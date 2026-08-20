# SPEC 10 — Controles táctiles

> **Estado:** Implementado
> **Depende de:** SPEC 05 (asteroids-game), SPEC 07 (tetris-game / registro genérico de juegos reales), SPEC 08 (arkanoid-game), SPEC 09 (snake-game)
> **Fecha:** 2026-08-20
> **Objetivo:** Agregar un sistema de controles táctiles (D-pad de 4 direcciones + botón de acción, visualmente idéntico en los 4 juegos) debajo del canvas en `/juego/[id]/jugar`, que se muestra solo en dispositivos con pantalla táctil y reproduce las mismas teclas que cada juego real (Asteroids, Tetris, Arkanoid, Snake) ya escucha, para que los 4 sean completamente jugables en móvil.

## Scope

**In:**

- Nuevo componente compartido de controles táctiles (p. ej. `app/games/touch-controls.tsx`): D-pad de 4 flechas + 1 botón de acción, con estilo pixel/neon consistente con el resto de la UI (no botones HTML por defecto).
- Detección de dispositivo táctil vía `matchMedia('(pointer: coarse)')` (con fallback a `'ontouchstart' in window`), encapsulada en un hook (p. ej. `useIsTouchDevice`) — el componente de controles solo se renderiza cuando el dispositivo es táctil.
- Ubicación: dentro de `.crt-screen`, debajo del canvas del juego, en `app/juego/[id]/jugar/page.tsx` — mismo componente para los 4 juegos reales, sin variantes visuales por juego.
- Mapeo mecánico fijo, igual para los 4 juegos: cada botón del D-pad despacha un `KeyboardEvent` sintético (`keydown` al presionar / `keyup` al soltar) con el mismo `code` que ya escuchan los juegos (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`), y el botón de acción despacha `Space`. Se dispara sobre `window`, así ningún juego (`asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx`) necesita cambios en su lógica de control interna.
- Auto-repeat: mientras se mantiene presionado un botón de dirección, se repite el `keydown` a intervalo fijo (imitando el auto-repeat del teclado físico) hasta soltar, para que mover/rotar en Tetris (y el resto) se sienta igual que con teclado. El botón de acción no repite (un toque = una pulsación).
- Los 5 botones se muestran siempre completos en los 4 juegos, aunque alguno no tenga efecto en un juego puntual (ej. Arriba/Abajo/Acción en Arkanoid, Acción en Snake) — prioridad explícita del usuario sobre consistencia visual.
- `touch-action: none` y prevención de comportamientos táctiles del navegador (zoom, selección de texto, menú contextual por long-press) sobre el área de los controles, para que no interfieran con el juego.
- Los controles de teclado/mouse existentes siguen funcionando sin cambios en desktop y en dispositivos táctiles con teclado conectado (se agrega, no se reemplaza, el manejo de input).

**Out of scope (para futuros specs):**

- Rediseño general del layout responsive del HUD (`player-hud`), modal de fin de partida, biblioteca o salón de la fama para pantallas chicas — solo se ajusta lo estrictamente necesario dentro de `.crt-screen` para que quepan los controles nuevos.
- Gestos de swipe o joystick virtual de arrastre (se descartó a favor del D-pad de botones fijos).
- Arrastrar el dedo directamente sobre el canvas de Arkanoid para mover la paleta (como el mouse) — en touch, Arkanoid se controla solo con el D-pad, igual que los demás.
- Soporte de gamepad físico (Bluetooth/USB).
- Bloqueo de orientación de pantalla (portrait/landscape).
- Vibración/haptic feedback al tocar los botones.
- Preferencia de esquema de control persistida por usuario — siempre el mismo D-pad, sin opción de elegir otro.
- Cambios a los juegos mock de `app/data/games.ts` — solo aplica a los 4 juegos reales.
- Cambios a Supabase (`games`/`scores`) o a RLS.

## Data model

No hay datos persistidos nuevos (nada en Supabase, nada en `localStorage`) — solo un componente y un hook nuevos, más un ajuste de renderizado en la página del jugador.

**Nuevo componente — `app/games/touch-controls.tsx`:**

```ts
export type TouchControlCode = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space";

export default function TouchControls(): JSX.Element;
```

- Autónomo: no recibe props ni callbacks del juego. En `pointerdown` sobre un botón despacha `window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true }))`; en `pointerup`/`pointercancel`/`pointerleave` despacha el `keyup` correspondiente.
- Usa Pointer Events (no touch events legacy) para unificar dedo/mouse/lápiz y simplificar el auto-repeat.
- Los 4 botones de dirección mantienen un intervalo de auto-repeat interno mientras están presionados (limpiado al soltar o al desmontar); el botón de acción despacha una sola pulsación por toque, sin repetir.
- Aplica `touch-action: none` y bloquea `contextmenu`/selección de texto sobre sí mismo.

**Nuevo hook — `app/games/use-is-touch-device.ts`:**

```ts
export function useIsTouchDevice(): boolean;
```

- Devuelve `false` en el render inicial (SSR-safe, mismo patrón que la skin en `jugar/page.tsx`) y se actualiza en un `useEffect` leyendo `window.matchMedia("(pointer: coarse)").matches` (fallback `"ontouchstart" in window`).

**Cambios en `app/juego/[id]/jugar/page.tsx`:**

- Usa `useIsTouchDevice()` y renderiza `<TouchControls />` dentro de `.crt-screen`, debajo del `RealGameComponent`, solo cuando `RealGameComponent && isTouchDevice`.

**Cambios en `app/globals.css`:**

- Nueva clase `.touch-controls` (y subclases para el D-pad y el botón de acción), con el lenguaje visual pixel/neon existente.

Sin cambios a `RealGameProps`, `REAL_GAME_COMPONENTS`, tablas de Supabase, ni a los 4 componentes de juego (`asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx`).

## Implementation plan

1. Crear el hook `useIsTouchDevice` en `app/games/use-is-touch-device.ts` (detección SSR-safe vía `matchMedia`). Sistema funcional: no se usa en ningún lado todavía, no cambia nada visible.
2. Crear el componente `TouchControls` en `app/games/touch-controls.tsx`: D-pad de 4 flechas + botón de acción, con pointer events, auto-repeat en las direcciones y despacho de `KeyboardEvent` sintéticos (`keydown`/`keyup`) sobre `window`. Sistema funcional: el componente existe y compila, aún no está montado en ninguna página.
3. Agregar la clase `.touch-controls` (D-pad, botón de acción, `touch-action: none`) en `app/globals.css`, siguiendo el lenguaje visual pixel/neon existente. Sistema funcional: sin componente montado, no cambia nada visible todavía.
4. Integrar en `app/juego/[id]/jugar/page.tsx`: usar `useIsTouchDevice()` y renderizar `<TouchControls />` dentro de `.crt-screen`, debajo del `RealGameComponent`, solo cuando hay un juego real y el dispositivo es táctil. Sistema funcional: en desktop nada cambia; en un dispositivo táctil, los controles aparecen debajo del canvas en los 4 juegos reales.
5. Verificación final: `npm run build` sin errores de tipos/compilación, y prueba manual en emulación táctil (Chrome DevTools "toggle device toolbar" o un teléfono real) jugando una partida completa de cada uno de los 4 juegos usando **solo** el D-pad/botón de acción — Asteroids (rotar + empuje + disparo), Tetris (mover + rotar + soft drop + hard drop, incluyendo auto-repeat al mantener presionado), Snake (las 4 direcciones), Arkanoid (mover paleta izq/der) — y confirmando que en desktop con mouse/teclado los controles táctiles no aparecen y todo sigue funcionando igual que antes.

## Acceptance criteria

- [ ] `app/games/use-is-touch-device.ts` existe y exporta `useIsTouchDevice()`, SSR-safe (devuelve `false` en el primer render, se actualiza en cliente).
- [ ] `app/games/touch-controls.tsx` existe, compila sin errores de tipos, y renderiza un D-pad de 4 flechas + 1 botón de acción con estilo pixel/neon consistente con el resto de la UI.
- [ ] Al presionar cualquiera de los 4 botones de dirección se despacha `keydown` con el `code` correspondiente (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`) sobre `window`, y `keyup` al soltar/cancelar.
- [ ] Al presionar el botón de acción se despacha `keydown`/`keyup` con `code: "Space"`.
- [ ] Mantener presionado un botón de dirección repite el `keydown` a intervalo fijo hasta soltarlo; el botón de acción no repite.
- [ ] En `/juego/[id]/jugar`, con un dispositivo táctil (`pointer: coarse`), los controles aparecen dentro de `.crt-screen` debajo del canvas para los 4 juegos reales (asteroids, tetris, arkanoid, snake), siempre con los 5 botones visibles.
- [ ] En desktop (mouse/teclado, sin `pointer: coarse`), los controles táctiles no se renderizan y el juego funciona exactamente igual que antes.
- [ ] Usando solo los controles táctiles (sin teclado ni mouse) se puede jugar una partida completa de cada uno de los 4 juegos: Asteroids (rotar, empuje, disparo), Tetris (mover, rotar, soft drop, hard drop), Snake (las 4 direcciones), Arkanoid (mover la paleta).
- [ ] Tocar los controles no dispara scroll, zoom, selección de texto ni menú contextual del navegador.
- [ ] Ningún archivo de los 4 componentes de juego (`asteroids-game.tsx`, `tetris-game.tsx`, `arkanoid-game.tsx`, `snake-game.tsx`) cambia su lógica de manejo de teclado.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** un único componente `TouchControls` compartido por los 4 juegos, sin variantes por juego. Pedido explícito del usuario: "los mismos botones... para consistencia", priorizado por sobre un control óptimo por juego (ej. joystick para Asteroids o swipe para Snake).
- **Sí:** los 5 botones (4 direcciones + acción) se muestran siempre completos en los 4 juegos, aunque algún botón no tenga efecto en un juego puntual (ej. Arriba/Abajo/Acción en Arkanoid, Acción en Snake). Decisión explícita del usuario sobre uniformidad visual, aceptando que algunos botones queden "sin función" en ciertos juegos.
- **Sí:** despachar `KeyboardEvent` sintéticos sobre `window` en vez de agregar una prop/callback nueva a `RealGameProps`. Los 4 juegos ya escuchan `keydown`/`keyup` a nivel de `window`, así que este mecanismo cubre los 4 sin tocar su lógica interna ni el contrato `RealGameProps` (evita reabrir SPEC 07).
- **Sí:** ubicar los controles debajo del canvas, dentro de `.crt-screen` (no superpuestos sobre el juego). El usuario lo prefirió explícitamente frente a un overlay flotante sobre el canvas.
- **Sí:** auto-repeat en los 4 botones de dirección mientras se mantienen presionados, para igualar la sensación de mantener una tecla física. Pedido explícito del usuario para que Tetris (y el resto) no se sienta más tosco por tocar en vez de usar teclado.
- **No:** auto-repeat en el botón de acción — un toque = una pulsación de `Space`, evita disparos/hard-drops involuntarios en ráfaga si el dedo queda apoyado.
- **No:** arrastrar el dedo directamente sobre el canvas de Arkanoid para mover la paleta (como el mouse). Se descartó a favor de que Arkanoid use el mismo D-pad que los demás juegos, consistente con la decisión de controles uniformes.
- **No:** swipe ni joystick de arrastre — descartados a favor de botones fijos tipo D-pad, más simples de implementar y de descubrir sin instrucciones.
- **No:** persistir preferencia de esquema de control por usuario — siempre se muestra el mismo D-pad, sin alternativa configurable.
- **No:** rediseño general del HUD/modal/otras páginas para mobile — fuera de alcance, solo se ajusta lo necesario para que quepan los controles dentro de `.crt-screen`.
- **No:** soporte de gamepad físico ni bloqueo de orientación de pantalla — no pedidos, quedan para specs futuros si hacen falta.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El overlay de pausa (`.crt-content`, position absolute sobre `.crt-screen`) podría cubrir visualmente el D-pad si éste queda dentro del mismo contenedor, dejándolo inaccesible o mal recortado mientras el juego está pausado.                                                              | Verificar manualmente en el paso 5 que el D-pad se oculte o quede correctamente debajo del overlay al pausar (comportamiento aceptable, ya que ni teclado ni mouse mueven nada en pausa); ajustar únicamente el CSS nuevo de `.touch-controls` si hace falta, sin tocar la estructura de `jugar/page.tsx` más allá de lo ya planeado. |
| `pointerup`/`pointercancel` puede no dispararse de forma confiable en algunos navegadores móviles (ej. Safari iOS cuando el gesto se interpreta como scroll), dejando un botón "trabado" presionado y su auto-repeat corriendo indefinidamente (ej. empuje de Asteroids que nunca se apaga). | Escuchar también `pointerleave` y un fallback a nivel `window` (`pointerup`/`visibilitychange`) que fuerce el `keyup` y detenga cualquier intervalo de auto-repeat activo; probar en un dispositivo real en el paso 5, no solo en emulación de DevTools.                                                                              |
| Agregar el D-pad dentro de `.crt-screen` reduce el espacio vertical disponible para el canvas en pantallas chicas, pudiendo generar letterboxing excesivo o un canvas demasiado pequeño para jugar cómodamente.                                                                              | Reutilizar el mismo patrón de `aspect-ratio`/`object-fit` ya validado en SPEC 05/08 para el canvas; verificar manualmente en tamaños de viewport típicos (ej. iPhone SE, Android estándar) durante el paso 5.                                                                                                                         |
| El intervalo de auto-repeat de los botones de dirección puede sentirse demasiado rápido o demasiado lento según el juego (ej. deslizar piezas de Tetris de más, o rotar la nave de Asteroids en saltos bruscos) si se usa un valor arbitrario sin calibrar.                                  | Calibrar el intervalo durante la prueba manual del paso 5 imitando el ritmo de auto-repeat estándar de teclado (~500ms de delay inicial, ~50-100ms de repetición), ajustable en un solo lugar (`touch-controls.tsx`) ya que es compartido por los 4 juegos.                                                                           |
| Despachar `KeyboardEvent` sintéticos (`isTrusted: false`) podría comportarse distinto a un evento real de teclado si algún navegador restringe o ignora eventos no confiables sobre `window`.                                                                                                | Verificar manualmente en el paso 5, en un dispositivo táctil real (no solo emulación), que cada uno de los 4 juegos reacciona correctamente a los eventos sintéticos antes de dar la spec por verificada.                                                                                                                             |

## What is **not** in this spec

- Rediseño general del layout responsive del HUD, modal de fin de partida, biblioteca o salón de la fama.
- Gestos de swipe o joystick virtual de arrastre.
- Arrastrar el dedo sobre el canvas de Arkanoid para mover la paleta.
- Soporte de gamepad físico.
- Bloqueo de orientación de pantalla.
- Vibración/haptic feedback.
- Preferencia de esquema de control persistida por usuario.
- Cambios a los juegos mock de `app/data/games.ts`.
- Cambios a Supabase (`games`/`scores`) o a RLS.

Cada uno de estos, si se implementa, va en su propio spec.
