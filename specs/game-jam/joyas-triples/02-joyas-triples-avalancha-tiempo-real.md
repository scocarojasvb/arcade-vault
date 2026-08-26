# SPEC 13 — JOYAS TRIPLES · variante 2/2: avalancha en tiempo real con desborde del tablero

> **Estado:** Draft
> **Variante:** 2 de 2 — avalancha en tiempo real con desborde del tablero (alternativa a `01-joyas-triples-objetivos-movimientos-limitados.md`, mutuamente excluyentes)
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales)
> **Fecha:** 2026-08-26
> **Tema del jam:** JOYAS TRIPLES — match-3 por intercambio de gemas adyacentes con relleno en cascada (fila `joyas-triples` de `references/suggested-games.md`, 2026-08-20, veredicto "candidato")
> **Objetivo:** Agregar el juego real "JOYAS TRIPLES" al catálogo de Arcade Vault como un match-3 **en tiempo real** donde el tablero sube continuamente desde abajo, los intercambios son ilimitados y siempre permitidos, y la partida termina en el instante en que una gema cruza la línea de peligro superior, con dificultad dada por la velocidad creciente de la avalancha y dibujado con formas de canvas puro sin assets nuevos.
> **Promoción:** si se elige esta variante, copiar a `specs/13-joyas-triples-game.md`, cambiar Estado a Approved y quitar las líneas Variante/Promoción del header.

> **Nota sobre la numeración:** el prefijo `02` del nombre de archivo es el **índice de variante dentro de esta corrida del game jam**, no el número global de spec de `specs/`. El número global libre detectado es `13` (último spec en `specs/` plano: `12-frogger-render-performance.md`), y solo una de las dos variantes va a aterrizar ahí.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`, mismo criterio que tetris/arkanoid/snake/frogger): id `"joyas-triples"`, título "JOYAS TRIPLES", descripciones corta/larga acordadas, `cat: "PUZZLE"`, `color: "magenta"`, `cover: "cover-joyas-triples"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-joyas-triples` en `app/globals.css`, visualmente distinta de `.cover-tetro` (mock heredado "caída", el otro PUZZLE del catálogo falso), de `.cover-tetris` y del resto de `cover-*`.
- Diseño e implementación desde cero (no port: no hay carpeta en `references/started-games/` ni assets en `references/source-assets/` para este juego) de un match-3 en tiempo real como componente cliente React sobre canvas **480×600** (proporción vertical 4:5, justificada por la presión vertical del tablero — mismo precedente que el 300×600 de tetris):
  - Tablero lógico de **8 columnas × 12 filas visibles**, celdas de 48px (384×576), centrado horizontalmente con 48px de margen a cada lado.
  - **Línea de peligro** dibujada en el borde superior del tablero, con parpadeo de alerta cuando alguna columna llega a la penúltima fila.
  - Franja inferior de 24px donde se ve **asomar la fila siguiente** que está entrando (preview parcial de la avalancha).
  - Indicadores dibujados dentro del canvas: cadena/combo en curso (`×2 CADENA`, `¡COMBO 5!`) y tramo de velocidad actual.
- **Bucle núcleo en tiempo real** (esta es la firma mecánica de la variante):
  - El tablero **sube continuamente**: un desplazamiento vertical en píxeles crece por `deltaTime`; cuando acumula una celda completa, se inserta una fila nueva de gemas aleatorias por abajo y todo el contenido se corre una fila hacia arriba.
  - Un **cursor de 2 celdas horizontales** (estilo Panel de Pon) se mueve con `←`/`→`/`↑`/`↓` (y `A`/`D`/`W`/`S`); `Espacio` intercambia las dos gemas bajo el cursor. El intercambio es **instantáneo, ilimitado y siempre permitido**, incluso si no forma ningún match — no hay presupuesto de movimientos ni revert.
  - `X` fuerza la entrada inmediata de una fila (subida manual), con un pequeño bonus de puntaje: da control sobre el ritmo a cambio de riesgo.
  - Las corridas de 3 o más del mismo color se limpian **en cuanto se forman** (también las que se forman solas por la caída, sin que el jugador toque nada); las gemas superiores caen con gravedad continua y, si al aterrizar forman una corrida nueva, se encadena una **cadena** con multiplicador creciente.
  - Todo esto ocurre mientras la avalancha sigue subiendo: **nunca hay una pausa entre turnos**.
- **Condición de derrota: cualquier gema cruza la línea de peligro superior.** Una sola vida, game over inmediato (mismo criterio que snake).
- Gracia de desborde: cuando una columna toca la fila superior, la subida se **congela ~2 segundos** dando margen a limpiar; si al terminar la gracia la columna sigue tocando el techo, se pierde. La gracia no se acumula.
- Progresión de dificultad **continua, sin niveles diseñados**: la velocidad de subida arranca en ~1 fila cada 6 s y sube un 8% cada 20 segundos jugados y otro 4% cada 20 gemas limpiadas; `level` es el tramo de velocidad (entero creciente) y se reporta al HUD. No hay tabla de niveles ni objetivos.
- Puntuación: 10 puntos por gema limpiada, ×(largo del grupo − 2) por grupos de 4+, ×(eslabón de la cadena) por cadena; +50 por cada fila forzada con `X`; bonus de combo cuando se limpian 2+ grupos en la misma resolución.
- Gemas dibujadas con **formas de canvas puro** codificadas por forma además de por color (círculo, rombo, cuadrado, triángulo, hexágono, estrella), sin assets nuevos — mismo criterio que la serpiente de SPEC 09 y el tablero de SPEC 11.
- Filas nuevas generadas **sin matches inmediatos con la fila ya en juego** (evita que la avalancha se auto-limpie sola al entrar).
- El componente expone `onStateChange({ score, level })` — sin `lives` ni `lines`, mismo shape que snake — y `onGameOver(finalScore)` una única vez al desbordar.
- `preventDefault` en flechas/WASD/espacio mientras se juega, para que mover el cursor no scrollee la página.
- Registrar `"joyas-triples"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`).
- Seed/migración SQL que inserta la fila `"joyas-triples"` en `games`, ejecutada como parte de este spec (primero en el plan, para no romper la FK `scores.game_id → games.id`).

**Out of scope (para futuros specs):**

- Modo por turnos con presupuesto de movimientos y objetivos de color por nivel (es exactamente la variante 1, mutuamente excluyente).
- Controles táctiles, drag & drop con mouse o gestos de swipe (el catálogo entero es solo teclado).
- Gemas especiales / power-ups y bloques de basura enviados por cadenas (mecánica de versus).
- Modo versus a dos jugadores locales (la ruta `/juego/[id]/jugar` tiene un solo scoreboard — ver Risks).
- Sonido y música.
- Spritesheet o cualquier asset en `public/games/joyas-triples/`.
- Mostrar la cadena/combo o el tramo de velocidad en el HUD de React (`RealGameState` no tiene campos para eso — ver Risks).
- Cambios a la entrada mock existente `"caida"` en `app/data/games.ts`.
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión heredada de SPEC 06).
- Cualquier ajuste a `app/biblioteca/page.tsx`, `app/salon-de-la-fama/page.tsx`, `app/juego/[id]/page.tsx` o `app/juego/[id]/jugar/page.tsx` más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS` (ya lo hacen desde SPEC 07).

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'joyas-triples',
  'JOYAS TRIPLES',
  'La avalancha de gemas sube sin parar: alinea tres o más antes de que toque el techo.',
  'Las gemas de neón brotan desde abajo y empujan el tablero hacia la línea de peligro. Desliza el cursor, intercambia joyas adyacentes sin límite y encadena cadenas para hundir la pila antes de que te sepulte. No hay turnos ni descanso: cada segundo la avalancha sube un poco más rápido, y una sola gema que cruce el techo termina la partida.',
  'PUZZLE',
  'cover-joyas-triples',
  'magenta',
  0,
  '0'
);
```

Migración sugerida: `supabase/migrations/20260826000000_seed_joyas_triples_game.sql`, siguiendo el patrón de `20260805010000_seed_snake_game.sql`.

**Componente del juego — `app/games/joyas-triples/joyas-triples-game.tsx`, implementa `RealGameProps` (sin cambios a la interfaz de `app/games/registry.tsx`):**

- `'use client'`, canvas de resolución interna fija **480×600** escalado por CSS (proporción 4:5, distinta del 4:3 del resto; precedente de aspect ratio propio: el 300×600 de tetris en SPEC 07). Tablero de 8 columnas × 12 filas visibles, celdas de 48px.
- Encapsula dentro del componente/closure (sin variables globales de módulo ni de `window`):
  - `board: (Gem | null)[][]` — 8 columnas × 13 filas lógicas (12 visibles + 1 fila de entrada por debajo del borde), `Gem { color: GemColor; state: 'idle' | 'clearing' | 'falling'; offsetY: number; timer: number }`.
  - `riseOffset: number` — desplazamiento vertical en píxeles de la avalancha, en `[0, 48)`; al cruzar 48 se consume insertando la fila de entrada.
  - `cursor { row, col }` — ancla izquierda del par de 2 celdas.
  - `riseInterval`, `speedTier` (`level`), `gemsCleared`, `elapsed`, `chainStep`, `graceTimer`, `score`, `gameState`.
- Loop con `requestAnimationFrame` + `deltaTime`: subida de la avalancha, gravedad de las gemas, temporizadores de limpieza, gracia de desborde y rampa de velocidad son **todos continuos e independientes del framerate**. No hay máquina de turnos: el input se acepta en cualquier momento salvo sobre gemas en estado `clearing`.
- `findMatches(board)` se evalúa **cada frame** sobre las gemas en estado `idle` (corridas horizontales y verticales ≥3, unión deduplicada en un `Set`), no solo después de un intercambio: es lo que permite que la caída genere cadenas por sí sola.
- Resolución de cadena: las gemas de un grupo pasan a `clearing` con un temporizador corto; al expirar se eliminan, las de arriba pasan a `falling` con gravedad; si un aterrizaje produce un match nuevo mientras la cadena está "viva" (ventana de ~250 ms desde la última limpieza), `chainStep + 1`.
- Reporta `onStateChange({ score, level })` cuando alguno de los dos cambia — sin `lives` ni `lines`, exactamente el shape de snake, así que el HUD compartido no requiere ningún cambio (mostrará "Vidas: —").
- `onGameOver(finalScore)` se invoca **una sola vez**, cuando la gracia de desborde expira con una columna aún tocando la línea de peligro. El componente no dibuja overlay propio de "GAME OVER" (lo cubre el modal existente de `/juego/[id]/jugar`).
- `paused`: cuando el prop es `true`, el loop deja de llamar a `update(dt)` — avalancha, gravedad, temporizadores de limpieza, gracia y rampa de velocidad congelados — y se ignora el input. Sin atajo de teclado propio de pausa (criterio de asteroids/tetris/snake/frogger, no el doble control de arkanoid).
- Listeners `keydown`/`keyup` registrados solo mientras el componente está montado y limpiados en el cleanup del `useEffect`, con `preventDefault()` en flechas/WASD/espacio. El movimiento del cursor **sí** admite auto-repetición al mantener la tecla (a diferencia del salto discreto de Frogger): en tiempo real, tener que soltar la tecla para reubicar el cursor sería un impuesto injusto.

**Assets nuevos:**

- Ninguno. No se crea `public/games/joyas-triples/`: las gemas se dibujan con primitivas de canvas (`arc`, `roundRect`, paths) y las variables de color del tema (`--cyan`, `--magenta`, `--yellow`, `--green` + un tono derivado extra para llegar a 6 colores distinguibles).

## Implementation plan

1. **Seed de la fila `"joyas-triples"` en `games`** vía migración nueva (`supabase/migrations/20260826000000_seed_joyas_triples_game.sql`), con los valores exactos de Data model. Va primero para que la FK `scores.game_id → games.id` ya acepte `'joyas-triples'` antes de que exista cualquier forma de guardar un puntaje. Sistema funcional: nada visible cambia todavía.
2. **Clase `.cover-joyas-triples` en `app/globals.css`** (+ pseudo-elementos), visualmente distinta de `.cover-tetro` (mock "caída"), `.cover-tetris` y el resto de covers: sugerido un apilado de rombos/hexágonos magenta subiendo desde el borde inferior con una línea de peligro cyan arriba. Sistema funcional: `/juego/joyas-triples` (detalle) y `/biblioteca` ya muestran el juego con su portada, aunque todavía caiga al fallback de "juego real sin componente".
3. **(No aplica en esta variante)** copiar assets a `public/games/joyas-triples/` — esta propuesta no usa assets externos. El paso se mantiene numerado a propósito para que el orden coincida con el de los specs 08/09/11 y con la variante 1.
4. **Crear `app/games/joyas-triples/joyas-triples-game.tsx`**: componente `'use client'` que implementa `RealGameProps`, monta el canvas 480×600, define el tablero de 8×12 visibles con la fila de entrada, implementa el loop continuo por `deltaTime` (subida con `riseOffset`, inserción de fila, gravedad, limpieza con temporizador, cadenas y combos, rampa de velocidad por tiempo y por gemas limpiadas), el cursor de 2 celdas con intercambio ilimitado por `Espacio`, la subida forzada por `X` con su bonus, la gracia de ~2 s al tocar el techo, la derrota por desborde, y el reporte `onStateChange({ score, level })` + `onGameOver(finalScore)` una única vez. Sistema funcional: el componente compila y existe, aún sin ruta que lo monte.
5. **Registrar `"joyas-triples"`** en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`) apuntando a `JoyasTriplesGame`. Sistema funcional: `/juego/joyas-triples/jugar` ya renderiza el juego completo; biblioteca, detalle y salón de la fama lo listan automáticamente sin cambios en esas páginas.
6. **Verificación final**: `npm run build` sin errores de tipos/compilación + prueba manual de una partida completa — mover el cursor con flechas y WASD (incluida la auto-repetición al mantener) sin que la página scrollee, intercambiar gemas sin formar match y confirmar que el intercambio se aplica igual, limpiar grupos de 3/4/5, provocar una cadena de 2+ eslabones por caída (sin tocar nada) y un combo de 2 grupos simultáneos, forzar filas con `X` y ver el bonus, comprobar que la velocidad de subida aumenta con el tiempo y con las gemas limpiadas y que `level` sube, llegar a la línea de peligro y comprobar la gracia de 2 s (salvarse una vez y perder otra), pausar con el botón del HUD y confirmar que la avalancha, la gravedad y la gracia se congelan, ver el modal de fin de partida con el score real, guardar la puntuación y verla en `/salon-de-la-fama` y `/juego/joyas-triples`; confirmar que asteroids, tetris, arkanoid, snake, frogger y los mocks (incluida "caída") siguen funcionando igual, y que el canvas vertical 480×600 se ve correctamente dentro de `.crt-screen` sin deformarse.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"joyas-triples"` con `title: "JOYAS TRIPLES"`, `cat: "PUZZLE"`, `color: "magenta"`, `cover: "cover-joyas-triples"`, `best: 0`, `plays: "0"` y las descripciones corta/larga del Data model.
- [ ] `app/globals.css` incluye `.cover-joyas-triples`, visualmente distinta de `.cover-tetro` (mock "caída"), `.cover-tetris` y el resto de `cover-*`.
- [ ] `/juego/joyas-triples` (detalle) funciona igual que los demás juegos reales: info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/joyas-triples/joyas-triples-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps` y no usa variables globales.
- [ ] No se agregan archivos a `public/games/joyas-triples/`: las gemas se dibujan íntegramente con formas de canvas y son distinguibles **también por forma**, no solo por color.
- [ ] El canvas tiene resolución interna **480×600** y se muestra dentro de `.crt-screen` respetando su proporción 4:5, sin deformación ni recorte.
- [ ] En `/juego/joyas-triples/jugar` se juega el match-3 en tiempo real: la avalancha sube sola desde abajo, con la fila siguiente asomando en la franja inferior.
- [ ] El cursor de 2 celdas se mueve con flechas/WASD (con auto-repetición al mantener la tecla) y `Espacio` intercambia las dos gemas **siempre**, forme o no un match, sin límite de intercambios.
- [ ] Las teclas de flecha/WASD/espacio no producen scroll de la página mientras se juega.
- [ ] Las corridas de 3 o más se limpian en cuanto se forman, incluidas las que se forman solas por la caída sin intervención del jugador.
- [ ] Una caída que produce un match nuevo dentro de la ventana de cadena incrementa el multiplicador (`×2`, `×3`, …) y se refleja en el puntaje y en el indicador dibujado en el canvas.
- [ ] `X` fuerza la entrada inmediata de una fila y suma su bonus de puntaje.
- [ ] Las filas nuevas que entran no forman matches inmediatos con la fila que ya estaba en juego.
- [ ] La velocidad de subida aumenta con el tiempo jugado y con las gemas limpiadas, y `level` refleja el tramo de velocidad actual en el HUD.
- [ ] El HUD superior de React muestra score y nivel reales, y la sección de vidas queda en `—` (el componente no reporta `lives` ni `lines`, igual que snake).
- [ ] Al tocar una columna la línea de peligro, la subida se congela ~2 s (con alerta visual) y limpiar esa columna durante la gracia salva la partida.
- [ ] Si la gracia expira con una gema aún cruzando la línea de peligro, se dispara `onGameOver` una única vez y aparece el modal de fin de partida existente con el score real, sin overlay propio de "GAME OVER" en el canvas.
- [ ] El botón "PAUSA"/"REANUDAR" del HUD congela la avalancha, la gravedad, los temporizadores de limpieza, la gracia y la rampa de velocidad, y el input se ignora mientras está pausado.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "joyas-triples"`.
- [ ] `/salon-de-la-fama` incluye el tab de JOYAS TRIPLES con sus puntuaciones reales.
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y los juegos mock (incluida `"caida"`) siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí (por qué esta variante y no la otra):** bucle **en tiempo real con avalancha ascendente, intercambios ilimitados y derrota por desborde**. Resuelve el trade-off a favor de **rejugabilidad infinita y curva de dificultad autoescalada**: no hay 6 objetivos que memorizar ni presupuesto que administrar, cada partida es más larga o más corta según qué tan bien juega el jugador, y el puntaje es directamente comparable en el leaderboard (que es lo que la app hace con los puntajes). Encaja mejor con el resto del catálogo, donde el score de una run infinita es la unidad de comparación (asteroids, snake, tetris). El costo es doble: (a) deja de ser un puzzle "de pensar" y pasa a exigir reflejo, lo cual lo acerca a tetris en sensación aunque la mecánica sea distinta; (b) es más difícil de balancear, porque una rampa de velocidad mal elegida hace la partida trivial o imposible y no se arregla editando una tabla de datos. La variante 1 (turnos + movimientos limitados + objetivos diseñados) invierte exactamente eso. Esta variante es la apuesta "presión continua, rejugabilidad infinita"; la otra es la "puzzle mental, dificultad curada".
- **Sí:** id `"joyas-triples"` — no está en `REAL_GAME_IDS` (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`) ni entre los ids mock de `app/data/games.ts` (`bloque-buster`, `caida`, `duelo-pixel`, `gloton`, `invasores`, `ranaria`, `rocas`, `serpentina`). Es el id ya propuesto en `references/suggested-games.md`, así que no hace falta renombrar nada.
- **Sí:** `cat: "PUZZLE"`. Aunque el bucle es en tiempo real, la decisión que toma el jugador es de reconocimiento de patrones, no de puntería ni de esquive.
- **Sí:** `color: "magenta"`. Los cuatro colores del catálogo ya están tomados por juegos reales (asteroids=yellow, tetris=cyan, arkanoid=magenta, snake=green, frogger=cyan), así que la colisión es inevitable; se elige magenta porque lee como gema/amatista y porque cyan ya lo cargan dos juegos reales. Colisiona con arkanoid, no con el otro PUZZLE real (tetris, cyan), que es la comparación que el usuario va a hacer en `/biblioteca`.
- **Sí:** `cover: "cover-joyas-triples"`, clase nueva. No se reusa `.cover-tetro` (portada del mock PUZZLE "caída"); precedente explícito de SPEC 09 (`cover-snake-real` vs. `cover-snake`).
- **Sí:** canvas **480×600** en vez del 800×600 del resto. Razón concreta: la mecánica central es la distancia vertical entre la pila y el techo, y un tablero 4:3 dejaría solo ~9 filas útiles, que es demasiado poco margen para que la gracia y las cadenas tengan sentido. Precedente de aspect ratio propio ya aceptado en el catálogo: tetris con 300×600.
- **Sí:** intercambio **siempre permitido**, incluso sin match. Es lo que hace jugable el tiempo real: permite preparar la pila y reordenar antes de que suba, y elimina la penalización por explorar. Es la diferencia mecánica más visible con la variante 1.
- **Sí:** cursor de 2 celdas horizontales (estilo Panel de Pon) en vez de "seleccionar y luego elegir vecino". Con la pila moviéndose, un modelo de dos pulsaciones hace que el segundo objetivo se desplace entre pulsación y pulsación; el par fijo del cursor es inmune a eso.
- **Sí:** solo intercambios **horizontales**, derivado del cursor de 2 celdas horizontales. Simplifica el modelo mental y evita el caso ambiguo del intercambio vertical mientras las gemas están cayendo.
- **Sí:** limpieza automática de matches que se forman sin intervención del jugador (por caída o por entrada de filas). Es la base de las cadenas y el skill principal del género en tiempo real: montar la pila para que se limpie sola.
- **Sí:** gracia de ~2 s al tocar el techo. Sin ella, la derrota se siente arbitraria en el instante exacto de una inserción de fila; con ella, el jugador siempre tiene una última jugada.
- **Sí:** `X` para forzar la subida de una fila con bonus. Da agencia sobre el ritmo (acelerar cuando la pila está baja para ganar puntos) y es la única palanca ofensiva del jugador.
- **Sí:** `onStateChange({ score, level })` sin `lives` ni `lines`, mismo shape que snake. La cadena/combo y el tramo de velocidad se dibujan dentro del canvas; así este spec no toca `app/juego/[id]/jugar/page.tsx` en absoluto.
- **Sí:** 1 sola vida, game over inmediato al desbordar. Fiel al género en tiempo real y coherente con snake; con vidas, la avalancha tendría que reiniciarse y se perdería la tensión acumulada.
- **Sí:** auto-repetición del cursor al mantener la tecla (a diferencia del salto discreto sin auto-repeat de Frogger, SPEC 11). En tiempo real, obligar a soltar la tecla por cada celda de desplazamiento es un impuesto de input, no una decisión de diseño.
- **Sí:** dificultad como **rampa continua** (tiempo + gemas limpiadas) en vez de tabla de niveles. Un jugador bueno limpia más y por eso acelera más rápido: la dificultad se autoajusta al skill sin que nadie balancee 6 niveles.
- **Sí:** gemas codificadas por forma además de por color. Un match-3 solo por color es inaccesible para daltonismo y, con la pila en movimiento y la paleta neon del catálogo, incluso difícil para visión normal.
- **No:** modo por turnos con movimientos limitados y objetivos por nivel — es la variante 1, mutuamente excluyente.
- **No:** gemas especiales / power-ups ni bloques de basura. Los bloques de basura solo tienen sentido en versus; los power-ups multiplican reglas de interacción antes de tener el bucle base jugable.
- **No:** modo versus a dos jugadores locales, que es el destino natural de esta mecánica. La ruta `/juego/[id]/jugar` tiene un único scoreboard y un único `onGameOver(finalScore)`: hoy no hay forma de representar dos jugadores sin rediseñar el contrato (ver Risks).
- **No:** mouse, drag & drop, táctil o swipe. Ningún juego real del catálogo los tiene; solo teclado, mismo criterio que el resto.
- **No:** sonido — mismo criterio que asteroids/tetris/snake/frogger; arkanoid lo tiene solo porque su original ya lo traía y acá no hay original que portar.
- **No:** spritesheet ni `public/games/joyas-triples/`. Sin fuente en `references/source-assets/`, diseñar arte propio es trabajo de arte, no de implementación; las formas de canvas ya funcionaron en SPEC 09 y SPEC 11.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** cambios a la entrada mock `"caida"` de `app/data/games.ts`.

## Risks

| Riesgo                                                                                                                                                                                                                                                                 | Mitigación                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El escalado CSS del canvas dentro de `.crt-screen` puede introducir letterboxing (riesgo estructural de SPEC 05), y acá es **peor que en el resto**: la proporción 4:5 es la única vertical junto con tetris, y el contenedor está pensado para 4:3.                   | Usar `aspect-ratio` CSS y sizing tipo `object-fit` (`max-width`/`max-height` con `width: auto; height: auto`), replicando exactamente el tratamiento que ya recibe el canvas 300×600 de tetris; verificación manual explícita en el paso 6.                                                               |
| Doble montaje del `useEffect` en desarrollo (React Strict Mode) puede duplicar listeners de teclado y `requestAnimationFrame`, haciendo que la avalancha suba al doble de velocidad o que un intercambio se aplique dos veces (y se cancele solo).                     | Cancelar el `rAF` y remover `keydown`/`keyup` en el cleanup del `useEffect`, mismo patrón ya validado en asteroids/tetris/arkanoid/snake/frogger; probar recarga y navegación de ida y vuelta a `/jugar`.                                                                                                 |
| Sin RLS en `games`/`scores`, cualquiera con la publishable key puede insertar puntajes arbitrarios para `game_id: "joyas-triples"` (riesgo aceptado en SPEC 06/07/08/09/11).                                                                                           | Aceptado explícitamente; queda documentado como deuda para cuando exista auth real.                                                                                                                                                                                                                       |
| Si el seed de la fila `"joyas-triples"` no corre antes de exponer el componente jugable, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                                                                    | El plan corre el seed en el paso 1 y registra el componente en el paso 5; el paso 6 verifica manualmente que guardar un puntaje funciona.                                                                                                                                                                 |
| **`RealGameState` no puede transportar la cadena/combo en curso ni el tramo de velocidad**, que son los indicadores que el jugador necesita mirar en tiempo real.                                                                                                      | Costo aceptado: se dibujan dentro del canvas, al lado del tablero. Extender `RealGameState` tocaría `app/juego/[id]/jugar/page.tsx`, fuera de alcance, y sería su propio spec.                                                                                                                            |
| El HUD compartido mostrará **"Vidas: —"** porque el componente no reporta `lives` ni `lines`.                                                                                                                                                                          | Comportamiento heredado e idéntico al de snake; se acepta a propósito por no tocar la ruta compartida. La única vida real del juego es implícita (desbordar = fin).                                                                                                                                       |
| **Esta mecánica pide un modo versus a dos jugadores locales** (el género vive de mandar basura al rival), y la ruta `/juego/[id]/jugar` tiene un solo scoreboard, un solo canvas y un solo `onGameOver(finalScore)`: hoy no hay forma de representarlo.                | Documentado como límite conocido, no como bug: esta variante se implementa **solo en modo un jugador**. Un modo versus requeriría rediseñar `RealGameProps`/la ruta y sería un spec aparte (además del mock `"duelo-pixel"` que ya reserva la categoría VERSUS).                                          |
| Evaluar `findMatches` sobre todo el tablero **cada frame** (a diferencia de la variante 1, que lo hace solo al final de un turno) puede volverse el cuello de botella del render y disparar el mismo tipo de problema que motivó SPEC 12 (Frogger render performance). | El tablero es chico (8×13 = 104 celdas) y el barrido es lineal con bucles `for` indexados, sin `forEach` ni asignaciones por frame; el resultado se cachea y solo se recalcula cuando alguna gema cambió de estado. Si aparece degradación, el subagente `game-performance` es el camino, no un rediseño. |
| La subida por `riseOffset` en píxeles mientras hay gemas cayendo puede producir posiciones ambiguas (una gema "entre dos filas" que además sube) y colisiones mal resueltas.                                                                                           | Separación estricta: la posición **lógica** de una gema es siempre su celda; `riseOffset` y `offsetY` son solo desplazamientos de dibujo. Ninguna decisión de match o de colisión lee píxeles.                                                                                                            |
| Una cadena mal implementada (ventana de encadenamiento demasiado larga) puede encadenar limpiezas no relacionadas e inflar el puntaje de forma arbitraria, rompiendo la comparabilidad del leaderboard.                                                                | Ventana de cadena corta y explícita (~250 ms desde la última limpieza) y `chainStep` que se resetea al llegar el tablero a reposo; techo configurable del multiplicador.                                                                                                                                  |
| Insertar filas que forman matches inmediatos haría que la avalancha se limpie sola y el juego nunca pierda tensión (o al contrario, regale cadenas gratis).                                                                                                            | El generador de la fila de entrada rechaza colores que formarían una corrida ≥3 con lo ya presente, reintentando por celda.                                                                                                                                                                               |
| La rampa de velocidad continua es **más difícil de balancear que una tabla de niveles**: si sube muy rápido, la partida dura 40 s; si sube muy despacio, es infinita y el leaderboard se vuelve una prueba de paciencia.                                               | Las tres constantes de la rampa (intervalo inicial, +8% por 20 s, +4% por 20 gemas) se declaran juntas y comentadas al tope del archivo. El paso 6 exige medir al menos tres partidas y ajustarlas para que una partida "normal" quede en el rango de 2–5 minutos.                                        |
| La pausa debe congelar la avalancha, la gravedad, los temporizadores de limpieza **y la gracia de desborde** — si no, se puede perder la partida estando en pausa.                                                                                                     | El prop `paused` corta el `update(dt)` completo, incluida la gracia; verificado explícitamente en el paso 6 pausando con una columna tocando la línea de peligro.                                                                                                                                         |
| Solape de categoría/color con el catálogo existente: `/biblioteca` va a mostrar dos PUZZLE reales (tetris y este), dos magenta reales (arkanoid y este) y dos canvas verticales (tetris y este).                                                                       | Aceptado: con 4 categorías y 4 colores y 6 juegos reales, la colisión es estructural. Se mitiga con `.cover-joyas-triples` claramente distinta y títulos/descripciones inequívocos.                                                                                                                       |

## What is **not** in this spec

- Modo por turnos con presupuesto de movimientos y objetivos de color por nivel (variante 1, mutuamente excluyente).
- Controles táctiles, mouse/drag & drop o swipe.
- Gemas especiales / power-ups y bloques de basura.
- Modo versus a dos jugadores locales (requiere rediseñar `RealGameProps` y la ruta `/juego/[id]/jugar`).
- Sonido y música.
- Spritesheet o cualquier asset en `public/games/joyas-triples/`.
- Agregar campos de cadena/combo o velocidad a `RealGameState`, o mostrarlos en el HUD de React.
- Cambios a la entrada mock existente `"caida"`.
- Cambios a RLS en `games`/`scores`.
- Cualquier ajuste a las páginas de catálogo más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS`.

Cada uno de estos, si se implementa, va en su propio spec.
