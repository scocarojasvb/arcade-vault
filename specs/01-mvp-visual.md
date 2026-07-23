# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Approved
> **Depende de:** —
> **Fecha:** 2026-07-23
> **Objetivo:** Implementar la interfaz visual completa de Arcade Vault (biblioteca, detalle de juego, reproductor simulado, autenticación y salón de la fama) migrando los templates de `references/templates/` a rutas reales de Next.js App Router con datos mock, sin lógica de juego real.

## Scope

**In:**

- 5 pantallas migradas desde `references/templates/` a rutas reales de Next.js App Router:
  - Biblioteca (`/`) — grid de juegos con búsqueda y filtro por categoría.
  - Detalle de juego (`/juego/[id]`) — info del juego + leaderboard mock.
  - Reproductor simulado (`/juego/[id]/jugar`) — HUD, pantalla CRT con animación falsa (nave/enemigos/grid), ticker de puntuación aleatorio, modal de fin de partida con guardado simulado.
  - Autenticación (`/auth`) — tabs de iniciar sesión / crear cuenta, login como invitado, botones sociales decorativos (sin OAuth real).
  - Salón de la Fama (`/salon-de-la-fama`) — podio + tabla de puntuaciones por juego.
- Nav global (barra superior + menú móvil) con estado de sesión compartido vía Context.
- Persistencia client-side con `localStorage` (sesión de usuario y puntuaciones guardadas), igual que el prototipo.
- Datos mock (juegos, jugadores, generador de puntuaciones seed) en `app/data/`, tipados en TypeScript, pensado para luego reemplazarse por una base de datos.
- Migración del CSS del template (`styles.css`) a los estilos globales del proyecto, conservando look neón/CRT/scanlines.
- Fuentes del template (Press Start 2P, JetBrains Mono, Courier Prime) vía `next/font/google`, reemplazando Geist.

**Out of scope (para futuros specs):**

- Lógica real de cualquier juego (Bloque Buster, Caída, Serpentina, etc.) — el reproductor solo simula.
- Autenticación real / backend / base de datos — todo sigue siendo mock y localStorage.
- OAuth con Google/GitHub — los botones quedan decorativos.
- Persistencia de puntuaciones en servidor o sincronización entre dispositivos.
- Sistema de créditos/monedas funcional (el contador "CRÉDITOS · 03" es decorativo, como en el template).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Data model

Vive en `app/data/` (mock, pensado para ser reemplazado por una base de datos más adelante):

```ts
// app/data/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;   // clase CSS del cover generado (ej. "cover-bricks")
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;   // ej. "12.4K", ya formateado como en el template
}

export const GAMES: Game[];
export const CATS: string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]

// app/data/players.ts
export const PLAYERS: string[];

// app/data/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY"
}

export function seededScores(seed: number, count?: number): ScoreRow[];
```

Estado de sesión y puntuaciones guardadas, gestionado por un `AuthProvider` (Context) y persistido en `localStorage`:

```ts
// Contexto de sesión
interface User {
  name: string;
}

// localStorage keys
"av_user"   -> User | null   (JSON)
"av_scores" -> SavedScore[]  (JSON)

interface SavedScore {
  game: string;   // Game.id
  score: number;
  name: string;
  at: number;     // Date.now() al guardar
}
```

Convenciones:

- Categorías (`Game.cat`) son un union type cerrado, no un `string` libre.
- `seededScores` es determinístico (PRNG con semilla), igual que en el template — no usa `Math.random()`.
- Los datos de `app/data/` no dependen de Next.js (sin `"use client"` ni fetch); son importables tanto en Server como Client Components.

## Implementation plan

1. Configurar fuentes: reemplazar Geist en `app/layout.tsx` por Press Start 2P, JetBrains Mono y Courier Prime vía `next/font/google`.
2. Portar `references/templates/styles.css` a `app/globals.css` (o un archivo `app/arcade.css` importado desde `globals.css`), conservando variables, animaciones y el fondo (`av-bg`, `av-noise`).
3. Crear la capa de datos mock en `app/data/games.ts`, `app/data/players.ts` y `app/data/scores.ts` (tipos + `GAMES`, `CATS`, `PLAYERS`, `seededScores`), migrando el contenido de `data.jsx`.
4. Crear `app/auth-context.tsx` (`AuthProvider` + hook `useAuth`) como client component: lee/escribe `av_user` en `localStorage`, expone `user`, `login`, `logout`. Envolver `app/layout.tsx` con el provider.
5. Crear `app/components/nav.tsx` (client component) migrando `nav.jsx`: usa `useAuth()` y `usePathname()`/`next/link` en vez de `route`/`navigate`. Montarlo en `app/layout.tsx` junto con el footer.
6. Implementar `/` (`app/page.tsx`): migrar `biblioteca.jsx` (búsqueda, chips de categoría, grid de `GameCard` con tilt) usando `next/link` hacia `/juego/[id]`.
7. Implementar `/juego/[id]` (`app/juego/[id]/page.tsx`): migrar `detalle.jsx` (info del juego + leaderboard con `seededScores`), botón "JUGAR AHORA" enlaza a `/juego/[id]/jugar`.
8. Implementar `/juego/[id]/jugar` (`app/juego/[id]/jugar/page.tsx`, client component): migrar `reproductor.jsx` (HUD, CRT simulado, ticker de score, modal de fin con guardado en `av_scores` vía `useAuth`/localStorage).
9. Implementar `/auth` (`app/auth/page.tsx`, client component): migrar `auth.jsx` (tabs, formulario, invitado, botones sociales decorativos), usando `login()` del contexto y redirigiendo a `/` tras autenticar.
10. Implementar `/salon-de-la-fama` (`app/salon-de-la-fama/page.tsx`): migrar `salon.jsx` (tabs por juego, podio, tabla con fila destacada del usuario logueado vía `useAuth`).
11. Revisión final de navegación cruzada: verificar que todos los enlaces (`Nav`, botones "VOLVER AL VAULT", "SALIR", etc.) apunten a las rutas reales creadas y no queden referencias al router por hash.

## Acceptance criteria

- [ ] `npm run dev` levanta el proyecto sin errores en consola.
- [ ] `/` muestra la biblioteca con hero, buscador, chips de categoría y grid de juegos.
- [ ] Buscar por nombre y filtrar por categoría en `/` reduce correctamente el grid, y muestra el estado "NO HAY RESULTADOS" cuando no hay coincidencias.
- [ ] Click en una tarjeta o en "JUGAR" navega a `/juego/[id]` con el `id` correcto.
- [ ] `/juego/[id]` muestra info del juego, tags, stats y leaderboard con 10 filas generadas por `seededScores`.
- [ ] "JUGAR AHORA" en `/juego/[id]` navega a `/juego/[id]/jugar`.
- [ ] "VOLVER AL VAULT" en `/juego/[id]` navega a `/`.
- [ ] `/juego/[id]/jugar` muestra el HUD (jugador, puntuación, vidas, nivel) y la puntuación sube sola cada ~220ms mientras no está en pausa ni terminado.
- [ ] El botón "PAUSA" detiene el incremento de puntuación y "REANUDAR" lo reactiva.
- [ ] El botón "FIN" abre el modal de fin de partida con la puntuación final.
- [ ] Guardar la puntuación en el modal la persiste en `localStorage` (`av_scores`) y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] "JUGAR DE NUEVO" reinicia score/vidas/nivel y cierra el modal.
- [ ] "SALIR" desde el reproductor navega de vuelta a `/juego/[id]`.
- [ ] `/auth` permite alternar entre tabs "INICIAR SESIÓN" / "CREAR CUENTA", mostrando el campo de correo solo en "CREAR CUENTA".
- [ ] Enviar el formulario de auth guarda el usuario en `localStorage` (`av_user`) y redirige a `/`.
- [ ] "JUGAR COMO INVITADO" navega a `/` sin usuario logueado.
- [ ] Con sesión iniciada, el Nav muestra el nombre de usuario en vez del botón "Iniciar Sesión", y permite cerrar sesión.
- [ ] Recargar la página (F5) preserva la sesión iniciada y las puntuaciones guardadas.
- [ ] `/salon-de-la-fama` muestra tabs por juego, podio (top 3) y tabla de 12 filas ordenadas por puntuación descendente.
- [ ] Con sesión iniciada, `/salon-de-la-fama` muestra una fila adicional resaltada con la marca del usuario actual.
- [ ] El Nav (links "Biblioteca" / "Salón de la Fama") resalta la ruta activa correctamente en las 5 pantallas.
- [ ] En viewport móvil (<840px), el Nav colapsa a hamburguesa y el panel lateral abre/cierra correctamente.
- [ ] El build de producción (`npm run build`) completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** rutas reales de Next.js App Router (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon-de-la-fama`) en vez del router por hash del prototipo. Es lo idiomático en este proyecto y habilita SSR/enlaces reales.
- **No:** mantener el router por hash tipo SPA. Perdería las ventajas de App Router sin aportar nada al MVP.
- **Sí:** portar `styles.css` casi tal cual a estilos globales, conservando el look neón/CRT. Reescribirlo en utilidades de Tailwind es mucho esfuerzo con riesgo de perder fidelidad visual, sin beneficio real para este MVP.
- **No:** reescribir todo a Tailwind utility classes.
- **Sí:** `next/font/google` para Press Start 2P, JetBrains Mono y Courier Prime, reemplazando Geist. Es el mecanismo estándar y optimizado de Next.js para fuentes de Google, y el template depende visualmente de esas tipografías.
- **Sí:** replicar la simulación falsa del reproductor (ticker de score, animación CSS de nave/enemigos, modal de fin) tal cual el template. Es la pieza central de la pantalla y "sin lógica de juego real" se refiere a que no hay mecánica jugable de verdad, no a omitir la puesta en escena visual.
- **Sí:** persistencia con `localStorage` (`av_user`, `av_scores`), sin backend. Es el enfoque del prototipo y encaja con el alcance "solo visual" del MVP.
- **No:** backend o base de datos real en este spec.
- **Sí:** datos mock en `app/data/` (en vez de `lib/data.ts`), a pedido explícito para dejar preparado el reemplazo futuro por una base de datos.
- **Sí:** Context de React (`AuthProvider`/`useAuth`) para compartir el estado de sesión entre `Nav` y las páginas, en vez de que cada componente lea `localStorage` por su cuenta. Evita duplicación y desincronización entre componentes.
- **No:** sistema de créditos/monedas funcional — el contador en el Nav queda decorativo, igual que en el template.
- **No:** OAuth real con Google/GitHub — los botones quedan decorativos.

## Risks

| Riesgo                                                                 | Mitigación                                                                                                   |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Mismatch de hidratación al leer `localStorage` en el primer render     | `AuthProvider` inicializa `user` en `null`/estado por defecto en el server y lo hidrata en un `useEffect` en cliente, evitando leer `localStorage` durante el render inicial. |
| `localStorage` deshabilitado (modo privado / bloqueado)                 | Igual que en el template: los `try/catch` alrededor de lectura/escritura evitan que la app rompa; simplemente no persiste. |
| APIs de Next.js 16 / Turbopack distintas a lo esperado por conocimiento previo | Antes de escribir código de rutas, layout o config, revisar `node_modules/next/dist/docs/01-app/` según indica `CLAUDE.md`. |
| Regresión visual al portar `styles.css` (clases que dependían de la estructura DOM exacta del prototipo) | Mantener los mismos nombres de clase y estructura JSX que los templates originales al migrar cada componente. |

Se omiten riesgos de escalabilidad, seguridad o backend por estar fuera del alcance de este MVP visual.

## What is **not** in this spec

- Lógica jugable real de cualquier juego del catálogo.
- Autenticación, backend o base de datos reales.
- OAuth con Google/GitHub.
- Sincronización de puntuaciones entre dispositivos o sesiones de servidor.
- Sistema de créditos/monedas funcional.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
