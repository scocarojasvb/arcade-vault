# SPEC 02 — Home (landing page)

> **Estado:** Approved
> **Depende de:** [01-mvp-visual](01-mvp-visual.md)
> **Fecha:** 2026-07-23
> **Objetivo:** Migrar la landing page (`home.jsx`) de `references/templates/home-about/` a una ruta real `/` de Next.js App Router, moviendo la Biblioteca actual a `/biblioteca` y actualizando el Nav para distinguir "Inicio" de "Biblioteca".

## Scope

**In:**

- Nueva ruta `/` (`app/page.tsx`): landing page migrada de `home.jsx` — hero con silhouettes flotantes, sección "¿Por qué Arcade Vault?" (feature grid), sección "Juegos disponibles ahora" (mini-cards con cover real), sección de stats, sección "Actividad en vivo" (ticker + top jugadores, datos hardcodeados como en el template), sección "Precios" (plan único + FAQ) y CTA final.
- Mover la Biblioteca actual (`app/page.tsx` existente) a `app/biblioteca/page.tsx`, ruta `/biblioteca`.
- Actualizar `app/components/nav.tsx`: agregar link "Inicio" apuntando a `/`, cambiar el link "Biblioteca" para apuntar a `/biblioteca`, y ajustar `isActive` para que "Inicio" solo esté activo en `/` y "Biblioteca" en `/biblioteca` y `/juego/*`.
- Actualizar todos los enlaces internos existentes que asumían que `/` era la Biblioteca (ej. "VOLVER AL VAULT" en `/juego/[id]`, logo del Nav, redirecciones tras login/guest en `/auth`) para que apunten a `/biblioteca` donde corresponda.
- Animación de aparición al hacer scroll (`useReveal`, `IntersectionObserver` + clase `.reveal`/`.in`), migrada tal cual del template.
- Estilos: portar a `app/globals.css` el CSS de home (`.home`, `.home-hero`, `.home-section`, `.home-stats`, `.home-final`, `.feature-grid`, `.mini-rail`, `.mini-card`, `.reveal`, sección "Actividad" — `.activity-grid`, `.ticker`, `.top-list`, etc. — y sección "Precios" — `.pricing-grid`, `.price-card`, `.pricing-faq`, etc.) desde `references/templates/home-about/styles.css`. **Corrección respecto a la redacción original de esta spec:** se asumía que este CSS ya estaba portado desde la spec 01, pero al implementar se verificó que no era así (ninguna de esas clases existía en `app/globals.css`); se añade explícitamente al scope.

**Out of scope (para futuros specs):**

- Pantalla About (`about.jsx`) — no se toca en esta spec.
- Link "Acerca de" en el Nav — no se agrega hasta que exista la pantalla About.
- Datos reales/dinámicos para "Actividad en vivo" (ticker y top jugadores) — quedan hardcodeados igual que en el template.
- Cualquier cambio a las pantallas de detalle, reproductor, auth o salón de la fama más allá de actualizar los enlaces que apuntaban a `/`.

## Data model

Esta spec no introduce estructuras de datos nuevas: reutiliza `GAMES` de `app/data/games.ts` (para las mini-cards, vía `slice(0, 6)`) y el componente de cover existente. Los arrays de "Actividad en vivo" (últimas puntuaciones, top jugadores) quedan como literales hardcodeados dentro del componente de la página, igual que en `home.jsx` — no se modela como dato reusable.

## Implementation plan

1. Mover `app/page.tsx` (Biblioteca actual) a `app/biblioteca/page.tsx`, sin cambios de contenido.
2. Crear `app/components/mini-card.tsx`: migra `MiniCard` de `home.jsx` (`.mini-card`, `.mini-cover`, `.mini-meta`), usando `Link` a `/juego/[id]` y el mismo patrón `cover-bg` + `game.cover` que `GameCard`.
3. Crear `app/components/floating-silhouettes.tsx` y `app/components/feature-icon.tsx`: migran `FloatingSilhouettes` y `FeatureIcon` de `home.jsx` tal cual (SVGs decorativos en rects).
4. Crear `app/hooks/use-reveal.ts`: migra el hook `useReveal` (`IntersectionObserver` sobre `.reveal`) tal cual del template.
5. Crear `app/page.tsx` (nuevo Home): migra el JSX completo de `home.jsx` (hero, why, games preview con `MiniCard`, stats, actividad en vivo con arrays hardcodeados, precios, CTA final), usando `next/link`/`useRouter` en vez de `navigate()`, y `GAMES.slice(0, 6)` para la sección de juegos.
6. Actualizar `app/components/nav.tsx`: agregar link "Inicio" → `/`, cambiar "Biblioteca" → `/biblioteca`, actualizar `isActive` (Inicio activo solo en `/`; Biblioteca activa en `/biblioteca` y `/juego/*`), en el menú de escritorio y el panel móvil.
7. Actualizar el logo del Nav para que siga apuntando a `/` (ahora Home, antes Biblioteca) — sin cambios de código, solo confirmar que sigue siendo correcto.
8. Actualizar enlaces que asumían `/` como Biblioteca: botón "VOLVER AL VAULT" en `app/juego/[id]/page.tsx`, y las redirecciones tras login/invitado en `app/auth/page.tsx` (deben apuntar a `/biblioteca`, no a `/`).
9. Revisión final: recorrer las 6 rutas (`/`, `/biblioteca`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon-de-la-fama`) verificando que ningún enlace quede roto ni apunte a la ruta equivocada.

## Acceptance criteria

- [ ] `npm run dev` levanta el proyecto sin errores en consola.
- [ ] `/` muestra la landing page (hero con silhouettes, secciones "¿Por qué Arcade Vault?", "Juegos disponibles ahora", stats, "Actividad en vivo", "Precios" y CTA final).
- [ ] `/biblioteca` muestra el grid de juegos con búsqueda y filtro por categoría (mismo comportamiento que antes tenía `/`).
- [ ] Las secciones del home con clase `.reveal` aparecen con fade/slide al hacer scroll hasta ellas (no aparecen ya visibles al cargar, si empiezan fuera del viewport).
- [ ] La sección "Juegos disponibles ahora" muestra 6 mini-cards con cover real (clase `cover-bg` + `game.cover`), y cada una navega a `/juego/[id]` correcto al hacer click.
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" en el home navegan a `/biblioteca`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" en el home navegan a `/auth`.
- [ ] "VER SALÓN →" en la sección de actividad navega a `/salon-de-la-fama`.
- [ ] El Nav muestra los links "Inicio" y "Biblioteca" como opciones separadas, resaltando la ruta activa correctamente en las 6 pantallas (`/`, `/biblioteca`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon-de-la-fama`).
- [ ] El logo del Nav navega a `/` (Home).
- [ ] "VOLVER AL VAULT" en `/juego/[id]` navega a `/biblioteca`.
- [ ] Login, crear cuenta y "JUGAR COMO INVITADO" en `/auth` redirigen a `/biblioteca` (no a `/`).
- [ ] En viewport móvil (<840px), el panel lateral del Nav incluye "Inicio" y "Biblioteca" como opciones separadas y resalta la activa.
- [ ] El build de producción (`npm run build`) completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** Home pasa a ocupar `/` y la Biblioteca se mueve a `/biblioteca`. Coincide con el nav del template (Inicio ≠ Biblioteca) y es el patrón más idiomático para una landing page.
- **No:** dejar Home en `/inicio` y Biblioteca en `/`. Rompería la convención del template sin necesidad, ya que no hay enlaces externos o SEO existentes que dependan de que `/` sea la Biblioteca.
- **No:** agregar el link "Acerca de" al Nav en esta spec. La pantalla About está fuera de alcance; agregar un link que rompe (404) sería peor que no tenerlo. Se agrega junto con su propia spec.
- **Sí:** los datos de "Actividad en vivo" (últimas puntuaciones, top jugadores de hoy) quedan hardcodeados igual que en `home.jsx`, sin usar `seededScores()`. Mantiene fidelidad exacta con el template y consistencia con el enfoque "solo visual" de la spec 01; generarlos dinámicamente es trabajo adicional sin pedido explícito.
- **Sí:** las mini-cards de la sección "Juegos disponibles ahora" reutilizan el sistema de covers reales (`cover-bg` + `game.cover`) ya existente en `globals.css` y `app/data/games.ts`, en vez de un placeholder simple. Consistencia visual con `GameCard` y cero costo adicional de CSS.
- **Sí:** incluir la sección "Precios" (plan único + FAQ) tal cual el template, sin lógica nueva — es solo contenido estático con un botón que ya navega a `/auth`.
- **Sí:** `MiniCard`, `FloatingSilhouettes`, `FeatureIcon` y `useReveal` se extraen a archivos propios (`app/components/`, `app/hooks/`) en vez de vivir inline en `app/page.tsx`, siguiendo el mismo criterio de componentización que `GameCard` en la spec 01.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Al mover la Biblioteca de `/` a `/biblioteca`, queda algún `Link`/`router.push` interno apuntando a `/` esperando ver la Biblioteca | Paso 9 del plan de implementación: revisión cruzada explícita de las 6 rutas antes de cerrar la spec. |
| `useReveal` usa `document.querySelectorAll(".reveal")` en un `useEffect` — si corre antes de que el DOM del home esté montado, algunas secciones no se observan | Se mantiene la misma implementación del template (efecto sin dependencias, corre tras el primer render); si falla, es el mismo comportamiento ya validado en el prototipo. |
| Enlaces externos o marcadores previos (si alguien ya guardó `/` como Biblioteca) quedan apuntando a la landing en vez del grid | Fuera de control de esta spec: no hay usuarios reales todavía (proyecto en MVP), por lo que el impacto es nulo. |

## What is **not** in this spec

- Pantalla About.
- Link "Acerca de" en el Nav.
- Datos dinámicos/reales para "Actividad en vivo".
- Cambios funcionales a detalle, reproductor, auth o salón de la fama (solo actualización de enlaces).

Cada uno de estos, si se implementa, va en su propio spec.
