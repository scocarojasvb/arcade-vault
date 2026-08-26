# SPEC 13 — ESQUIVA BALAS · variante 2/2: endless procedural de una vida con campo de absorción y multiplicador de riesgo

> **Estado:** Draft
> **Variante:** 2 de 2 — endless procedural de una vida con campo de absorción y multiplicador de riesgo (alternativa a `01-esquiva-balas-oleadas-vidas-bombas.md`, mutuamente excluyentes)
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales), SPEC 10 (controles táctiles), SPEC 12 (playbook de rendimiento de render)
> **Fecha:** 2026-08-26
> **Tema del jam:** ESQUIVA BALAS (`esquiva-balas`, bullet-hell puro tomado de la tabla de sugerencias de `references/suggested-games.md`)
> **Objetivo:** Agregar el juego real "ESQUIVA BALAS" al catálogo de Arcade Vault como un bullet-hell **endless** en formato vertical 600×800, con **una sola vida**, densidad de proyectiles generada proceduralmente por una intensidad que sube sin techo, y un **campo de absorción** de energía limitada que convierte balas en puntos multiplicados por cuántas balas tenés encima — el juego premia quedarse en peligro, no huir de él.
> **Promoción:** si se elige esta variante, copiar a `specs/13-esquiva-balas-game.md`, cambiar Estado a Approved y quitar las líneas Variante/Promoción del header.

> **Nota sobre la numeración:** el prefijo `02` del nombre de archivo es el **índice de variante dentro de esta corrida del game jam**, no el número global de spec. El número global libre detectado es `13` (último spec en `specs/` plano: `12-frogger-render-performance.md`), y solo una de las dos variantes va a aterrizar ahí.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase (no en `app/data/games.ts`, mismo criterio que tetris/arkanoid/snake/frogger): id `"esquiva-balas"`, título "ESQUIVA BALAS", descripciones corta/larga acordadas, `cat: "SHOOTER"`, `color: "magenta"`, `cover: "cover-esquiva-balas"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-esquiva-balas` en `app/globals.css`, visualmente distinta de `.cover-invaders` (mock heredado "invasores"), de `.cover-asteroids` (el otro SHOOTER real) y del resto de `cover-*`.
- Diseño e implementación **desde cero** (no port: no hay carpeta en `references/started-games/` ni assets en `references/source-assets/` para este juego) de un bullet-hell endless como componente cliente React sobre canvas de resolución interna **600×800** (3:4 vertical, formato TATE del género danmaku; precedentes de proporción no-4:3 en el repo: Tetris 300×600 y la variante endless de Frogger 600×800), escalado por CSS:
  - **El jugador no dispara nunca** y **no hay bombas**. Los dos únicos verbos son moverse y **absorber**. Es la premisa registrada para `esquiva-balas` en `references/suggested-games.md` ("el foco es esquivar patrones geométricos de proyectiles escalables, no destruir enemigos").
  - **Nave del jugador:** formas de canvas (rombo de 18×18 px) con **núcleo brillante de 4 px de radio dibujado siempre**, que es literalmente la hitbox circular (`r = 4`). Arranca en `(300, 640)` y se mueve libre por todo el campo (no está confinada al tercio inferior), clampeada al canvas con 8 px de margen. Velocidad única de 240 px/s: **no hay modo preciso** — el recurso de supervivencia fina es el campo, no la velocidad.
  - **Campo de absorción:** manteniendo `Espacio` se activa un anillo de 60 px de radio centrado en la nave. Toda bala cuyo centro entra al anillo es **absorbida** (desaparece) y suma `10 × multiplicador` puntos. Consume `energía`: de 100 a 0 en 2,0 s de uso continuo; regenera 25/s **solo tras 0,5 s sin usarlo**; se puede reactivar con cualquier energía > 0.
  - **Multiplicador de riesgo:** recalculado una vez por frame como `1 + floor(balasEnRadio120 / 4)`, capado en **x8**. Es el corazón del bucle: absorber vale más cuanto más rodeado estás, así que el juego óptimo es meterse en la parte más densa del patrón, no escapar de ella.
  - **Una sola vida:** cualquier bala que toque la hitbox de 4 px termina la partida al instante (mismo criterio que Snake: choque = game over inmediato, sin vidas).
  - **Dificultad 100% procedural y continua, sin oleadas:** una única variable `intensidad = 1 + tiempoVivo / 25` (sube +1 cada 25 s, **sin techo**). Cada `1,6 / sqrt(intensidad)` segundos el generador instancia un **emisor efímero** en un borde aleatorio, eligiendo su patrón de una tabla de pesos que depende de `intensidad`: al inicio solo `lluvia` y `abanico`; desde `intensidad ≥ 3` entra `espiral`; desde `≥ 5`, `anillo`; desde `≥ 7`, `muro` con hueco. Los parámetros escalan con la misma variable: velocidad de bala `90 + 12 · intensidad` px/s, densidad `4 + 2 · intensidad` balas por ráfaga, ambos acotados por el cap de pool.
  - **No hay victoria ni final:** la partida solo termina por impacto. `level = floor(intensidad)` se reporta al HUD como "nivel" y crece indefinidamente.
- **Score:** `+1` cada 100 ms sobrevivido (supervivencia, plano, sin multiplicador) y `+10 × multiplicador` por bala absorbida. No hay bonos de final ni de oleada — el score es puramente "cuánto tiempo aguantaste × cuánto riesgo tomaste".
- **Controles (solo teclado/táctil, sin mouse):** flechas y WASD para mover, `Espacio` **mantenido** para el campo de absorción, `P`/`Escape` como atajo de pausa que escribe el **mismo** flag de pausa interno que el prop `paused` (mismo doble control que SPEC 08). `preventDefault()` en flechas/WASD/espacio mientras el juego está montado, para que mover la nave no scrollee la página (patrón de SPEC 09).
- **Compatibilidad con SPEC 10 sin tocar nada:** el D-pad táctil compartido despacha `KeyboardEvent` sintéticos (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` y `Space`) sobre `window`. Verificado en `app/games/touch-controls.tsx:118` — el botón de acción usa `usePressableCode("Space", false)`, que emite `keydown` al presionar y `keyup` al soltar (el `false` solo desactiva el auto-repeat, no adelanta el `keyup`), así que **mantener** el botón táctil mantiene el campo activo igual que mantener `Espacio` en teclado. No hace falta cambiar `touch-controls.tsx` ni `app/juego/[id]/jugar/page.tsx`.
- **HUD propio dentro del canvas** para las dos métricas que `RealGameState` no puede expresar: barra de **energía** del campo (esquina inferior) y **multiplicador** actual (junto a la nave, tipo `x4`). Ver Decisions y Risks: es un costo explícito de esta variante, no un olvido.
- El componente expone `onStateChange({ score, level })` — **sin `lives` ni `lines`**, igual que Snake, así que el HUD de React muestra solo score y nivel sin tocar `app/juego/[id]/jugar/page.tsx` — y `onGameOver(finalScore)` **una sola vez**, al primer impacto.
- **Rendimiento por diseño (playbook de SPEC 12, aplicado desde el primer commit, no como parche posterior):** pool preasignado de 1200 balas con flag `activo` (cero allocations por frame), iteración con `for` indexado (nunca `forEach`), sprites de bala y del orbe de absorción **horneados una sola vez a canvas offscreen** (3 radios × 2 colores + orbe, glow incluido) y blitteados con `drawImage` en vez de `arc` + `shadowBlur` por bala, escrituras de estilo izadas fuera de los bucles calientes, y **cero `useState` dentro del loop** (todo el estado vive en `useRef`/closure; `onStateChange` se llama a lo sumo ~10 veces por segundo, nunca por frame). El conteo de balas cercanas para el multiplicador se hace en la **misma pasada** que la integración y la colisión, no en un recorrido extra.
- Seed/migración SQL que inserta la fila `"esquiva-balas"` en `games`, ejecutada como parte de este spec (mismo criterio que SPEC 07/08/09 — evita el riesgo de FK rota en `scores`).
- Registrar `"esquiva-balas"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`).

**Edge cases cubiertos (parte del alcance, verificables en Acceptance criteria):**

- **Absorción vs. colisión en el mismo frame:** si una bala entra al campo y toca la hitbox en el mismo paso de integración, **gana la absorción**. Se resuelve absorción antes que colisión, para que el campo se sienta fiable y no mate por un frame de desempate.
- **Energía a 0 con `Espacio` mantenido:** el campo se corta solo y **no vuelve** hasta que el jugador suelte y pasen 0,5 s (evita el exploit de tapping infinito para tener campo permanente).
- **Varias balas absorbidas en el mismo frame:** todas usan el multiplicador calculado al inicio del frame — determinista, sin recursión ni bola de nieve dentro del mismo frame.
- **Multiplicador cayendo mientras absorbés:** esperado y no se compensa. Absorber vacía tu propio entorno y baja tu multiplicador: es la tensión central del diseño, no un bug.
- **Spawn seguro:** ningún emisor se instancia a menos de 140 px del jugador, para que no haya muertes por aparición encima.
- **Cap de pool (1200 balas activas):** el generador deja de instanciar emisores y de emitir ráfagas hasta que se libere espacio, en vez de crecer el array o tirar frames.
- **Pausa (prop `paused` o `P`/`Escape`):** congela el loop, **resetea el acumulador de tiempo al reanudar** (nada de `dt` gigante que teletransporte las balas) y **congela también** `tiempoVivo`, `intensidad` y la regeneración de energía — pausar no puede ser una forma de recargar el campo gratis.
- **Pestaña en background:** `requestAnimationFrame` se detiene; al volver, el `dt` se clampea a 50 ms por frame como máximo.
- **Despawn con margen:** las balas se liberan al salir 40 px por fuera del canvas, no en el borde exacto, para que las trayectorias diagonales entrantes no desaparezcan antes de tiempo.
- **`onGameOver` una sola vez:** protegido por un flag `finalizado`, incluso si dos balas impactan en el mismo frame.
- **Sin `lives`:** el HUD de React no muestra la fila de vidas (misma rama que Snake), y el modal de fin de partida se dispara con el score real al primer impacto.
- **Doble montaje de `useEffect` en dev:** el cleanup cancela el `rAF`, quita todos los listeners y descarta el pool; no quedan dos loops corriendo ni listeners duplicados.
- **Redimensionar la ventana:** solo cambia el escalado CSS; la resolución interna (600×800) y toda la física quedan intactas.

**Out of scope (para futuros specs):**

- Que el jugador dispare, o que el campo destruya emisores (solo absorbe balas).
- Oleadas o niveles diseñados a mano, y cualquier condición de victoria (esta variante es endless por definición).
- Vidas múltiples, continues, escudos.
- Skins `neon`/`retro` propias (`app/games/esquiva-balas/skins.ts`) — las agrega el subagente `skin-designer` después, encadenado por `/spec-impl-game`; el componente acepta la prop opcional `skin` y por ahora renderiza igual en las tres.
- Ajuste responsive general de la ruta (lo cubre `mobile-porter`), incluida la revisión del canvas vertical en `.crt-screen`.
- Extender `RealGameState` con campos para energía/multiplicador, o tocar el HUD de React de `app/juego/[id]/jugar/page.tsx`.
- Sonido.
- Ranking por intensidad/tiempo alcanzado (el leaderboard sigue siendo solo `score`).
- Cambios a la entrada mock heredada `"invasores"` en `app/data/games.ts`.
- Cambios a RLS en `games`/`scores` (sigue sin RLS, decisión heredada de SPEC 06).
- Cualquier ajuste a `app/biblioteca/page.tsx`/`app/salon-de-la-fama/page.tsx`/`app/juego/[id]/page.tsx` más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS`.

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'esquiva-balas',
  'ESQUIVA BALAS',
  'Una vida, sin armas: absorbe las balas desde el centro del peligro.',
  'Un torrente infinito de proyectiles se vuelve más denso cada segundo y no tienes con qué destruirlo. Solo cuentas con un campo de absorción de energía limitada que convierte balas en puntos, multiplicados por cuántas balas te rodean: cuanto más cerca de la muerte juegas, más vale cada absorción. Un solo roce y todo termina.',
  'SHOOTER',
  'cover-esquiva-balas',
  'magenta',
  0,
  '0'
);
```

**Componente del juego — `app/games/esquiva-balas/esquiva-balas-game.tsx`, implementa `RealGameProps` (sin cambios a la interfaz de `app/games/registry.tsx`):**

- `'use client'`, canvas de resolución interna fija 600×800 escalado por CSS, **sin variables globales de módulo**: todo el estado vive en el closure del `useEffect` y en `useRef`.
- Estado encapsulado: `jugador { x, y }`, `energia: number` (0–100), `campoActivo: boolean`, `ultimoUsoCampo: number`, `multiplicador: number`, `pool: Bala[]` (1200 entradas preasignadas), `emisores: Emisor[]` (efímeros, con `vidaRestante`), `score`, `tiempoVivo`, `intensidad`, `pausado`, `finalizado`.
- **Forma de una bala (pool, campos planos, sin objetos anidados):** `{ activo: boolean, x: number, y: number, vx: number, vy: number, r: number, tipo: 0 | 1 | 2 }`. Sin flag de roce: en esta variante el "premio por proximidad" no es el roce sino el multiplicador + la absorción.
- **Forma de un emisor efímero:** `{ x, y, patron: 'lluvia' | 'abanico' | 'espiral' | 'anillo' | 'muro', cadencia, acumulador, angulo, vidaRestante, params: Record<string, number> }`. Se recicla desde un pool chico de 8 emisores.
- **Generador procedural (`elegirPatron(intensidad)`)**: función pura que recibe `intensidad` y un RNG, y devuelve `{ patron, params, borde }` según la tabla de pesos por umbral (`lluvia`/`abanico` desde 1, `espiral` desde 3, `anillo` desde 5, `muro` desde 7). Es el único lugar donde se toca la curva de dificultad — ningún número mágico repartido por el loop.
- **Reporta `onStateChange({ score, level })`** — **no** manda `lives` ni `lines` (rama de HUD ya generalizada por SPEC 07 y usada por Snake); `level = floor(intensidad)`. Se llama con throttle (~10 Hz) y solo cuando algún valor cambió, nunca por frame (memoria del proyecto: minimizar re-renders desde `app/games/**`).
- **`onGameOver(finalScore)`** una única vez (`finalizado`), al primer impacto. El canvas **no** dibuja overlay propio de "GAME OVER": lo cubre el modal existente de `app/juego/[id]/jugar/page.tsx`.
- **`paused`:** el prop de React y las teclas `P`/`Escape` escriben el mismo flag interno; mientras está activo el loop no llama `update(dt)` y no se dibuja overlay propio (el overlay genérico "EN PAUSA" de `jugar/page.tsx` ya cubre todo `.crt-screen`, como documentó SPEC 08).
- **`skin?: SkinId`** se acepta en las props (contrato ya vigente) pero en este spec no altera la paleta — queda para `skin-designer`.

**Assets nuevos:** ninguno en disco. Los sprites (3 radios de bala × 2 colores, más el orbe/anillo del campo de absorción) se hornean en un canvas offscreen al montar, dibujando `arc` + `shadowBlur` una sola vez por sprite, y luego se blitean con `drawImage` (técnica ya validada en `frogger` por SPEC 12 y en `arkanoid` con `bakeTintedSheet`). No se crea `public/games/esquiva-balas/`.

## Implementation plan

1. **Seed primero.** Agregar la fila `"esquiva-balas"` a la tabla `games` de Supabase vía migración nueva en `supabase/migrations/` (nombre tipo `20260826000000_seed_esquiva_balas_game.sql`), con los valores exactos de Data model. Sistema funcional: nada visible cambia todavía, pero queda lista la FK para `scores.game_id = 'esquiva-balas'`.
2. **Cover.** Agregar la clase `.cover-esquiva-balas` (+ pseudo-elementos) en `app/globals.css`, visualmente distinta de `.cover-invaders`, `.cover-asteroids` y del resto de `cover-*` (propuesta: espiral de puntos magenta convergiendo a un núcleo brillante, evocando la absorción). Sistema funcional: `/juego/esquiva-balas` (detalle) ya se ve bien, aunque todavía caiga al fallback de juego sin componente.
3. **Sprites horneados.** Crear el helper interno de horneado offscreen (3 radios × 2 colores + orbe del campo) dentro del módulo del juego, sin tocar disco ni `public/`. Sistema funcional: helper puro, sin efectos en el resto de la app.
4. **Generador procedural.** Implementar `elegirPatron(intensidad, rng)` con su tabla de pesos por umbral y las 5 funciones de patrón (`lluvia`, `abanico`, `espiral`, `anillo`, `muro`) que solo escriben en el pool, más la regla de spawn seguro (≥ 140 px del jugador). Sistema funcional: funciones puras verificables sin loop.
5. **Componente jugable.** Crear `app/games/esquiva-balas/esquiva-balas-game.tsx`: `'use client'`, implementa `RealGameProps`, monta el canvas 600×800, arma el pool de 1200 balas y el de 8 emisores, el loop de `requestAnimationFrame` con acumulador y `dt` clampeado a 50 ms, movimiento con flechas/WASD, campo de absorción con `Espacio` mantenido + gestión de energía (drenaje 2,0 s, regen 25/s tras 0,5 s de reposo, corte forzado a 0), cálculo del multiplicador y de la colisión **en la misma pasada** que la integración (resolviendo absorción antes que colisión), `intensidad` creciente sin techo, HUD interno de energía/multiplicador dibujado en canvas, `preventDefault` en flechas/WASD/espacio, pausa compartida con `P`/`Escape` que congela también `tiempoVivo`/`intensidad`/regeneración, `onStateChange({ score, level })` con throttle y `onGameOver` protegido por flag. Sistema funcional: el componente existe y compila, aunque todavía no esté enchufado a ninguna ruta.
6. **Registro.** Registrar `"esquiva-balas"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`) apuntando a `EsquivaBalasGame`. Sistema funcional: `/juego/esquiva-balas/jugar` ya renderiza el juego real completo; biblioteca, detalle y salón de la fama lo listan automáticamente por iterar sobre `REAL_GAME_IDS` (desde SPEC 07, sin cambios en esas páginas).
7. **Verificación final.** `npm run build` sin errores de tipos/compilación, y prueba manual de una partida completa: mover con flechas y WASD sin scroll de página, ver el núcleo de la hitbox, mantener `Espacio` para absorber y ver la barra de energía drenarse en ~2 s, confirmar que a energía 0 el campo se corta y no vuelve hasta soltar 0,5 s, ver el multiplicador subir hasta x8 metiéndose en la zona densa, comprobar que una bala que entra al campo y a la hitbox en el mismo frame se absorbe (no mata), verificar que ningún emisor aparece encima del jugador, pausar con el botón del HUD y con `P`/`Escape` confirmando que la energía no se regenera en pausa y las balas no saltan al reanudar, dejar la pestaña en background y volver sin salto de física, morir al primer impacto y ver el modal de fin de partida con el score real, guardar la puntuación y verla en `/salon-de-la-fama` y `/juego/esquiva-balas`, y probar el D-pad táctil manteniendo el botón de acción (emulación móvil de DevTools). Confirmar que asteroids, tetris, arkanoid, snake, frogger y los mocks siguen funcionando exactamente igual.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"esquiva-balas"` con `title`, `short`, `long`, `cat: "SHOOTER"`, `color: "magenta"`, `cover: "cover-esquiva-balas"`, `best`, `plays`.
- [ ] `app/globals.css` incluye la clase `.cover-esquiva-balas`, visualmente distinta de `.cover-invaders` y `.cover-asteroids`, y se ve correctamente en biblioteca y en el detalle.
- [ ] `/juego/esquiva-balas` (detalle) funciona igual que los demás juegos reales: info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/esquiva-balas/esquiva-balas-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps` y no usa variables globales de módulo.
- [ ] No se agregó nada a `public/games/` (esta variante no tiene assets en disco).
- [ ] Al entrar a `/juego/esquiva-balas/jugar` se juega el bullet-hell real dentro de `.crt-screen`, con el canvas **vertical 600×800** escalado sin distorsionar el 3:4 y sin desbordar el marco del CRT.
- [ ] La nave se mueve con flechas y WASD por todo el campo, el núcleo de 4 px de la hitbox es visible, y el jugador **no** puede disparar ni tirar bombas.
- [ ] Mantener `Espacio` activa el campo de 60 px: las balas que entran desaparecen y suman `10 × multiplicador`; la barra de energía se vacía en ~2,0 s de uso continuo.
- [ ] Con energía 0 el campo se corta solo y no se puede reactivar hasta soltar `Espacio` y esperar 0,5 s (el tapping rápido no da campo permanente).
- [ ] El multiplicador mostrado junto a la nave sube con la cantidad de balas a ≤ 120 px, en pasos de 4 balas, capado en x8, y baja al vaciarse el entorno.
- [ ] Una bala que entra al campo y toca la hitbox en el mismo frame se **absorbe** (no mata).
- [ ] `level` crece de a 1 cada ~25 s (`floor(intensidad)`), y los patrones nuevos aparecen en sus umbrales: `espiral` desde nivel 3, `anillo` desde 5, `muro` desde 7.
- [ ] El HUD superior de React muestra score y nivel **sin la fila de "Vidas" ni de "Líneas"** (misma rama que Snake), con valores reales en tiempo real.
- [ ] Ningún emisor aparece a menos de 140 px del jugador.
- [ ] Un único impacto termina la partida al instante y dispara el modal de fin de partida existente con el score real, **una sola vez**, sin overlay propio de GAME OVER en el canvas.
- [ ] Tanto el botón "PAUSA"/"REANUDAR" del HUD como `P`/`Escape` alternan el mismo estado de pausa; en pausa no se regenera energía, no crece `intensidad` ni el score, y al reanudar las balas **no** saltan de posición (acumulador reseteado).
- [ ] Volver a la pestaña tras dejarla en background no provoca un salto de física (`dt` clampeado a 50 ms).
- [ ] Guardar la puntuación desde el modal inserta una fila en `scores` de Supabase con `game_id: "esquiva-balas"`.
- [ ] `/salon-de-la-fama` incluye un tab para ESQUIVA BALAS con sus puntuaciones reales.
- [ ] Las flechas/WASD/espacio no producen scroll de la página mientras se juega, y al desmontar el componente los listeners quedan limpios (navegar ida y vuelta a `/jugar` no duplica el loop).
- [ ] El D-pad táctil de SPEC 10 mueve la nave y **mantener** el botón de acción mantiene el campo de absorción activo, sin modificar `app/games/touch-controls.tsx` ni `app/juego/[id]/jugar/page.tsx`.
- [ ] Con el pool saturado (1200 balas) el juego no crece en memoria ni tira frames: el generador deja de emitir hasta liberar espacio.
- [ ] El loop no contiene ningún `useState`, no aloca objetos por frame, itera con `for` indexado, calcula multiplicador + colisión en la misma pasada que la integración, y dibuja las balas con `drawImage` de sprites horneados (no `arc` + `shadowBlur` por bala).
- [ ] Asteroids, Tetris, Arkanoid, Snake, Frogger y los juegos mock siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí (por qué esta variante y no la otra):** endless procedural de una vida con campo de absorción, en vez de las 5 oleadas a mano con 3 vidas y bombas de la variante 1. El trade-off que resuelve distinto es **de dónde sale la dificultad y qué premia el score**: acá no hay contenido autoral que tunear (una sola variable `intensidad` genera la curva, así que el costo de diseño de niveles es cero y la rejugabilidad es infinita), y el score no mide "cuánto huiste" sino "cuánto riesgo tomaste", porque absorber vale más cuanto más rodeado estás. El precio es que no hay victoria, la primera partida es más hostil (una sola vida) y la curva es emergente, así que puede ser injusta en tramos que nadie diseñó. La variante 1 compra legibilidad y un final alcanzable a cambio de trabajo de tuning y un score más plano.
- **Sí:** `id: "esquiva-balas"` — no colisiona con `REAL_GAME_IDS` (`asteroids`, `tetris`, `arkanoid`, `snake`, `frogger`) ni con los ids del catálogo mock (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroids`, `rocas`, `ranaria`, `duelo-pixel`). Es el mismo id ya reservado para este juego en `references/suggested-games.md`.
- **Sí:** `cat: "SHOOTER"` aunque el jugador no dispare. La categoría del catálogo describe el espacio de proyectiles del juego, no el verbo del jugador, y es la categoría con la que este juego está registrado en `suggested-games.md`. Colisiona temáticamente con el mock heredado `invasores` (clon de Space Invaders) solo en superficie: el bucle es opuesto (ahí destruís formaciones, acá no tenés arma).
- **Sí:** `color: "magenta"`. Los cuatro colores del catálogo ya están usados por juegos reales (asteroids=yellow, tetris=cyan, arkanoid=magenta, snake=green, frogger=cyan), así que repetir es inevitable; magenta es el más idiomático para un bullet-hell de neón y el único real que lo usa (arkanoid) está en otra categoría.
- **Sí (desvío del default 800×600):** canvas **600×800 vertical**. Razón concreta, no estética: el formato TATE es el estándar del género danmaku porque el eje largo vertical da tiempo de lectura a los patrones que descienden, y con una sola vida la legibilidad del patrón es la diferencia entre difícil y arbitrario. Precedentes de proporción no-4:3 en el repo: Tetris (300×600) y la variante endless de Frogger (600×800).
- **Sí:** una sola vida, impacto = game over inmediato. Mismo criterio que Snake (donde el crecimiento, no las vidas, es la progresión): acá la progresión es la intensidad, y las vidas diluirían el peso de cada decisión de riesgo, que es justamente lo que el multiplicador quiere hacer valer.
- **Sí:** absorción antes que colisión cuando coinciden en el mismo frame. Con una sola vida, el campo tiene que sentirse confiable; el desempate contrario haría que la mecánica central mate al jugador de forma indistinguible del azar.
- **Sí:** energía con corte forzado a 0 y reposo obligatorio de 0,5 s. Sin el reposo, mantener/soltar rápido daría campo permanente y el juego dejaría de tener esquiva.
- **Sí:** el multiplicador baja al absorber (no se congela). La consecuencia buscada es que no exista una posición óptima estable: vaciar tu entorno reduce tu propia ganancia y te obliga a reposicionarte hacia el peligro.
- **Sí:** energía y multiplicador dibujados **dentro del canvas**. `RealGameState` (`score`, `level`, `lives?`, `lines?`) no puede expresar ninguna de las dos, y extenderlo obligaría a tocar `app/juego/[id]/jugar/page.tsx`, archivo compartido por los 5 juegos reales — mismo criterio de "no tocar el archivo compartido" que ya tomó SPEC 08 con el selector de nivel de Arkanoid. Costo aceptado explícitamente (ver Risks).
- **Sí:** sin modo preciso (`Shift`). En esta variante el recurso de control fino es el campo, que además funciona en táctil (SPEC 10 despacha `Space` con `keydown`/`keyup` reales), así que la experiencia móvil y la de escritorio son mecánicamente equivalentes — a diferencia de la variante 1, donde el modo preciso no tiene botón táctil.
- **Sí:** aplicar el playbook de rendimiento de SPEC 12 desde el primer commit (pool, `for` indexado, sprites horneados, estilos izados, cero `useState` en el loop, multiplicador calculado en la misma pasada). Un bullet-hell endless es el peor caso del catálogo en entidades por frame **y** crece sin techo: arreglarlo después sería reescribir el camino de dibujo entero.
- **No:** que el jugador dispare. Es la premisa registrada del juego; agregar arma lo convertiría en otro Asteroids/Escuadrón y borraría la diferencia mecánica que justificaba agregarlo.
- **No:** oleadas, niveles, ni condición de victoria — son exactamente la propuesta de la variante 1, y mezclarlas dejaría dos juegos a medias en vez de dos propuestas nítidas.
- **No:** sonido — mismo criterio que asteroids/tetris/snake/frogger (solo arkanoid tiene audio, porque su original lo traía).
- **No:** skins propias en este spec — las agrega `skin-designer` encadenado por `/spec-impl-game`; el componente ya acepta la prop opcional `skin`.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** cambios a la entrada mock `"invasores"` en `app/data/games.ts`.

## Risks

| Riesgo                                                                                                                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El escalado CSS del canvas dentro de `.crt-screen` puede introducir letterboxing si el contenedor no respeta el aspect ratio (riesgo estructural heredado desde SPEC 05), **agravado acá** porque 3:4 vertical es más alto que ancho y el marco del CRT está pensado para 4:3. | Usar `aspect-ratio: 3 / 4` con `max-height` dominante (`width: auto; height: auto`), el mismo enfoque que resolvió el 600×800 de la variante endless de Frogger; verificación manual en el paso 7 y, si hace falta ajuste responsive fino, se delega a `mobile-porter`.         |
| Doble montaje de `useEffect` en dev (React 19 StrictMode) puede dejar dos loops de `rAF` y listeners de teclado duplicados — riesgo ya mitigado en SPEC 05/07/08/09.                                                                                                           | Cancelar el `rAF` y remover `keydown`/`keyup` en el `return` del `useEffect`; probar recarga y navegación de ida/vuelta a `/jugar` (paso 7).                                                                                                                                    |
| Sin RLS, cualquiera con la publishable key puede insertar puntajes arbitrarios en `scores` con `game_id: "esquiva-balas"` (riesgo aceptado desde SPEC 06).                                                                                                                     | Aceptado explícitamente; queda documentado como deuda para cuando haya auth real.                                                                                                                                                                                               |
| Si el seed de la fila `"esquiva-balas"` no corre antes de exponer el componente jugable, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                                                                                                            | El plan corre el seed en el paso 1 y registra el componente en el paso 6; el paso 7 verifica a mano que guardar un puntaje funciona.                                                                                                                                            |
| **Costo explícito de la variante:** `RealGameState` no puede expresar la energía del campo ni el multiplicador de riesgo, las dos métricas que el jugador necesita leer a cada instante; el HUD de React solo mostrará score y nivel.                                          | Se dibujan dentro del canvas (barra de energía + `xN` junto a la nave), sin tocar `app/juego/[id]/jugar/page.tsx` ni extender la interfaz compartida. Aceptado como costo de diseño: la información crítica queda en el canvas, el HUD compartido queda incompleto a propósito. |
| **Propio de la variante:** cientos de balas por frame con densidad que crece **sin techo** es el peor caso de render del catálogo; a intensidad alta el frame time puede caer muy por debajo de los ~18–40 ms que ya miden los demás juegos.                                   | Sprites de glow horneados + `drawImage`, pool de 1200 sin allocations, `for` indexado, estilos izados, multiplicador y colisión en la misma pasada, cero `useState` en el loop (playbook de SPEC 12); el cap de pool actúa además como techo duro de carga de dibujo.           |
| **Propio de la variante:** dificultad emergente sin autor puede producir tramos injustos (p. ej. `anillo` + `muro` coincidiendo y cerrando todas las salidas) o, al revés, mesetas aburridas.                                                                                  | Toda la curva vive en `elegirPatron(intensidad)` (un solo lugar, tabla de pesos por umbral) y hay reglas duras de justicia: spawn seguro a ≥ 140 px y umbrales de aparición por patrón; el paso 7 exige llegar al menos a nivel 5 y se acepta re-tunear esa tabla.              |
| **Propio de la variante:** una sola vida + curva infinita puede hacer que las primeras partidas duren 20 s y el juego se sienta hostil, hundiendo la retención frente al resto del catálogo (asteroids/arkanoid/frogger dan 3 vidas).                                          | `intensidad` arranca en 1 con solo `lluvia`/`abanico` y sube +1 cada 25 s (los primeros ~50 s son deliberadamente laxos), y el campo de absorción está disponible desde el segundo 0 como red de seguridad activa.                                                              |
| **Propio de la variante:** con densidad alta, un `dt` grande (background, GC pause) puede hacer que una bala atraviese la hitbox de 4 px entre frames sin registrar colisión (tunneling), y con una sola vida el error es fatal en ambos sentidos.                             | `dt` clampeado a 50 ms y velocidad de bala acotada por `90 + 12 · intensidad` con techo duro (~320 px/s ⇒ ≤ 16 px por frame de 50 ms, mayor que el radio de colisión combinado); si la intensidad alta exigiera balas más rápidas, subdividir el paso de integración.           |
| **Propio de la variante:** el multiplicador y la absorción son explotables si existe una posición "segura pero densa" estable (p. ej. una esquina donde las balas se acumulen sin llegar a la hitbox).                                                                         | El generador emite desde bordes aleatorios (no solo desde arriba) y el multiplicador se calcula sobre balas **vivas a ≤ 120 px**, que el propio campo elimina al absorberlas: farmear vacía el entorno y baja el multiplicador. Verificar a mano las 4 esquinas en el paso 7.   |
| **Propio de la variante:** pausar podría usarse para regenerar energía gratis o para congelar el peligro sin costo.                                                                                                                                                            | La pausa congela `tiempoVivo`, `intensidad`, el score por supervivencia **y** la regeneración de energía; criterio verificado explícitamente en Acceptance criteria.                                                                                                            |

## What is **not** in this spec

- Que el jugador dispare, o que el campo destruya emisores.
- Oleadas/niveles diseñados a mano y cualquier condición de victoria.
- Vidas múltiples, continues o escudos.
- Extender `RealGameState` con energía/multiplicador, o tocar el HUD de React de `app/juego/[id]/jugar/page.tsx`.
- Skins `neon`/`retro` propias (las agrega `skin-designer`).
- Ajuste responsive general de la ruta, incluida la revisión fina del canvas vertical (lo cubre `mobile-porter`).
- Sonido.
- Ranking por intensidad/tiempo alcanzado (el leaderboard sigue siendo solo `score`).
- Cambios a la entrada mock heredada `"invasores"`.
- Cambios a RLS en `games`/`scores`.
- Cualquier ajuste a las páginas de catálogo más allá de que listen automáticamente al juego por iterar sobre `REAL_GAME_IDS`.

Cada uno de estos, si se implementa, va en su propio spec.
