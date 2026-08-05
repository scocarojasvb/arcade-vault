# SPEC 07 — Juego Tetris

> **Estado:** Implementado
> **Depende de:** SPEC 04 (supabase-setup), SPEC 05 (asteroids-game), SPEC 06 (leaderboard-supabase)
> **Fecha:** 2026-08-03
> **Objetivo:** Agregar un nuevo juego real "TETRIS" al catálogo de Arcade Vault, portando a TypeScript el juego de canvas vanilla JS en `references/started-games/03-tetris` como componente cliente de Next.js, generalizar el patrón hardcodeado que dejó SPEC 05 (`real-games.ts`/`registry.tsx`) para que tanto Asteroids como Tetris se resuelvan desde un registro común de juegos reales, y hacer que la app solo muestre juegos reales (ocultando el catálogo mock) del catálogo visible.

## Scope

**In:**

- Crear el registro genérico de juegos reales: `app/data/real-games.ts` (exporta `REAL_GAME_IDS: string[]`) y `app/games/registry.tsx` (exporta `REAL_GAME_COMPONENTS: Record<string, ComponentType<RealGameProps>>`), generalizando el `id === "asteroids"` hardcodeado que dejó SPEC 05.
- Definir la interfaz `RealGameProps`/`RealGameState` (ver Data model), con la "segunda métrica" generalizada (`lives?`/`lines?`) para soportar asteroids y tetris sin que el HUD necesite un `if` por juego.
- Migrar `AsteroidsGame` a implementar esa interfaz generalizada y registrarse en `REAL_GAME_COMPONENTS["asteroids"]`, sin cambiar su comportamiento de juego.
- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`): id `"tetris"`, título "TETRIS", descripciones corta/larga, `cat: "PUZZLE"`, `color: "cyan"`, `cover: "cover-tetris"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-tetris` en `app/globals.css`, siguiendo el mismo patrón visual que las demás `cover-*`.
- Port a TypeScript del juego completo de `references/started-games/03-tetris/game.js` (tablero 10×20, las 8 piezas incluyendo la pieza "N"/tuerca, rotación con wall-kicks, ghost piece, hard/soft drop, next-piece preview) dentro de un componente cliente de React (`'use client'`), sin variables globales.
- El componente monta un `<canvas>` de resolución interna fija 300×600, escalado visualmente por CSS. El mini-canvas de "next piece" se dibuja dentro del mismo componente, sin exponerlo al HUD de React.
- Controles: solo teclado — `←`/`→` mover, `↓` soft drop, `↑`/`X` rotar, `Espacio` hard drop. La tecla `P` de pausa propia del original **no** se porta; la pausa la controla exclusivamente el botón "PAUSA" del HUD de React.
- El componente expone `onStateChange({ score, level, lines })` y `onGameOver(finalScore)`, igual contrato que asteroids.
- El botón "PAUSA"/"REANUDAR" del HUD de React pausa y reanuda el loop interno del juego.
- El HUD de React generaliza la segunda métrica: "Vidas" (`♥` × N) para juegos con `lives`, "Líneas" (número) para juegos con `lines`.
- Al terminar la partida, se reutiliza el modal existente (input de iniciales + `saveScore` vía Supabase, ya generalizado por SPEC 06).
- Seed/migración SQL que inserta la fila `"tetris"` en la tabla `games`, ejecutada como parte de este spec.
- **Cambio de alcance ampliado — ocultar el catálogo mock de la UI:** `app/biblioteca/page.tsx`, `app/salon-de-la-fama/page.tsx` y `app/juego/[id]/page.tsx` dejan de iterar sobre `GAMES` (`app/data/games.ts`) para poblar lo que el usuario ve, y en su lugar iteran únicamente sobre `REAL_GAME_IDS` (resolviendo cada uno vía `fetchGame`). Con esto, solo `"asteroids"` y `"tetris"` aparecen en biblioteca, detalle y salón de la fama.
- `app/data/games.ts` y su array `GAMES` **no se eliminan del código** — quedan intactos como fuente histórica/no usada por la UI, por si se decide reactivar algún juego mock en el futuro (evita perder las descripciones/copy ya escritas).
- Cualquier ruta/página que dependa de `GAMES` para navegación (ej. filtros por categoría en biblioteca) se ajusta para operar solo sobre el subconjunto de juegos reales.

**Out of scope (para futuros specs):**

- Controles táctiles/móviles.
- Toggle de tema claro/oscuro propio del original.
- Sonido/efectos de audio.
- Eliminar físicamente `app/data/games.ts`/`GAMES` del repositorio, o las clases `.cover-*` de los mocks en `globals.css` — solo se dejan de mostrar, no se borra el código.
- Portar cualquier juego mock adicional a real (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) — quedan sin componente jugable, simplemente ya no aparecen en la UI.
- Cualquier feature nueva no presente en `game.js` de Tetris (multiplayer, hold piece, 7-bag randomizer, T-spins, etc.).
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión de SPEC 06).

## Data model

**Nueva fila en la tabla `games` de Supabase** (no en `app/data/games.ts` — los juegos reales viven solo en Supabase, convención de SPEC 06):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'tetris',
  'TETRIS',
  'Encaja piezas cayendo antes de que te desborden.',
  'Piezas geométricas de siete formas —más una tuerca metálica escondida— caen sin pausa. Rota, encaja y limpia líneas completas antes de que la pila alcance el techo. La velocidad sube cada 10 líneas.',
  'PUZZLE',
  'cover-tetris',
  'cyan',
  0,
  '0'
);
```

**Contrato generalizado de juegos reales — `app/games/registry.tsx`:**

```ts
export interface RealGameState {
  score: number;
  level: number;
  lives?: number; // juegos con sistema de vidas (ej. asteroids)
  lines?: number; // juegos con sistema de líneas (ej. tetris)
}

export interface RealGameProps {
  paused: boolean;
  onStateChange: (state: RealGameState) => void;
  onGameOver: (finalScore: number) => void;
}

export const REAL_GAME_IDS = ["asteroids", "tetris"] as const;

export const REAL_GAME_COMPONENTS: Record<string, React.ComponentType<RealGameProps>> = {
  asteroids: AsteroidsGame,
  tetris: TetrisGame,
};
```

- `RealGameState` reemplaza el `{ score, lives, level }` fijo que usaba `AsteroidsGameProps` en SPEC 05: `lives` y `lines` son mutuamente excluyentes y opcionales — cada componente reporta el campo que le corresponde según su mecánica.
- `AsteroidsGame` pasa a reportar `{ score, level, lives }` (sin cambio de comportamiento, solo de forma del tipo). `TetrisGame` reporta `{ score, level, lines }`.
- `app/juego/[id]/jugar/page.tsx` decide qué mostrar en el segundo `hud-stat`: si `state.lives !== undefined` → "Vidas" (`♥` × N); si `state.lines !== undefined` → "Líneas" (número); nunca ambos a la vez.

**Componente del juego — `app/games/tetris/tetris-game.tsx`, implementa `RealGameProps`:**

- Encapsula tablero (`10×20`, `BLOCK = 30`), las 8 piezas (7 tetrominós + pieza "N"/tuerca), `rotateCW`/wall-kicks `[0,±1,±2]`, `ghostY`, `hardDrop`/`softDrop`, `clearLines` con `LINE_SCORES = [0,100,300,500,800] × level`, y el mini-canvas de "next piece" — todo dentro del componente/closure, sin variables globales ni módulo compartido.
- `paused`: detiene el `requestAnimationFrame` loop (no acumula `dropAccum`).
- `onStateChange`: se invoca cuando cambian `score`/`lines`/`level` con `{ score, level, lines }`.
- `onGameOver`: se invoca una única vez cuando `spawn()` colisiona inmediatamente (pila desbordada); el componente deja de escuchar el teclado de juego y no dibuja su overlay propio de "GAME OVER".
- No se porta la tecla `P` (pausa propia) ni el toggle de tema — quedan fuera del componente.

**Fuente de datos para las páginas de catálogo (biblioteca, salón de la fama, detalle):** pasan a iterar sobre `REAL_GAME_IDS` (no sobre `GAMES`), resolviendo cada juego vía `fetchGame(id)`. `app/data/games.ts`/`GAMES` no cambia de forma ni se elimina — simplemente deja de ser la fuente que consumen esas tres páginas.

## Implementation plan

1. Generalizar el registro de juegos reales: crear `app/data/real-games.ts` (`REAL_GAME_IDS = ["asteroids"] as const` por ahora) y `app/games/registry.tsx` (`RealGameState`, `RealGameProps`, `REAL_GAME_COMPONENTS`). Migrar `AsteroidsGame` para que implemente `RealGameProps` (reporta `{ score, level, lives }`) y se registre en `REAL_GAME_COMPONENTS["asteroids"]`. Sistema funcional: asteroids sigue jugándose exactamente igual.
2. Modificar `app/juego/[id]/jugar/page.tsx` para resolver cualquier `id` de `REAL_GAME_IDS` vía `fetchGame(id)` + `REAL_GAME_COMPONENTS[id]`, reemplazando el `if (id === "asteroids")` actual, y generalizar el HUD ("Vidas" si `state.lives !== undefined`, "Líneas" si `state.lines !== undefined`). Sistema funcional: sin cambio visible todavía (solo asteroids está registrado).
3. Modificar `app/biblioteca/page.tsx` para iterar solo sobre `REAL_GAME_IDS` (resolviendo cada uno vía `fetchGame`) en vez de sobre `GAMES`, y ajustar los filtros por categoría para operar sobre ese subconjunto. Sistema funcional: biblioteca ahora muestra únicamente Asteroids; los 8 juegos mock dejan de aparecer.
4. Modificar `app/salon-de-la-fama/page.tsx` (tabs de juego) y `app/juego/[id]/page.tsx` (detalle) de la misma forma: generar sus tabs/rutas válidas solo a partir de `REAL_GAME_IDS`. Sistema funcional: salón de la fama y el detalle de cualquier juego mock (ej. `/juego/caida`) dejan de estar disponibles/listados; Asteroids sigue funcionando igual.
5. Agregar la fila `"tetris"` a la tabla `games` de Supabase vía seed/migración (`supabase/seed.sql` o migración nueva), con los valores acordados en Data model. Sistema funcional: no afecta nada visible aún, deja lista la FK para `scores.game_id = 'tetris'`.
6. Agregar la clase CSS `.cover-tetris` (+ pseudo-elementos) en `app/globals.css`, distinta de `.cover-tetro`.
7. Crear `app/games/tetris/tetris-game.tsx`: portar `game.js` a TypeScript implementando `RealGameProps`, monta `<canvas>` 300×600 + mini-canvas de "next piece" interno, encapsula tablero/piezas/rotación/wall-kicks/ghost/drop/clearLines sin variables globales, y agregar `"tetris"` a `REAL_GAME_IDS`/`REAL_GAME_COMPONENTS`. Sistema funcional: `/juego/tetris` y `/juego/tetris/jugar` muestran el juego real completo; biblioteca/salón de la fama ya listan Tetris junto a Asteroids.
8. Verificación final: `npm run build` sin errores de tipos/compilación, y prueba manual — confirmar que biblioteca/salón de la fama/detalle solo muestran Asteroids y Tetris (ningún juego mock aparece ni es accesible por URL directa), jugar una partida completa de Tetris (piezas, rotación con wall-kick, soft/hard drop, pieza "N", limpiar líneas, desbordar pila), confirmar HUD "Líneas" para Tetris y "Vidas" para Asteroids, guardar puntuación y verla en `/salon-de-la-fama` (tab Tetris) y `/juego/tetris`, y confirmar que Asteroids sigue funcionando igual que antes.

## Acceptance criteria

- [ ] `app/data/real-games.ts` exporta `REAL_GAME_IDS` incluyendo `"asteroids"` y `"tetris"`; `app/games/registry.tsx` exporta `RealGameState`, `RealGameProps` y `REAL_GAME_COMPONENTS` con ambos juegos registrados.
- [ ] `AsteroidsGame` implementa `RealGameProps` y sigue funcionando exactamente igual que antes tras la migración al registro genérico.
- [ ] `app/biblioteca/page.tsx`, `app/salon-de-la-fama/page.tsx` y `app/juego/[id]/page.tsx` iteran únicamente sobre `REAL_GAME_IDS` — ningún juego mock (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) aparece en biblioteca, salón de la fama ni es accesible en su página de detalle.
- [ ] `app/data/games.ts`/`GAMES` sigue existiendo sin cambios de forma en el código (no se elimina el archivo ni el array).
- [ ] La tabla `games` de Supabase contiene la fila `"tetris"` con `title`, `short`, `long`, `cat: "PUZZLE"`, `color: "cyan"`, `cover: "cover-tetris"`, `best`, `plays`.
- [ ] `app/globals.css` incluye la clase `.cover-tetris`, visualmente distinta de `.cover-tetro`, y se ve correctamente en biblioteca y en el detalle.
- [ ] `/juego/tetris` (detalle) funciona igual que `/juego/asteroids`: muestra info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/tetris/tetris-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps`, y no usa variables globales.
- [ ] Al entrar a `/juego/tetris/jugar`, se ve y se juega el Tetris real (tablero 10×20, las 8 piezas incluida la "N"/tuerca, rotación con wall-kicks, ghost piece, soft/hard drop, next-piece preview) dentro de `.crt-screen`, escalado responsivamente en 300×600 sin distorsionar el aspect ratio.
- [ ] El HUD superior de React muestra "Líneas" (no "Vidas") mientras se juega Tetris, y "Vidas" (no "Líneas") mientras se juega Asteroids, reflejando valores reales en tiempo real.
- [ ] El botón "PAUSA" congela efectivamente el juego (piezas y auto-drop dejan de moverse) y "REANUDAR" lo continúa; la tecla `P` del original no tiene efecto.
- [ ] Al desbordar la pila, aparece el modal de fin de partida existente con el score real, sin overlay propio de "GAME OVER" del canvas.
- [ ] Guardar la puntuación desde el modal inserta correctamente una fila en `scores` de Supabase con `game_id: "tetris"`.
- [ ] `/salon-de-la-fama` solo muestra tabs para Asteroids y Tetris, cada uno con sus puntuaciones reales.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** crear una entrada nueva `"tetris"` en vez de reemplazar `"caida"`. Aunque ahora `"caida"` deja de mostrarse en la UI (ver más abajo), sigue existiendo en el código; no se sobrescribe su copy/metadatos con los de Tetris.
- **Sí:** incluir la 8va pieza "N" (tuerca 3×3) en el port. Ya está implementada y probada en `game.js`; excluirla agregaría trabajo extra sin beneficio, mismo criterio que el power-up de disparo triple en SPEC 05.
- **Sí:** canvas interno fijo en 300×600 (proporciones exactas del original), escalado por CSS, en vez de uniformar a 800×600 como asteroids.
- **No:** portar el toggle de tema claro/oscuro propio del original. Arcade Vault no tiene un toggle de tema global.
- **Sí:** mapeo de teclas idéntico al original, salvo la tecla `P` de pausa propia — la pausa la controla el botón "PAUSA" del HUD de React, mismo criterio que asteroids.
- **Sí:** el next-piece preview se dibuja encapsulado dentro del propio componente de Tetris, sin exponerlo al HUD genérico de React.
- **Sí:** generalizar `real-games.ts`/`registry.tsx` ahora en vez de agregar un segundo `if` hardcodeado — es el segundo juego real, el momento correcto para dejar el patrón listo.
- **Sí:** el contrato `RealGameState` generaliza la segunda métrica como `lives?`/`lines?` opcionales y mutuamente excluyentes, en vez de forzar a Tetris a reportar una `lives` ficticia.
- **Sí:** el seed de la fila `"tetris"` en `games` se ejecuta como parte de este spec (paso 5 del plan), no como paso manual — mismo criterio de SPEC 06.
- **Sí (cambio de alcance, decidido a mitad de spec):** ocultar todos los juegos mock del catálogo visible (biblioteca, salón de la fama, detalle), haciendo que esas páginas iteren sobre `REAL_GAME_IDS` en vez de `GAMES`. El usuario decidió que la app solo debe mostrar juegos realmente jugables ahora que existe un segundo juego real (Tetris) — mantener 8 tarjetas de simulación falsa junto a 2 juegos reales dejó de tener sentido como estado del producto.
- **Sí:** ocultar sin eliminar — `app/data/games.ts`/`GAMES` y las clases `.cover-*` de los mocks permanecen en el código sin cambios de forma, solo dejan de ser consumidos por las páginas de catálogo. Evita perder el copy/diseño ya escrito por si se decide reactivar algún mock (ej. portándolo a juego real) en un spec futuro.
- **No:** eliminar físicamente el código de los juegos mock — decisión explícita del usuario de "solo ocultar", no borrar.
- **No:** sonido — el original no tiene audio, no se agrega en este port.
- **No:** controles táctiles/móviles, hold piece, 7-bag randomizer, T-spins ni ninguna feature ausente en `game.js` — fuera de alcance.

## Risks

| Riesgo                                                                                                                                                                                                                                                    | Mitigación                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al ocultar los juegos mock de `biblioteca`/`salón de la fama`/detalle, cualquier bookmark o link directo a `/juego/<id-mock>` (ej. `/juego/caida`) queda huérfano — la página de detalle ya no resuelve ese `id` porque solo itera sobre `REAL_GAME_IDS`. | Aceptado explícitamente: el usuario pidió que la app "solo muestre juegos reales"; no se define un manejo especial de 404/redirect para esas rutas en este spec — queda como comportamiento por defecto de Next.js (página no encontrada) si no se agrega lógica extra. |
| Los filtros por categoría en `biblioteca` (`ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`) pueden quedar vacíos para categorías donde ningún juego real esté registrado todavía (ej. `VERSUS` no tiene juego real hoy).                                          | Se acepta un estado vacío por filtro sin partidas reales, mismo criterio que el estado vacío de leaderboard ya aceptado en SPEC 06 — no requiere ocultar el filtro en sí.                                                                                               |
| El escalado CSS del canvas de 300×600 (aspect ratio 1:2) a un contenedor `.crt-screen` diseñado originalmente para el 4:3 de asteroids puede introducir letterboxing distinto al ya validado.                                                             | Usar `aspect-ratio` CSS y sizing tipo `object-fit` (max-width/max-height con `width: auto; height: auto`), igual estrategia que SPEC 05; verificación manual en el paso 8 del plan.                                                                                     |
| Portar el juego a un componente React con `useEffect`/`useRef` puede introducir bugs de timing (doble montaje en desarrollo, listeners de teclado duplicados), igual riesgo que ya se documentó y mitigó en SPEC 05 para asteroids.                       | Limpiar listeners y cancelar `requestAnimationFrame` en el `return` del `useEffect`; probar recarga y navegación de ida/vuelta a `/jugar` manualmente.                                                                                                                  |
| Generalizar `RealGameProps`/`RealGameState` como parte de este spec toca el componente ya existente `AsteroidsGame` (SPEC 05, implementado) — un error en la migración podría romper Asteroids, que hoy funciona.                                         | El paso 1 del plan dedica su propia verificación funcional ("asteroids sigue jugándose exactamente igual") antes de tocar ninguna página; se prueba manualmente Asteroids de nuevo en el paso 8.                                                                        |
| Sin RLS, cualquiera con la anon/publishable key puede insertar puntajes arbitrarios en `scores` para `game_id: "tetris"`, igual riesgo ya aceptado en SPEC 06 para todos los juegos.                                                                      | Aceptado explícitamente (decisión heredada de SPEC 06); queda documentado como deuda para cuando exista auth real.                                                                                                                                                      |
| Si el seed de la fila `"tetris"` no corre antes de que un usuario guarde un puntaje, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                                                           | El plan corre el seed (paso 5) antes de exponer el componente jugable (paso 7); verificación manual en el paso 8 confirma que guardar un puntaje de Tetris funciona.                                                                                                    |

## What is **not** in this spec

- Controles táctiles/móviles.
- Toggle de tema claro/oscuro propio del original.
- Sonido/efectos de audio.
- Eliminar físicamente `app/data/games.ts`/`GAMES` del repositorio, o las clases `.cover-*` de los mocks en `globals.css` — solo se dejan de mostrar, no se borra el código.
- Portar cualquier juego mock adicional a real (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`).
- Cualquier feature nueva no presente en `game.js` de Tetris (multiplayer, hold piece, 7-bag randomizer, T-spins, etc.).
- Cambios a RLS en `games`/`scores`.
- Manejo especial (404/redirect) de rutas directas a juegos mock ocultos.

Cada uno de estos, si se implementa, va en su propio spec.
