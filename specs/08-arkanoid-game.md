# SPEC 08 — Juego Arkanoid

> **Estado:** Approved
> **Depende de:** SPEC 04 (supabase-setup), SPEC 05 (asteroids-game), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales)
> **Fecha:** 2026-08-05
> **Objetivo:** Agregar un nuevo juego real "ARKANOID" al catálogo de Arcade Vault, portando fielmente a TypeScript el juego de canvas vanilla JS en `references/started-games/04-arkanoid` (5 niveles, explosiones animadas, sonido y menú de pausa con selección de nivel) como componente cliente registrado en `REAL_GAME_COMPONENTS`.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`, mismo criterio que tetris): id `"arkanoid"`, título "ARKANOID", descripciones corta/larga, `cat: "ARCADE"`, `color: "magenta"`, `cover: "cover-arkanoid"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-arkanoid` en `app/globals.css`, siguiendo el mismo patrón visual que las demás `cover-*`, visualmente distinta de `.cover-bricks` (el mock existente de "bloque-buster").
- Port fiel a TypeScript del juego completo de `references/started-games/04-arkanoid/game.js` dentro de un componente cliente de React (`'use client'`), sin variables globales: paleta controlada por mouse **y** teclado (`←`/`→`), pelota con rebotes en paredes/paleta, colisión AABB contra bloques, los 5 niveles definidos en `levels.js` (patrones de bloques y multiplicador de velocidad creciente), explosiones animadas por sprite (4 frames, `EXPLOSION_DURATION`), vidas (3 iniciales), y transición automática de nivel al destruir todos los bloques (o `gameState: 'win'` al completar el nivel 5).
- Spritesheet: portar `assets/spritesheet.js` (`loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) y el archivo `assets/spritesheet-breakout.png`, copiados a `public/` para poder cargarse desde el componente.
- Sonido: portar los dos efectos (`ball-bounce.mp3`, `break-sound.mp3`) tal cual el original, copiados a `public/`, reproducidos vía `Audio`/`cloneNode()` igual que `game.js` (a diferencia de asteroids/tetris, que no tienen audio — decisión explícita de esta spec).
- Pausa: **doble control simultáneo**, a diferencia de asteroids/tetris. El botón "PAUSA"/"REANUDAR" del HUD de React controla el mismo estado de pausa interno del componente, **y** el componente además escucha las teclas `P`/`Escape` como atajo propio (igual que el original) para alternar esa misma pausa. El componente **no** dibuja su propio overlay de pausa (ver Decisions — cambio de alcance decidido durante la implementación: `jugar/page.tsx` ya cubre todo `.crt-screen` con su overlay genérico "EN PAUSA", que captura los clicks; se descarta el overlay de selección de nivel por click en vez de tocar esa página compartida).
- El componente monta un `<canvas>` de resolución interna fija 800×600 (igual que asteroids), escalado visualmente por CSS.
- El componente expone `onStateChange({ score, level, lives })` (mismo shape que asteroids: usa `lives`, no `lines`) y `onGameOver(finalScore)` cuando `lives` llega a 0, mismo contrato `RealGameProps` que ya generalizó SPEC 07.
- Registrar `"arkanoid"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`) — el registro genérico ya existe (creado por SPEC 07), este spec solo agrega la entrada, no lo generaliza de nuevo.
- Al terminar la partida (perder las 3 vidas) o al ganar (completar nivel 5), se reutiliza el modal existente de fin de partida (input de iniciales + `saveScore` vía Supabase); completar el nivel 5 también dispara `onGameOver` con el score final, sin que el canvas dibuje su propio overlay de "GAME OVER"/"¡Completaste el juego!".
- Seed/migración SQL que inserta la fila `"arkanoid"` en la tabla `games`, ejecutada como parte de este spec (mismo criterio que SPEC 07 para tetris — evita el riesgo de FK rota en `scores`).

**Out of scope (para futuros specs):**

- Controles táctiles/móviles.
- Cualquier feature nueva no presente en `game.js` de Arkanoid (power-ups, multi-bola, ladrillos indestructibles, etc.).
- Cambios a la entrada mock existente `"bloque-buster"` (sigue siendo la simulación falsa en `app/data/games.ts`, no se toca ni se reemplaza).
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión heredada de SPEC 06).
- Cualquier ajuste a `app/biblioteca/page.tsx`/`app/salon-de-la-fama/page.tsx`/`app/juego/[id]/page.tsx` más allá de que automáticamente listen a Arkanoid por iterar sobre `REAL_GAME_IDS` (ya lo hacen desde SPEC 07 — no requieren cambios de código).

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'arkanoid',
  'ARKANOID',
  'Destruye 5 muros de bloques antes de perder tus 3 vidas.',
  'Controla una paleta con mouse o teclado y rebota una bola de energía contra 5 formaciones de bloques cada vez más veloces. Cada bloque destruido estalla en una animación de partículas y suma puntos. Pierde una vida si la bola cae al vacío; pierde las 3 y todo termina.',
  'ARCADE',
  'cover-arkanoid',
  'magenta',
  0,
  '0'
);
```

**Componente del juego — `app/games/arkanoid/arkanoid-game.tsx`, implementa `RealGameProps` (ya definido en `app/games/registry.tsx`, sin cambios a la interfaz):**

- Reporta `onStateChange({ score, level, lives })` — mismo shape que `AsteroidsGame`, usa `lives` (no `lines`), así que el HUD de React ya sabe mostrar "Vidas" sin cambios (la rama `lines !== undefined` no aplica).
- `paused`: el botón PAUSA de React y las teclas `P`/`Escape` internas controlan el **mismo** flag de pausa interno del componente — no son dos estados independientes. Cuando cualquiera de los dos lo activa, el `requestAnimationFrame` loop deja de llamar `update(dt)` y se dibuja el overlay de selección de nivel (click en 1 de 5 botones para saltar directamente a ese nivel, reiniciando bolas/paleta/bloques de ese nivel y despausando).
- `onGameOver`: se invoca una única vez, tanto al perder la última vida (`lives <= 0`) como al completar el nivel 5 (`gameState === 'win'`); en ambos casos se pasa el `score` final y el componente deja de dibujar sus overlays propios de "GAME OVER"/"¡Completaste el juego!" (los sustituye el modal de React).
- Encapsula dentro del componente/closure: `paddle`, `ball`, `blocks[]`, `explosions[]`, `lives`, `score`, `gameState`, `currentLevel`, `LEVELS` (portado de `levels.js`), y las funciones del spritesheet (`loadSpritesheet`/`drawSprite`/`drawFrame`) y de audio (`bounceSound`/`breakSound`) — nada vive en variables globales de módulo.

**Assets nuevos (estáticos, sin tabla asociada):**

- `public/games/arkanoid/spritesheet-breakout.png`
- `public/games/arkanoid/sounds/ball-bounce.mp3`
- `public/games/arkanoid/sounds/break-sound.mp3`

## Implementation plan

1. Agregar la fila `"arkanoid"` a la tabla `games` de Supabase vía seed/migración (`supabase/seed.sql` o migración nueva), con los valores acordados en Data model. Sistema funcional: no afecta nada visible aún, deja lista la FK para `scores.game_id = 'arkanoid'`.
2. Agregar la clase CSS `.cover-arkanoid` (+ pseudo-elementos) en `app/globals.css`, distinta de `.cover-bricks` (mock de "bloque-buster"). Sistema funcional: `/juego/arkanoid` (detalle) ya se ve correctamente porque `REAL_GAME_IDS` resuelve dinámicamente desde Supabase — aún sin componente jugable, cae al mismo fallback que cualquier juego real sin implementar.
3. Copiar los assets del original a `public/games/arkanoid/` (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`) desde `references/started-games/04-arkanoid/assets/`.
4. Crear `app/games/arkanoid/arkanoid-game.tsx`: portar `game.js` + `levels.js` + `assets/spritesheet.js` a TypeScript dentro de un componente `'use client'` que implementa `RealGameProps`, monta el `<canvas>` 800×600 (escalado por CSS), encapsula paleta/bola/bloques/niveles/explosiones/audio sin variables globales, escucha mouse+teclado para la paleta, y las teclas `P`/`Escape` además del prop `paused` para el mismo flag de pausa (con el overlay de selección de nivel por click). Llama `onStateChange({ score, level, lives })` y `onGameOver(finalScore)` una sola vez al perder la última vida o ganar. Sistema funcional: el componente existe y compila, aunque todavía no está enchufado a ninguna ruta.
5. Registrar `"arkanoid"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`), apuntando a `ArkanoidGame`. Sistema funcional: `/juego/arkanoid/jugar` ya renderiza el juego real completo; biblioteca/salón de la fama/detalle lo listan automáticamente (ya iteran sobre `REAL_GAME_IDS` desde SPEC 07, sin cambios adicionales en esas páginas).
6. Verificación final: `npm run build` sin errores de tipos/compilación, y prueba manual — jugar una partida completa (mover paleta con mouse y teclado, romper bloques con explosión y sonido, subir de nivel 1→5, pausar con el botón React y con `P`/`Escape`, saltar de nivel desde el overlay de pausa, perder las 3 vidas y ver el modal de fin de partida con el score real, guardar puntuación y verla en `/salon-de-la-fama` y `/juego/arkanoid`), confirmando que asteroids/tetris y los juegos mock siguen funcionando exactamente igual.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"arkanoid"` con `title`, `short`, `long`, `cat: "ARCADE"`, `color: "magenta"`, `cover: "cover-arkanoid"`, `best`, `plays`.
- [ ] `app/globals.css` incluye la clase `.cover-arkanoid`, visualmente distinta de `.cover-bricks`, y se ve correctamente en biblioteca y en el detalle.
- [ ] `/juego/arkanoid` (detalle) funciona igual que `/juego/asteroids`/`/juego/tetris`: muestra info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/arkanoid/arkanoid-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps`, y no usa variables globales.
- [ ] Los assets (`spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3`) están en `public/games/arkanoid/` y se cargan correctamente en el navegador.
- [ ] Al entrar a `/juego/arkanoid/jugar`, se ve y se juega el Arkanoid real (paleta con mouse y teclado, bola con rebotes, 5 niveles con velocidad creciente, explosiones animadas, sonido de rebote y rotura) dentro de `.crt-screen`, escalado responsivamente en 800×600 sin distorsionar el aspect ratio.
- [ ] El HUD superior de React muestra "Vidas" (no "Líneas") mientras se juega Arkanoid, reflejando valores reales (score, nivel, vidas) en tiempo real.
- [ ] Tanto el botón "PAUSA"/"REANUDAR" del HUD de React como las teclas `P`/`Escape` alternan el mismo estado de pausa (congelan/reanudan el loop); el componente no dibuja su propio overlay al pausar (se descartó el selector de nivel por click — ver Decisions).
- [ ] Al perder las 3 vidas, o al completar el nivel 5, aparece el modal de fin de partida existente con el score real, sin overlay propio de "GAME OVER"/victoria del canvas.
- [ ] Guardar la puntuación desde el modal inserta correctamente una fila en `scores` de Supabase con `game_id: "arkanoid"`.
- [ ] `/salon-de-la-fama` incluye un tab para Arkanoid con sus puntuaciones reales.
- [ ] Asteroids, Tetris y los juegos mock (`bloque-buster`, `caida`, etc.) siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** crear una entrada nueva `"arkanoid"` en vez de reemplazar `"bloque-buster"`. El usuario pidió agregar un juego nuevo; `"bloque-buster"` sigue existiendo como mock en `app/data/games.ts`, sin tocarse.
- **Sí:** `cat: "ARCADE"`, `color: "magenta"`. Magenta no está tomado por ningún juego real existente (asteroids=yellow, tetris=cyan), evitando confusión visual en biblioteca/detalle.
- **Sí:** port fiel completo del original — 5 niveles, explosiones animadas y sonido incluidos. Ya están implementados y probados en `game.js`/`levels.js`/`assets/`; excluirlos agregaría trabajo extra (quitar código) sin beneficio, mismo criterio que el power-up de asteroids y la pieza "N" de tetris.
- **Sí (desvío respecto al patrón de asteroids/tetris):** incluir sonido. A diferencia de los dos juegos reales anteriores (que no tenían audio en su original y por eso no se agregó), el original de Arkanoid sí trae efectos de sonido — se portan tal cual en vez de mantener silencio "por consistencia" artificial con los juegos previos.
- **Sí (desvío respecto al patrón de asteroids/tetris):** doble control de pausa — el botón PAUSA del HUD de React y las teclas `P`/`Escape` internas controlan el mismo estado. A diferencia de asteroids/tetris (donde se descartó la tecla de pausa propia del original), aquí el usuario pidió explícitamente mantener ambas.
- **No (cambio de alcance, decidido durante `/spec-impl`):** el overlay propio de selección de nivel por click, que esta spec originalmente planeaba mantener, se descarta. Al implementar el paso 4 se detectó que `app/juego/[id]/jugar/page.tsx` ya cubre todo `.crt-screen` con su propio overlay genérico "EN PAUSA" (`.crt-content`, sin `pointer-events: none`) cada vez que `paused === true`, para cualquier juego — ese overlay taparía visualmente el overlay de niveles del canvas y capturaría los clicks antes de que llegaran a los 5 botones. Se presentaron tres opciones (tocar `jugar/page.tsx` para ocultar/hacer transparente su overlay solo para Arkanoid, o descartar el selector de nivel); el usuario eligió no tocar el archivo compartido y descartar el selector de nivel clicable. El componente igual porta el resto del port fiel (niveles automáticos 1→5, explosiones, sonido, doble control de pausa sin overlay propio).
- **Sí:** canvas interno fijo en 800×600 (igual que asteroids), escalado por CSS — mantiene el patrón ya validado en SPEC 05 en vez de introducir un tercer aspect ratio.
- **Sí:** `onStateChange` reporta `lives` (no `lines`), reutilizando la rama de HUD "Vidas" ya generalizada por SPEC 07 sin tocar `app/juego/[id]/jugar/page.tsx`.
- **Sí:** el seed de la fila `"arkanoid"` en `games` se ejecuta como parte de este spec (paso 1 del plan), no como paso manual — mismo criterio que SPEC 07 para tetris.
- **No:** controles táctiles/móviles — fuera de alcance, el original tampoco los tiene.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** features nuevas ausentes en el original (power-ups, multi-bola, ladrillos indestructibles, etc.).

## Risks

| Riesgo                                                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El escalado CSS del canvas de 800×600 a `.crt-screen` puede introducir letterboxing si el contenedor no respeta el aspect ratio 4:3, mismo riesgo ya documentado en SPEC 05.                                                                   | Usar `aspect-ratio` CSS y sizing tipo `object-fit` (max-width/max-height con `width: auto; height: auto`); verificación manual en el paso 6 del plan.                                                                                            |
| Reproducir `Audio`/`cloneNode()` en cada rebote/rotura dentro de un componente React con `useEffect` puede disparar múltiples instancias de audio superpuestas o fallar si el navegador bloquea autoplay antes de una interacción del usuario. | Instanciar los objetos `Audio` una sola vez (`useRef`) y solo reproducir tras el primer input del jugador (mover paleta/click), igual estrategia de inicialización perezosa; probar manualmente que no haya eco de sonido ni errores de consola. |
| Tener dos mecanismos simultáneos de pausa (botón React + teclas `P`/`Escape` internas) puede desincronizarse si cada uno mantiene su propio estado en vez de compartir la misma fuente de verdad.                                              | El componente expone un único flag de pausa interno controlado tanto por el prop `paused` como por el listener de teclado — ambos escriben/leen el mismo estado, nunca dos banderas independientes.                                              |
| Portar el juego a un componente React con `useEffect`/`useRef` puede introducir bugs de timing (doble montaje en desarrollo, listeners de teclado/mouse duplicados), igual riesgo ya mitigado en SPEC 05/07.                                   | Limpiar todos los listeners (`keydown`, `keyup`, `mousemove`, `click`) y cancelar `requestAnimationFrame` en el `return` del `useEffect`; probar recarga y navegación de ida/vuelta a `/jugar`.                                                  |
| Sin RLS, cualquiera con la anon/publishable key puede insertar puntajes arbitrarios en `scores` para `game_id: "arkanoid"`, mismo riesgo ya aceptado en SPEC 06/07.                                                                            | Aceptado explícitamente (decisión heredada); queda documentado como deuda para cuando exista auth real.                                                                                                                                          |
| Si el seed de la fila `"arkanoid"` no corre antes de que un usuario guarde un puntaje, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                                              | El plan corre el seed (paso 1) antes de exponer el componente jugable (paso 5); verificación manual en el paso 6 confirma que guardar un puntaje funciona.                                                                                       |

## What is **not** in this spec

- Controles táctiles/móviles.
- Cualquier feature nueva no presente en `game.js` de Arkanoid (power-ups, multi-bola, ladrillos indestructibles, etc.).
- Cambios a la entrada mock existente `"bloque-buster"`.
- Cambios a RLS en `games`/`scores`.
- Cualquier ajuste a las páginas de catálogo más allá de que listen automáticamente a Arkanoid por iterar sobre `REAL_GAME_IDS`.

Cada uno de estos, si se implementa, va en su propio spec.
