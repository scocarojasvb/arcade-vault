# SPEC 13 — Registro, login y autenticación real con Supabase Auth

> **Estado:** Approved
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase)
> **Fecha:** 2026-08-26
> **Objetivo:** Reemplazar el login simulado en `localStorage` por autenticación real de Supabase Auth (registro y login por email/contraseña, login social con Google y GitHub, confirmación de email obligatoria y recuperación de contraseña), vinculando cada puntaje guardado al usuario autenticado que lo generó.

## Scope

**In:**

- Reemplazar `app/auth-context.tsx`: el `AuthProvider` deja de leer/escribir `av_user` en `localStorage` y pasa a hidratar `user` desde la sesión real de Supabase Auth (`supabase.auth.getUser()` al montar + suscripción a `onAuthStateChange` para mantenerlo sincronizado tras login, logout u OAuth).
- `login`/`logout` de `AuthContextValue` dejan de ser setters locales: `logout` llama a `supabase.auth.signOut()` real; el login ya no lo dispara el contexto sino los formularios de `/auth` (`signInWithPassword`, `signUp`, `signInWithOAuth`).
- `/auth` (`app/auth/page.tsx`): tab **INICIAR SESIÓN** pasa a pedir **Correo + Contraseña** (ya no "Usuario") y llama a `supabase.auth.signInWithPassword`. Tab **CREAR CUENTA** mantiene Usuario (nickname) + Correo + Contraseña y llama a `supabase.auth.signUp`, guardando el nickname en `user_metadata.name`.
- Tras un registro exitoso, la tarjeta de `/auth` cambia a una pantalla de aviso "revisá tu correo" con botón para reenviar el email de confirmación (`supabase.auth.resend`), sin redirigir todavía — no hay sesión hasta confirmar.
- Manejo de errores diferenciado en el login: credenciales inválidas vs. email no confirmado (mensaje distinto y opción de reenviar confirmación en el segundo caso).
- Botones "GOOGLE"/"GITHUB" en `/auth` pasan de decorativos a reales: `supabase.auth.signInWithOAuth({ provider })` con `redirectTo` a `/auth/callback`. Los providers ya están configurados en el dashboard del proyecto Supabase (fuera de esta spec).
- Nueva ruta `app/auth/callback/route.ts`: intercambia el código OAuth por sesión (`exchangeCodeForSession`) y redirige a `/biblioteca`.
- Nuevas rutas `app/auth/recuperar/page.tsx` (pide correo, llama `resetPasswordForEmail`) y `app/auth/actualizar-clave/page.tsx` (detecta la sesión de recuperación desde el link del correo y llama `updateUser({ password })`). Enlace "¿Olvidaste tu contraseña?" agregado al tab de login.
- Redirect a `/biblioteca` tras cualquier autenticación exitosa (login por email/contraseña, login OAuth, y tras completar la actualización de contraseña).
- `app/components/nav.tsx`: sigue mostrando `user.name`/"Cuenta" vs. "Iniciar Sesión" igual que hoy, pero ahora contra la sesión real; el botón de logout invoca el `logout` real.
- `app/juego/[id]/jugar/page.tsx`: si hay sesión, el campo de nickname del modal de fin de partida se autocompleta con `user.name` y queda bloqueado (no editable); si es invitado, sigue siendo texto libre como hoy.
- `saveScore` en `app/auth-context.tsx` inserta `user_id: session user id` cuando hay sesión real (antes siempre `null`); invitado sigue insertando `user_id: null`.
- Migración SQL nueva que agrega la foreign key `scores.user_id → auth.users(id)` (columna ya existente y nullable desde SPEC 06, hoy sin FK).
- Se mantiene "JUGAR COMO INVITADO": ninguna ruta existente pasa a requerir sesión para navegar o jugar.
- `npm run build` sin errores de tipos/compilación.

**Out of scope (para futuros specs):**

- RLS en `games`/`scores` — sigue explícitamente sin RLS, misma deuda documentada en SPEC 06.
- Tabla `profiles` o cualquier validación de unicidad del nickname — vive solo en `user_metadata`, dos usuarios pueden compartir el mismo nickname.
- Pantalla de edición de perfil (cambiar nickname, correo o contraseña ya logueado) — esta spec solo cubre registro, login, logout y recuperación de contraseña por el flujo de "olvidé mi contraseña".
- Eliminar cuenta / gestión de cuenta.
- Migrar puntajes históricos con `user_id: null` para asociarlos retroactivamente a una cuenta real.
- Configurar los providers de Google/GitHub en el dashboard de Supabase — se asume ya hecho.
- Verificar/activar la opción "Confirm email" en el dashboard de Supabase Auth — se asume ya activa; si no lo está, es un ajuste de configuración del proyecto, no de código, y queda fuera de lo que este spec puede forzar.
- Rate limiting, CAPTCHA o cualquier protección anti-bot en el registro.
- Autenticación multifactor (MFA).
- Cambios a `RealGameProps`, a los componentes de juego, o a cualquier otro juego del catálogo.
- Auditoría mobile de las rutas nuevas (`/auth/recuperar`, `/auth/actualizar-clave`, `/auth/callback`) más allá de reutilizar las clases CSS (`.av-auth-wrap`, `.auth-card`) ya responsivas de `/auth` — una pasada completa de `mobile-porter` sobre ellas, si hace falta, es otra spec.
- Cambios a la simulación falsa "tu puntaje"/`youRank` de `app/salon-de-la-fama/page.tsx` — sigue funcionando igual, solo que ahora `user` viene de una sesión real en vez de `localStorage`.

## Data model

**`app/auth-context.tsx` — `User` y `AuthContextValue` se redefinen:**

```ts
export interface User {
  id: string; // auth.users.id (uuid), viene de la sesión real de Supabase
  email: string;
  name: string; // nickname, leído de user_metadata.name
}

interface AuthContextValue {
  user: User | null;
  logout: () => Promise<void>; // llama a supabase.auth.signOut()
  saveScore: (entry: Omit<SavedScore, "at">) => void;
}
```

- Se elimina `login` de `AuthContextValue`: ya no existe un setter manual — `user` se deriva de `supabase.auth.getUser()` en el mount y de la suscripción a `onAuthStateChange` (login por email/contraseña, OAuth y logout, disparados desde `/auth/*`, todos terminan actualizando `user` a través de este mismo mecanismo).
- Se elimina el campo `scores`/`useState<SavedScore[]>` de `AuthContextValue`: hoy no lo lee ningún componente (`saveScore` ya inserta directo en Supabase desde SPEC 06) — es estado muerto que quedó del `localStorage` original. `SavedScore` como tipo se mantiene (lo sigue usando `saveScore`).
- `user.name` se lee de `session.user.user_metadata.name` (string que se guarda al hacer `signUp` con `options: { data: { name } }`); no hay tabla `profiles` ni garantía de unicidad (decisión ya tomada).

**Migración SQL nueva — agrega la FK pendiente desde SPEC 06:**

```sql
alter table scores
  add constraint scores_user_id_fkey
  foreign key (user_id) references auth.users(id);
```

Sugerido: `supabase/migrations/20260826000000_scores_user_id_fk.sql`. `user_id` sigue `nullable` (invitados sin cuenta siguen insertando `null`); esta migración solo agrega la restricción de integridad referencial, no cambia el tipo de columna ni RLS.

**Sin tablas nuevas.** Los usuarios viven enteramente en `auth.users` (gestionada por Supabase Auth), no se crea `profiles` ni ninguna tabla espejo.

**Rutas nuevas (sin modelo de datos propio, solo componentes/route handlers):**

- `app/auth/callback/route.ts` — intercambia el código OAuth por sesión.
- `app/auth/recuperar/page.tsx` — pide correo, dispara `resetPasswordForEmail`.
- `app/auth/actualizar-clave/page.tsx` — toma la sesión de recuperación del link del correo, llama `updateUser({ password })`.

## Implementation plan

1. **Migración SQL**: crear y aplicar `supabase/migrations/20260826000000_scores_user_id_fk.sql` con la FK `scores.user_id → auth.users(id)`. Sistema funcional: nada visible cambia, la columna sigue nullable.
2. **Refactor de `app/auth-context.tsx`**: nuevo `User`/`AuthContextValue` (sin `login`, sin `scores`), hidratación de `user` vía `supabase.auth.getUser()` + `onAuthStateChange`, `logout` real (`signOut()`), `saveScore` insertando `user_id` real cuando hay sesión y `null` para invitado. Actualizar en el mismo paso los 3 consumidores para que compilen contra el contrato nuevo: `app/components/nav.tsx` (sin cambio funcional), `app/salon-de-la-fama/page.tsx` (sin cambio funcional) y `app/juego/[id]/jugar/page.tsx` (nickname autocompletado y bloqueado cuando hay sesión, libre para invitado). Sistema funcional: build compila; `/auth` todavía no existe en su forma nueva (paso 3) por lo que login/registro no funcionan aún — es el único paso de este plan que deja una ruta rota temporalmente, acotado a `/auth` en sí.
3. **Reescribir `app/auth/page.tsx`**: tab INICIAR SESIÓN con Correo + Contraseña (`signInWithPassword`), tab CREAR CUENTA con Usuario + Correo + Contraseña (`signUp`, nickname en `options.data.name`), pantalla de aviso "revisá tu correo" con reenvío (`resend`) tras registrar, y mensajes de error diferenciados (credenciales inválidas vs. email no confirmado). Sistema funcional: registro y login reales por email/contraseña funcionan de punta a punta, incluida la confirmación obligatoria.
4. **OAuth**: botones GOOGLE/GITHUB en `/auth` llaman `signInWithOAuth({ provider, options: { redirectTo } })`; nueva ruta `app/auth/callback/route.ts` que intercambia el código por sesión y redirige a `/biblioteca`. Sistema funcional: login social funcionando de punta a punta contra los providers ya configurados en el dashboard.
5. **Recuperación de contraseña**: nuevas rutas `app/auth/recuperar/page.tsx` (pide correo, `resetPasswordForEmail`) y `app/auth/actualizar-clave/page.tsx` (toma la sesión de recuperación del link, `updateUser({ password })`); enlace "¿Olvidaste tu contraseña?" agregado al tab de login. Sistema funcional: flujo completo de reseteo de contraseña.
6. **Verificación final**: `npm run build` sin errores; prueba manual completa — registrarse (ver pantalla de confirmación), confirmar el correo, loguearse por email/contraseña, loguearse con Google y con GitHub, cerrar sesión, "¿Olvidaste tu contraseña?" de punta a punta, jugar como invitado sin sesión, guardar un puntaje logueado (nickname bloqueado, `user_id` real en la fila de `scores`) y como invitado (`user_id: null`), confirmar que el nav y `/salon-de-la-fama` reflejan la sesión real.

## Acceptance criteria

- [ ] La migración `scores_user_id_fk.sql` está aplicada: `scores.user_id` tiene una FK hacia `auth.users(id)`, sigue siendo `nullable`.
- [ ] `app/auth-context.tsx` ya no lee ni escribe `av_user` en `localStorage`; `user` refleja la sesión real de Supabase Auth al recargar la página.
- [ ] `AuthContextValue` ya no expone `login` ni `scores`.
- [ ] En `/auth`, el tab INICIAR SESIÓN pide Correo + Contraseña y autentica contra Supabase Auth real.
- [ ] En `/auth`, el tab CREAR CUENTA pide Usuario + Correo + Contraseña, crea la cuenta real y guarda el nickname en `user_metadata.name`.
- [ ] Tras registrarse, se muestra la pantalla "revisá tu correo" con opción de reenviar el email de confirmación, sin loguear automáticamente.
- [ ] Intentar loguearse antes de confirmar el correo muestra un mensaje específico de "email no confirmado" (distinto de "credenciales inválidas").
- [ ] Los botones GOOGLE y GITHUB en `/auth` inician sesión real vía OAuth y redirigen a `/biblioteca` tras completar el flujo en `/auth/callback`.
- [ ] `/auth/recuperar` envía un correo de reseteo de contraseña real; `/auth/actualizar-clave` permite fijar una contraseña nueva desde el link recibido, y con ella se puede volver a iniciar sesión.
- [ ] El botón de logout (`app/components/nav.tsx`) cierra la sesión real; tras cerrar sesión, `/salon-de-la-fama` y el nav vuelven al estado "sin sesión".
- [ ] "JUGAR COMO INVITADO" y el resto de la navegación siguen funcionando sin sesión, sin ningún redirect forzado a `/auth`.
- [ ] En el modal de fin de partida, con sesión activa el campo de nickname aparece autocompletado con el nombre de cuenta y no editable; sin sesión, sigue siendo texto libre.
- [ ] Guardar un puntaje logueado inserta en `scores` el `user_id` real de la sesión; guardar como invitado sigue insertando `user_id: null`.
- [ ] Ningún cambio de RLS se aplicó a `games` ni `scores`.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** reemplazar el login falso por Supabase Auth real (email/contraseña + OAuth), no una simulación más elaborada. Es la deuda que SPEC 06 dejó documentada explícitamente ("Autenticación real / login" fuera de alcance "hasta que exista auth real") y la infraestructura (`proxy.ts` refrescando `supabase.auth.getUser()`, `scores.user_id` ya `uuid` nullable) ya estaba preparada para esto.
- **Sí:** confirmación de email obligatoria antes de poder loguearse. Pedido explícito del usuario; se asume que la opción "Confirm email" ya está activa en el dashboard del proyecto Supabase — verificarlo/activarlo es un ajuste de configuración externo, no de código, y queda fuera de lo que este spec puede forzar.
- **Sí:** se mantiene "JUGAR COMO INVITADO" — ninguna ruta pasa a requerir sesión. Decisión explícita del usuario; coincide con que `scores.user_id` sigue nullable y no se activa RLS.
- **Sí:** login social (Google/GitHub) real en esta misma spec, en vez de diferirlo. Pedido explícito del usuario; se asume que los providers ya están configurados con client id/secret en el dashboard de Supabase — el spec solo agrega el código (botones + `app/auth/callback/route.ts`).
- **Sí:** recuperación de contraseña ("olvidé mi contraseña") entra en esta spec, con rutas propias `/auth/recuperar` y `/auth/actualizar-clave`. Pedido explícito del usuario.
- **Sí:** el nickname vive en `user_metadata.name` de Supabase Auth, no en una tabla `profiles` nueva. Evita sumar una tabla y su sincronización; el costo aceptado es que no hay garantía de unicidad entre nicknames — decisión explícita del usuario.
- **No:** no se activa RLS en `games`/`scores`, aunque ahora exista login real (spec 06 lo dejó condicionado a esto). Decisión explícita del usuario: se prefiere resolverlo en un spec aparte en vez de acoplarlo a esta.
- **Sí:** el tab de login pasa de pedir "Usuario" a pedir "Correo electrónico". Supabase Auth autentica por email, y el nickname vive solo en `user_metadata` (no en una tabla consultable con la anon key antes de loguearse), así que no hay forma de resolver "usuario → email" sin la tabla `profiles` que ya se descartó.
- **Sí:** al guardar un puntaje logueado, el nickname del modal se autocompleta con el nombre de cuenta y queda bloqueado (no editable); el invitado sigue escribiendo libre. Evita que una cuenta real guarde un puntaje con un nombre distinto al de su perfil, sin restringir el flujo de invitado que no tiene nombre de cuenta.
- **Sí:** `scores.user_id` pasa a poblarse con el `id` real del usuario autenticado (antes siempre `null`) y se agrega la FK `scores.user_id → auth.users(id)` pendiente desde SPEC 06. Es consistente con bloquear el nickname a la cuenta: si el score queda atado a un nombre de cuenta, tiene sentido que también quede atado a su `user_id` real.
- **Sí:** redirect siempre a `/biblioteca` tras cualquier autenticación exitosa (login, OAuth, tras actualizar contraseña), igual que el comportamiento del login falso actual. Sin cambios de navegación no solicitados.
- **Sí:** se elimina el campo `scores`/`useState<SavedScore[]>` de `AuthContextValue` al tocar ese archivo. Es estado muerto desde SPEC 06 (nada lo lee; `saveScore` ya inserta directo en Supabase) — se retira porque este spec ya reescribe el contrato de `AuthContextValue` y dejarlo sería mantener código muerto a sabiendas.
- **No:** no se crea una pantalla de edición de perfil, eliminación de cuenta, MFA, ni rate limiting/CAPTCHA en el registro — ninguno fue pedido y cada uno ameritaría su propia spec.
- **No:** no se migran puntajes históricos (`user_id: null`) hacia cuentas reales — no hay forma de inferir a qué cuenta pertenecen puntajes guardados como invitado antes de esta spec.
- **No:** no se invoca una auditoría completa de `mobile-porter` sobre las rutas nuevas — se reutilizan las clases ya responsivas de `/auth` (`.av-auth-wrap`, `.auth-card`); si hace falta un ajuste fino, es trabajo aparte.

## Risks

| Riesgo                                                                                                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Si "Confirm email" no está realmente activado en el dashboard de Supabase (se asume que sí), el registro loguea directo sin confirmación y la pantalla "revisá tu correo" queda huérfana/engañosa.                                                                           | Verificar manualmente en el paso 6 (registrar una cuenta de prueba y confirmar que no hay sesión hasta hacer clic en el link del correo); si el proyecto no lo tiene activo, es un ajuste de configuración a hacer antes de dar la spec por terminada, no de código. |
| Si Google/GitHub no están realmente configurados en el dashboard de Supabase (se asume que sí), `signInWithOAuth` falla en runtime con un error de provider no habilitado.                                                                                                   | Verificar manualmente en el paso 6 con un login real por cada provider antes de cerrar la spec; si falla, es un ajuste de dashboard, no un bug de este código.                                                                                                       |
| `app/auth/callback/route.ts` es una ruta nueva sobre App Router — si el intercambio de código (`exchangeCodeForSession`) no maneja bien el caso de error (código inválido/expirado), el usuario puede quedar en una redirección rota sin mensaje.                            | Manejar el caso de error explícitamente en el route handler: si `exchangeCodeForSession` falla, redirigir a `/auth` con un query param de error visible en la UI, en vez de un 500 silencioso.                                                                       |
| Doble montaje del `useEffect` en desarrollo (React Strict Mode) podría duplicar la suscripción a `onAuthStateChange` en `AuthProvider`.                                                                                                                                      | Hacer `unsubscribe()` de la suscripción en el cleanup del `useEffect`, mismo patrón de limpieza ya usado en los `useEffect` de los juegos reales del catálogo.                                                                                                       |
| Bloquear el campo de nickname en el modal de fin de partida cuando hay sesión asume que `user.name` siempre existe si hay `user` — una cuenta creada por OAuth podría no tener `user_metadata.name` seteado (Google/GitHub no lo completan solos).                           | En el registro por OAuth, si `user_metadata.name` viene vacío, usar un fallback derivado del email (ej. la parte antes de `@`) al leer `user.name` en el contexto, para que el nickname nunca quede vacío/bloqueado en blanco.                                       |
| Sin RLS, cualquiera con la anon/publishable key puede seguir insertando `scores` con un `user_id` arbitrario (no necesariamente el propio), falseando a qué cuenta pertenece un puntaje.                                                                                     | Aceptado explícitamente por el usuario (misma decisión que mantener RLS fuera de esta spec) — queda documentado como deuda, igual que en SPEC 06.                                                                                                                    |
| El flujo de recuperación de contraseña depende de que el link del correo incluya un token que Supabase resuelve como sesión temporal en `/auth/actualizar-clave`; si el usuario abre el link en un navegador distinto al que inició el flujo, podría no reconocer la sesión. | Es el comportamiento estándar de Supabase Auth (el token va en la URL, no depende del navegador de origen); verificar manualmente en el paso 6 abriendo el link de recuperación en una pestaña nueva.                                                                |
