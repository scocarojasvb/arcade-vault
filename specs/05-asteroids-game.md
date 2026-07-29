# SPEC 05 — Juego Asteroids

> **Estado:** Approved
> **Depende de:** ninguna spec previa (independiente)
> **Fecha:** 2026-07-29
> **Objetivo:** Agregar un nuevo juego "ASTEROIDS" al catálogo de Arcade Vault, portando a TypeScript el juego de canvas vanilla JS en `references/started-games/02-asteroids` como componente cliente de Next.js, integrado con el HUD, la pausa y el flujo de guardado de puntuación ya existentes en `/juego/[id]/jugar`.

## Scope

**In:**

- Nueva entrada en `app/data/games.ts` (`GAMES`): id `"asteroids"`, título, descripciones corta/larga, `cat: "SHOOTER"`, `color: "yellow"`, cover art propia (`cover-asteroids`), valores iniciales de `best`/`plays`.
- Nueva clase CSS `.cover-asteroids` en `app/globals.css`, siguiendo el mismo patrón visual que las demás `cover-*` (gradiente + pseudo-elementos).
- Port a TypeScript del juego completo de `references/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, incluyendo el power-up de disparo triple) dentro de un componente cliente de React (`'use client'`), sin variables globales — todo el estado vive dentro del componente/closure.
- El componente monta un `<canvas>` de resolución interna fija 800×600 (misma física/colisiones/wrap del original) y se escala visualmente por CSS para caber en `.crt-screen`, manteniendo el aspect ratio.
- Controles: solo teclado, igual que el original (`←`/`→` rotar, `↑` propulsar, `Espacio` disparar).
- El componente expone hacia la página contenedora: el estado en vivo (score, lives, level) vía callback/ref para alimentar el HUD de React existente, y un evento `onGameOver(score)` que detiene el loop interno y suprime el overlay/reinicio propio del canvas (la única UI de fin de partida es el modal de React ya existente).
- El botón "PAUSA" del HUD de React pausa realmente el loop del juego (deja de actualizar/animar) además de mostrar su overlay visual existente; "REANUDAR" lo reactiva.
- `app/juego/[id]/jugar/page.tsx`: renderiza el componente real de Asteroids cuando `id === "asteroids"`; para el resto de juegos (incluido `"rocas"`) se mantiene sin cambios la simulación falsa actual.
- Al terminar la partida, se reutiliza el modal existente (input de iniciales + `saveScore` vía `useAuth`/localStorage), sin cambios en esa lógica de persistencia.

**Out of scope (para futuros specs):**

- Controles táctiles/móviles.
- Cualquier cambio a la entrada existente `"rocas"` (sigue siendo la simulación falsa).
- Cambios a persistencia/backend (Supabase) — se sigue usando localStorage vía `AuthContext`, igual que el resto de juegos.
- Rediseño real del "mundo" del juego para ser responsive (solo escalado CSS, no recalcular física a otra resolución).
- Sonido/efectos de audio (el original tampoco los tiene).
- Cualquier feature nueva no presente en `game.js` (multiplayer, otros power-ups, dificultad ajustable, etc.).
- Modificar la lógica de la simulación falsa que usan los demás juegos.

## Data model

Esta spec no introduce estructuras de datos persistentes nuevas (no hay tablas, ni cambios al esquema de `localStorage`/`SavedScore`). Sí define un contrato de comunicación entre el componente del juego y la página `jugar`, y reutiliza la interfaz `Game` ya existente para el nuevo registro. Lo detallo porque son los nombres reales que va a usar el código:

**Nuevo registro en `GAMES` (usa la interfaz `Game` existente, sin cambios a la interfaz):**

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "...",
  long: "...",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "yellow",
  best: 0,        // valor inicial, sin partidas reales aún
  plays: "0",
}
```

**Componente del juego — `app/games/asteroids/asteroids-game.tsx`, props:**

```ts
interface AsteroidsGameProps {
  paused: boolean;
  onStateChange: (state: { score: number; lives: number; level: number }) => void;
  onGameOver: (finalScore: number) => void;
}
```

- `paused`: cuando es `true`, el componente detiene su `requestAnimationFrame` loop (no consume `dt`).
- `onStateChange`: se invoca cuando cambian score/lives/level para que la página `jugar` actualice el HUD de React con los valores reales.
- `onGameOver`: se invoca una única vez cuando el juego interno pasa a `'gameover'`; el componente deja de escuchar `Space` como reinicio y no dibuja su overlay de "GAME OVER" (la página `jugar` toma el control mostrando el modal existente).

Las clases internas (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) viven encapsuladas dentro del archivo del componente — no se exportan ni se documentan como API pública, son detalle de implementación.

## Implementation plan

1. Agregar la entrada `"asteroids"` a `app/data/games.ts` (título, descripciones, `cat: "SHOOTER"`, `color: "yellow"`, `cover: "cover-asteroids"`, `best: 0`, `plays: "0"`). En este punto el juego ya aparece en la biblioteca y su página de detalle (`/juego/asteroids`) funciona con la simulación falsa heredada — sistema funcional.
2. Agregar la clase CSS `.cover-asteroids` (+ pseudo-elementos) en `app/globals.css`, siguiendo el patrón visual de `.cover-rocas`/`.cover-invaders`, para que la portada en biblioteca/detalle no use un estilo genérico.
3. Crear `app/games/asteroids/asteroids-game.tsx`: portar `game.js` a TypeScript dentro de un componente `'use client'` que recibe `{ paused, onStateChange, onGameOver }`, monta el `<canvas>` (800×600 interno, escalado por CSS), y encapsula todas las clases (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) y el loop (`requestAnimationFrame`) sin variables globales. Incluye el power-up de disparo triple. El componente respeta `paused` (detiene el loop) y llama `onGameOver(score)` una sola vez al morir la última vida, sin dibujar su propio overlay de game over ni escuchar `Space` para reiniciar.
4. Modificar `app/juego/[id]/jugar/page.tsx`: cuando `game.id === "asteroids"`, renderizar `<AsteroidsGame />` dentro de `.crt-screen` en lugar del `.game-arena` falso, conectar `onStateChange` para actualizar `score`/`lives`/`level` reales en el HUD de React, conectar `paused` al estado `paused` ya existente del botón "PAUSA", y conectar `onGameOver` para disparar el mismo flujo de `over`/modal que ya existe (sin el `setInterval` de puntaje falso, que se sigue usando solo para el resto de juegos).
5. Verificación final: `npm run build` sin errores de tipos/compilación, y prueba manual en navegador — jugar una partida completa de Asteroids (mover, disparar, romper asteroides, subir de nivel, perder las 3 vidas, ver el modal de fin de partida con el score real, guardar puntuación con iniciales), confirmando que los demás juegos (`rocas`, `caida`, etc.) siguen mostrando la simulación falsa sin cambios.

## Acceptance criteria

- [ ] `app/data/games.ts` incluye una entrada `"asteroids"` con `title`, `short`, `long`, `cat: "SHOOTER"`, `color: "yellow"`, `cover: "cover-asteroids"`, `best`, `plays`.
- [ ] `app/globals.css` incluye la clase `.cover-asteroids` y se ve correctamente en la card de biblioteca y en la portada de la página de detalle.
- [ ] `/juego/asteroids` (detalle) funciona igual que cualquier otro juego: muestra info, leaderboard y botón "JUGAR AHORA".
- [ ] `app/games/asteroids/asteroids-game.tsx` existe, compila sin errores de tipos, y no usa variables globales (todo el estado del juego vive encapsulado en el componente).
- [ ] Al entrar a `/juego/asteroids/jugar`, se ve y se juega el juego real de asteroides (nave, rotación, propulsión, disparo, asteroides que se dividen, partículas de explosión, power-up de disparo triple) dentro de `.crt-screen`, escalado responsivamente sin distorsionar el aspect ratio.
- [ ] El HUD superior de React (Puntuación, Vidas, Nivel) refleja los valores reales del juego en tiempo real, no valores aleatorios.
- [ ] El botón "PAUSA" congela efectivamente el juego (nave, asteroides y balas dejan de moverse) y "REANUDAR" lo continúa.
- [ ] Al perder las 3 vidas, aparece el modal de fin de partida existente con el score real, sin que el canvas muestre su propio overlay de "GAME OVER" ni reaccione a `Espacio` para reiniciar.
- [ ] Guardar la puntuación desde el modal (`saveScore`) persiste correctamente en `localStorage` bajo `av_scores` con `game: "asteroids"`.
- [ ] Los demás juegos (`rocas`, `caida`, `serpentina`, etc.) siguen funcionando exactamente igual que antes (simulación falsa sin cambios).
- [ ] `npm run build` completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** crear una entrada nueva `"asteroids"` en vez de reemplazar `"rocas"`. El usuario pidió explícitamente agregar un juego nuevo; `"rocas"` sigue siendo la simulación falsa hasta que exista una spec propia para ella.
- **Sí:** portar `game.js` a TypeScript encapsulado en un componente cliente, en vez de cargarlo como script estático. Mantiene consistencia con el resto del proyecto (TS, sin variables globales) sin costo real adicional.
- **Sí:** mundo del juego fijo en 800×600 con escalado por CSS, en vez de recalcular la física a una resolución dinámica. Evita tocar (y potencialmente romper) el _feel_ del juego original ya probado; el contenedor `.crt-screen` solo lo escala visualmente.
- **Sí:** incluir el power-up de disparo triple en el MVP. Ya está implementado y probado en `game.js`; excluirlo agregaría trabajo extra (quitar código) sin beneficio.
- **Sí:** el canvas notifica `onGameOver` y detiene su loop, delegando toda la UI de fin de partida al modal de React ya existente, evitando dos UIs de "game over" superpuestas.
- **Sí:** pausa funcional real (no solo visual) — el botón "PAUSA" del HUD debe detener el loop del juego, ya que dejar el juego corriendo detrás de un overlay de pausa sería confuso para el jugador.
- **No:** controles táctiles/móviles — fuera de alcance, el original tampoco los tiene; se deja para una spec futura si se decide soportar móvil.
- **No:** cambios a Supabase/persistencia backend — la spec de Supabase (`04-supabase-setup`) es solo plomería aún sin consumir; esta spec sigue usando `localStorage` vía `AuthContext`, igual que todos los demás juegos.
- **No:** sonido — el juego original no tiene audio, no se agrega en este port.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                 | Mitigación                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El escalado CSS del canvas de 800×600 a un contenedor `.crt-screen` de tamaño variable puede introducir letterboxing o recorte si el aspect ratio del contenedor no es 4:3.                                                                                                                            | Usar `aspect-ratio` CSS y sizing tipo `object-fit` (max-width/max-height con `width: auto; height: auto`) para preservar proporción; verificación manual en el paso 5 del plan.                     |
| Portar las clases del juego a un componente React con `useEffect`/`useRef` puede introducir bugs sutiles de timing (doble montaje en modo desarrollo de React, listeners de teclado duplicados) que no existían en el `game.js` original con `window.addEventListener` una sola vez a nivel de módulo. | Limpiar listeners y cancelar `requestAnimationFrame` en el `return` del `useEffect`; probar recarga y navegación de ida/vuelta a `/jugar` manualmente.                                              |
| Sincronizar `onStateChange` hacia el componente padre de React podría causar renders excesivos del HUD y afectar el framerate del juego si se invoca cada frame sin control.                                                                                                                           | Solo llamar `onStateChange` cuando cambian score/lives/level (no cada frame incondicionalmente).                                                                                                    |
| El botón "PAUSA" ya existente asumía que solo afectaba una simulación falsa (sin loop real); conectar `paused` al loop real de Asteroids podría dejar el juego en un estado inconsistente si se pausa a mitad de una colisión/explosión.                                                               | El `paused` simplemente detiene el avance de `dt` en el loop (no se ejecuta `update`), dejando el estado congelado tal cual estaba — no hay lógica a mitad de frame que pueda quedar inconsistente. |

## What is **not** in this spec

- Controles táctiles/móviles.
- Cambios a la entrada `"rocas"` o a la simulación falsa de los demás juegos.
- Persistencia real en Supabase/Postgres.
- Redimensionado real del mundo del juego (solo escalado CSS).
- Sonido.

Cada uno de estos, si se implementa, va en su propio spec.
