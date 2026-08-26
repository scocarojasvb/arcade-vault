# SPEC 13 — JOYAS TRIPLES · variante 1/2: objetivos por nivel con movimientos limitados

> **Estado:** Draft
> **Variante:** 1 de 2 — objetivos por nivel con movimientos limitados (alternativa a `02-joyas-triples-avalancha-tiempo-real.md`, mutuamente excluyentes)
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales)
> **Fecha:** 2026-08-26
> **Tema del jam:** JOYAS TRIPLES — match-3 por intercambio de gemas adyacentes con relleno en cascada (fila `joyas-triples` de `references/suggested-games.md`, 2026-08-20, veredicto "candidato")
> **Objetivo:** Agregar el juego real "JOYAS TRIPLES" al catálogo de Arcade Vault como un match-3 **por turnos discretos** sobre un tablero fijo de 8×8, donde cada intercambio válido gasta uno de los movimientos de un presupuesto limitado y cada nivel exige cumplir un objetivo de color diseñado a mano antes de agotarlo, dibujado con formas de canvas puro y sin assets nuevos.
> **Promoción:** si se elige esta variante, copiar a `specs/13-joyas-triples-game.md`, cambiar Estado a Approved y quitar las líneas Variante/Promoción del header.

> **Nota sobre la numeración:** el prefijo `01` del nombre de archivo es el **índice de variante dentro de esta corrida del game jam**, no el número global de spec de `specs/`. El número global libre detectado es `13` (último spec en `specs/` plano: `12-frogger-render-performance.md`), y solo una de las dos variantes va a aterrizar ahí.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`, mismo criterio que tetris/arkanoid/snake/frogger): id `"joyas-triples"`, título "JOYAS TRIPLES", descripciones corta/larga acordadas, `cat: "PUZZLE"`, `color: "magenta"`, `cover: "cover-joyas-triples"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-joyas-triples` en `app/globals.css`, visualmente distinta de `.cover-tetro` (mock heredado "caída", el otro PUZZLE del catálogo falso), de `.cover-tetris` y del resto de `cover-*`.
- Diseño e implementación desde cero (no port: no hay carpeta en `references/started-games/` ni assets en `references/source-assets/` para este juego) de un match-3 por turnos como componente cliente React sobre canvas **800×600**:
  - Tablero lógico **8×8 celdas de 64px** (512×512), dibujado en la zona izquierda del canvas.
  - Panel lateral **dibujado dentro del mismo canvas** (zona derecha, ~256px): objetivo del nivel en curso (color y contador `conseguidas / requeridas`), movimientos restantes como barra + número, y el multiplicador de cascada de la resolución en curso.
- **Bucle núcleo por turnos discretos** (esta es la firma mecánica de la variante):
  1. El jugador mueve un cursor de una celda con `←`/`→`/`↑`/`↓` (y `A`/`D`/`W`/`S`).
  2. `Espacio`/`Enter` selecciona la gema bajo el cursor; una segunda pulsación sobre una gema **ortogonalmente adyacente** ejecuta el intercambio. `Escape` cancela la selección.
  3. Si el intercambio **no** produce ninguna línea de 3 o más, las gemas vuelven a su lugar con una animación corta y **no** se gasta movimiento (regla clásica del género).
  4. Si produce match, se gasta **exactamente 1 movimiento** y arranca la resolución: limpiar los grupos, hacer caer las gemas superiores, rellenar desde arriba con gemas aleatorias, y repetir mientras sigan apareciendo matches (**cascadas encadenadas**), con multiplicador creciente por eslabón.
  5. Mientras la resolución está en curso el input queda bloqueado; el turno siguiente empieza cuando el tablero queda estable.
- Detección de matches: corridas horizontales y verticales de **3 o más** gemas del mismo color, evaluadas sobre todo el tablero en cada eslabón de la cascada (no solo alrededor del swap), para que las cascadas se resuelvan igual que las jugadas directas.
- Puntuación: 30 puntos por grupo de 3, 60 por grupo de 4, 100 por grupo de 5 o más; el total de cada eslabón se multiplica por el número de eslabón de la cascada (×1, ×2, ×3, …). Las gemas del color objetivo del nivel puntúan doble.
- Progresión por **niveles diseñados a mano**: tabla `LEVELS` con 6 entradas `{ targetColor, targetCount, moves, colorCount }` (el objetivo crece, el presupuesto de movimientos baja y la cantidad de colores distintos en juego sube de 5 a 7, que es lo que realmente endurece el tablero). Cumplir el objetivo completa el nivel: `level + 1`, tablero regenerado, objetivo y presupuesto nuevos. A partir del nivel 6 se reutiliza la entrada 6 con `targetCount × 1.2` y `moves − 2` (con piso de 12), mismo criterio de "nivel infinito" que tetris.
- **Condición de derrota: los movimientos llegan a 0 sin haber cumplido el objetivo del nivel en curso.** Una sola falla termina la partida (sin vidas).
- Anti-bloqueo: si el tablero queda sin ningún intercambio válido posible, se re-mezcla automáticamente **sin gastar movimientos** y se avisa con un flash en el panel del canvas.
- Tablero inicial (y cada re-mezcla) generado **sin matches preexistentes** y garantizando al menos un movimiento válido.
- Gemas dibujadas con **formas de canvas puro** codificadas por forma además de por color (círculo, rombo, cuadrado, triángulo, hexágono, estrella, cruz), sin assets nuevos — mismo criterio que la serpiente de SPEC 09 y el tablero de SPEC 11.
- El componente expone `onStateChange({ score, level, lines })` — reusa el campo `lines` para publicar los **movimientos restantes** (ver Risks: el HUD compartido lo rotula "Líneas") — y `onGameOver(finalScore)` una única vez al agotar los movimientos sin cumplir el objetivo.
- `preventDefault` en flechas/WASD/espacio/enter mientras se juega, para que mover el cursor no scrollee la página.
- Registrar `"joyas-triples"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`).
- Seed/migración SQL que inserta la fila `"joyas-triples"` en `games`, ejecutada como parte de este spec (primero en el plan, para no romper la FK `scores.game_id → games.id`).

**Out of scope (para futuros specs):**

- Modo en tiempo real con filas que suben y desbordan el tablero (es exactamente la variante 2, mutuamente excluyente).
- Controles táctiles, drag & drop con mouse o gestos de swipe (el catálogo entero es solo teclado).
- Gemas especiales / power-ups (bomba por grupo de 4, rayo por grupo de 5, gema de color).
- Sonido y música.
- Spritesheet o cualquier asset en `public/games/joyas-triples/`.
- Objetivos distintos al de color (bajar fichas, romper hielo, sumar puntaje mínimo).
- Mostrar el objetivo del nivel en el HUD de React (`RealGameState` no tiene un campo para eso — ver Risks).
- Cambios a la entrada mock existente `"caida"` en `app/data/games.ts`.
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión heredada de SPEC 06).
- Cualquier ajuste a `app/biblioteca/page.tsx`, `app/salon-de-la-fama/page.tsx`, `app/juego/[id]/page.tsx` o `app/juego/[id]/jugar/page.tsx` más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS` (ya lo hacen desde SPEC 07).

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'joyas-triples',
  'JOYAS TRIPLES',
  'Intercambia gemas, encadena cascadas y cumple el objetivo antes de quedarte sin movimientos.',
  'Un tablero de 8×8 gemas de neón espera tu jugada. Intercambia dos joyas adyacentes para alinear tres o más, mira cómo el relleno desata cascadas encadenadas que multiplican tu puntaje, y cumple el objetivo de color de cada nivel antes de gastar el último movimiento. Seis niveles diseñados a mano, cada uno con menos margen de error que el anterior.',
  'PUZZLE',
  'cover-joyas-triples',
  'magenta',
  0,
  '0'
);
```

Migración sugerida: `supabase/migrations/20260826000000_seed_joyas_triples_game.sql`, siguiendo el patrón de `20260805010000_seed_snake_game.sql`.

**Componente del juego — `app/games/joyas-triples/joyas-triples-game.tsx`, implementa `RealGameProps` (sin cambios a la interfaz de `app/games/registry.tsx`):**

- `'use client'`, canvas de resolución interna fija **800×600** escalado por CSS (mismo aspect ratio 4:3 que asteroids/arkanoid/snake/frogger). Tablero 8×8 de celdas de 64px a la izquierda, panel de estado dibujado a la derecha dentro del mismo canvas.
- Encapsula dentro del componente/closure (sin variables globales de módulo ni de `window`):
  - `board: (Gem | null)[][]` — 8×8, `Gem { color: GemColor; y: number; scale: number }` donde `y` es el desplazamiento vertical en píxeles usado por la animación de caída y `scale` el de la animación de limpieza.
  - `cursor { row, col }` y `selected { row, col } | null`.
  - `phase: 'idle' | 'swapping' | 'reverting' | 'clearing' | 'falling' | 'refilling' | 'shuffling' | 'over'` — máquina de estados que define el turno; el input solo se acepta en `idle`.
  - `movesLeft`, `score`, `level`, `objectiveDone`, `cascadeStep`.
  - `LEVELS: LevelConfig[]` — 6 entradas diseñadas a mano `{ targetColor, targetCount, moves, colorCount }`.
- Loop con `requestAnimationFrame` + `deltaTime`: las animaciones (swap ~120 ms, revert ~160 ms, flash de limpieza ~150 ms, caída con easing) avanzan por tiempo, **nunca por frame**. La lógica del juego es puramente por turnos: nada cambia de estado sin input o sin una cascada en curso.
- `findMatches(board)` devuelve el conjunto de celdas en corridas ≥3 (barrido por filas y por columnas, unión de conjuntos), y se reusa tanto para validar el swap como para cada eslabón de la cascada.
- `hasValidMove(board)` prueba cada intercambio ortogonal en un tablero clonado y dispara la re-mezcla cuando no hay ninguno.
- Reporta `onStateChange({ score, level, lines })` cuando alguno de los tres cambia. `lines` transporta los **movimientos restantes** (no líneas): es el único campo numérico libre de `RealGameState` y evita tocar la ruta compartida `/jugar` en este spec.
- `onGameOver(finalScore)` se invoca **una sola vez**, cuando `movesLeft` llega a 0, el tablero ya está estable y el objetivo del nivel no está cumplido. El componente no dibuja overlay propio de "GAME OVER" (lo cubre el modal existente de `/juego/[id]/jugar`).
- `paused`: cuando el prop es `true`, el loop deja de avanzar animaciones y de aceptar input; al reanudar, la fase en curso continúa donde estaba. Sin atajo de teclado propio de pausa (criterio de asteroids/tetris/snake/frogger, no el doble control de arkanoid).
- Listeners `keydown`/`keyup` registrados solo mientras el componente está montado y limpiados en el cleanup del `useEffect`, con `preventDefault()` en flechas/WASD/espacio/enter.

**Assets nuevos:**

- Ninguno. No se crea `public/games/joyas-triples/`: las gemas se dibujan con primitivas de canvas (`arc`, `roundRect`, paths) y las variables de color del tema (`--cyan`, `--magenta`, `--yellow`, `--green` + dos tonos derivados para llegar a 7 colores distinguibles).

## Implementation plan

1. **Seed de la fila `"joyas-triples"` en `games`** vía migración nueva (`supabase/migrations/20260826000000_seed_joyas_triples_game.sql`), con los valores exactos de Data model. Va primero para que la FK `scores.game_id → games.id` ya acepte `'joyas-triples'` antes de que exista cualquier forma de guardar un puntaje. Sistema funcional: nada visible cambia todavía.
2. **Clase `.cover-joyas-triples` en `app/globals.css`** (+ pseudo-elementos), visualmente distinta de `.cover-tetro` (mock "caída"), `.cover-tetris` y el resto de covers: sugerida una retícula de rombos/círculos magenta con un brillo diagonal de cascada. Sistema funcional: `/juego/joyas-triples` (detalle) y `/biblioteca` ya muestran el juego con su portada, aunque todavía caiga al fallback de "juego real sin componente".
3. **(No aplica en esta variante)** copiar assets a `public/games/joyas-triples/` — esta propuesta no usa assets externos. El paso se mantiene numerado a propósito para que el orden coincida con el de los specs 08/09/11 y con la variante 2.
4. **Crear `app/games/joyas-triples/joyas-triples-game.tsx`**: componente `'use client'` que implementa `RealGameProps`, monta el canvas 800×600, genera el tablero 8×8 sin matches preexistentes, define la tabla `LEVELS` de 6 niveles, implementa la máquina de estados del turno (cursor → selección → swap válido/inválido → limpieza → caída → relleno → cascada → `idle`) con animaciones por `deltaTime`, el gasto de exactamente 1 movimiento por swap válido, la puntuación con multiplicador de cascada y doble puntaje para el color objetivo, el avance de nivel al cumplir el objetivo, la re-mezcla anti-bloqueo sin costo, y el reporte `onStateChange({ score, level, lines })` + `onGameOver(finalScore)` una única vez. Sistema funcional: el componente compila y existe, aún sin ruta que lo monte.
5. **Registrar `"joyas-triples"`** en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`) apuntando a `JoyasTriplesGame`. Sistema funcional: `/juego/joyas-triples/jugar` ya renderiza el juego completo; biblioteca, detalle y salón de la fama lo listan automáticamente sin cambios en esas páginas.
6. **Verificación final**: `npm run build` sin errores de tipos/compilación + prueba manual de una partida completa — mover el cursor con flechas y WASD sin que la página scrollee, intentar un intercambio inválido y confirmar que las gemas vuelven y **no** se descuenta movimiento, hacer un match de 3 y uno de 4/5, provocar al menos una cascada de 2+ eslabones y ver el multiplicador, cumplir el objetivo del nivel 1 y ver el salto al nivel 2 con tablero, objetivo y movimientos nuevos, pausar con el botón del HUD y confirmar que las animaciones y el input se congelan, agotar los movimientos sin cumplir el objetivo, ver el modal de fin de partida con el score real, guardar la puntuación y verla en `/salon-de-la-fama` y `/juego/joyas-triples`; confirmar que asteroids, tetris, arkanoid, snake, frogger y los mocks (incluida "caída") siguen funcionando igual.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"joyas-triples"` con `title: "JOYAS TRIPLES"`, `cat: "PUZZLE"`, `color: "magenta"`, `cover: "cover-joyas-triples"`, `best: 0`, `plays: "0"` y las descripciones corta/larga del Data model.
- [ ] `app/globals.css` incluye `.cover-joyas-triples`, visualmente distinta de `.cover-tetro` (mock "caída"), `.cover-tetris` y el resto de `cover-*`.
- [ ] `/juego/joyas-triples` (detalle) funciona igual que los demás juegos reales: info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/joyas-triples/joyas-triples-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps` y no usa variables globales.
- [ ] No se agregan archivos a `public/games/joyas-triples/`: las gemas se dibujan íntegramente con formas de canvas y son distinguibles **también por forma**, no solo por color.
- [ ] En `/juego/joyas-triples/jugar` se juega el match-3 real: cursor con flechas/WASD, selección con espacio/enter, intercambio solo con celdas ortogonalmente adyacentes, cancelación con escape.
- [ ] Un intercambio que no genera ninguna corrida de 3+ revierte las gemas y **no** descuenta movimientos.
- [ ] Un intercambio válido descuenta **exactamente 1** movimiento, limpia los grupos, hace caer y rellenar, y resuelve las cascadas encadenadas hasta que el tablero queda estable.
- [ ] El multiplicador de cascada crece por eslabón (×1, ×2, ×3, …) y se refleja en el puntaje sumado; las gemas del color objetivo puntúan doble.
- [ ] El input está bloqueado mientras la resolución (limpieza/caída/relleno) está en curso y se rehabilita al volver a `idle`.
- [ ] El HUD superior de React muestra **"Líneas"** con los movimientos restantes (consecuencia conocida y aceptada de reusar `lines`), además de score y nivel, actualizados en tiempo real.
- [ ] Cumplir el objetivo de color del nivel incrementa `level`, regenera el tablero y carga la entrada siguiente de `LEVELS` (objetivo mayor, menos movimientos, más colores).
- [ ] El panel dibujado dentro del canvas muestra el objetivo del nivel (color + `conseguidas / requeridas`) y los movimientos restantes.
- [ ] Si el tablero queda sin ningún intercambio válido, se re-mezcla automáticamente sin descontar movimientos.
- [ ] El tablero inicial y cada re-mezcla no contienen matches preexistentes y tienen al menos un movimiento válido.
- [ ] El botón "PAUSA"/"REANUDAR" del HUD congela las animaciones y el input, y al reanudar la partida continúa en la misma fase.
- [ ] Al agotar los movimientos sin cumplir el objetivo se dispara `onGameOver` una única vez y aparece el modal de fin de partida existente con el score real, sin overlay propio de "GAME OVER" en el canvas.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "joyas-triples"`.
- [ ] `/salon-de-la-fama` incluye el tab de JOYAS TRIPLES con sus puntuaciones reales.
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y los juegos mock (incluida `"caida"`) siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí (por qué esta variante y no la otra):** bucle **por turnos discretos con presupuesto de movimientos y objetivos diseñados a mano**. Resuelve el trade-off a favor de un juego **de puzzle puro y de dificultad ajustable como dato**: no hay reloj, el jugador puede pensar cada jugada, y endurecer o suavizar la curva es editar 6 filas de `LEVELS` sin tocar lógica. Además es la lectura literal de la fila de `references/suggested-games.md` ("turnos discretos en vez de caída continua como Tetris"), y aporta al catálogo un ritmo que hoy no existe: los seis juegos reales actuales son todos de reflejo en tiempo real. El costo es la rejugabilidad: una vez memorizados los 6 objetivos, la partida se vuelve predecible, y el `level` avanza a saltos grandes en vez de con granularidad fina. La variante 2 (avalancha en tiempo real) invierte exactamente eso. Esta variante es la apuesta "puzzle mental, dificultad curada"; la otra es la "presión continua, rejugabilidad infinita".
- **Sí:** id `"joyas-triples"` — no está en `REAL_GAME_IDS` (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`) ni entre los ids mock de `app/data/games.ts` (`bloque-buster`, `caida`, `duelo-pixel`, `gloton`, `invasores`, `ranaria`, `rocas`, `serpentina`). Es el id ya propuesto en `references/suggested-games.md`, así que no hace falta renombrar nada.
- **Sí:** `cat: "PUZZLE"`. Comparte categoría con tetris (único PUZZLE real) y con el mock "caída", pero es la categoría correcta: no hay reflejo ni disparo.
- **Sí:** `color: "magenta"`. Los cuatro colores del catálogo ya están tomados por juegos reales (asteroids=yellow, tetris=cyan, arkanoid=magenta, snake=green, frogger=cyan), así que la colisión es inevitable; se elige magenta porque lee como gema/amatista y porque cyan ya lo cargan dos juegos reales. Colisiona con arkanoid, no con el otro PUZZLE real (tetris, cyan), que es la comparación que el usuario va a hacer en `/biblioteca`.
- **Sí:** `cover: "cover-joyas-triples"`, clase nueva. No se reusa `.cover-tetro` (portada del mock PUZZLE "caída"); precedente explícito de SPEC 09 (`cover-snake-real` vs. `cover-snake`).
- **Sí:** canvas 800×600 con tablero 8×8 de 64px + panel lateral dibujado dentro del canvas. Mantiene el aspect ratio 4:3 ya validado en asteroids/arkanoid/snake/frogger; el tablero cuadrado deja los ~256px sobrantes justo para el panel de objetivo/movimientos, así que no hace falta un aspect ratio nuevo (a diferencia del 300×600 de tetris).
- **Sí:** tablero 8×8 y 5→7 colores según nivel. 8×8 es el tamaño canónico del género y con 5 colores el tablero es holgado, con 7 es exigente: subir la cantidad de colores es la palanca de dificultad más limpia en un match-3 sin reloj.
- **Sí:** un intercambio inválido **no** gasta movimiento. Con presupuesto limitado, cobrar los intentos fallidos convierte el juego en castigo por explorar; la regla clásica del género es la correcta acá.
- **Sí:** cascadas con multiplicador por eslabón y doble puntaje para el color objetivo. Es lo que premia planear la jugada en vez de tomar el primer match visible, que es el único skill real de un match-3 por turnos.
- **Sí:** `onStateChange({ score, level, lines })` con `lines` = movimientos restantes. Es el único campo numérico libre de `RealGameState`; el HUD lo va a rotular "Líneas", lo cual es inexacto pero no requiere tocar la ruta compartida `/juego/[id]/jugar` (ver Risks). La alternativa (no reportar nada, como snake) dejaría el dato más importante de esta variante solo dentro del canvas.
- **Sí:** 1 sola falla termina la partida (sin vidas). Con presupuesto de movimientos por nivel, "vidas" duplicaría el mismo concepto de margen de error; mismo criterio de vida única que snake.
- **Sí:** re-mezcla automática y gratuita cuando no hay movimientos válidos. Sin esto el juego puede llegar a un estado literalmente injugable donde el jugador pierde por el generador, no por sus decisiones.
- **Sí:** gemas codificadas por forma además de por color. Un match-3 solo por color es inaccesible para daltonismo y, en la paleta neon de este catálogo, incluso difícil para visión normal.
- **No:** modo en tiempo real con filas que suben — es la variante 2, mutuamente excluyente.
- **No:** gemas especiales / power-ups (bomba, rayo, gema de color). Multiplican el estado y las reglas de interacción; primero hay que tener el match-3 base jugable.
- **No:** mouse, drag & drop, táctil o swipe. Ningún juego real del catálogo los tiene; solo teclado, mismo criterio que el resto.
- **No:** sonido — mismo criterio que asteroids/tetris/snake/frogger; arkanoid lo tiene solo porque su original ya lo traía y acá no hay original que portar.
- **No:** spritesheet ni `public/games/joyas-triples/`. Sin fuente en `references/source-assets/`, diseñar arte propio es trabajo de arte, no de implementación; las formas de canvas ya funcionaron en SPEC 09 y SPEC 11.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** cambios a la entrada mock `"caida"` de `app/data/games.ts`.

## Risks

| Riesgo                                                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El escalado CSS del canvas 800×600 dentro de `.crt-screen` puede introducir letterboxing si el contenedor no respeta el aspect ratio 4:3 (riesgo estructural ya documentado en SPEC 05).                                                       | Usar `aspect-ratio` CSS y sizing tipo `object-fit` (`max-width`/`max-height` con `width: auto; height: auto`); verificación manual en el paso 6.                                                                                                                                              |
| Doble montaje del `useEffect` en desarrollo (React Strict Mode) puede duplicar listeners de teclado y `requestAnimationFrame`, haciendo que una pulsación seleccione/intercambie dos veces o que las animaciones corran al doble de velocidad. | Cancelar el `rAF` y remover `keydown`/`keyup` en el cleanup del `useEffect`, mismo patrón ya validado en asteroids/tetris/arkanoid/snake/frogger; probar recarga y navegación de ida y vuelta a `/jugar`.                                                                                     |
| Sin RLS en `games`/`scores`, cualquiera con la publishable key puede insertar puntajes arbitrarios para `game_id: "joyas-triples"` (riesgo aceptado en SPEC 06/07/08/09/11).                                                                   | Aceptado explícitamente; queda documentado como deuda para cuando exista auth real.                                                                                                                                                                                                           |
| Si el seed de la fila `"joyas-triples"` no corre antes de exponer el componente jugable, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                                            | El plan corre el seed en el paso 1 y registra el componente en el paso 5; el paso 6 verifica manualmente que guardar un puntaje funciona.                                                                                                                                                     |
| **`RealGameState` no tiene un campo para "movimientos restantes"**: reusar `lines` hace que el HUD compartido lo rotule **"Líneas"**, que es engañoso en un match-3.                                                                           | Costo explícito y aceptado de esta variante: el número correcto se dibuja además dentro del canvas, con su etiqueta real ("MOVIMIENTOS"). Agregar `moves?` a `RealGameState` (o rotular por juego) tocaría `app/juego/[id]/jugar/page.tsx`, que está fuera de alcance y sería su propio spec. |
| `RealGameState` tampoco puede transportar el **objetivo del nivel** (color + progreso), que es el dato que decide la partida.                                                                                                                  | Se dibuja en el panel lateral dentro del canvas; misma solución que la barra de tiempo de la variante 1 de Frogger (SPEC 11).                                                                                                                                                                 |
| La máquina de estados del turno (swap → limpieza → caída → relleno → cascada) es la parte más frágil: si el input se rehabilita antes de que el tablero esté estable, el jugador puede intercambiar gemas "en el aire" y corromper el `board`. | `phase` único y explícito: el input solo se acepta en `idle`; toda transición de fase pasa por una función central. En el paso 6 se prueba pulsar espacio a repetición durante una cascada larga.                                                                                             |
| Contar el objetivo durante las cascadas puede duplicar o perder gemas si se cuenta en el sitio del dibujo en vez de en el de la limpieza (matches solapados en cruz cuentan una celda dos veces).                                              | El conjunto de celdas a limpiar es un `Set` deduplicado; el contador del objetivo y el puntaje se calculan una sola vez por eslabón, sobre ese `Set`.                                                                                                                                         |
| Rellenar desde arriba con gemas aleatorias puede generar matches automáticos infinitos (o casi) y disparar cascadas que el jugador no jugó, inflando el puntaje.                                                                               | Es comportamiento deseado del género (la cascada del relleno es parte del premio), pero se acota: el multiplicador se corta en un techo configurable y el relleno usa un sesgo que evita crear corridas de 4+ de arranque.                                                                    |
| Un nivel mal balanceado (objetivo demasiado grande para el presupuesto de movimientos, o 7 colores demasiado pronto) puede volver un nivel estadísticamente imposible.                                                                         | Los 6 niveles son datos en `LEVELS`, no lógica: se ajustan sin refactor. El paso 6 exige completar de punta a punta al menos los niveles 1 y 2.                                                                                                                                               |
| Las animaciones atadas al framerate (avanzar tweens "por frame" en vez de por `deltaTime`) harían el juego más rápido o más lento según el refresh rate del monitor.                                                                           | Todas las animaciones avanzan por `deltaTime`; nada avanza por frame. La lógica es por turnos, así que un frame perdido no puede alterar el resultado de una jugada.                                                                                                                          |
| La pausa debe congelar también las animaciones en curso, no solo el input — si no, al reanudar el tablero puede quedar en un estado intermedio inconsistente.                                                                                  | El prop `paused` corta el `update(dt)` completo; la fase y sus temporizadores se conservan y continúan al reanudar. Verificado en el paso 6 pausando en medio de una cascada.                                                                                                                 |
| Solape de categoría/color con el catálogo existente: `/biblioteca` va a mostrar dos PUZZLE reales (tetris y este) y dos magenta reales (arkanoid y este).                                                                                      | Aceptado: con 4 categorías y 4 colores y 6 juegos reales, la colisión es estructural. Se mitiga con `.cover-joyas-triples` claramente distinta y títulos/descripciones inequívocos.                                                                                                           |

## What is **not** in this spec

- Modo en tiempo real con filas que suben y desbordan el tablero (variante 2, mutuamente excluyente).
- Controles táctiles, mouse/drag & drop o swipe.
- Gemas especiales / power-ups (bomba, rayo, gema de color).
- Sonido y música.
- Spritesheet o cualquier asset en `public/games/joyas-triples/`.
- Objetivos distintos al de color (bajar fichas, romper hielo, puntaje mínimo).
- Agregar un campo `moves?` a `RealGameState` o mostrar el objetivo del nivel en el HUD de React.
- Cambios a la entrada mock existente `"caida"`.
- Cambios a RLS en `games`/`scores`.
- Cualquier ajuste a las páginas de catálogo más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS`.

Cada uno de estos, si se implementa, va en su propio spec.
