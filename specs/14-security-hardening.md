# SPEC 14 — Hardening de seguridad (RLS, headers, Auth)

> **Estado:** Approved
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 13 (auth-supabase)
> **Fecha:** 2026-08-26
> **Objetivo:** Cerrar el checklist de seguridad de `references/security/checklist.md` — habilitar RLS real en `games` y `scores` (bloqueando en el proceso que los invitados guarden puntajes, y exigiendo que un usuario logueado solo pueda guardar su propio `user_id`), revocar el permiso de ejecución público de la función `rls_auto_enable()`, agregar headers de seguridad en Next.js, y documentar los tres ajustes de Auth del dashboard de Supabase (mínimo de contraseña, leaked password protection, rate limit de signup) que no se pueden aplicar por código con las herramientas disponibles.

## Scope

**In:**

- Migración SQL nueva: `alter table games enable row level security;` y `alter table scores enable row level security;`.
- Policy de `SELECT` pública en `games` (cualquiera, `anon` + `authenticated`, puede leer) — sin policies de `INSERT`/`UPDATE`/`DELETE`, quedan denegadas por default (los seeds siguen escribiendo vía migraciones, que corren con rol elevado y no pasan por RLS).
- Policy de `SELECT` pública en `scores` (leaderboard sigue siendo visible para cualquiera, logueado o no).
- Policy de `INSERT` en `scores` **solo para `authenticated`**, con `with check (user_id = auth.uid())` — un usuario logueado únicamente puede insertar un score con su propio `user_id`; no existe policy de `INSERT` para `anon`, por lo que un invitado no puede insertar en absoluto a nivel de base de datos. Sin policies de `UPDATE`/`DELETE` (denegadas por default).
- Misma migración: `revoke execute on function public.rls_auto_enable() from anon, authenticated;` — cierra el warning del advisor sin tocar la función ni el event trigger `ensure_rls` que la dispara (sigue auto-habilitando RLS en tablas `public` nuevas).
- `next.config.ts`: agregar `headers()` con los 3 headers del checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) aplicados a todas las rutas (`/(.*)`).
- `app/juego/[id]/jugar/page.tsx`: en el modal de fin de partida, cuando no hay sesión, el campo de nickname + botón "Guardar" se reemplazan por un mensaje con CTA a `/auth` invitando a iniciar sesión para guardar el puntaje. Con sesión, el modal sigue exactamente igual que hoy (nickname autocompletado y bloqueado, guarda con `user_id` real).
- Documentar en **Decisions**/**Risks** los 3 ajustes de Auth del dashboard de Supabase que esta spec no puede aplicar por código con las herramientas MCP conectadas (mínimo de contraseña ≥ 8, leaked password protection, rate limit de signup) — quedan como checklist manual a verificar, mismo precedente que SPEC 13 con OAuth/Confirm email.
- Verificación con `mcp__supabase__get_advisors(type: "security")`: los 4 findings de RLS/función quedan resueltos (0 resultados); `auth_leaked_password_protection` puede seguir apareciendo como WARN si el ajuste manual de dashboard no se aplicó, y eso es aceptado — no bloquea el cierre de la spec.
- `npm run build` sin errores de tipos/compilación.

**Out of scope (para futuros specs):**

- Policies explícitas de `UPDATE`/`DELETE` en `games`/`scores` — quedan denegadas por default al no existir policy, no hace falta escribir una policy negativa.
- Eliminar/dropear `rls_auto_enable()` o el event trigger `ensure_rls` — se mantiene como red de seguridad preexistente del proyecto, solo se revoca el `EXECUTE` público.
- Aplicar por código el mínimo de contraseña, leaked password protection o el rate limit de signup — son ajuste de dashboard/Management API con un token que no está configurado en este repo; documentados como pasos manuales, no como acceptance criteria de código.
- Headers de seguridad adicionales (`Strict-Transport-Security`, `Permissions-Policy`, `X-DNS-Prefetch-Control`, CSP, etc.) más allá de los 3 listados en el checklist — decisión explícita del usuario de acotar a lo pedido.
- Requerir sesión para **jugar** — "JUGAR COMO INVITADO" sigue funcionando en toda la navegación; el bloqueo es únicamente sobre guardar el puntaje al final de la partida.
- Migrar o eliminar puntajes históricos con `user_id: null` guardados antes de esta spec.
- Cambios a `RealGameProps`, a los componentes de juego, o a cualquier otro juego del catálogo.
- Cambios a `app/api/contacto/route.ts` / Resend.
- Auditoría mobile del modal de fin de partida más allá de reutilizar clases ya responsivas existentes.
- RLS sobre cualquier tabla que no sea `games`/`scores` — son las únicas dos que existen hoy.

## Data model

No se crean tablas nuevas. Esta spec define policies de RLS sobre las tablas existentes (`games`, `scores`) y revoca un permiso sobre una función existente — el "modelo de datos" de esta spec es esa política de acceso.

**Migración SQL nueva** (sugerido: `supabase/migrations/20260826010000_rls_and_security_hardening.sql`):

```sql
-- games: solo lectura pública, sin escritura desde anon/authenticated
alter table games enable row level security;

create policy "games_select_public"
  on games for select
  to anon, authenticated
  using (true);

-- scores: lectura pública, insert solo autenticado y solo el propio user_id
alter table scores enable row level security;

create policy "scores_select_public"
  on scores for select
  to anon, authenticated
  using (true);

create policy "scores_insert_own"
  on scores for insert
  to authenticated
  with check (user_id = auth.uid());

-- cierra el warning del advisor sin tocar la función ni el event trigger ensure_rls
revoke execute on function public.rls_auto_enable() from anon, authenticated;
```

- No hay policy de `INSERT`/`UPDATE`/`DELETE` en `games`: quedan denegadas por default para `anon`/`authenticated` en cuanto se habilita RLS sin definirlas. Los seeds (`supabase/migrations/*_seed_*.sql`) siguen escribiendo porque corren con el rol de servicio de la migración, que no está sujeto a RLS.
- No hay policy de `UPDATE`/`DELETE` en `scores`: mismo razonamiento, quedan denegadas por default. Ningún código de la app las usa hoy.
- `scores_insert_own` reemplaza el comportamiento actual de `app/auth-context.tsx#saveScore` (que hoy inserta cualquier `user_id`, incluido `null`, sin verificación): a partir de esta spec, un insert sin sesión (`anon`) es rechazado por RLS, y un insert con sesión pero `user_id` distinto a `auth.uid()` también. `saveScore` en sí no cambia de firma — el gating pasa a vivir en el punto de llamada (el modal de fin de partida) y se refuerza en la base de datos vía RLS.

## Implementation plan

1. **Bloquear guardado de invitados en la UI**: en `app/juego/[id]/jugar/page.tsx`, el modal de fin de partida reemplaza el campo de nickname + botón "Guardar" por un mensaje con CTA a `/auth` cuando no hay sesión (`user === null` desde `useAuth()`). Con sesión, el modal no cambia (nickname autocompletado y bloqueado, guarda igual que hoy). Sistema funcional: invitados ya no intentan guardar puntaje desde la UI; usuarios logueados guardan exactamente igual que antes.

2. **Migración de RLS y permisos**: crear y aplicar `supabase/migrations/20260826010000_rls_and_security_hardening.sql` con RLS habilitado + policies en `games` y `scores` (según Data model) y el `revoke execute` sobre `rls_auto_enable()`. Sistema funcional: lectura de `games`/`scores` sigue igual (policies de `SELECT` públicas); guardado de puntaje logueado sigue funcionando (inserta su propio `user_id`, que ahora además se verifica en la DB); el guardado de invitado, ya removido de la UI en el paso 1, queda además bloqueado a nivel de base de datos.

3. **Headers de seguridad**: agregar la función `headers()` a `next.config.ts` con `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy` aplicados a `/(.*)`. Sistema funcional: sin cambios de comportamiento visible, solo headers HTTP nuevos en cada respuesta.

4. **Verificación final**: `mcp__supabase__get_advisors(type: "security")` confirma que los 4 findings de RLS/función (`rls_disabled_in_public` ×2, `anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`) ya no aparecen; prueba manual — jugar como invitado y confirmar que el modal de fin de partida muestra el CTA de login en vez de poder guardar; loguearse, jugar y guardar un puntaje, confirmar que aparece en `/salon-de-la-fama`; intentar (vía `execute_sql` o el cliente con una sesión activa) insertar un score con un `user_id` ajeno y confirmar que RLS lo rechaza; `curl -I` contra una ruta local y confirmar los 3 headers nuevos; `npm run build` sin errores.

## Acceptance criteria

- [ ] `games` tiene RLS habilitado, con una policy de `SELECT` pública (`anon`+`authenticated`) y ninguna policy de `INSERT`/`UPDATE`/`DELETE`.
- [ ] `scores` tiene RLS habilitado, con una policy de `SELECT` pública y una policy de `INSERT` restringida a `authenticated` con `user_id = auth.uid()`; ninguna policy de `UPDATE`/`DELETE`.
- [ ] Insertar un score sin sesión (`anon`) es rechazado por RLS.
- [ ] Insertar un score logueado con un `user_id` distinto al de la sesión (`auth.uid()`) es rechazado por RLS.
- [ ] Insertar un score logueado con el propio `user_id` funciona igual que antes de esta spec.
- [ ] `revoke execute` aplicado sobre `public.rls_auto_enable()` para `anon` y `authenticated`; el event trigger `ensure_rls` sigue existiendo y funcionando (una tabla `public` nueva creada de prueba sigue quedando con RLS auto-habilitado).
- [ ] `mcp__supabase__get_advisors(type: "security")` ya no reporta `rls_disabled_in_public` (ni `games` ni `scores`), `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`.
- [ ] En el modal de fin de partida (`/juego/[id]/jugar`), sin sesión se muestra un CTA para iniciar sesión en vez de un campo de nickname editable y botón de guardar.
- [ ] En el modal de fin de partida, con sesión, el comportamiento es idéntico al de antes de esta spec (nickname autocompletado y bloqueado, guarda el puntaje).
- [ ] "JUGAR COMO INVITADO" y el resto de la navegación siguen funcionando sin sesión — ninguna ruta pasa a requerir login para jugar.
- [ ] `next.config.ts` responde con los headers `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy: strict-origin-when-cross-origin` en todas las rutas.
- [ ] El checklist de ajustes manuales de Auth (mínimo de contraseña ≥ 8, leaked password protection, rate limit de signup) queda documentado en la spec como pendiente de verificar/activar en el dashboard de Supabase — no es un criterio de código.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** habilitar RLS real en `games` y `scores`, no solo documentar el gap. Es exactamente lo que pide el checklist (`rls_disabled_in_public`, ERROR level en ambas tablas) y lo que SPEC 06/13 dejaron como deuda explícita a resolver "en un spec aparte".
- **Sí:** bloquear el guardado de puntaje a invitados, tanto en la UI como en la policy de `INSERT` de `scores`. Decisión explícita del usuario, aunque cambia el comportamiento que SPEC 13 había fijado ("JUGAR COMO INVITADO" sin restricciones) — el ajuste queda acotado a "guardar", no a "jugar".
- **Sí:** mantener "JUGAR COMO INVITADO" para navegar y jugar sin cuenta. Decisión explícita del usuario tras aclarar el alcance — solo se bloquea el guardado del puntaje, no el acceso a ningún juego ni ruta.
- **Sí:** la policy de `INSERT` en `scores` exige `user_id = auth.uid()` a nivel de base de datos (`with check`), no solo un gate en el frontend. Decisión explícita del usuario — cierra el riesgo que SPEC 13 había documentado y aceptado ("cualquiera con la anon/publishable key puede insertar un `user_id` arbitrario") en vez de dejarlo como deuda otra vez.
- **No:** no se agregan policies explícitas de `UPDATE`/`DELETE` en `games`/`scores` — con RLS habilitado y sin policy para esas operaciones, quedan denegadas por default. Ningún código de la app las necesita hoy; agregar una policy negativa sería código sin efecto.
- **Sí:** revocar `EXECUTE` de `rls_auto_enable()` para `anon`/`authenticated`, sin tocar la función ni el event trigger `ensure_rls`. La función es una red de seguridad preexistente del proyecto (auto-habilita RLS en tablas `public` nuevas) que no fue creada por ninguna migración de este repo; el warning del advisor es sobre su exposición vía RPC, no sobre su lógica — revocar el permiso cierra el warning sin perder la protección.
- **No:** no se aplican por código el mínimo de contraseña, leaked password protection ni el rate limit de signup. Se confirmó que ninguna herramienta MCP de Supabase conectada expone configuración de Auth (son ajuste del dashboard o de la Management API con un token no configurado en este repo) — mismo precedente que SPEC 13 con OAuth/Confirm email. Quedan documentados como checklist manual.
- **Sí:** los headers de seguridad se limitan exactamente a los 3 que lista el checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`). Decisión explícita del usuario de acotar la spec a lo pedido; un set más amplio de hardening (CSP, HSTS, Permissions-Policy) puede ser su propia spec.
- **No:** `saveScore` en `app/auth-context.tsx` no cambia de firma ni gana lógica nueva de validación — el gating de invitados vive en el punto de llamada (el modal de fin de partida) y se refuerza en la base de datos vía RLS, no duplicando la verificación en el cliente.
- **No:** no se migran puntajes históricos guardados con `user_id: null` — no hay forma de inferir a qué cuenta pertenecen, mismo razonamiento que SPEC 13.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un error en la definición de las policies de `SELECT` podría dejar `games`/`scores` ilegibles para `anon`/`authenticated`, rompiendo `/biblioteca`, el detalle de juego y `/salon-de-la-fama` (que hoy leen sin autenticación).                                                               | Verificar manualmente en el paso 4 que la lectura pública sigue funcionando (listar juegos, ver detalle, ver top scores) inmediatamente después de aplicar la migración, antes de dar el paso por cerrado; la migración es reversible con `drop policy`/`disable row level security` si algo falla.                                                                         |
| Bloquear `INSERT` de `games` a nivel de RLS podría romper algún flujo no detectado que escriba desde el cliente (ej. actualizar `plays`/`best`).                                                                                                                                              | El grep sobre `app/` confirmó que ningún código de la app inserta/actualiza `games` — solo se lee (`fetchGame`, listado estático). Si una spec futura necesita escritura desde cliente, tendrá que agregar su propia policy explícita.                                                                                                                                      |
| Revocar `EXECUTE` sobre `rls_auto_enable()` podría, en teoría, afectar su disparo si algo la invocara directamente por RPC en vez de vía el event trigger.                                                                                                                                    | La función está declarada `RETURNS event_trigger`, por lo que solo puede invocarse desde el mecanismo de event triggers de Postgres, nunca como una llamada RPC normal — revocar `EXECUTE` de `anon`/`authenticated` no afecta su disparo interno. Verificar en el paso 4 creando una tabla de prueba en `public` y confirmando que sigue quedando con RLS auto-habilitado. |
| El warning `auth_leaked_password_protection` va a seguir apareciendo en los advisors después de esta spec, porque es un ajuste de dashboard fuera de lo que el código puede forzar — podría leerse como que la spec quedó incompleta.                                                         | Acceptance criteria lo separa explícitamente como "documentado, no criterio de código"; se deja como checklist manual pendiente de quien tenga acceso al dashboard del proyecto.                                                                                                                                                                                            |
| Bloquear el guardado de puntaje a invitados es un cambio de producto real (reduce fricción hoy, la aumenta después) — un usuario que solo quería probar el juego ya no puede quedar en el leaderboard sin crear cuenta.                                                                       | Decisión explícita y consciente del usuario en esta misma spec; "JUGAR COMO INVITADO" se mantiene intacto para navegar y jugar, el único cambio es que guardar el puntaje requiere sesión.                                                                                                                                                                                  |
| Si el orden de despliegue se invierte (se aplica la migración de RLS antes que el cambio de UI del paso 1), un invitado que intente guardar puntaje entre ambos pasos recibe un insert rechazado silenciosamente (mismo manejo de error que ya existe hoy: `console.error`, sin UI de error). | El plan de implementación ordena el paso 1 (UI) antes del paso 2 (RLS) explícitamente para evitar esta ventana; si se implementa fuera de orden, es un riesgo cosmético acotado (ningún dato corrupto, solo un guardado silenciosamente fallido) hasta que se complete el paso 1.                                                                                           |
