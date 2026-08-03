---
name: add-game
description: Genera un spec nuevo en `specs/` para agregar un juego real al catálogo de Arcade Vault — puerto a TypeScript, tabla `games`/`scores` de Supabase, HUD/pausa/game-over y leaderboard — a partir de una carpeta de `references/started-games` o de una descripción en prompt. Sigue el mismo proceso guiado que `/spec`, generalizando el patrón usado en las specs 05 (asteroids-game) y 06 (leaderboard-supabase). No implementa nada.
disable-model-invocation: true
argument-hint: <NN-nombre-en-references/started-games | descripción libre del juego a crear>
---

# /add-game — Generar el spec de un juego real jugable con leaderboard

Este skill **solo escribe un archivo de spec** en `specs/`. No toca código de la app, no corre `npm run build`, no aplica migraciones de Supabase. Es una variante de `/spec` especializada en un tipo de feature recurrente en este repo: agregar un juego real (no la simulación falsa) al catálogo. Si el usuario pide implementar, recordarle que para eso existe `/spec-impl NN-slug` una vez el spec esté aprobado.

Tu respuesta debe estar en el mismo idioma del prompt inicial (igual que `/spec`).

## Contexto de sesión

Estado del repo:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs existentes:
!`ls specs/*.md 2>/dev/null`

Referencias disponibles:
!`ls references/started-games 2>/dev/null || echo "references/started-games no existe"`

Juegos ya registrados en `app/data/games.ts`:
!`grep -o 'id: "[a-z-]*"' app/data/games.ts 2>/dev/null`

¿Ya existe el registro genérico de juegos reales?
!`ls app/data/real-games.ts app/games/registry.tsx 2>/dev/null || echo "todavía no existe — el spec generado deberá contemplar crearlo"`

---

## El patrón de referencia: specs 05 + 06

`specs/05-asteroids-game.md` y `specs/06-leaderboard-supabase.md` son la primera vez que este repo agregó un juego real: puerto de canvas vanilla JS a un componente TS encapsulado, tabla `games`/`scores` en Supabase, HUD/pausa/game-over conectados en `jugar/page.tsx`, y leaderboard real vía `fetchTopScores`/`fetchGame`. Leelas antes de generar un spec nuevo si no las tienes frescas — son la fuente de las convenciones de nombres, contratos de props y estructura de tablas que el spec nuevo debe reutilizar en vez de reinventar.

Si ya existe un juego real adicional a asteroids (o si `app/data/real-games.ts` / `app/games/registry.tsx` ya existen), ese es el registro genérico (`REAL_GAME_IDS`, `REAL_GAME_COMPONENTS`) al que el spec nuevo debe engancharse, en vez de asumir que asteroids sigue siendo un caso especial hardcodeado.

---

## Fase 1 — Entender el contexto y la fuente del juego

1. Confirmar que `CLAUDE.md`/`AGENTS.md` ya están cargados (vienen en el contexto de sesión del sistema); si por algún motivo no, leerlos.
2. Revisar los resultados del contexto de sesión de arriba: specs existentes, juegos registrados, si el registro genérico de juegos reales ya existe.
3. Determinar la fuente del juego a partir de `$ARGUMENTS`:
   - Si coincide con una carpeta de `references/started-games/` (por número, slug o nombre parcial) → **fuente = referencia**. Leer `game.js` (y `index.html`/`style.css` si existen) completos con Read — el spec debe describir con precisión qué se porta.
   - Si no coincide con ninguna carpeta → **fuente = prompt**. La descripción del usuario es el diseño del juego; no rechazar por falta de referencia.
   - Si `$ARGUMENTS` viene vacío, preguntar: ¿referencia de `references/started-games` o descripción de un juego nuevo?

Si la descripción no cabe en una sola frase de objetivo, es la primera señal de que el feature es demasiado grande — sugerir dividirlo antes de continuar (mismo criterio que `/spec`).

---

## Fase 2 — Aclarar mediante preguntas

Igual que `/spec`: preguntar en bloques de 3 a 5, esperar respuesta antes de seguir. No asumir nada de lo que sigue sin confirmar.

**Metadatos del catálogo (interfaz `Game` existente, `app/data/games.ts`):**

1. `id`: slug en minúsculas/guiones, único (verificar contra `app/data/games.ts` y la tabla `games` de Supabase con `mcp__supabase__list_tables`/`execute_sql` si hay acceso).
2. `title`, `short`, `long` (tono retro/neón en español, mismo estilo que las entradas existentes).
3. `cat`: uno de `ARCADE | PUZZLE | SHOOTER | VERSUS`.
4. `color`: uno de `cyan | magenta | yellow | green`.
5. `cover`: `cover-<id>` — confirmar si necesita un patrón visual nuevo o puede seguir el de un `cover-*` existente similar.

**Diseño del juego:**

- Si la fuente es una referencia: confirmar que se porta tal cual (mismas mecánicas/física/colisiones) o si hay cambios deliberados respecto al original — cualquier cambio es una decisión a registrar, no un default.
- Si la fuente es un prompt: mecánica principal, condición de derrota/vidas, qué hace subir el score/nivel, y controles (default: solo teclado, igual que asteroids, salvo que se pida táctil explícitamente — si se pide, es scope nuevo a marcar como decisión).
- Resolución interna del canvas (default 800×600 como asteroids, salvo que la referencia use otra proporción claramente distinta).

**Integración con el patrón existente:**

- ¿Ya existe `app/data/real-games.ts`/`app/games/registry.tsx`? Si no, el spec debe incluir crearlos como parte de su plan (generalizar el caso hardcodeado de `"asteroids"`), igual que si ya existen, el spec solo agrega una entrada.
- ¿El seed de Supabase (`supabase/seed.sql` o migración nueva) se corre como parte de este spec o queda como paso manual documentado en riesgos?
- ¿Power-ups u otras mecánicas del original que sean opcionales — se incluyen en el MVP de este spec o quedan out of scope para uno futuro?

**Categorías generales a considerar (igual que `/spec`):** scope in/out, persistencia (siempre Supabase `games`/`scores`, sin RLS, igual que la spec 06 — confirmar que no cambia), riesgos, y cualquier decisión que el usuario ya tenga tomada y no quiera reabrir.

**Cuándo dejar de preguntar:** cuando puedas responder sin asumir: qué archivos van a aparecer o cambiar, cuál es el primer paso ejecutable y cuál el último, y cómo se verifica que el juego quedó terminado.

---

## Fase 3 — Desarrollar el spec sección por sección

Usar el mismo template que `/spec` (`.agents/skills/spec/template.md` si existe en el repo, o la estructura de las specs 05/06 como referencia directa). **No generar el spec completo de una vez** — mostrar cada sección y esperar confirmación antes de la siguiente.

Orden estricto:

1. **Header**: `# SPEC NN — <título del juego>`, con `Estado: Draft` (o `Borrador`), `Depende de:` (normalmente spec 04 supabase-setup y spec 06 leaderboard-supabase, más spec 05 solo si este spec asume/extiende el registro genérico de juegos reales que 05 dejó hardcodeado), fecha, objetivo en una sola frase.
2. **Scope** (`In` / `Out of scope`), separando explícitamente qué generaliza vs. qué es específico de este juego. Si el registro genérico (`real-games.ts`/`registry.tsx`) todavía no existe, el `In` debe incluir crearlo — no darlo por hecho.
3. **Data model**: fila nueva en `GAMES`/tabla `games` de Supabase (mismo shape que en la spec 05/06), contrato de props del componente (`paused`, `onStateChange`, `onGameOver` — reusar `RealGameProps` si ya existe, o definirlo si este es el primer juego que lo generaliza), y cualquier insert SQL nuevo para `supabase/seed.sql`.
4. **Implementation plan**: pasos numerados, cada uno dejando el sistema funcional, en este orden aproximado (ajustar según lo confirmado en Fase 2): (a) generalizar `real-games.ts`/`registry.tsx` si no existen, (b) entrada en `games.ts`/tabla `games` + seed, (c) CSS `.cover-<id>`, (d) puerto/diseño del componente `app/games/<id>/<id>-game.tsx`, (e) registrar en `REAL_GAME_IDS`/`REAL_GAME_COMPONENTS`, (f) verificación manual.
5. **Acceptance criteria**: checklist booleano — build sin errores, biblioteca/detalle muestran el juego desde Supabase, HUD refleja estado real, pausa congela el loop, game over dispara el modal existente, guardar puntuación inserta en `scores`, leaderboard lo refleja, otros juegos (incluido asteroids) no cambian de comportamiento.
6. **Decisions**: qué se decidió y qué se descartó, con motivo — en particular cualquier desvío respecto al patrón de la spec 05/06 (resolución de canvas distinta, mecánicas nuevas no presentes en la referencia, etc.).
7. **Risks** (si aplica): mismos riesgos estructurales que la spec 06 (FK `scores.game_id → games.id` requiere seed previo, sin RLS) más los específicos del juego nuevo (timing de `useEffect`/doble montaje, escalado de aspect ratio si la resolución no es 800×600, etc.).

Después de cada sección: mostrarla en markdown y preguntar si queda así o si se ajusta. Solo avanzar con confirmación explícita.

---

## Fase 4 — Guardar el spec

1. Determinar el siguiente número secuencial mirando `specs/` (ej. si el último es `06-leaderboard-supabase.md`, este es `07-`).
2. Generar un slug corto del objetivo (ej. `pong-game` o `invasores-real`).
3. Confirmar el nombre de archivo propuesto con el usuario antes de escribirlo.
4. Crear `specs/NN-slug.md` con todas las secciones aprobadas, incluyendo al final la sección **"What is not in this spec"** repitiendo lo excluido.
5. Marcar el estado como `Draft`/`Borrador` por defecto — **nunca marcarlo `Approved` automáticamente**.
6. Si `specs/.spec-config.yml` no existe, seguir el mismo criterio que `/spec` (crearlo con `AutoCreateBranch: true`); si ya existe, no tocarlo.
7. Confirmar al usuario:
   - Ruta del archivo creado.
   - Recordatorio: el spec está en estado `Draft`/`Borrador`.
   - Próximo paso: una vez revisado y aprobado, correr `/spec-impl NN-slug` para implementarlo.
   - **Detenerse ahí.** No proponer implementar el spec, escribir código, ni tocar Supabase.

---

## Reglas duras

- **Este skill nunca escribe código ni corre migraciones.** Solo produce el archivo `.md` del spec. Cualquier implementación es responsabilidad de `/spec-impl` después de que el spec esté aprobado.
- **No inventar metadatos ni diseño de juego sin confirmar** — `id`, `cat`, `color`, y las mecánicas (si la fuente es un prompt) siempre se confirman con el usuario antes de escribir cualquier sección del spec.
- **No generar el spec completo en una sola respuesta** — sección por sección, con confirmación, igual que `/spec`.
- **Nunca proponer tocar `GAMES` en `app/data/games.ts`** para el juego nuevo dentro del plan — los juegos reales viven en la tabla `games` de Supabase, esa es la convención que dejó la spec 06; si el spec propone algo distinto, debe ser una decisión explícita y justificada, no un default silencioso.
- **Nunca asumir RLS** en `games`/`scores` — la spec 06 decidió explícitamente no tener RLS; cambiar eso es fuera de alcance de este skill salvo pedido explícito del usuario, y en ese caso amerita su propio spec.
- Si el usuario pide implementar directamente en vez de generar el spec, recordarle que este skill no lo hace y sugerir `/spec-impl` una vez el spec quede aprobado.
