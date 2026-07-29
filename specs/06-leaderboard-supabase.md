# SPEC 06 — Leaderboard real con Supabase

> **Estado:** Approved
> **Depende de:** SPEC 04 (supabase-setup), SPEC 05 (asteroids-game)
> **Fecha:** 2026-07-29
> **Objetivo:** Reemplazar el leaderboard falso (`seededScores`) de Salón de la Fama y del detalle de cada juego por datos reales persistidos en dos tablas nuevas de Supabase (`games` y `scores`), guardando cada puntuación real ahí en vez de en `localStorage`.

## Scope

**In:**

- Crear la tabla `games` en Supabase (Postgres), espejo completo de la interfaz `Game` de `app/data/games.ts` (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`), como tabla padre para la foreign key de `scores`.
- Crear la tabla `scores` en Supabase: cada fila es una puntuación real guardada al terminar una partida, con foreign key a `games.id`.
- Migración/seed SQL que puebla la tabla `games` con **todas** las entradas actuales de `GAMES` (`app/data/games.ts`), corrida una sola vez — necesario para que existan como padres válidos de la FK de `scores` (incluidos los juegos mock, que hoy también permiten guardar un puntaje), aunque solo Asteroids se lea de vuelta desde ahí.
- Sin políticas RLS en ninguna de las dos tablas: lectura y escritura públicas vía la anon/publishable key, igual que el flujo actual sin login.
- Modificar `saveScore` en `app/auth-context.tsx` para que haga un `INSERT` en la tabla `scores` de Supabase, en vez de escribir en `localStorage`. Aplica a todos los juegos (cualquier partida real que termine, incluida Asteroids), ya que `saveScore` es el mismo flujo genérico para todos.
- Eliminar por completo la lógica de lectura/escritura de `av_scores` en `localStorage` (`AuthProvider` deja de cargar/persistir ese key).
- `app/salon-de-la-fama/page.tsx`: cada tab de juego consulta (`SELECT`) las 12 puntuaciones más altas reales de `scores` para ese `game_id`, reemplazando `seededScores`, para **todos** los juegos (la tabla de leaderboard es la misma estructura sin importar si el juego en sí es real o mock). Si un juego no tiene puntuaciones reales todavía, se muestra un estado vacío ("sin puntuaciones aún").
- `app/juego/[id]/page.tsx` (detalle de juego): la tabla de leaderboard consulta igualmente las 12 puntuaciones más altas reales de `scores` para **todos** los juegos, mismo reemplazo de `seededScores` y mismo estado vacío.
- **Solo para `id === "asteroids"`**: `app/juego/[id]/page.tsx` (y `app/juego/[id]/jugar/page.tsx`, si allí también se lee `Game`) obtiene los datos del juego (`title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`) desde un `SELECT` a la tabla `games` de Supabase en vez de buscarlo en el array estático `GAMES`.
- `app/biblioteca/page.tsx`: la tarjeta de Asteroids en la grilla también obtiene sus datos desde la tabla `games` de Supabase; el resto de las tarjetas siguen viniendo del array estático `GAMES`.

**Out of scope (para futuros specs):**

- Autenticación real / login — el nombre del jugador sigue siendo el nickname escrito en el modal de fin de partida, sin `user_id` real.
- Políticas RLS o cualquier control de acceso a `games`/`scores` — se deja explícitamente abierto por ahora.
- Migrar los demás juegos (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) a leer desde la tabla `games` — no son funcionales todavía (simulación falsa), siguen 100% en `app/data/games.ts`.
- Recalcular los campos `best`/`plays` de Asteroids en la tabla `games` a partir de los datos reales de `scores` — quedan como valores estáticos seedeados, sin sincronización automática en este spec.
- Migrar puntuaciones históricas que ya estén guardadas en `av_scores` de `localStorage` hacia Supabase — se elimina ese storage sin migrar su contenido.
- Panel de administración para crear/editar/eliminar juegos.
- Paginación o "ver más" más allá del top 12 por juego.

## Data model

**Tabla `games` (Supabase/Postgres):**

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best integer not null default 0,
  plays text not null default '0'
);
```

- `id` usa los mismos strings que hoy en `app/data/games.ts` (`"asteroids"`, `"bloque-buster"`, etc.), para que el seed sea un mapeo directo del array `GAMES`.
- El seed inicial inserta las 9 filas actuales de `GAMES`, aunque solo se vuelva a leer la fila `"asteroids"` desde el código de la app.

**Tabla `scores` (Supabase/Postgres):**

```sql
create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  user_id uuid null,
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
```

- `game_id` referencia `games.id` — por eso `games` debe existir y estar seedeada con todos los juegos antes de poder insertar puntuaciones de cualquiera de ellos.
- `user_id` queda preparado para el futuro login real: `nullable`, sin foreign key todavía (no existe tabla de usuarios), y este spec nunca lo escribe (siempre se inserta `null`).
- `name` es el nickname/iniciales que hoy ya se captura en el modal de fin de partida (sin cambios en esa UI).
- No hay política RLS: cualquiera con la anon/publishable key puede hacer `INSERT`/`SELECT`.

**Tipos TypeScript nuevos, en `app/data/scores.ts` (reemplazando `seededScores`):**

```ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // derivado de created_at, formateado dd/mm/aaaa
}

export async function fetchTopScores(gameId: string, limit = 12): Promise<ScoreRow[]>;
```

- `fetchTopScores` hace `SELECT name, score, created_at FROM scores WHERE game_id = :gameId ORDER BY score DESC LIMIT :limit` vía el cliente browser de Supabase (`app/lib/supabase/client.ts`, ya creado en SPEC 04), y arma `rank` en el cliente según la posición (`index + 1`).
- La interfaz `ScoreRow` no cambia de forma respecto a la actual (mismo shape que usa hoy `seededScores`), así que `app/salon-de-la-fama/page.tsx` y `app/juego/[id]/page.tsx` cambian la fuente de datos pero no la forma en que renderizan la tabla/podio.

**Cambios a `AuthContextValue` (`app/auth-context.tsx`):**

```ts
export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
// saveScore ya no escribe en localStorage: hace INSERT en Supabase.scores (user_id: null)
// AuthProvider deja de cargar `scores` desde av_scores en el mount.
```

## Implementation plan

1. Crear el archivo de migración SQL (ej. `supabase/migrations/0001_games_and_scores.sql`) con las sentencias `create table games` y `create table scores` (incluyendo `user_id` nullable sin FK) definidas en la sección anterior. Sistema funcional: no afecta nada de la app todavía, solo agrega las tablas vacías.
2. Agregar un script/seed (ej. `supabase/seed.sql` con sentencias `insert into games (...) values (...)` para las 9 entradas actuales de `GAMES`) y ejecutarlo contra el proyecto de Supabase. Sistema funcional: la tabla `games` queda poblada, la app sigue sin leerla.
3. En `app/data/scores.ts`, reemplazar `seededScores` por `fetchTopScores(gameId, limit = 12)`, que hace el `SELECT` a `scores` vía `createClient()` de `app/lib/supabase/client.ts` y arma `rank`/`date` en el cliente. Eliminar `seededScores` y su import de `PLAYERS` (ya no se usa data falsa). Sistema funcional: la función existe y compila, pero nada la llama aún.
4. Modificar `saveScore` en `app/auth-context.tsx` para hacer `INSERT` en `scores` (con `user_id: null`) usando el cliente de Supabase, y eliminar la lectura/escritura de `av_scores` en `localStorage` (el `useState` de `scores` deja de inicializarse desde `localStorage`). Sistema funcional: terminar una partida ahora persiste en Supabase en vez de `localStorage`; el leaderboard aún muestra la versión anterior hasta el próximo paso.
5. Actualizar `app/salon-de-la-fama/page.tsx`: cada tab llama `fetchTopScores(tab.id)` en vez de `seededScores(...)`, mostrando el podio y la tabla con los resultados reales, y un estado vacío ("sin puntuaciones aún") cuando el array vuelve vacío. Sistema funcional: Salón de la Fama ya refleja datos reales.
6. Actualizar `app/juego/[id]/page.tsx`: la tabla de leaderboard del detalle llama `fetchTopScores(id)` en vez de `seededScores(...)`, mismo estado vacío. Sistema funcional: el detalle de cada juego también refleja datos reales.
7. Agregar `fetchGame(id)` en `app/data/games.ts` (o un archivo nuevo `app/data/games-remote.ts`), que hace `SELECT * FROM games WHERE id = :id` vía Supabase. En `app/biblioteca/page.tsx` y `app/juego/[id]/page.tsx`, cuando `id === "asteroids"`, usar el resultado de `fetchGame("asteroids")` en vez de buscar en el array estático `GAMES`; el resto de los juegos sigue resolviéndose contra `GAMES` sin cambios. Sistema funcional: Asteroids muestra su info (título, descripción, cover, best, plays) desde Supabase; los demás juegos no cambian.
8. Verificación final: `npm run build` sin errores de tipos/compilación, y prueba manual — jugar una partida de Asteroids y guardar el puntaje, confirmar que aparece en `/salon-de-la-fama` (tab Asteroids) y en `/juego/asteroids` con el nombre/score correctos, confirmar que un juego sin puntuaciones reales muestra el estado vacío, y confirmar que la tarjeta/detalle de Asteroids sigue viéndose igual (ahora con datos de Supabase) mientras el resto de juegos se ve igual que antes (datos de `games.ts`).

## Acceptance criteria

- [ ] Existen las tablas `games` y `scores` en Supabase con las columnas definidas (incluyendo `scores.user_id` nullable sin FK).
- [ ] La tabla `games` contiene las 9 filas correspondientes a las entradas actuales de `GAMES` (`app/data/games.ts`).
- [ ] Terminar una partida de cualquier juego y guardar el puntaje (modal de iniciales) inserta una fila en `scores` de Supabase con `game_id`, `name`, `score` correctos y `user_id = null`.
- [ ] `localStorage` ya no contiene ni se usa la key `av_scores` en ningún punto del código (`AuthProvider` no la lee ni la escribe).
- [ ] `/salon-de-la-fama` muestra, para cada tab de juego, el podio y la tabla con las puntuaciones reales guardadas en Supabase (no `seededScores`), ordenadas de mayor a menor, hasta 12 filas.
- [ ] Un juego sin puntuaciones reales guardadas muestra un estado vacío ("sin puntuaciones aún") en `/salon-de-la-fama`, sin datos falsos.
- [ ] `/juego/[id]` (detalle), para cualquier juego, muestra la tabla de leaderboard con puntuaciones reales de Supabase (no `seededScores`), mismo comportamiento de estado vacío.
- [ ] `/juego/asteroids` y la tarjeta de Asteroids en `/biblioteca` muestran su información (`title`, `short`, `long`, `cat`, `cover`, `color`, `best`, `plays`) obtenida de la tabla `games` de Supabase, no del array estático `GAMES`.
- [ ] El resto de los juegos (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) siguen mostrando su información exactamente igual que antes, leída del array estático `GAMES` sin cambios.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** un solo spec combinado para leaderboard real + tabla `games`, en vez de dos specs separados. El usuario prefirió verlo como una sola entrega, ya que ambas tablas están ligadas por la FK `scores.game_id → games.id`.
- **Sí:** el leaderboard pasa a usar datos 100% reales (`scores` en Supabase), sin mezclar con `seededScores`. Un juego sin partidas reales muestra un estado vacío en vez de rellenar con datos falsos, para no confundir "puntaje real" con "puntaje inventado".
- **Sí:** cubrir ambas páginas de leaderboard (`/salon-de-la-fama` y `/juego/[id]`) en el mismo spec, ya que comparten la misma función `fetchTopScores` y el mismo cambio de fuente de datos.
- **Sí:** los puntajes reales viven en una tabla `scores` de Supabase (no en `localStorage`). Un leaderboard compartido entre jugadores/dispositivos reales requiere persistencia en el backend, no por-navegador.
- **Sí:** eliminar `av_scores` de `localStorage` por completo en vez de mantenerlo como respaldo. Evita tener dos fuentes de verdad desincronizadas entre `localStorage` y Supabase.
- **Sí:** `scores.user_id` existe desde ya como columna `uuid` nullable, sin FK todavía. Prepara el esquema para cuando exista login real, sin tener que migrar la tabla después; en este spec siempre se inserta `null`.
- **No:** RLS en `games` ni en `scores`. El usuario pidió explícitamente no implementar nada de RLS por ahora — cualquiera con la anon/publishable key puede leer y escribir, igual que el comportamiento actual sin login.
- **Sí:** la tabla `games` es un espejo completo de la interfaz `Game` (todos los campos), aunque hoy solo se vuelva a leer la fila de Asteroids desde el código de la app. Deja la tabla lista para una migración total futura sin tener que alterar su esquema.
- **Sí:** se seedean las **9** filas de `GAMES` en la tabla `games` (no solo Asteroids), porque `scores.game_id` tiene FK a `games.id` y los juegos mock también permiten guardar un puntaje hoy (modal de iniciales genérico); sin esas filas, guardar un puntaje en un juego mock rompería por violación de FK.
- **Sí:** solo Asteroids se **lee** de vuelta desde la tabla `games` (biblioteca y detalle). Es el único juego realmente funcional (SPEC 05); el resto sigue resolviéndose contra el array estático `GAMES` sin cambios, ya que migrarlos no aporta nada mientras sigan siendo simulación falsa.
- **No:** panel de administración (CRUD) para gestionar juegos. Solo lectura vía seed/migración, sin UI de creación/edición en este spec.
- **Sí:** top 12 por juego en ambos leaderboards, igual que el límite que ya usaba `seededScores(seed, 12)` — mantiene el diseño visual actual (podio + tabla) sin cambios de layout.
- **No:** migrar puntuaciones históricas de `av_scores` hacia Supabase. Se elimina ese storage sin intentar trasladar su contenido, ya que eran datos de prueba/simulación acumulados durante el desarrollo.

## Risks

| Riesgo                                                                                                                                                                                                                                                          | Mitigación                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin RLS, cualquiera con la anon/publishable key puede insertar puntajes arbitrarios o hacer spam a la tabla `scores` (falsear leaderboards).                                                                                                                    | Aceptado explícitamente por el usuario para este spec — es el mismo nivel de confianza que el flujo actual sin login; queda documentado como deuda para cuando exista auth real.                              |
| Si el seed de `games` no corre antes de que un usuario guarde un puntaje, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                                                                            | El plan de implementación corre el seed (paso 2) antes de tocar `saveScore` (paso 4); verificación manual en el paso 8 confirma que guardar un puntaje funciona para Asteroids y para al menos un juego mock. |
| Eliminar `av_scores` sin migrar su contenido implica que cualquier puntaje guardado previamente en el navegador de un usuario (antes de este spec) desaparece de forma silenciosa.                                                                              | Aceptado porque son datos de prueba de simulaciones falsas generados durante el desarrollo, sin valor de producción; no hay usuarios reales todavía.                                                          |
| `fetchTopScores` y `fetchGame("asteroids")` dependen de que el cliente de Supabase (`app/lib/supabase/client.ts`) esté correctamente configurado (SPEC 04); si las env vars faltan en producción, el leaderboard y la página de Asteroids fallarían en runtime. | Cubierto por el criterio de aceptación de build + prueba manual; ya documentado como riesgo aceptado en SPEC 04 (`.env` sin valores reales en el repo).                                                       |
| Mostrar el estado vacío ("sin puntuaciones aún") en juegos mock que nunca reciban partidas reales podría verse extraño junto a juegos con leaderboards activos.                                                                                                 | Aceptado como comportamiento esperado — es más honesto que mostrar datos falsos; no requiere mitigación adicional.                                                                                            |

## What is **not** in this spec

- Autenticación real / login (`user_id` se agrega como columna preparada, pero siempre se inserta `null`).
- Políticas RLS en `games` o `scores`.
- Migrar `biblioteca`/detalle de los 8 juegos mock a la tabla `games` — siguen en `app/data/games.ts`.
- Recalcular `best`/`plays` de Asteroids en la tabla `games` a partir de los datos reales de `scores`.
- Migración de puntuaciones históricas de `av_scores` (`localStorage`) hacia Supabase.
- Panel de administración para crear/editar/eliminar juegos.
- Paginación o "ver más" más allá del top 12 por juego.

Cada uno de estos, si se implementa, va en su propio spec.
