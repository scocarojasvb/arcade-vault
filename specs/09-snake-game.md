# SPEC 09 — Juego Snake

> **Estado:** Approved
> **Depende de:** SPEC 04 (supabase-setup), SPEC 06 (leaderboard-supabase), SPEC 07 (tetris-game / registro genérico de juegos reales)
> **Fecha:** 2026-08-05
> **Objetivo:** Agregar un nuevo juego real "SNAKE" al catálogo de Arcade Vault, diseñado desde cero (sin carpeta de referencia en `references/started-games`) a partir de la descripción del usuario y los assets provistos en `references/source-assets/snake-assets` (spritesheet de frutas `fruits.png` + atlas `sprites.js`), como componente cliente registrado en `REAL_GAME_COMPONENTS`.

## Scope

**In:**

- Nueva entrada en la tabla `games` de Supabase: id `"snake"`, título "SNAKE", descripciones corta/larga acordadas, `cat: "ARCADE"`, `color: "green"`, `cover: "cover-snake-real"`, `best`/`plays` iniciales en 0.
- Nueva clase CSS `.cover-snake-real` en `app/globals.css`, visualmente distinta de `.cover-snake` (mock "serpentina") y del resto de `cover-*`.
- Diseño e implementación desde cero (no port) del juego Snake clásico como componente cliente React: grilla de 40×30 celdas de 20px sobre canvas 800×600, serpiente dibujada como bloques neon (sin sprite propio), comida dibujada usando sprites aleatorios del atlas `fruits.png`/`sprites.js`, movimiento por turnos/tick con flechas o WASD, choque contra sí misma o contra el borde = game over inmediato (1 vida), velocidad +5% cada 5 frutas comidas, 10 puntos por fruta.
- Copiar `fruits.png` a `public/games/snake/` y portar el atlas de coordenadas (`sprites.js`) a un módulo TS interno del componente (sin variables globales de `window`).
- Registrar `"snake"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`).
- El componente expone `onStateChange({ score, level })` (sin `lives`/`lines`) y `onGameOver(finalScore)` al chocar.
- Prevenir que las teclas de flecha/espacio/WASD hagan scroll de la página mientras se juega (`preventDefault` en el listener de teclado).
- Seed/migración SQL que inserta la fila `"snake"` en `games`, ejecutada como parte de este spec.

**Out of scope (para futuros specs):**

- Controles táctiles/swipe.
- Efectos distintos por tipo de fruta (todas dan el mismo efecto).
- Sonido.
- Wrap-around en los bordes.
- Múltiples vidas.
- Cambios a la entrada mock existente `"serpentina"` en `app/data/games.ts`.
- Cambios a RLS en `games`/`scores`.

## Data model

**Nueva fila en la tabla `games` de Supabase:**

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'snake',
  'SNAKE',
  'Devora frutas de neón y crece sin chocar contigo mismo.',
  'Guía una serpiente de píxeles por una grilla infinita, devorando frutas brillantes que la hacen crecer y acelerar. Un choque contra tu propia cola o el borde del campo termina la partida al instante.',
  'ARCADE',
  'cover-snake-real',
  'green',
  0,
  '0'
);
```

**Componente del juego — `app/games/snake/snake-game.tsx`, implementa `RealGameProps` (sin cambios a la interfaz):**

- Encapsula dentro del componente/closure (sin variables globales): grilla lógica de 40×30 celdas de 20px, `snake[]` (segmentos), `direction`/`nextDirection`, `food { x, y, sprite }`, `score`, intervalo de tick (velocidad actual), `gameState`.
- Loop basado en un acumulador de tiempo (deltaTime) sobre `requestAnimationFrame`, no un movimiento por frame — el intervalo de tick define la velocidad lógica, independiente del framerate de dibujo.
- Reporta `onStateChange({ score, level })` — `level` refleja el tramo de velocidad/frutas comidas; no usa `lives` ni `lines`.
- `onGameOver(finalScore)` se invoca una única vez, al chocar contra sí misma o contra el borde.
- Bloquea el cambio de dirección a la opuesta de la actual en el mismo tick (evita giro de 180° instantáneo).
- Escucha flechas y WASD, con `preventDefault()` en esas teclas mientras el juego está activo, para que el movimiento no dispare scroll de la página.
- Módulo TS interno con el atlas de sprites (coordenadas de `fruits.png`), portado de `sprites.js` como constantes tipadas, sin depender de `window`.

**Assets nuevos (estáticos, sin tabla asociada):**

- `public/games/snake/fruits.png`

## Implementation plan

1. Agregar la fila `"snake"` a la tabla `games` de Supabase vía seed/migración (`supabase/seed.sql` o migración nueva), con los valores acordados en Data model. Sistema funcional: no afecta nada visible aún, deja lista la FK para `scores.game_id = 'snake'`.
2. Agregar la clase CSS `.cover-snake-real` (+ pseudo-elementos) en `app/globals.css`, distinta de `.cover-snake` (mock "serpentina") y del resto de covers. Sistema funcional: `/juego/snake` (detalle) ya se ve correctamente vía `REAL_GAME_IDS`, aunque aún no haya componente jugable.
3. Copiar `fruits.png` desde `references/source-assets/snake-assets/` a `public/games/snake/`.
4. Portar las coordenadas de `sprites.js` a un módulo TS interno (dentro de `snake-game.tsx` o un archivo hermano `sprites.ts`) como constantes tipadas, sin usar `window.SPRITE_ATLAS`.
5. Crear `app/games/snake/snake-game.tsx`: implementa `RealGameProps`, monta un `<canvas>` 800×600 (escalado por CSS), grilla lógica 40×30 de 20px, loop por tick con acumulador de tiempo (velocidad inicial + incremento del 5% cada 5 frutas comidas), control por flechas/WASD con `preventDefault` (evita scroll de página) y bloqueo de giro de 180°, detección de colisión contra bordes y contra el propio cuerpo, comida dibujada con un sprite aleatorio del atlas portado, `onStateChange({ score, level })` y `onGameOver(finalScore)` una sola vez al chocar. Sistema funcional: el componente existe y compila, aunque todavía no está enchufado a ninguna ruta.
6. Registrar `"snake"` en `REAL_GAME_IDS` (`app/data/real-games.ts`) y en `REAL_GAME_COMPONENTS` (`app/games/registry.tsx`), apuntando a `SnakeGame`. Sistema funcional: `/juego/snake/jugar` ya renderiza el juego real completo; biblioteca/salón de la fama/detalle lo listan automáticamente (ya iteran sobre `REAL_GAME_IDS` desde SPEC 07, sin cambios adicionales en esas páginas).
7. Verificación final: `npm run build` sin errores de tipos/compilación, y prueba manual — jugar una partida completa (mover con flechas y con WASD sin que la página haga scroll, comer frutas con sprites aleatorios del atlas y crecer, ver la velocidad subir cada 5 frutas, chocar contra el borde y contra sí misma para confirmar el game over inmediato, ver el modal de fin de partida existente con el score real, guardar puntuación y verla en `/salon-de-la-fama` y `/juego/snake`), confirmando que asteroids, tetris, arkanoid y los juegos mock (incluida "serpentina") siguen funcionando exactamente igual.

## Acceptance criteria

- [ ] La tabla `games` de Supabase contiene la fila `"snake"` con `title`, `short`, `long`, `cat: "ARCADE"`, `color: "green"`, `cover: "cover-snake-real"`, `best`, `plays`.
- [ ] `app/globals.css` incluye la clase `.cover-snake-real`, visualmente distinta de `.cover-snake` (mock) y de las demás covers.
- [ ] `/juego/snake` (detalle) funciona igual que los demás juegos reales: muestra info desde Supabase, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/snake/snake-game.tsx` existe, compila sin errores de tipos, implementa `RealGameProps`, y no usa variables globales.
- [ ] `fruits.png` está en `public/games/snake/` y se carga correctamente en el navegador.
- [ ] Al entrar a `/juego/snake/jugar`, se juega Snake real: mover con flechas/WASD, comer frutas (sprites aleatorios del atlas), crecer, acelerar cada 5 frutas, y chocar con el borde o consigo misma termina el juego de inmediato.
- [ ] Las teclas de flecha/WASD/espacio no producen scroll de la página mientras se juega.
- [ ] El HUD superior de React muestra el score (y nivel/velocidad) sin mostrar "Vidas" ni "Líneas".
- [ ] Al chocar, aparece el modal de fin de partida existente con el score real.
- [ ] Guardar la puntuación desde el modal inserta correctamente una fila en `scores` de Supabase con `game_id: "snake"`.
- [ ] `/salon-de-la-fama` incluye un tab para Snake con sus puntuaciones reales.
- [ ] Asteroids, Tetris, Arkanoid y los juegos mock (incluida "serpentina") siguen funcionando exactamente igual que antes.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** id `"snake"` distinto de `"serpentina"` (mock existente, sin tocar). Evita confusión entre el mock falso y el juego real.
- **Sí:** `color: "green"`, aunque se repite visualmente con el mock "serpentina" en biblioteca. El usuario prefirió el color temático clásico de Snake sobre evitar duplicados de color.
- **Sí:** canvas interno fijo en 800×600, igual que asteroids/tetris/arkanoid, con una grilla lógica de 40×30 celdas de 20px encima. Mantiene el patrón ya validado en vez de introducir un aspect ratio nuevo.
- **Sí:** 1 vida, choque = game over inmediato. Fiel al Snake clásico, a diferencia de asteroids/arkanoid (3 vidas) porque en Snake el "crecimiento" ya es la progresión, no las vidas.
- **Sí:** sin sprite propio de serpiente (no incluido en el atlas provisto) — se dibuja como bloques neon, coherente con el lenguaje visual del resto del catálogo.
- **Sí:** todas las frutas dan el mismo efecto (crecer +1, +10 puntos), eligiendo el sprite al azar solo por variedad visual, sin tabla fruta→efecto.
- **Sí:** sin wrap-around — chocar con el borde termina el juego, patrón clásico de Snake.
- **Sí:** `preventDefault` en flechas/espacio/WASD durante el juego, para que mover la serpiente no scrollee la página (pedido explícito del usuario).
- **Sí:** velocidad +5% cada 5 frutas comidas, 10 puntos por fruta — escalado gradual similar en espíritu al incremento de velocidad de tetris cada 10 líneas.
- **No:** sonido — a diferencia de arkanoid, el diseño desde cero no incluyó esta vez efectos de audio como parte del MVP.
- **No:** controles táctiles/swipe — fuera de alcance, ningún juego real anterior los tiene.
- **No:** cambios a RLS en `games`/`scores` — sigue sin RLS, decisión heredada de SPEC 06.
- **No:** cambios a la entrada mock `"serpentina"` en `app/data/games.ts`.

## Risks

| Riesgo                                                                                                                                                                                   | Mitigación                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El escalado CSS del canvas de 800×600 puede introducir letterboxing si el contenedor no respeta el aspect ratio 4:3, mismo riesgo ya documentado en SPEC 05.                             | Usar `aspect-ratio` CSS y sizing tipo `object-fit` (max-width/max-height con `width: auto; height: auto`); verificación manual en el paso 7 del plan.      |
| Un loop de movimiento por tick mal implementado (p. ej. atado a `rAF` sin acumulador) puede hacer que la serpiente se mueva a velocidad inconsistente según el refresh rate del monitor. | Usar un acumulador de tiempo (deltaTime) y un intervalo lógico de tick independiente del framerate de dibujo.                                              |
| Escuchar `keydown` para prevenir scroll (`preventDefault`) podría interferir con la navegación normal del resto de la app si el listener no se limpia al desmontar.                      | Registrar el listener solo mientras el componente está montado y limpiarlo en el cleanup del `useEffect`, mismo patrón que asteroids/tetris/arkanoid.      |
| Cambiar de dirección en el mismo tick puede permitir un giro de 180° instantáneo (chocar contra el segundo segmento del propio cuerpo de forma no intencional).                          | Bloquear el cambio a la dirección opuesta a la actual hasta el siguiente tick.                                                                             |
| Sin RLS, cualquiera con la anon/publishable key puede insertar puntajes arbitrarios en `scores` para `game_id: "snake"`, mismo riesgo ya aceptado en SPEC 06/07/08.                      | Aceptado explícitamente; queda documentado como deuda para cuando exista auth real.                                                                        |
| Si el seed de la fila `"snake"` no corre antes de que un usuario guarde un puntaje, el `INSERT` en `scores` falla por violación de FK (`game_id` inexistente).                           | El plan corre el seed (paso 1) antes de exponer el componente jugable (paso 6); verificación manual en el paso 7 confirma que guardar un puntaje funciona. |

## What is **not** in this spec

- Controles táctiles/swipe.
- Efectos distintos por tipo de fruta (todas dan el mismo efecto).
- Sonido.
- Wrap-around en los bordes.
- Múltiples vidas.
- Cambios a la entrada mock existente `"serpentina"`.
- Cambios a RLS en `games`/`scores`.

Cada uno de estos, si se implementa, va en su propio spec.
