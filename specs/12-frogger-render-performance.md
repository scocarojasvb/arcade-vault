# SPEC 12 — Rendimiento del render de Frogger

> **Estado:** Implementado
> **Depende de:** SPEC 11 (frogger-game)
> **Fecha:** 2026-08-21
> **Objetivo:** Diagnosticar y corregir el cuello de botella de rendimiento del bucle de dibujo de Frogger (rectángulos redondeados dibujados a mano con `arcTo` y el glow por `shadowBlur` recalculado cada frame) para sostener ~60fps de forma indefinida en las tres skins y en toda la progresión de niveles, sin cambiar el aspecto visual del juego ni tocar ningún otro juego del catálogo.

## Scope

**In:**

- Diagnóstico inicial: perfilar `frogger-game.tsx` con Chrome DevTools Performance (grabación) en las 3 skins y en nivel 1, nivel 5 y un nivel "infinito" (ej. nivel 8) para confirmar los cuellos de botella (helper `roundRect()` manual con `arcTo`, `shadowBlur`/`shadowColor` recalculado cada frame, closures/asignaciones redundantes) antes de aplicar los fixes — deja una medición base documentada.
- Sustituir el helper `roundRect()` manual (4 `ctx.arcTo`) por el método nativo `ctx.roundRect()` del Canvas 2D en los lugares donde se dibujan troncos y vehículos.
- Reducir asignaciones y closures redundantes en los bucles de dibujo por frame (evitar recrear arrow functions en caminos calientes, evitar reescribir `ctx.fillStyle`/`shadowColor` cuando no cambia, etc.), sin alterar el resultado visual.
- Para las skins `classic`/`neon`: sustituir el recálculo de `shadowBlur`/`shadowColor` por forma y por frame (troncos, tortugas, vehículos, nenúfar libre) por un sprite de "glow" pre-renderizado una sola vez en un canvas offscreen y compuesto con `drawImage` cada frame — mismo aspecto visual, costo por frame mucho menor. El sprite se regenera solo cuando cambia el skin, reutilizando el hook `skinRef`/`redrawRef` que ya existe.
- Todo el estado nuevo que esto introduzca (sprite offscreen, valores cacheados) vive como variable de closure o `useRef` dentro del mismo `useEffect`, nunca `useState` — cero re-renders nuevos de React.
- Verificación final: grabación de DevTools Performance mostrando frame time sostenido ~16ms (60fps) sin tareas largas relevantes, en las 3 skins, en nivel 1, nivel 5 y nivel "infinito" (ej. nivel 8+), jugando una partida real.
- `npm run build` sin errores de tipos/compilación.

**Out of scope (para futuros specs):**

- Cualquier cambio a asteroids, tetris, arkanoid o snake, incluida su auditoría de performance — decisión explícita: esta spec es solo Frogger.
- Cambios a la mecánica/jugabilidad de Frogger (tabla `LEVELS`, colisiones, puntuación, temporizador, respawn) — es exclusivamente un fix de rendering.
- Cambios al contrato `RealGameProps` o a `app/juego/[id]/jugar/page.tsx`.
- Un contador de FPS visible en producción (la verificación elegida es DevTools, no un overlay en el juego).
- Cambios a los valores de color/glow en `app/games/frogger/skins.ts` — se sigue usando `glowPlatform`/`glowVehicle`/`glowActor` tal cual, solo cambia cómo se aplican internamente.
- CSS compartido (`.crt-screen`, animaciones, `backdrop-filter`) o el layout de `/juego/[id]/jugar` — aunque puedan sumar costo de composición, afectan a todos los juegos por igual y no son un problema específico de Frogger.
- Cambios a Supabase o a specs de otros juegos.

## Data model

No hay datos persistidos nuevos (nada en Supabase, nada en `localStorage`) — es un fix interno de rendering sobre un componente ya existente. Sí se introduce una estructura interna nueva, **no persistida**, como variable de closure dentro del mismo `useEffect` de `frogger-game.tsx`:

```ts
interface GlowSprite {
  canvas: HTMLCanvasElement; // sprite offscreen cuadrado, pre-renderizado
  size: number; // ancho = alto del sprite, en px
}
```

- Un puñado de `GlowSprite` (uno por rol: plataforma, vehículo, actor — los mismos tres que hoy definen `glowPlatform`/`glowVehicle`/`glowActor` en `FroggerSkin`), cacheados como variables de closure (nunca `useState`), construidos una vez en `init()` y **reconstruidos solo cuando cambia el skin** — mismo punto donde hoy ya se dispara `redrawRef.current?.()` al cambiar `skinRef.current`.
- Cada sprite es un canvas offscreen con el blob de glow (color + `shadowBlur` del skin) dibujado **una sola vez**; en el loop de juego se compone con `drawImage` en la posición de cada tronco/tortuga/vehículo, en vez de pedirle al motor de canvas que recalcule el blur en cada `fill()` de cada frame.
- No se agregan campos nuevos a `FroggerSkin` (`app/games/frogger/skins.ts`): los sprites se generan a partir de los valores `glowPlatform`/`glowVehicle`/`glowActor` y de color que ya existen ahí. Para `retro` (glow en `0`), simplemente no se genera/compone sprite — se mantiene el camino actual sin blur.

## Implementation plan

1. **Medición base**: grabar con Chrome DevTools Performance una partida en `/juego/frogger/jugar`, en las 3 skins, en nivel 1 y forzando temporalmente (solo para medir, sin commitear cambios de gameplay) nivel 5 y un nivel "infinito" (ej. nivel 8). Documentar qué domina el frame time (`arcTo`, `shadowBlur`, asignaciones redundantes). Sistema funcional: no se toca código de producción, solo medición.
2. **`roundRect()` manual → `ctx.roundRect()` nativo** en `drawPlatforms` (troncos) y `drawVehicles`. Sistema funcional: mismo resultado visual, ruta de dibujo más liviana en las 3 skins.
3. **Eliminar closures/asignaciones redundantes** en los bucles calientes (`drawPlatforms`, `drawVehicles`, `isHitByVehicle`, etc.) sin cambiar comportamiento — por ejemplo, `for` en vez de `forEach` con arrow function recreada cada frame, evitar reescribir `ctx.fillStyle`/`shadowColor` cuando no cambió respecto a la forma anterior. Sistema funcional: mismo juego, menos trabajo por frame.
4. **Cacheo de glow (`GlowSprite`) para `classic`/`neon`**: generar los sprites offscreen en `init()` y al cambiar de skin; sustituir las llamadas a `shadowBlur`/`shadowColor` + `fill` por composición con `drawImage` en `drawPlatforms`/`drawVehicles`/`drawLilypads`/`drawFrog`. `retro` sigue su camino actual sin sprite (glow en `0`). Sistema funcional: el juego se ve igual, mismo glow, pero compuesto en vez de recalculado cada frame.
5. **Verificación final**: repetir las grabaciones de DevTools Performance del paso 1 (3 skins × nivel 1 / nivel 5 / nivel infinito) y confirmar frame time sostenido ~16ms sin tareas largas; jugar una partida completa en cada skin para confirmar que el aspecto visual no cambió perceptiblemente; `npm run build` sin errores; confirmar que asteroids, tetris, arkanoid y snake siguen funcionando exactamente igual (no se tocó nada compartido).

## Acceptance criteria

- [ ] Grabación de DevTools Performance en **nivel 1** muestra frame time sostenido ~16ms (≥55fps) en las 3 skins (classic, neon, retro).
- [ ] Grabación de DevTools Performance en **nivel 5** muestra frame time sostenido ~16ms (≥55fps) en las 3 skins.
- [ ] Grabación de DevTools Performance en un **nivel "infinito"** (ej. nivel 8+) muestra frame time sostenido ~16ms (≥55fps) en las 3 skins.
- [ ] El helper `roundRect()` manual (basado en `arcTo`) ya no se usa para dibujar troncos/vehículos; se usa `ctx.roundRect()` nativo.
- [ ] `classic` y `neon` siguen mostrando el mismo glow visual (color, intensidad, forma) en troncos, tortugas, vehículos, nenúfar libre/ocupado y rana — sin diferencia perceptible a simple vista respecto al comportamiento anterior.
- [ ] `retro` sigue sin glow (comportamiento sin cambios).
- [ ] Ningún estado nuevo se implementa con `useState`; todo el estado nuevo (sprites de glow, cachés) vive en variables de closure o `useRef` dentro del `useEffect` existente.
- [ ] No cambia ninguna regla de jugabilidad: colisiones, puntuación, temporizador, vidas, niveles y transición de nivel se comportan igual que antes del fix.
- [ ] No se modifican `RealGameProps`, `app/juego/[id]/jugar/page.tsx`, ni los valores de `app/games/frogger/skins.ts`.
- [ ] Asteroids, Tetris, Arkanoid y Snake siguen funcionando exactamente igual que antes (no se tocó código compartido).
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** alcance limitado exclusivamente a Frogger — ningún cambio ni auditoría en asteroids/tetris/arkanoid/snake. Decisión explícita del usuario, aunque el pedido inicial mencionaba "posiblemente en los demás"; si aparece un problema similar en otro juego, es su propia spec.
- **Sí:** enfoque de dos frentes en la misma spec — `ctx.roundRect()` nativo + limpieza de closures/asignaciones (arregla las 3 skins) y glow horneado a sprite offscreen (preserva el look en classic/neon) — en vez de dividir en dos specs o apostar solo por una técnica. Se decidió así porque el hallazgo de que `retro` (glow en 0) también sufre el problema descarta `shadowBlur` como única causa: hacía falta atacar el costo base además del glow.
- **Sí:** preservar el aspecto visual actual del glow mediante un sprite pre-renderizado, en vez de simplificarlo o quitarlo de troncos/vehículos. El usuario priorizó mantener el look aunque el fix sea más elaborado.
- **Sí:** verificación mediante grabación de Chrome DevTools Performance, no un contador de FPS visible en pantalla. Evita agregar UI de diagnóstico (temporal o permanente) al juego.
- **Sí:** todo el estado nuevo (sprites de glow, cachés) vive en `useRef`/variables de closure, nunca `useState`. Pedido explícito del usuario para minimizar re-renders de React en el loop de juego; coincide con el patrón que ya usa `frogger-game.tsx` para `paused`/`skin`/callbacks.
- **Sí:** el objetivo de 60fps debe sostenerse de forma indefinida, incluida la progresión infinita post-nivel 5, no solo hasta nivel 5. La cantidad de formas dibujadas por frame no crece más allá del nivel 5 (solo la velocidad), así que una vez resuelto el cuello de botella de dibujo el objetivo debería sostenerse sin límite.
- **Sí:** el primer paso del plan es perfilar (medición base) antes de tocar código. El análisis estático hecho para esta spec descartó `shadowBlur` como única causa pero no midió el peso relativo real de `arcTo` vs. closures vs. `shadowBlur`; medir antes de aplicar los fixes reduce el riesgo de optimizar algo que no era el cuello de botella dominante.
- **No:** no se agrega ningún campo nuevo a `FroggerSkin` (`app/games/frogger/skins.ts`) ni se cambia su interfaz — los sprites de glow se derivan de los valores existentes (`glowPlatform`/`glowVehicle`/`glowActor` + color). Evita reabrir el contrato de skins que mantiene `skin-designer`.
- **No:** no se toca CSS compartido (`.crt-screen`, `backdrop-filter`, animaciones de la página `/juego/[id]/jugar`) aunque también podría sumar costo de composición. Afecta a todos los juegos por igual, no es específico de Frogger, y tocarlo reabriría el trabajo de `mobile-porter`/otros juegos — fuera de alcance de esta spec.
- **No:** no se agrega un contador de FPS visible ni instrumentación permanente en producción — la verificación es manual vía DevTools en el paso final del plan.

## Risks

| Riesgo                                                                                                                                                                                                                                                                      | Mitigación                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El sprite de glow horneado podría no verse pixel-idéntico al `shadowBlur` real del navegador si se aproxima el halo "a mano" (radio/opacidad estimados).                                                                                                                    | Generar el sprite dibujando la forma **con el `shadowBlur`/`shadowColor` reales activados dentro del canvas offscreen**, una sola vez — así el resultado es el mismo pixel a pixel que hoy, solo que cacheado en vez de recalculado cada frame.                                                     |
| Troncos y vehículos cambian de ancho entre niveles (`logLength`/`vehicleGap` distintos en `LEVELS`), mientras que el sprite cacheado por rol (plataforma/vehículo/actor) es de tamaño fijo — riesgo de que el glow se vea "recortado" en los extremos de formas más largas. | El sprite representa solo el halo alrededor del contorno (depende del radio de blur, no del ancho de la forma) y se compone estirado/repetido según el ancho real en cada frame; verificar visualmente en el paso 5 con logs cortos (nivel 4-5) y largos (nivel 1) que no haya recorte perceptible. |
| Doble montaje en desarrollo (React Strict Mode) podría generar sprites de glow duplicados o dejar referencias huérfanas si el cleanup no las libera.                                                                                                                        | Los sprites se crean como variables de closure dentro del mismo `useEffect` que ya cancela el `rAF` y remueve listeners en su cleanup (mismo patrón validado en los 4 juegos reales existentes) — nada vive en variables de módulo/`window`.                                                        |
| El propio grabador de Chrome DevTools Performance añade cierto overhead, lo que puede sesgar la lectura absoluta de fps durante la medición.                                                                                                                                | Interpretar "~16ms sostenido" de forma relativa (medición base del paso 1 vs. medición final del paso 5), no como un número absoluto perfecto; complementar con la sensación de fluidez al jugar manualmente sin DevTools abierto.                                                                  |

## Medición base (Paso 1)

Grabado con el mismo mecanismo que usa el panel Performance de DevTools (dominio `Tracing` del protocolo CDP, categoría `disabled-by-default-v8.cpu_profiler`), pilotado automáticamente sobre Chrome headless contra `/juego/frogger/jugar` servido por `next dev`, simulando una partida corta (~6s, teclas de flecha alternadas) por combinación. `retro` y `classic` se midieron en nivel 1, 5 y 8 (infinito); `neon` se verificó en nivel 1 (su composición de costo es equivalente a `classic`, ambos con glow > 0). El override de nivel (`level = 5` / `level = 8` en `init()`) fue temporal, revertido con `git checkout` antes de continuar — no se commiteó ningún cambio de gameplay.

| Config            | avg frame (ms) | p95 (ms) | fps est. | costo activo top-3 (self time)                     |
| ----------------- | -------------: | -------: | -------: | -------------------------------------------------- |
| classic — nivel 1 |          18.17 |     33.3 |     55.0 | `fill` 8.68 · `arcTo` 3.55 · `drawPlatforms` 3.53  |
| retro — nivel 1   |          18.48 |     33.3 |     54.1 | `fill` 7.77 · `arcTo` 5.15 · `fillRect` 3.26       |
| neon — nivel 1    |          18.37 |     33.3 |     54.4 | `fill` 8.04 · `drawPlatforms` 4.19 · `arcTo` 3.41  |
| classic — nivel 5 |          18.69 |     33.4 |     53.5 | `fill` 11.41 · `drawPlatforms` 5.25 · `arcTo` 3.97 |
| retro — nivel 5   |          18.80 |     33.3 |     53.2 | `fill` 10.28 · `arcTo` 5.15 · `drawPlatforms` 4.88 |
| classic — nivel 8 |          18.74 |     33.3 |     53.4 | `fill` 9.34 · `arcTo` 4.78 · `drawPlatforms` 3.77  |
| retro — nivel 8   |          18.69 |     33.3 |     53.5 | `fill` 11.04 · `arcTo` 4.22 · `drawPlatforms` 4.01 |

(Los valores absolutos de fps están sesgados a la baja por correr en Chrome headless compartiendo CPU con `next dev` y el propio recorder — se interpretan de forma relativa entre filas, según el riesgo documentado arriba.)

**Qué domina el frame time:**

1. **`fill`/`arcTo` (llamadas nativas de Canvas2D) son el costo dominante en las 7 configuraciones, incluida `retro`** (glow en `0` en las tres formas). Esto confirma la hipótesis de la spec: `shadowBlur` **no** es la causa dominante — el costo base de trazar el contorno a mano con 4 `arcTo` por rectángulo (troncos y vehículos, docenas por frame) pesa igual con o sin glow. → justifica el paso 2 (`ctx.roundRect()` nativo) como el fix de mayor impacto, independiente del paso 4.
2. **`drawPlatforms`/`drawVehicles` (self time de las funciones JS, no de las llamadas de canvas)** aparecen siempre en el top-3, y su costo sí crece un poco más en `classic`/`neon` que en `retro` a igualdad de nivel (ej. nivel 5: `drawPlatforms` 5.25ms en classic vs. 4.88ms en retro) — la diferencia atribuible a `shadowColor`/`shadowBlur` reescritos en cada forma es real pero secundaria frente al costo de `fill`/`arcTo`. → confirma que el paso 4 (sprite de glow) aporta, pero el paso 2+3 son los que más rinden.
3. El costo activo total (suma de funciones no-idle) sube de nivel 1 → nivel 5 (~29ms → ~40ms en classic) pero **no sigue subiendo de nivel 5 → nivel 8** (~35ms) — coincide con la decisión ya documentada de que la cantidad de formas no crece más allá de nivel 5 (solo la velocidad), así que no hay un cuello de botella adicional específico de la progresión infinita.
4. No se observó ninguna tarea larga (`Long Task`) aislada dominando un frame — el costo está distribuido en muchas llamadas `fill`/`arcTo` pequeñas por frame (uno por tronco/tortuga/vehículo), consistente con "cientos de asignaciones/llamadas redundantes" más que con un solo cuello de botella puntual.

**Conclusión para los pasos 2-4:** proceder con el plan tal cual — `ctx.roundRect()` nativo (paso 2) ataca la causa dominante confirmada por la medición; la limpieza de closures/asignaciones (paso 3) ataca el costo secundario visible en `drawPlatforms`/`drawVehicles`; el sprite de glow cacheado (paso 4) preserva el look de `classic`/`neon` a la vez que elimina la porción de costo específica de `shadowBlur` que sí se midió (más chica que `fill`/`arcTo`, pero real).
