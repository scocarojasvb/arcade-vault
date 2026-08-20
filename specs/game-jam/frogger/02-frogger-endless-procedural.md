# SPEC 10 — FROGGER · variante 2/2: endless procedural de una vida con cámara que sube

> **Estado:** Draft
> **Variante:** 2 de 2 — endless procedural de una vida con cámara que sube (alternativa a `01-frogger-clasico-niveles-vidas.md`, mutuamente excluyentes)
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales)
> **Fecha:** 2026-08-20
> **Tema del jam:** Frogger
> **Objetivo:** Agregar el juego real "FROGGER" al catálogo de Arcade Vault como un cruce infinito en formato vertical: la cámara sube sin parar, las filas de tráfico y río se generan proceduralmente con densidad creciente, y una sola colisión (o quedarse atrás de la cámara) termina la partida — el score es la distancia recorrida.
> **Promoción:** si se elige esta variante, copiar a `specs/10-frogger-game.md`, cambiar Estado a Approved y quitar las líneas Variante/Promoción del header.

> **Nota sobre la numeración:** el prefijo `02` del nombre de archivo es el **índice de variante dentro de esta corrida del game jam**, no el número global de spec. El número global libre detectado es `10` (último spec en `specs/` plano: `09-snake-game.md`), y solo una de las dos variantes va a aterrizar ahí.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`, mismo criterio que tetris/arkanoid/snake): id `"frogger"`, título "FROGGER", descripciones corta/larga acordadas, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-frogger"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-frogger` en `app/globals.css`, visualmente distinta de `.cover-rana` (mock heredado "ranaria", también clon de Frogger) y del resto de `cover-*`.
- Diseño e implementación desde cero (no port: no hay carpeta en `references/started-games/` ni assets propios en `references/source-assets/` para este juego) de un Frogger **endless** como componente cliente React:
  - Canvas de resolución interna fija **600×800** (formato vertical 3:4), grilla lógica de 15 columnas × 20 filas visibles, celda de 40px.
  - **Cámara que sube**: la rana se mantiene alrededor del tercio inferior de la pantalla; al avanzar hacia arriba la cámara scrollea en píxeles (movimiento continuo, no por celdas) y además tiene una **velocidad mínima de scroll propia que nunca se detiene** y crece con la profundidad — no hay temporizador, la presión es la cámara.
  - **Generación procedural por filas**: cada fila nueva que entra por arriba se sortea entre `safe` (acera), `road` (carril de tráfico con dirección, velocidad y gap aleatorios) y `river` (carril de corriente con troncos/tortugas de longitud aleatoria), con pesos que dependen de la profundidad alcanzada. Las filas que salen por abajo se descartan (buffer acotado, sin fugas de memoria).
  - **Reglas de solvencia del generador** (obligatorias, no opcionales): nunca más de 4 filas peligrosas consecutivas; una fila `safe` garantizada al menos cada 6 filas; en dos o más filas `river` consecutivas, las plataformas se generan garantizando solape alcanzable en `x`; ningún carril `road` con gap menor al ancho de la rana + margen.
- Movimiento **discreto**: cada pulsación de `←`/`→`/`↑`/`↓` (y `A`/`D`/`W`/`S`) = un salto de una celda, sin auto-repetición al mantener la tecla (requiere `keyup`), con `preventDefault` para no scrollear la página. Se permite retroceder (`↓`), pero la cámara no baja nunca.
- Modelo híbrido de posición: la fila (`y`) es discreta en coordenadas de mundo; sobre el río la `x` de la rana pasa a ser **continua** y adopta la velocidad de la plataforma que pisa.
- **Una sola vida.** Cualquiera de estas causas termina la partida de inmediato: atropello en un carril de tráfico, caer al agua, ser arrastrado por una plataforma fuera del borde lateral, o quedar por **debajo del borde inferior de la cámara**.
- Progresión por **profundidad**, no por niveles diseñados: `level` = `1 + floor(filasAvanzadas / 20)`, y cada tramo sube la velocidad mínima de scroll y los pesos de peligro/densidad del generador. No hay meta, no hay nenúfares, no hay fin de partida por victoria.
- Puntuación: +10 por cada fila nueva de profundidad máxima alcanzada (no se puntúa retroceder y volver a subir), +5 extra por cada fila de tipo `river` superada, sin bonus de tiempo.
- El componente expone `onStateChange({ score, level })` — **sin** `lives` ni `lines` (mismo criterio que SPEC 09 para snake) — y `onGameOver(finalScore)` una única vez al morir.
- **Assets nuevos**: spritesheet propio `public/games/frogger/frogger-sprites.png` con al menos 6 tiles de 40×40 (rana idle, rana en salto, auto, camión, tronco, tortuga) + atlas de coordenadas portado a un módulo TS interno tipado (`app/games/frogger/sprites.ts`), sin variables globales de `window` (mismo patrón que el atlas de frutas de SPEC 09). El spritesheet hay que **producirlo** en este spec: no existe fuente en `references/source-assets/` (ver Risks).
- Registrar `"frogger"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`).
- Seed/migración SQL que inserta la fila `"frogger"` en `games`, ejecutada como parte de este spec (primero en el plan, para no romper la FK `scores.game_id → games.id`).

**Out of scope (para futuros specs):**

- Controles táctiles/swipe o por gestos.
- Sonido y música.
- Niveles diseñados a mano, temporizador por travesía, nenúfares y múltiples vidas (es exactamente la variante 1, mutuamente excluyente).
- Semilla determinista / partidas reproducibles y modo "daily run".
- Coleccionables, power-ups y multiplicadores de racha.
- Mostrar la distancia (filas recorridas) en el HUD de React (`RealGameState` no tiene campo de distancia — ver Risks).
- Cambios a la entrada mock existente `"ranaria"` en `app/data/games.ts`.
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión heredada de SPEC 06).
- Cualquier ajuste a `app/biblioteca/page.tsx`, `app/salon-de-la-fama/page.tsx` o `app/juego/[id]/page.tsx` más allá de que listen automáticamente a Frogger por iterar sobre `REAL_GAME_IDS` (ya lo hacen desde SPEC 07).

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'frogger',
  'FROGGER',
  'Avanza sin fin entre tráfico y corriente: un solo error y termina.',
  'La cámara sube y nunca se detiene. Cada fila que entra en pantalla se genera al azar: autopistas de neón, camiones a toda velocidad, corrientes con troncos y tortugas. Salta hacia arriba mientras puedas, porque no hay meta ni vidas de repuesto: un atropello, una caída al agua o quedarte atrás y tu distancia queda congelada en el marcador.',
  'ARCADE',
  'cover-frogger',
  'cyan',
  0,
  '0'
);
```

Migración sugerida: `supabase/migrations/20260820000000_seed_frogger_game.sql`, siguiendo el patrón de `20260805010000_seed_snake_game.sql`.

**Componente del juego — `app/games/frogger/frogger-game.tsx`, implementa `RealGameProps` (sin cambios a la interfaz de `app/games/registry.tsx`):**

- `'use client'`, canvas de resolución interna fija **600×800** (vertical) escalado por CSS.
- Encapsula dentro del componente/closure (sin variables globales de módulo ni de `window`):
  - `frog { worldRow, x, ridingPlatform | null, alive, hopAnimT }`.
  - `cameraY` (píxeles de mundo) y `scrollSpeed` (px/s, creciente por tramo).
  - `rows: Map<worldRow, RowDescriptor>` — buffer acotado a las filas dentro de la ventana visible + margen; `RowDescriptor = { kind: 'safe' | 'road' | 'river', dir, speed, entities[] }`.
  - `entities[]` por fila — vehículos y plataformas (`{ x, width, tile }`), recicladas por wrap-around horizontal.
  - `maxDepth`, `score`, `level`, `gameState`.
  - `generateRow(worldRow, difficulty)` — generador puro por fila que aplica las reglas de solvencia; recibe el estado de las últimas filas generadas para poder garantizar la acera cada 6 filas y el solape en ríos consecutivos.
- Loop con `requestAnimationFrame` + `deltaTime`: cámara, entidades y corriente avanzan por tiempo, nunca por frame. El salto de la rana es discreto y disparado por input (con una animación de interpolación corta, puramente visual).
- Detección de colisión AABB 1D en la fila actual de la rana + chequeo de "rana por debajo de `cameraY + alto visible`" para la muerte por quedarse atrás.
- Reporta `onStateChange({ score, level })` — el HUD de React no muestra "Vidas" ni "Líneas" (misma forma que snake).
- `onGameOver(finalScore)` se invoca **una sola vez** en cualquiera de las cuatro causas de muerte; el componente no dibuja overlay propio de "GAME OVER" (lo cubre el modal existente de `/juego/[id]/jugar`).
- `paused`: cuando el prop es `true`, el loop deja de llamar a `update(dt)` (cámara, tráfico y corriente congelados) y se ignora el input de salto. Sin atajo de teclado propio de pausa (criterio de asteroids/tetris/snake).
- Listeners `keydown`/`keyup` registrados solo mientras el componente está montado y limpiados en el cleanup del `useEffect`, con `preventDefault()` en flechas/WASD/espacio.
- `app/games/frogger/sprites.ts`: atlas tipado con las coordenadas de cada tile del spritesheet, cargado una sola vez vía `useRef` + `Image`, con dibujo de fallback (rectángulo de color) mientras la imagen no está lista.

**Assets nuevos (estáticos, sin tabla asociada):**

- `public/games/frogger/frogger-sprites.png` — spritesheet de tiles 40×40 (rana idle, rana en salto, auto, camión, tronco, tortuga; ampliable).

## Implementation plan

1. **Seed de la fila `"frogger"` en `games`** vía migración nueva (`supabase/migrations/20260820000000_seed_frogger_game.sql`), con los valores exactos de Data model. Va primero para que la FK `scores.game_id → games.id` ya acepte `'frogger'` antes de que exista cualquier forma de guardar un puntaje. Sistema funcional: nada visible cambia todavía.
2. **Clase `.cover-frogger` en `app/globals.css`** (+ pseudo-elementos), visualmente distinta de `.cover-rana` (mock "ranaria") y del resto de covers: sugerido franjas horizontales en fuga vertical con degradado hacia arriba, que insinúen scroll infinito. Sistema funcional: `/juego/frogger` y `/biblioteca` ya muestran el juego con su portada, aunque aún caiga al fallback de "juego real sin componente".
3. **Producir y copiar el spritesheet** a `public/games/frogger/frogger-sprites.png` (tiles de 40×40, paleta del tema) y crear `app/games/frogger/sprites.ts` con el atlas de coordenadas tipado. Sistema funcional: assets disponibles y verificables por URL, sin que nada los consuma todavía.
4. **Crear `app/games/frogger/frogger-game.tsx`**: componente `'use client'` que implementa `RealGameProps`, monta el canvas 600×800, implementa el loop con `deltaTime`, la cámara con velocidad mínima creciente, `generateRow` con las reglas de solvencia, el buffer acotado de filas (generar arriba / descartar abajo), el salto discreto por `keydown`/`keyup`, el arrastre sobre plataformas, las cuatro causas de muerte con `onGameOver` único, el puntaje por profundidad máxima y el reporte `onStateChange({ score, level })`. Dibujo con los tiles del atlas y fallback de formas mientras la imagen carga. Sistema funcional: el componente compila y existe, aún sin ruta que lo monte.
5. **Registrar `"frogger"`** en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`) apuntando a `FroggerGame`. Sistema funcional: `/juego/frogger/jugar` ya renderiza el juego completo; biblioteca, detalle y salón de la fama lo listan automáticamente sin cambios en esas páginas.
6. **Verificación final**: `npm run build` sin errores de tipos/compilación + prueba manual — jugar varias partidas seguidas comprobando que el terreno cambia entre partidas, avanzar más de 60 filas para ver al menos 3 tramos de dificultad, verificar que aparece una acera segura al menos cada 6 filas y que dos ríos consecutivos siempre son cruzables, morir por cada una de las cuatro causas (incluida quedarse atrás de la cámara), pausar con el botón del HUD y confirmar que la cámara y el tráfico se congelan, ver el modal de fin de partida con el score real, guardar la puntuación y verla en `/salon-de-la-fama` y `/juego/frogger`; confirmar que asteroids, tetris, arkanoid, snake y los mocks (incluida "ranaria") siguen funcionando igual, y que el canvas vertical 600×800 no rompe el layout de `.crt-screen` en escritorio ni en pantallas angostas.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"frogger"` con `title: "FROGGER"`, `cat: "ARCADE"`, `color: "cyan"`, `cover: "cover-frogger"`, `best: 0`, `plays: "0"` y las descripciones corta/larga del Data model.
- [ ] `app/globals.css` incluye `.cover-frogger`, visualmente distinta de `.cover-rana` (mock "ranaria") y del resto de `cover-*`.
- [ ] `/juego/frogger` (detalle) funciona igual que los demás juegos reales: info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/frogger/frogger-game.tsx` y `app/games/frogger/sprites.ts` existen, compilan sin errores de tipos, implementan/usan `RealGameProps` y no usan variables globales.
- [ ] `public/games/frogger/frogger-sprites.png` existe, se carga en el navegador, y mientras no está listo el juego dibuja formas de fallback sin romperse.
- [ ] En `/juego/frogger/jugar` se juega el cruce endless: canvas vertical 600×800, salto discreto de una celda por pulsación con flechas y WASD, cámara que sube sola y nunca baja, filas de tráfico/río/acera generadas al azar.
- [ ] Las teclas de flecha/WASD/espacio no producen scroll de la página mientras se juega.
- [ ] Dos partidas consecutivas producen terrenos distintos (generación procedural real, no una tabla fija).
- [ ] El generador cumple sus reglas de solvencia: nunca más de 4 filas peligrosas consecutivas, una acera al menos cada 6 filas, ríos consecutivos siempre cruzables, gaps de tráfico siempre mayores al ancho de la rana.
- [ ] Cada una de las cuatro causas de muerte (atropello, caer al agua, arrastre fuera del borde lateral, quedar debajo del borde inferior de la cámara) termina la partida de inmediato, con **una sola vida**.
- [ ] El HUD superior de React muestra solo score y nivel: **no** aparece "Vidas" ni "Líneas".
- [ ] `level` sube cada 20 filas de profundidad y con él la velocidad mínima de scroll y la densidad de peligro.
- [ ] El score refleja la profundidad máxima alcanzada (+10 por fila nueva, +5 por fila de río superada) y **no** aumenta al retroceder y volver a subir por filas ya contadas.
- [ ] El botón "PAUSA"/"REANUDAR" del HUD congela cámara, tráfico y corriente, y el input de salto se ignora mientras está pausado.
- [ ] Al morir se dispara `onGameOver` una única vez y aparece el modal de fin de partida existente con el score real, sin overlay propio de "GAME OVER" en el canvas.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` con `game_id: "frogger"`.
- [ ] `/salon-de-la-fama` incluye el tab de Frogger con sus puntuaciones reales.
- [ ] El canvas vertical 600×800 se escala dentro de `.crt-screen` sin distorsionar su aspect ratio 3:4 y sin desbordar el layout en pantallas angostas.
- [ ] Asteroids, Tetris, Arkanoid, Snake y los juegos mock (incluida `"ranaria"`) siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí (por qué esta variante y no la otra):** endless procedural, una sola vida y score = distancia. Resuelve el trade-off a favor de la **rejugabilidad y la competencia en el leaderboard**: sin niveles finitos ni condición de victoria, cada partida es distinta y el salón de la fama mide habilidad real en vez de "cuántos niveles memorizaste". La variante 1 (clásico por niveles, 3 vidas, temporizador) es más fiel y más barata, pero su techo es fijo y su dificultad se agota cuando el jugador aprende las 5 tablas. Acá se paga ese beneficio con dos costos concretos: un generador procedural que hay que balancear para que nunca produzca filas imposibles, y un spritesheet que hoy no existe en el repo y hay que producir.
- **Sí:** id `"frogger"` en vez de reutilizar el mock `"ranaria"` (clon temático de Frogger del catálogo heredado en `app/data/games.ts`). El mock no se toca; misma separación que `snake` vs. `serpentina` y `arkanoid` vs. `bloque-buster`. El id `"frogger"` no está en `REAL_GAME_IDS` ni entre los ids mock.
- **Sí:** `cover: "cover-frogger"`, no `cover-rana`. Precedente explícito de SPEC 09 (`cover-snake-real` vs. `cover-snake`).
- **Sí:** `color: "cyan"`. Los cuatro colores ya están tomados por juegos reales (asteroids=yellow, tetris=cyan, arkanoid=magenta, snake=green), así que la colisión es inevitable; se elige cyan porque el verde ya lo cargan tres entradas (snake real + mocks "serpentina" y "ranaria") y porque lee como agua/corriente.
- **Sí:** `cat: "ARCADE"` — mismo criterio que arkanoid/snake.
- **Sí (desvío del default 800×600):** canvas **600×800 vertical**. Un endless de avance vertical necesita ver más filas hacia arriba que hacia los costados; en 4:3 la cámara mostraría apenas 15 filas de mundo y el jugador no alcanzaría a leer los carriles que se acercan. Hay precedente de aspect ratio propio en el repo: tetris usa 300×600. Es un desvío deliberado, no un descuido.
- **Sí:** una sola vida, sin temporizador. La presión temporal la genera la cámara que nunca se detiene, así que un temporizador extra sería redundante; y con muerte instantánea el score de distancia se vuelve una métrica limpia y comparable en el leaderboard. Mismo criterio de "1 vida" ya validado en snake (SPEC 09).
- **Sí:** `onStateChange({ score, level })` sin `lives` ni `lines`, exactamente como snake — cero cambios en `app/juego/[id]/jugar/page.tsx`.
- **Sí:** puntuar solo la **profundidad máxima** alcanzada. Evita el farmeo trivial de subir y bajar una fila segura en loop.
- **Sí:** movimiento discreto sin auto-repetición al mantener la tecla. Es la firma mecánica de Frogger y evita que un hold accidental mande la rana al tráfico.
- **Sí:** modelo híbrido `y` discreto / `x` continuo sobre el río, con realineación a la celda más cercana al saltar.
- **Sí:** reglas de solvencia del generador tratadas como **requisito**, no como pulido posterior. Un endless que puede generar un muro imposible no es difícil, está roto.
- **Sí:** spritesheet propio + atlas TS tipado. Es el eje de assets donde esta variante se separa de la 1 (formas de canvas puro): con vehículos y plataformas reconocibles, el terreno procedural se lee de un vistazo, que es justo lo que un endless necesita. Se reutiliza el patrón de atlas ya validado en SPEC 09 con `fruits.png`.
- **No:** sonido — mismo criterio que asteroids/tetris/snake.
- **No:** semilla determinista, "daily run" ni ranking por semilla — atractivo, pero es otro spec.
- **No:** power-ups, coleccionables ni multiplicadores de racha — no son parte del MVP jugable.
- **No:** controles táctiles/swipe — ningún juego real del catálogo los tiene, aunque este formato vertical sea el que más los pediría.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** cambios a la entrada mock `"ranaria"` de `app/data/games.ts`.

## Risks

| Riesgo                                                                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El canvas **vertical 600×800** dentro de `.crt-screen` (pensado y verificado para 4:3) puede producir letterboxing lateral fuerte o desbordar en pantallas angostas — riesgo mayor que en SPEC 05/08/09 porque acá el aspect ratio es nuevo. | Usar `aspect-ratio: 3 / 4` y sizing tipo `object-fit` (`max-width`/`max-height` con `width: auto; height: auto`) sin tocar `.crt-screen`; el paso 6 exige verificar escritorio y viewport angosto antes de dar el juego por terminado.   |
| Doble montaje del `useEffect` en desarrollo (React Strict Mode) puede duplicar listeners de teclado y `requestAnimationFrame`, haciendo que un salto cuente doble o que se generen filas dos veces.                                          | Cancelar el `rAF` y remover `keydown`/`keyup` en el cleanup del `useEffect`, y mantener todo el estado de mundo en `useRef` inicializado una sola vez; probar recarga y navegación de ida y vuelta a `/jugar`.                           |
| Sin RLS en `games`/`scores`, cualquiera con la publishable key puede insertar puntajes arbitrarios para `game_id: "frogger"` (riesgo aceptado en SPEC 06/07/08/09), y en un endless el leaderboard es el corazón del juego.                  | Aceptado explícitamente; queda documentado como deuda para cuando exista auth real, con la nota de que este juego la hace más visible que los anteriores.                                                                                |
| Si el seed de la fila `"frogger"` no corre antes de exponer el componente jugable, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                                                | El plan corre el seed en el paso 1 y registra el componente en el paso 5; el paso 6 verifica manualmente que guardar un puntaje funciona.                                                                                                |
| **El spritesheet no existe en el repo**: no hay fuente en `references/source-assets/` ni en `references/started-games/`, así que el paso 3 incluye trabajo de arte, no solo de código.                                                       | Coste explícito de esta variante. El componente dibuja formas de fallback si la imagen no carga, así que el juego es jugable aun con el asset incompleto; si producir el arte se descarta, la alternativa documentada es la variante 1.  |
| El generador procedural puede producir tramos **imposibles** (ríos consecutivos sin solape, gaps de tráfico más chicos que la rana, cadenas largas de filas peligrosas) y hacer el juego injusto.                                            | Reglas de solvencia como requisito verificable en Acceptance criteria (máx. 4 peligrosas seguidas, acera cada ≤6 filas, solape garantizado en ríos consecutivos, gap mínimo > ancho de rana + margen), verificadas jugando en el paso 6. |
| La muerte por "quedarse atrás de la cámara" puede sentirse arbitraria si la velocidad mínima de scroll sube demasiado rápido, o inexistente si sube demasiado despacio.                                                                      | Curva de `scrollSpeed` definida por tramo (cada 20 filas) en una única constante tabulada, ajustable sin refactor; probar al menos 3 tramos en el paso 6.                                                                                |
| `RealGameState` no tiene campo para **distancia/filas recorridas**, que es la métrica central de esta variante: el HUD de React no puede mostrarla sin tocar la ruta compartida `/jugar`.                                                    | Coste aceptado: la distancia se refleja indirectamente en `score` (10 por fila) y se dibuja dentro del canvas. Agregar `distance?` a `RealGameState` queda fuera de alcance y sería su propio spec.                                      |
| Generar filas sin descartar las que salen por abajo hace crecer el buffer indefinidamente y degrada el framerate en partidas largas.                                                                                                         | Buffer acotado: `rows` es un `Map` del que se eliminan las filas por debajo de `cameraY` menos un margen, y las entidades se reciclan por wrap-around en vez de recrearse.                                                               |
| La cámara con scroll continuo y filas discretas puede producir tearing visual o filas que "aparecen de golpe" en el borde superior.                                                                                                          | Generar siempre 2–3 filas por encima del borde visible y dibujar con `cameraY` en subpíxeles; el salto de la rana se interpola visualmente para acompañar el scroll.                                                                     |
| La pausa desde el HUD debe congelar también la cámara — si no, el jugador puede morir por quedarse atrás estando en pausa.                                                                                                                   | El único flag de pausa (derivado del prop `paused`) corta la llamada a `update(dt)` completa, incluida la cámara; verificado explícitamente en el paso 6.                                                                                |
| Solape temático con el mock heredado `"ranaria"` y con las sugerencias `cruce-relampago` y `corredor-infinito` de `references/suggested-games.md`: la biblioteca mostrará entradas parecidas.                                                | Aceptado a propósito (mismo precedente que `snake`/`serpentina` y `arkanoid`/`bloque-buster`); se mitiga visualmente con `.cover-frogger` distinta y con títulos y descripciones inequívocos.                                            |

## What is **not** in this spec

- Controles táctiles/swipe o por gestos.
- Sonido y música.
- Niveles diseñados a mano, temporizador por travesía, nenúfares y múltiples vidas (variante 1, mutuamente excluyente).
- Semilla determinista, partidas reproducibles y modo "daily run".
- Coleccionables, power-ups y multiplicadores de racha.
- Agregar un campo de distancia a `RealGameState` o mostrarla en el HUD de React.
- Cambios a la entrada mock existente `"ranaria"`.
- Cambios a RLS en `games`/`scores`.
- Cualquier ajuste a las páginas de catálogo más allá de que listen automáticamente a Frogger por iterar sobre `REAL_GAME_IDS`.

Cada uno de estos, si se implementa, va en su propio spec.
