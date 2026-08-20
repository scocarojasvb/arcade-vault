# Rutas con layout móvil verificado

Memoria del subagente `mobile-porter` (`.claude/agents/mobile-porter.md`). Una ruta marcada
`completo` en la columna Estado **no se vuelve a tocar en corridas futuras** salvo que el usuario
la nombre explícitamente en su prompt.

| Ruta                | Estado    | 375px | 768px | landscape | Técnica / notas                                                                                                                                                                                                                               | Última corrida |
| ------------------- | --------- | ----- | ----- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `/juego/[id]/jugar` | pendiente | falta | falta | falta     | `.player-hud` (flex + 4-5 `hud-stat` + chips de skin + 3 botones) se desborda en 375px; `.av-player` padding + `.crt` padding se comen el alto del canvas; `@media 720px` solo retoca `.hud-skin`/`.skin-chip`, no el layout general del HUD. | 2026-08-20     |
| `/biblioteca`       | pendiente | falta | falta | —         | Grid del catálogo (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, `globals.css:542`) no auditado a fondo todavía.                                                                                                            | 2026-08-20     |
| `/salon-de-la-fama` | pendiente | falta | falta | —         | Tabla de puntajes con grid de columnas fijas en px (`36px 1fr 110px`, `globals.css:1006`) sin override en ningún `@media` — candidata a desbordar en 375px.                                                                                   | 2026-08-20     |
| `/`                 | pendiente | falta | falta | —         | `.home-hero` usa `min-height: calc(100vh - 60px)` (`globals.css:1840`) — único uso de `vh` en vez de `dvh`, puede saltar con la barra de URL móvil.                                                                                           | 2026-08-20     |
| `/juego/[id]`       | pendiente | falta | falta | —         | Sin auditar a fondo todavía.                                                                                                                                                                                                                  | 2026-08-20     |
| `/acerca-de`        | pendiente | falta | falta | —         | Sin auditar a fondo todavía (formulario de contacto).                                                                                                                                                                                         | 2026-08-20     |
| `/auth`             | pendiente | falta | falta | —         | Sin auditar a fondo todavía.                                                                                                                                                                                                                  | 2026-08-20     |

---

**Notas generales de la auditoría inicial (2026-08-20), válidas para todas las filas de arriba:**

- `app/layout.tsx` no exporta `viewport`/`themeColor` — falta en las 7 rutas por igual, ya que el
  shell es compartido (`RootLayout`).
- El footer de `app/layout.tsx` usa estilos inline (`style={{...}}`) — un `@media` no puede
  alcanzarlo hasta que se convierta en una clase de `app/globals.css`.
- El escalado del canvas (`.game-viewport { aspect-ratio: 4/3 }` + `object-fit: contain` /
  `.tetris-stage` con `transform: scale()`) ya está resuelto y no debe re-hacerse — es el patrón a
  reutilizar, no un problema.
- `app/components/nav.tsx` ya tiene hamburguesa + drawer `.av-mobile-panel` funcionando a
  `@media (max-width: 840px)` — no re-tocar salvo que un fix de otra ruta lo requiera.
- Ocho breakpoints ad-hoc conviven hoy en `globals.css` (520, 600, 720, 820, 840, 900, 980, 1100);
  el contrato del agente fija 900/720/520 como la escalera a usar en adelante.
