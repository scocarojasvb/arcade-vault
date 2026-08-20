# SPEC 10 — FROGGER · variante 1/2: clásico por niveles con 3 vidas y temporizador

> **Estado:** Draft
> **Variante:** 1 de 2 — clásico por niveles con 3 vidas y temporizador (alternativa a `02-frogger-endless-procedural.md`, mutuamente excluyentes)
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales)
> **Fecha:** 2026-08-20
> **Tema del jam:** Frogger
> **Objetivo:** Agregar el juego real "FROGGER" al catálogo de Arcade Vault como una pantalla fija de 15 filas (5 carriles de tráfico + 5 carriles de río) donde el jugador debe llevar 5 ranas a los nenúfares antes de que se agote el temporizador, con 3 vidas y 5 niveles diseñados a mano, dibujado con formas de canvas puro y sin assets nuevos.
> **Promoción:** si se elige esta variante, copiar a `specs/10-frogger-game.md`, cambiar Estado a Approved y quitar las líneas Variante/Promoción del header.

> **Nota sobre la numeración:** el prefijo `01` del nombre de archivo es el **índice de variante dentro de esta corrida del game jam**, no el número global de spec. El número global libre detectado es `10` (último spec en `specs/` plano: `09-snake-game.md`), y solo una de las dos variantes va a aterrizar ahí.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`, mismo criterio que tetris/arkanoid/snake): id `"frogger"`, título "FROGGER", descripciones corta/larga acordadas, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-frogger"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-frogger` en `app/globals.css`, visualmente distinta de `.cover-rana` (mock heredado "ranaria", que también es un clon de Frogger) y del resto de `cover-*`.
- Diseño e implementación desde cero (no port: no hay carpeta en `references/started-games/` ni assets en `references/source-assets/` para este juego) de Frogger clásico como componente cliente React sobre canvas 800×600, grilla lógica de 20×15 celdas de 40px:
  - Fila 0: zona de meta con **5 nenúfares** en columnas fijas (2, 6, 10, 14, 18).
  - Filas 1–5: **río** — 5 carriles con troncos y tortugas que se desplazan horizontalmente (direcciones alternas por carril).
  - Fila 6: **mediana segura** (isla central, sin peligro).
  - Filas 7–11: **tráfico** — 5 carriles con vehículos de distinto largo y velocidad (direcciones alternas por carril).
  - Fila 12: **acera de salida** (posición de respawn).
  - Filas 13–14: franja inferior donde el canvas dibuja la **barra de tiempo restante** y los nenúfares ya conquistados.
- Movimiento **discreto**: cada pulsación de `←`/`→`/`↑`/`↓` (y `A`/`D`/`W`/`S`) = un salto de exactamente una celda, con `preventDefault` para no scrollear la página. Mantener la tecla presionada **no** repite el salto (requiere `keyup` para volver a saltar).
- Modelo híbrido de posición: la fila (`y`) siempre es discreta; sobre el río la `x` de la rana pasa a ser **continua** y adopta la velocidad del tronco/tortuga que pisa (arrastre), realineándose a la celda más cercana al saltar.
- 3 vidas. Se pierde una vida por: ser atropellado en un carril de tráfico, caer al agua (fila de río sin tronco/tortuga debajo), ser arrastrado por un tronco fuera del borde de la pantalla, o llegar el temporizador a 0. Al perder una vida la rana respawnea en la acera (fila 12) con el temporizador completo, **conservando** los nenúfares ya ocupados.
- Temporizador por travesía: ~30 s (por nivel, decreciente según la tabla del nivel), dibujado como barra en la franja inferior del canvas.
- Progresión por **niveles diseñados a mano**: tabla `LEVELS` con 5 entradas (velocidad por carril, densidad/gap de vehículos, largo de troncos, tiempo disponible, si las tortugas se sumergen). Ocupar los 5 nenúfares completa el nivel: `level + 1`, se vacían los nenúfares y se carga la entrada siguiente de la tabla. A partir del nivel 5 se reutiliza la entrada 5 con un multiplicador de velocidad creciente (mismo criterio de "nivel infinito" que tetris).
- Puntuación: +10 por cada fila nueva avanzada (solo la primera vez que se alcanza esa fila en la vida actual), +50 por nenúfar ocupado, + (segundos restantes × 10) al llegar a un nenúfar, +200 al completar el nivel (5 nenúfares).
- El componente expone `onStateChange({ score, level, lives })` (mismo shape que asteroids/arkanoid: usa `lives`, no `lines`) y `onGameOver(finalScore)` una única vez cuando `lives` llega a 0.
- Todo dibujado con **formas de canvas puro** (rectángulos/óvalos neon, rana como cuerpo redondeado con dos ojos), sin assets nuevos — mismo criterio que la serpiente de SPEC 09.
- Registrar `"frogger"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`).
- Seed/migración SQL que inserta la fila `"frogger"` en `games`, ejecutada como parte de este spec (primero en el plan, para no romper la FK `scores.game_id → games.id`).

**Out of scope (para futuros specs):**

- Controles táctiles/swipe o por gestos.
- Sonido y música.
- Sprites/spritesheet propio (es exactamente la apuesta de la variante 2 en el eje de assets; acá se dibuja con formas).
- Cocodrilos, serpientes en la mediana, moscas bonus y rana rescatable del original de 1981.
- Modo endless con scroll de cámara y generación procedural (es la variante 2, mutuamente excluyente).
- Mostrar el temporizador en el HUD de React (`RealGameState` no tiene campo de tiempo — ver Risks).
- Cambios a la entrada mock existente `"ranaria"` en `app/data/games.ts`.
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión heredada de SPEC 06).
- Cualquier ajuste a `app/biblioteca/page.tsx`, `app/salon-de-la-fama/page.tsx` o `app/juego/[id]/page.tsx` más allá de que listen automáticamente a Frogger por iterar sobre `REAL_GAME_IDS` (ya lo hacen desde SPEC 07).

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'frogger',
  'FROGGER',
  'Cruza la autopista y el río y lleva 5 ranas a los nenúfares.',
  'Cinco carriles de tráfico y cinco de corriente separan a tu rana de los nenúfares. Salta celda por celda esquivando vehículos, súbete a troncos y tortugas antes de que la corriente te arrastre, y ocupa los 5 nenúfares antes de que se agote el tiempo. Tres vidas, cinco niveles y cada uno más rápido que el anterior.',
  'ARCADE',
  'cover-frogger',
  'cyan',
  0,
  '0'
);
```

Migración sugerida: `supabase/migrations/20260820000000_seed_frogger_game.sql`, siguiendo el patrón de `20260805010000_seed_snake_game.sql`.

**Componente del juego — `app/games/frogger/frogger-game.tsx`, implementa `RealGameProps` (sin cambios a la interfaz de `app/games/registry.tsx`):**

- `'use client'`, canvas de resolución interna fija **800×600** escalado por CSS (mismo aspect ratio 4:3 que asteroids/arkanoid/snake), grilla lógica 20×15 de celdas de 40px.
- Encapsula dentro del componente/closure (sin variables globales de módulo ni de `window`):
  - `frog { col, x, row, ridingLane | null, alive }` — `row` discreto, `x` en píxeles (continuo cuando va sobre el río).
  - `lanes[]` — descriptor por fila: `{ kind: 'safe' | 'road' | 'river' | 'goal', dir: -1 | 1, speed, gap, entities[] }`.
  - `entities[]` por carril — vehículos (`{ x, width }`) y plataformas de río (`{ x, width, kind: 'log' | 'turtle', divingPhase? }`), recicladas por wrap-around horizontal en vez de crearse/destruirse cada frame.
  - `lilypads: boolean[5]`, `lives`, `score`, `level`, `timeLeft`, `maxRowReached`, `gameState`.
  - `LEVELS: LevelConfig[]` — 5 entradas diseñadas a mano (velocidad por carril, gap, largo de troncos, `timeLimit`, `turtlesDive`).
- Loop con `requestAnimationFrame` + `deltaTime`: el movimiento de vehículos/troncos y el temporizador son continuos y **independientes del framerate**; el salto de la rana es discreto y disparado por input.
- Detección de colisión AABB 1D por carril (solapamiento en `x` con el ancho de la rana), evaluada solo en el carril de la fila actual de la rana.
- Reporta `onStateChange({ score, level, lives })` cuando alguno de los tres cambia — el HUD de React ya muestra la rama "Vidas" sin necesidad de tocar `app/juego/[id]/jugar/page.tsx`.
- `onGameOver(finalScore)` se invoca **una sola vez**, al perder la tercera vida. El componente no dibuja overlay propio de "GAME OVER" (lo cubre el modal existente de la ruta `/juego/[id]/jugar`).
- `paused`: cuando el prop es `true`, el loop deja de llamar a `update(dt)` (vehículos, corriente y temporizador congelados) y se ignora el input de salto. Sin atajo de teclado propio de pausa (criterio de asteroids/tetris/snake, no el doble control de arkanoid).
- Listeners `keydown`/`keyup` registrados solo mientras el componente está montado y limpiados en el cleanup del `useEffect`, con `preventDefault()` en flechas/WASD/espacio.

**Assets nuevos:**

- Ninguno. No se crea `public/games/frogger/` en esta variante: todo se dibuja con primitivas de canvas y las variables de color del tema (`--cyan`, `--green`, `--magenta`, `--yellow`).

## Implementation plan

1. **Seed de la fila `"frogger"` en `games`** vía migración nueva (`supabase/migrations/20260820000000_seed_frogger_game.sql`), con los valores exactos de Data model. Va primero para que la FK `scores.game_id → games.id` ya acepte `'frogger'` antes de que exista cualquier forma de guardar un puntaje. Sistema funcional: nada visible cambia todavía.
2. **Clase `.cover-frogger` en `app/globals.css`** (+ pseudo-elementos), visualmente distinta de `.cover-rana` (mock "ranaria") y del resto de covers: sugerido carriles horizontales alternos en cyan sobre fondo oscuro con una franja de "río" y cinco puntos de nenúfar arriba. Sistema funcional: `/juego/frogger` (detalle) y `/biblioteca` ya muestran el juego con su portada, aunque todavía caiga al fallback de "juego real sin componente".
3. **(No aplica en esta variante)** copiar assets a `public/games/frogger/` — esta propuesta no usa assets externos. El paso se mantiene numerado a propósito para que el orden coincida con el de los specs 08/09 y con la variante 2.
4. **Crear `app/games/frogger/frogger-game.tsx`**: componente `'use client'` que implementa `RealGameProps`, monta el canvas 800×600, define la grilla 20×15 y la tabla `LEVELS` de 5 niveles, implementa el loop con `deltaTime` (vehículos y corriente con wrap-around, temporizador decreciente), el salto discreto por `keydown`/`keyup`, el arrastre sobre troncos/tortugas, las cuatro causas de muerte (atropello, agua, arrastre fuera de pantalla, tiempo agotado), la ocupación de nenúfares con su bonus, la transición de nivel al ocupar los 5, y el reporte `onStateChange({ score, level, lives })` + `onGameOver(finalScore)` una única vez. Sistema funcional: el componente compila y existe, aún sin ruta que lo monte.
5. **Registrar `"frogger"`** en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`) apuntando a `FroggerGame`. Sistema funcional: `/juego/frogger/jugar` ya renderiza el juego completo; biblioteca, detalle y salón de la fama lo listan automáticamente sin cambios en esas páginas.
6. **Verificación final**: `npm run build` sin errores de tipos/compilación + prueba manual de una partida completa — cruzar los 5 carriles de tráfico y los 5 de río, subirse a troncos y tortugas y comprobar el arrastre, morir por cada una de las cuatro causas, ocupar los 5 nenúfares y ver el salto al nivel 2, pausar con el botón del HUD y confirmar que vehículos/corriente/temporizador se congelan, perder las 3 vidas, ver el modal de fin de partida con el score real, guardar la puntuación y verla en `/salon-de-la-fama` y `/juego/frogger`; confirmar que asteroids, tetris, arkanoid, snake y los mocks (incluida "ranaria") siguen funcionando igual.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"frogger"` con `title: "FROGGER"`, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-frogger"`, `best: 0`, `plays: "0"` y las descripciones corta/larga del Data model.
- [ ] `app/globals.css` incluye `.cover-frogger`, visualmente distinta de `.cover-rana` (mock "ranaria") y del resto de `cover-*`.
- [ ] `/juego/frogger` (detalle) funciona igual que los demás juegos reales: info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/frogger/frogger-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps` y no usa variables globales.
- [ ] No se agregan archivos a `public/games/frogger/`: el juego se dibuja íntegramente con formas de canvas.
- [ ] En `/juego/frogger/jugar` se juega Frogger real: salto discreto de una celda por pulsación con flechas y WASD, 5 carriles de tráfico y 5 de río con direcciones alternas, arrastre sobre troncos/tortugas, y llegada a los nenúfares.
- [ ] Las teclas de flecha/WASD/espacio no producen scroll de la página mientras se juega.
- [ ] Cada una de las cuatro causas de muerte (atropello, caer al agua, ser arrastrado fuera de pantalla, temporizador en 0) resta exactamente una vida y respawnea la rana en la acera conservando los nenúfares ya ocupados.
- [ ] El HUD superior de React muestra **"Vidas"** (no "Líneas") con el valor real, además de score y nivel, actualizados en tiempo real.
- [ ] Ocupar los 5 nenúfares incrementa `level`, vacía los nenúfares y aplica la entrada siguiente de `LEVELS` (más velocidad/densidad, menos tiempo).
- [ ] El botón "PAUSA"/"REANUDAR" del HUD congela vehículos, corriente y temporizador, y el input de salto se ignora mientras está pausado.
- [ ] Al perder la tercera vida se dispara `onGameOver` una única vez y aparece el modal de fin de partida existente con el score real, sin overlay propio de "GAME OVER" en el canvas.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "frogger"`.
- [ ] `/salon-de-la-fama` incluye el tab de Frogger con sus puntuaciones reales.
- [ ] Asteroids, Tetris, Arkanoid, Snake y los juegos mock (incluida `"ranaria"`) siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí (por qué esta variante y no la otra):** pantalla fija con meta explícita (5 nenúfares), temporizador y 3 vidas. Resuelve el trade-off a favor de la **fidelidad al clásico y del costo de implementación acotado**: los carriles son datos de una tabla escrita a mano, la dificultad se ajusta editando 5 filas de configuración y no hay generación procedural que balancear ni assets que producir. La variante 2 (endless procedural, 1 vida) apuesta por rejugabilidad infinita a cambio de un generador que puede producir filas imposibles y de un spritesheet que hoy no existe en el repo. Esta variante es la elección "segura y fiel"; la otra es la "moderna y arriesgada".
- **Sí:** id `"frogger"` en vez de reutilizar el mock `"ranaria"` (que es justamente el clon temático de Frogger del catálogo heredado en `app/data/games.ts`). El mock no se toca; misma separación que `snake` vs. `serpentina` y `arkanoid` vs. `bloque-buster`. El id `"frogger"` no está en `REAL_GAME_IDS` ni entre los ids mock.
- **Sí:** `cover: "cover-frogger"`, no `cover-rana`. Precedente explícito de SPEC 09 (`cover-snake-real` vs. `cover-snake`): un juego real nunca reusa la portada de su mock homólogo.
- **Sí:** `color: "cyan"`. Los cuatro colores del catálogo ya están tomados por juegos reales (asteroids=yellow, tetris=cyan, arkanoid=magenta, snake=green), así que la colisión es inevitable; se elige cyan porque el verde ya lo cargan tres entradas (snake real + mocks "serpentina" y "ranaria") y porque el cyan lee como agua/corriente, que es la mitad superior del tablero.
- **Sí:** `cat: "ARCADE"` — mismo criterio que arkanoid/snake; no es puzzle ni shooter.
- **Sí:** canvas 800×600 con grilla 20×15 de 40px. Mantiene el aspect ratio 4:3 ya validado en asteroids/arkanoid/snake, y 15 filas alcanzan exactamente para meta + 5 río + mediana + 5 tráfico + acera + franja de tiempo.
- **Sí:** 3 vidas y `onStateChange({ score, level, lives })`, reutilizando la rama "Vidas" del HUD que ya existe desde SPEC 07 — cero cambios en `app/juego/[id]/jugar/page.tsx`.
- **Sí:** movimiento discreto sin auto-repetición al mantener la tecla. Es la firma mecánica de Frogger (timing por salto, no deslizamiento) y evita que un hold accidental mande la rana al tráfico.
- **Sí:** modelo híbrido `y` discreto / `x` continuo sobre el río. Sin `x` continua el arrastre de los troncos se siente a saltos y deja de ser el desafío del original.
- **Sí:** temporizador dibujado como barra **dentro del canvas**. `RealGameState` no tiene campo de tiempo y este spec no toca el HUD compartido.
- **Sí:** progresión por tabla `LEVELS` de 5 niveles diseñados a mano, con reutilización del nivel 5 y multiplicador creciente después. Mismo número de niveles y mismo espíritu que arkanoid, con la cola infinita de tetris.
- **No:** sonido — mismo criterio que asteroids/tetris/snake; arkanoid lo tiene solo porque su original ya lo traía y acá no hay original que portar.
- **No:** spritesheet ni `public/games/frogger/`. Sin fuente en `references/source-assets/`, diseñar arte propio es trabajo de arte, no de implementación; las formas de canvas ya funcionaron en SPEC 09.
- **No:** cocodrilos, serpientes, moscas bonus y rana rescatable del original — features de segunda iteración, no del MVP jugable.
- **No:** controles táctiles/swipe — ningún juego real del catálogo los tiene.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** cambios a la entrada mock `"ranaria"` de `app/data/games.ts`.

## Risks

| Riesgo                                                                                                                                                                                                 | Mitigación                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El escalado CSS del canvas 800×600 dentro de `.crt-screen` puede introducir letterboxing si el contenedor no respeta el aspect ratio 4:3 (riesgo estructural ya documentado en SPEC 05).               | Usar `aspect-ratio` CSS y sizing tipo `object-fit` (`max-width`/`max-height` con `width: auto; height: auto`); verificación manual en el paso 6.                                                   |
| Doble montaje del `useEffect` en desarrollo (React Strict Mode) puede duplicar listeners de teclado y `requestAnimationFrame`, haciendo que un salto cuente doble.                                     | Cancelar el `rAF` y remover `keydown`/`keyup` en el cleanup del `useEffect`, mismo patrón ya validado en asteroids/tetris/arkanoid/snake; probar recarga y navegación de ida y vuelta a `/jugar`.  |
| Sin RLS en `games`/`scores`, cualquiera con la publishable key puede insertar puntajes arbitrarios para `game_id: "frogger"` (riesgo aceptado en SPEC 06/07/08/09).                                    | Aceptado explícitamente; queda documentado como deuda para cuando exista auth real.                                                                                                                |
| Si el seed de la fila `"frogger"` no corre antes de exponer el componente jugable, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                          | El plan corre el seed en el paso 1 y registra el componente en el paso 5; el paso 6 verifica manualmente que guardar un puntaje funciona.                                                          |
| `RealGameState` no tiene campo para el **tiempo restante**, que es un indicador central de esta variante: el HUD de React no puede mostrarlo sin tocar la ruta compartida `/jugar`.                    | Coste aceptado: la barra de tiempo se dibuja dentro del canvas. Agregar `time?` a `RealGameState` queda fuera de alcance y sería su propio spec.                                                   |
| El arrastre sobre troncos con `x` continua puede desincronizar la posición lógica de columna y permitir saltos "entre celdas" o quedar pisando dos plataformas a la vez.                               | Al saltar, realinear la rana a la celda más cercana (`round(x / 40)`); resolver la plataforma pisada como la de mayor solapamiento en `x`, nunca la primera encontrada.                            |
| Un tablero mal balanceado (gaps demasiado chicos en tráfico o troncos demasiado cortos/rápidos en el río) puede hacer un nivel literalmente imposible de cruzar.                                       | Los 5 niveles son datos en `LEVELS`, no lógica: se ajustan sin refactor. En el paso 6 se exige cruzar y completar al menos los niveles 1 y 2 de punta a punta antes de dar el juego por terminado. |
| El temporizador atado al framerate (decrementar por frame en vez de por `deltaTime`) haría la partida más corta o más larga según el refresh rate del monitor.                                         | El loop usa `deltaTime` para corriente, vehículos y temporizador; nada avanza "por frame".                                                                                                         |
| La pausa desde el HUD debe congelar también el temporizador, no solo el dibujo — si no, el jugador puede perder una vida estando en pausa.                                                             | El único flag de pausa (derivado del prop `paused`) corta la llamada a `update(dt)` completa, incluido el temporizador; verificado explícitamente en el paso 6.                                    |
| Solape temático con el mock heredado `"ranaria"` (Frogger del catálogo falso) y con la sugerencia `cruce-relampago` de `references/suggested-games.md`: la biblioteca mostrará dos entradas parecidas. | Aceptado a propósito (mismo precedente que `snake`/`serpentina` y `arkanoid`/`bloque-buster`); se mitiga visualmente con `.cover-frogger` distinta y con títulos y descripciones inequívocos.      |

## What is **not** in this spec

- Controles táctiles/swipe o por gestos.
- Sonido y música.
- Spritesheet o cualquier asset en `public/games/frogger/`.
- Cocodrilos, serpientes en la mediana, moscas bonus y rana rescatable del original.
- Modo endless con scroll de cámara y generación procedural (variante 2, mutuamente excluyente).
- Agregar un campo de tiempo a `RealGameState` o mostrar el temporizador en el HUD de React.
- Cambios a la entrada mock existente `"ranaria"`.
- Cambios a RLS en `games`/`scores`.
- Cualquier ajuste a las páginas de catálogo más allá de que listen automáticamente a Frogger por iterar sobre `REAL_GAME_IDS`.

Cada uno de estos, si se implementa, va en su propio spec.
