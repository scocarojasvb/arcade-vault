# SPEC 13 — ESQUIVA BALAS · variante 1/2: 5 oleadas diseñadas a mano con 3 vidas y bombas

> **Estado:** Draft
> **Variante:** 1 de 2 — 5 oleadas diseñadas a mano con 3 vidas y bombas (alternativa a `02-esquiva-balas-endless-absorcion.md`, mutuamente excluyentes)
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales), SPEC 10 (controles táctiles), SPEC 12 (playbook de rendimiento de render)
> **Fecha:** 2026-08-26
> **Tema del jam:** ESQUIVA BALAS (`esquiva-balas`, bullet-hell puro tomado de la tabla de sugerencias de `references/suggested-games.md`)
> **Objetivo:** Agregar el juego real "ESQUIVA BALAS" al catálogo de Arcade Vault como un bullet-hell de arena fija 800×600 con 5 oleadas de patrones diseñadas a mano, 3 vidas, hitbox diminuta, modo preciso y bombas de despeje, donde el jugador nunca dispara — solo esquiva, roza y despeja.
> **Promoción:** si se elige esta variante, copiar a `specs/13-esquiva-balas-game.md`, cambiar Estado a Approved y quitar las líneas Variante/Promoción del header.

> **Nota sobre la numeración:** el prefijo `01` del nombre de archivo es el **índice de variante dentro de esta corrida del game jam**, no el número global de spec. El número global libre detectado es `13` (último spec en `specs/` plano: `12-frogger-render-performance.md`), y solo una de las dos variantes va a aterrizar ahí.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`, mismo criterio que tetris/arkanoid/snake/frogger): id `"esquiva-balas"`, título "ESQUIVA BALAS", descripciones corta/larga acordadas, `cat: "SHOOTER"`, `color: "magenta"`, `cover: "cover-esquiva-balas"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-esquiva-balas` en `app/globals.css`, visualmente distinta de `.cover-invaders` (mock heredado "invasores"), de `.cover-asteroids` (el otro SHOOTER real) y del resto de `cover-*`.
- Diseño e implementación **desde cero** (no port: no hay carpeta en `references/started-games/` ni assets en `references/source-assets/` para este juego) de un bullet-hell de arena fija como componente cliente React sobre canvas de resolución interna **800×600** (4:3, igual que asteroids/arkanoid/snake/frogger), escalado por CSS:
  - **El jugador no dispara nunca.** No hay enemigos destruibles ni barra de vida enemiga: el único verbo es moverse (más bomba como recurso defensivo limitado). Es la premisa registrada para `esquiva-balas` en `references/suggested-games.md` ("el foco es esquivar patrones geométricos de proyectiles escalables, no destruir enemigos").
  - **Nave del jugador:** sprite de formas (rombo de 18×18 px) con un **núcleo brillante de 4 px de radio dibujado siempre**, que es literalmente la hitbox circular (`r = 4`). Convención danmaku: el jugador ve exactamente lo que mata.
  - **Confinamiento:** la nave se clampea al canvas con un margen interior de 8 px. No hay wrap-around.
  - **Velocidad:** 220 px/s normal, **95 px/s en modo preciso** (`Shift` mantenido), con el anillo de hitbox resaltado mientras el modo preciso está activo.
  - **Emisores ("torretas"):** entidades sin colisión propia, ancladas en posiciones fijas del borde superior/laterales, que solo generan balas según un script. Máximo 4 simultáneos.
  - **5 patrones de emisión parametrizables**, todos geométricos y sin assets: `anillo` (N balas en círculo completo, radiales), `abanico` (k balas en cono apuntado a la posición actual del jugador), `espiral` (1 bala por intervalo con el ángulo avanzando `Δθ` fijo por disparo), `lluvia` (balas desde el borde superior en `x` aleatoria, descendentes con deriva lateral leve) y `muro` (línea horizontal de balas con un hueco de ancho `g` en `x` aleatoria, descendente).
  - **5 oleadas diseñadas a mano** (mismo criterio que los 5 niveles de Arkanoid): cada oleada es un script declarativo de emisores/patrones/parámetros/ventanas de tiempo, de ~35–45 s, con dificultad creciente por más emisores simultáneos, mayor cadencia, mayor velocidad de bala y huecos más angostos. Al terminar el script de una oleada y quedar menos de 20 balas activas (o tras 3 s de gracia que despawnea el resto), se avanza: `+1000` puntos, `level++`, banner "OLEADA N" de 2 s sin emisión nueva.
  - **Completar la oleada 5 = victoria**, que dispara `onGameOver(scoreFinal)` con el bono de bombas, igual que el `win` del nivel 5 de Arkanoid (sin overlay propio de victoria en el canvas).
- **Vidas: 3.** Cada impacto resta 1 vida, despeja todas las balas activas, reposiciona la nave en el centro-abajo y otorga 2,5 s de invulnerabilidad con parpadeo. El script de la oleada **continúa donde estaba** (no se reinicia). `lives === 0` → `onGameOver(scoreFinal)`.
- **Bombas:** stock inicial 3, cap 3, `+1` por oleada superada. Efecto: onda de despeje que crece hasta 260 px de radio en 0,6 s destruyendo toda bala que toca (`+20` puntos cada una) y otorga 1,5 s de invulnerabilidad. Tecla `Espacio` (además de `Z`).
- **Score:** `+10` por segundo sobrevivido (acumulado en tramos de 100 ms), `+1` por **roce** (bala cuyo centro entra a ≤ 22 px del centro de la hitbox, contada **una sola vez** por bala vía flag), `+20` por bala destruida por bomba, `+1000` por oleada superada y `+5000` por cada bomba sin usar **solo si se completa la oleada 5**.
- **Controles (solo teclado/táctil, sin mouse):** flechas y WASD para mover, `Shift` para modo preciso, `Espacio`/`Z` para bomba, `P`/`Escape` como atajo de pausa que escribe el **mismo** flag de pausa interno que el prop `paused` (mismo doble control que SPEC 08). `preventDefault()` en flechas/WASD/espacio mientras el juego está montado, para que mover la nave no scrollee la página (patrón de SPEC 09).
- **Compatibilidad con SPEC 10 sin tocar nada:** el D-pad táctil compartido despacha `KeyboardEvent` sintéticos con los `code` `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` y `Space` sobre `window`, así que el juego es jugable en móvil sin cambios en `app/games/touch-controls.tsx` ni en `app/juego/[id]/jugar/page.tsx` con solo escuchar esos `code`. El modo preciso (`Shift`) **no** tiene equivalente táctil: en táctil se juega siempre a velocidad base (limitación documentada, ver Risks).
- El componente expone `onStateChange({ score, level, lives })` — mismo shape que asteroids/arkanoid/frogger, así que el HUD de React ya muestra "Vidas" sin tocar `app/juego/[id]/jugar/page.tsx` — y `onGameOver(finalScore)` **una sola vez**, tanto al perder la última vida como al completar la oleada 5.
- **Rendimiento por diseño (playbook de SPEC 12, aplicado desde el primer commit, no como parche posterior):** pool preasignado de 1500 balas con flag `activo` (cero allocations por frame), iteración con `for` indexado (nunca `forEach`), sprites de bala **horneados una sola vez a canvas offscreen** (3 radios × 2 colores, glow incluido) y dibujados con `drawImage` en vez de `arc` + `shadowBlur` por bala, escrituras de estilo del contexto izadas fuera de los bucles calientes, y **cero `useState` dentro del loop** (todo el estado del juego vive en `useRef`/closure; `onStateChange` se llama a lo sumo ~10 veces por segundo, no por frame).
- Seed/migración SQL que inserta la fila `"esquiva-balas"` en `games`, ejecutada como parte de este spec (mismo criterio que SPEC 07/08/09 — evita el riesgo de FK rota en `scores`).
- Registrar `"esquiva-balas"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`).

**Edge cases cubiertos (parte del alcance, verificables en Acceptance criteria):**

- **Impactos simultáneos:** varias balas tocando la hitbox en el mismo frame descuentan **1 sola vida** — el flag de invulnerabilidad se activa antes de seguir evaluando el resto del pool.
- **Muerte y victoria en el mismo frame:** gana la muerte (game over sin bono de bombas). `onGameOver` se dispara una única vez, protegido por un flag `finalizado`.
- **Bomba sin stock:** no hace nada — sin penalización, sin efecto visual, sin consumir el input.
- **Bomba durante invulnerabilidad:** permitida y consumida; la invulnerabilidad no se acumula, se toma el máximo del tiempo restante.
- **Pool saturado (1500 balas activas):** los emisores dejan de disparar hasta que se libere espacio, en vez de crecer el array o tirar frames.
- **Farmeo de roces:** una bala solo puntúa el roce una vez (flag `rozada`), así que quedarse pegado a una bala quieta no genera puntos infinitos.
- **Pausa (prop `paused` o `P`/`Escape`):** congela el loop y **resetea el acumulador de tiempo al reanudar**, para que no se consuma un `dt` gigante que teletransporte todas las balas.
- **Pestaña en background:** `requestAnimationFrame` se detiene; al volver, el `dt` se clampea a 50 ms por frame como máximo.
- **Despawn con margen:** las balas se liberan al salir 40 px por fuera del canvas, no en el borde exacto, para que las trayectorias diagonales entrantes no desaparezcan antes de tiempo.
- **Doble montaje de `useEffect` en dev:** el cleanup cancela el `rAF`, quita todos los listeners y descarta el pool; no quedan dos loops corriendo ni listeners duplicados.
- **Redimensionar la ventana:** solo cambia el escalado CSS; la resolución interna (800×600) y toda la física quedan intactas.

**Out of scope (para futuros specs):**

- Que el jugador dispare o pueda destruir emisores con algo que no sea la bomba.
- Skins `neon`/`retro` propias (`app/games/esquiva-balas/skins.ts`) — las agrega el subagente `skin-designer` después, encadenado por `/spec-impl-game`; el componente acepta la prop opcional `skin` y por ahora renderiza igual en las tres.
- Ajuste responsive general de la ruta (lo cubre `mobile-porter`).
- Sonido.
- Jefes / patrones con fase (barra de vida enemiga).
- Power-ups distintos de la bomba.
- Réplay/ghost, ranking por oleada alcanzada (el leaderboard sigue siendo solo `score`).
- Cambios a la entrada mock heredada `"invasores"` en `app/data/games.ts`.
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión heredada de SPEC 06).
- Cualquier ajuste a `app/biblioteca/page.tsx`/`app/salon-de-la-fama/page.tsx`/`app/juego/[id]/page.tsx` más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS`.

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'esquiva-balas',
  'ESQUIVA BALAS',
  'No tienes armas: solo 3 vidas, 3 bombas y 5 oleadas de balas.',
  'Cinco oleadas de torretas tejen anillos, espirales y muros de proyectiles sobre una arena cerrada. No disparas: tu única defensa es una nave con hitbox del tamaño de un píxel, un modo preciso para colarte entre las balas y tres bombas que barren la pantalla. Rozar los proyectiles suma puntos; tocarlos cuesta una vida.',
  'SHOOTER',
  'cover-esquiva-balas',
  'magenta',
  0,
  '0'
);
```

**Componente del juego — `app/games/esquiva-balas/esquiva-balas-game.tsx`, implementa `RealGameProps` (sin cambios a la interfaz de `app/games/registry.tsx`):**

- `'use client'`, canvas de resolución interna fija 800×600 escalado por CSS, **sin variables globales de módulo**: todo el estado vive en el closure del `useEffect` y en `useRef`.
- Estado encapsulado: `jugador { x, y, vx, vy, preciso, invulnerableHasta }`, `pool: Bala[]` (1500 entradas preasignadas), `emisores: Emisor[]`, `ondas: OndaBomba[]`, `score`, `vidas`, `bombas`, `oleadaIndex`, `tiempoOleada`, `estado: 'jugando' | 'transicion' | 'terminado'`, `pausado`, `finalizado`.
- **Forma de una bala (pool, campos planos, sin objetos anidados):** `{ activo: boolean, x: number, y: number, vx: number, vy: number, r: number, tipo: 0 | 1 | 2, rozada: boolean }`. `tipo` indexa el sprite offscreen horneado.
- **Forma de un emisor:** `{ x, y, patron: 'anillo' | 'abanico' | 'espiral' | 'lluvia' | 'muro', cadencia: number, acumulador: number, angulo: number, params: Record<string, number>, desde: number, hasta: number }` — `desde`/`hasta` son offsets en segundos dentro del script de la oleada.
- **Tabla de oleadas (`OLEADAS`)**, constante tipada dentro del módulo del juego (misma idea que `LEVELS` portado en Arkanoid, pero diseñada aquí desde cero): array de 5 entradas `{ nombre: string, duracion: number, emisores: EmisorScript[] }`. Es el único lugar donde se toca la dificultad — ningún número mágico repartido por el loop.
- **Reporta `onStateChange({ score, level, lives })`** — usa `lives`, no `lines`; `level` es el número de oleada (1..5). Se llama con throttle (~10 Hz) y solo cuando algún valor cambió, nunca por frame (memoria del proyecto: minimizar re-renders desde `app/games/**`).
- **`onGameOver(finalScore)`** una única vez (`finalizado`), al perder la última vida o al completar la oleada 5. El canvas **no** dibuja overlay propio de "GAME OVER" ni de victoria: los cubre el modal existente de `app/juego/[id]/jugar/page.tsx`.
- **`paused`:** el prop de React y las teclas `P`/`Escape` escriben el mismo flag interno; mientras está activo, el loop no llama `update(dt)` y no se dibuja overlay propio (el overlay genérico "EN PAUSA" de `jugar/page.tsx` ya cubre todo `.crt-screen`, como documentó SPEC 08).
- **`skin?: SkinId`** se acepta en las props (contrato ya vigente) pero en este spec no altera la paleta — queda para `skin-designer`.

**Assets nuevos:** ninguno en disco. Los sprites de bala (3 radios × 2 colores, con glow) se hornean en un canvas offscreen al montar, dibujando `arc` + `shadowBlur` una sola vez por sprite, y luego se blitean con `drawImage` (técnica ya validada en `frogger` por SPEC 12 y en `arkanoid` con `bakeTintedSheet`). No se crea `public/games/esquiva-balas/`.

## Implementation plan

1. **Seed primero.** Agregar la fila `"esquiva-balas"` a la tabla `games` de Supabase vía migración nueva en `supabase/migrations/` (nombre tipo `20260826000000_seed_esquiva_balas_game.sql`), con los valores exactos de Data model. Sistema funcional: nada visible cambia todavía, pero queda lista la FK para `scores.game_id = 'esquiva-balas'`.
2. **Cover.** Agregar la clase `.cover-esquiva-balas` (+ pseudo-elementos) en `app/globals.css`, visualmente distinta de `.cover-invaders`, `.cover-asteroids` y del resto de `cover-*` (propuesta: trama radial de puntos magenta sobre fondo oscuro, evocando un anillo de balas). Sistema funcional: `/juego/esquiva-balas` (detalle) ya se ve bien, aunque todavía caiga al fallback de juego sin componente.
3. **Sprites horneados.** Crear el helper interno de horneado offscreen (3 radios × 2 colores + la onda de bomba) dentro del módulo del juego, sin tocar disco ni `public/`. Sistema funcional: helper puro, testeable a ojo, sin efectos en el resto de la app.
4. **Tabla de oleadas.** Definir `OLEADAS` (5 entradas con sus emisores/patrones/parámetros/ventanas) como constante tipada, junto con las 5 funciones de patrón (`anillo`, `abanico`, `espiral`, `lluvia`, `muro`) que solo escriben en el pool. Sistema funcional: datos + funciones puras, sin loop todavía.
5. **Componente jugable.** Crear `app/games/esquiva-balas/esquiva-balas-game.tsx`: `'use client'`, implementa `RealGameProps`, monta el canvas 800×600, arma el pool de 1500 balas, el loop de `requestAnimationFrame` con acumulador y `dt` clampeado a 50 ms, movimiento con flechas/WASD + modo preciso con `Shift`, bombas con `Espacio`/`Z`, colisión círculo-círculo contra la hitbox de 4 px, roces a 22 px con flag, 3 vidas con invulnerabilidad de 2,5 s, avance de oleada con banner de 2 s, victoria en la oleada 5, `preventDefault` en flechas/WASD/espacio, pausa compartida con `P`/`Escape`, `onStateChange({ score, level, lives })` con throttle y `onGameOver` protegido por flag. Sistema funcional: el componente existe y compila, aunque todavía no esté enchufado a ninguna ruta.
6. **Registro.** Registrar `"esquiva-balas"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`) apuntando a `EsquivaBalasGame`. Sistema funcional: `/juego/esquiva-balas/jugar` ya renderiza el juego real completo; biblioteca, detalle y salón de la fama lo listan automáticamente por iterar sobre `REAL_GAME_IDS` (desde SPEC 07, sin cambios en esas páginas).
7. **Verificación final.** `npm run build` sin errores de tipos/compilación, y prueba manual de una partida completa: mover con flechas y WASD sin scroll de página, ver el núcleo de la hitbox, entrar en modo preciso con `Shift`, acumular roces, tirar una bomba y ver el despeje sumar puntos, perder una vida y confirmar que solo se resta 1 con impactos simultáneos, pausar con el botón del HUD y con `P`/`Escape`, pasar de oleada 1 a 2 con el banner, perder las 3 vidas para ver el modal de fin de partida con el score real, guardar la puntuación y verla en `/salon-de-la-fama` y `/juego/esquiva-balas`, y probar el D-pad táctil (emulación móvil de DevTools). Confirmar que asteroids, tetris, arkanoid, snake, frogger y los mocks siguen funcionando exactamente igual.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"esquiva-balas"` con `title`, `short`, `long`, `cat: "SHOOTER"`, `color: "magenta"`, `cover: "cover-esquiva-balas"`, `best`, `plays`.
- [ ] `app/globals.css` incluye la clase `.cover-esquiva-balas`, visualmente distinta de `.cover-invaders` y `.cover-asteroids`, y se ve correctamente en biblioteca y en el detalle.
- [ ] `/juego/esquiva-balas` (detalle) funciona igual que los demás juegos reales: info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/esquiva-balas/esquiva-balas-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps` y no usa variables globales de módulo.
- [ ] No se agregó nada a `public/games/` (esta variante no tiene assets en disco).
- [ ] Al entrar a `/juego/esquiva-balas/jugar` se juega el bullet-hell real dentro de `.crt-screen`, escalado sin distorsionar el 4:3: la nave se mueve con flechas y WASD, el núcleo de 4 px de la hitbox es visible, `Shift` reduce la velocidad a modo preciso y el jugador **no** puede disparar.
- [ ] Los 5 patrones (`anillo`, `abanico`, `espiral`, `lluvia`, `muro`) aparecen efectivamente a lo largo de las 5 oleadas, con dificultad creciente definida en `OLEADAS`.
- [ ] Rozar una bala (≤ 22 px) suma 1 punto **una sola vez por bala**; quedarse pegado a una bala no farmea puntos.
- [ ] `Espacio`/`Z` lanza una bomba solo si hay stock: despeja las balas alcanzadas sumando 20 puntos cada una, da invulnerabilidad, y con stock 0 no hace nada.
- [ ] Superar una oleada suma 1000 puntos, muestra el banner "OLEADA N" 2 s, incrementa `level` y devuelve 1 bomba (cap 3).
- [ ] El HUD superior de React muestra **"Vidas"** (no "Líneas") con score, nivel y vidas reales en tiempo real.
- [ ] Varias balas impactando en el mismo frame descuentan **una sola vida**.
- [ ] Tanto el botón "PAUSA"/"REANUDAR" del HUD como `P`/`Escape` alternan el mismo estado de pausa, congelan el loop, y al reanudar las balas **no** saltan de posición (acumulador reseteado).
- [ ] Volver a la pestaña tras dejarla en background no provoca un salto de física (`dt` clampeado).
- [ ] Perder las 3 vidas, o completar la oleada 5, dispara el modal de fin de partida existente con el score real, una sola vez, sin overlay propio de GAME OVER/victoria en el canvas; completar la oleada 5 suma 5000 por bomba sin usar.
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` de Supabase con `game_id: "esquiva-balas"`.
- [ ] `/salon-de-la-fama` incluye un tab para ESQUIVA BALAS con sus puntuaciones reales.
- [ ] Las flechas/WASD/espacio no producen scroll de la página mientras se juega, y al desmontar el componente los listeners quedan limpios (navegar ida y vuelta a `/jugar` no duplica el loop).
- [ ] El D-pad táctil de SPEC 10 mueve la nave y el botón de acción tira la bomba, sin modificar `app/games/touch-controls.tsx` ni `app/juego/[id]/jugar/page.tsx`.
- [ ] Con el pool saturado el juego no crece en memoria ni tira frames: los emisores dejan de disparar hasta liberar espacio.
- [ ] El loop no contiene ningún `useState`, no aloca objetos por frame, itera con `for` indexado y dibuja las balas con `drawImage` de sprites horneados (no `arc` + `shadowBlur` por bala).
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y los juegos mock siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí (por qué esta variante y no la otra):** oleadas diseñadas a mano + 3 vidas + bombas, en vez del endless procedural de una vida de la variante 2. El trade-off que resuelve distinto es **la curva de dificultad y la tolerancia al error**: acá la dificultad es _autoral_ (5 scripts fijos, reproducibles, ajustables a mano, iguales para todos los jugadores del leaderboard) y el jugador tiene 3 vidas + 3 bombas de colchón, lo que hace el juego legible y "completable" (hay victoria en la oleada 5). La variante 2 apuesta por dificultad _emergente_ e infinita sin techo, con una sola vida y sin red de seguridad. Esta variante cuesta más diseño de contenido (hay que tunear 5 oleadas para que sean justas) pero produce un leaderboard más comparable y una primera partida mucho menos hostil.
- **Sí:** `id: "esquiva-balas"` — no colisiona con `REAL_GAME_IDS` (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`) ni con los ids del catálogo mock (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroids`, `rocas`, `ranaria`, `duelo-pixel`). Es el mismo id ya reservado para este juego en `references/suggested-games.md`.
- **Sí:** `cat: "SHOOTER"` aunque el jugador no dispare. La categoría del catálogo describe el espacio de proyectiles del juego, no el verbo del jugador; además es la categoría con la que este juego está registrado en `suggested-games.md`. Colisiona temáticamente con el mock heredado `invasores` (clon de Space Invaders) solo en "cosas que vuelan y disparan": el bucle es opuesto (ahí destruís formaciones, acá no tenés arma).
- **Sí:** `color: "magenta"`. Los cuatro colores del catálogo ya están usados por juegos reales (asteroids=yellow, tetris=cyan, arkanoid=magenta, snake=green, frogger=cyan), así que la repetición es inevitable; magenta es el más idiomático para un bullet-hell de neón y el único real que lo usa (arkanoid) está en otra categoría (ARCADE), así que no se confunden en los filtros por categoría.
- **Sí:** canvas 800×600, el default del catálogo (asteroids/arkanoid/snake/frogger). Una arena 4:3 le da al jugador espacio horizontal para escapar lateralmente de los muros y espirales; no hay razón concreta para introducir otra proporción en esta variante (la variante 2 sí la tiene).
- **Sí:** hitbox de 4 px de radio **visible siempre** como núcleo brillante. Es la convención del género y la única forma de que esquivar entre balas se sienta justo en vez de aleatorio.
- **Sí:** modo preciso con `Shift`. Sin él, esquivar patrones densos con velocidad única es frustrante. Se acepta que no exista en táctil (SPEC 10 solo despacha flechas + `Space`) en vez de tocar el componente compartido de controles.
- **Sí:** el roce (`graze`) puntúa. Convierte el juego de "huir lo más lejos posible" a "pasar lo más cerca posible", que es lo que hace interesante al género, y le da al `score` una fuente de variación además del tiempo sobrevivido.
- **Sí:** las bombas también puntúan (`+20` por bala destruida) y el bono final premia no usarlas. Deja al jugador decidir entre usar la bomba para sobrevivir o guardarla para el bono, sin castigar ninguna de las dos.
- **Sí:** tras perder una vida, el script de la oleada **continúa** (no se reinicia como el nivel de Arkanoid). Reiniciar la oleada permitiría farmear los primeros segundos fáciles de un script, que son siempre los mismos.
- **Sí:** doble control de pausa (prop `paused` + `P`/`Escape` sobre el mismo flag), igual que SPEC 08, y **sin** overlay propio en el canvas — `jugar/page.tsx` ya cubre `.crt-screen` con su overlay genérico "EN PAUSA" (hallazgo documentado en SPEC 08).
- **Sí:** aplicar el playbook de rendimiento de SPEC 12 desde el primer commit (pool, `for` indexado, sprites horneados, estilos izados, cero `useState` en el loop). Un bullet-hell es el peor caso del catálogo en cantidad de entidades por frame: arreglarlo después sería reescribir el camino de dibujo entero.
- **No:** que el jugador dispare. Es la premisa registrada del juego; agregar arma lo convertiría en otro Asteroids/Escuadrón y borraría la diferencia mecánica que justificaba agregarlo.
- **No:** sonido — mismo criterio que asteroids/tetris/snake/frogger (solo arkanoid tiene audio, porque su original lo traía).
- **No:** skins propias en este spec — las agrega `skin-designer` encadenado por `/spec-impl-game`; el componente ya acepta la prop opcional `skin`.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** cambios a la entrada mock `"invasores"` en `app/data/games.ts`.

## Risks

| Riesgo                                                                                                                                                                                                                           | Mitigación                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El escalado CSS del canvas 800×600 dentro de `.crt-screen` puede introducir letterboxing si el contenedor no respeta el aspect ratio 4:3 (riesgo estructural heredado desde SPEC 05).                                            | Reusar exactamente el mismo wrapper/`className` que ya usan asteroids/arkanoid/snake/frogger (`aspect-ratio` + `max-width`/`max-height` con `width: auto; height: auto`); verificación manual en el paso 7.                                              |
| Doble montaje de `useEffect` en dev (React 19 StrictMode) puede dejar dos loops de `rAF` y listeners de teclado duplicados — riesgo ya mitigado en SPEC 05/07/08/09.                                                             | Cancelar el `rAF` y remover `keydown`/`keyup` en el `return` del `useEffect`; probar recarga y navegación de ida/vuelta a `/jugar` (paso 7).                                                                                                             |
| Sin RLS, cualquiera con la publishable key puede insertar puntajes arbitrarios en `scores` con `game_id: "esquiva-balas"` (riesgo aceptado desde SPEC 06).                                                                       | Aceptado explícitamente; queda documentado como deuda para cuando haya auth real.                                                                                                                                                                        |
| Si el seed de la fila `"esquiva-balas"` no corre antes de exponer el componente jugable, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                              | El plan corre el seed en el paso 1 y registra el componente en el paso 6; el paso 7 verifica a mano que guardar un puntaje funciona.                                                                                                                     |
| **Propio de la variante:** cientos de balas por frame es el peor caso de render de todo el catálogo; dibujar cada bala con `arc` + `shadowBlur` haría caer el frame time muy por debajo de los ~18–40 ms que ya miden los demás. | Sprites de glow horneados a canvas offscreen + `drawImage`, pool sin allocations, `for` indexado, estilos izados, cero `useState` en el loop (playbook de SPEC 12) desde el primer commit; si el frame time no cierra, bajar el cap de 1500 a 900 balas. |
| **Propio de la variante:** tunear 5 oleadas "justas" a mano es trabajo de diseño iterativo; una oleada mal calibrada vuelve el juego imposible o trivial y el leaderboard pierde sentido.                                        | Toda la dificultad vive en la constante `OLEADAS` (un solo lugar, sin números mágicos repartidos); el paso 7 exige jugar hasta oleada 2 como mínimo y se acepta re-tunear valores de esa tabla sin tocar el loop.                                        |
| **Propio de la variante:** con muchas balas cerca, un `dt` grande (pestaña en background, GC pause) puede hacer que una bala atraviese la hitbox entre frames sin registrar colisión (tunneling).                                | `dt` clampeado a 50 ms y velocidades de bala acotadas en `OLEADAS` (máx. ~320 px/s ⇒ ≤ 16 px por frame de 50 ms, mayor que el radio de colisión combinado de 4 + r_bala); si un patrón necesitara balas más rápidas, subdividir su paso de integración.  |
| **Propio de la variante:** el modo preciso (`Shift`) no existe en táctil porque SPEC 10 solo despacha flechas + `Space`, así que la experiencia móvil es estrictamente más difícil que la de escritorio.                         | Aceptado y documentado: en táctil se juega a velocidad base y las oleadas se tunean para ser superables sin modo preciso. La alternativa (agregar un segundo botón al componente compartido) queda fuera de alcance, en su propio spec.                  |
| **Propio de la variante:** el patrón `abanico` apunta a la posición actual del jugador; si la cadencia es alta puede volverse un flujo inevitable ("stream" imposible de romper).                                                | La cadencia de `abanico` se acota en `OLEADAS` y siempre se combina con al menos una ventana sin emisión en el script, para que el jugador tenga un momento de reposicionamiento.                                                                        |
| **Propio de la variante:** la onda de bomba y la invulnerabilidad pueden usarse para atravesar tramos enteros del script si el stock se recarga demasiado rápido.                                                                | Recarga de 1 bomba solo al superar una oleada, con cap 3 — nunca por tiempo; el bono de bombas sin usar empuja además a no gastarlas de más.                                                                                                             |

## What is **not** in this spec

- Que el jugador dispare o destruya emisores sin bomba.
- Skins `neon`/`retro` propias (las agrega `skin-designer`).
- Ajuste responsive general de la ruta (lo cubre `mobile-porter`).
- Sonido.
- Jefes / patrones con fase y barra de vida enemiga.
- Power-ups distintos de la bomba.
- Un segundo botón táctil para el modo preciso.
- Ranking por oleada alcanzada (el leaderboard sigue siendo solo `score`).
- Cambios a la entrada mock heredada `"invasores"`.
- Cambios a RLS en `games`/`scores`.
- Cualquier ajuste a las páginas de catálogo más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS`.

Cada uno de estos, si se implementa, va en su propio spec.
