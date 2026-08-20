# Juegos con tema (skins) implementado

Memoria del subagente `skin-designer` (`.claude/agents/skin-designer.md`). Un juego marcado
`completo` en la columna Estado **no se vuelve a tocar en corridas futuras** salvo que el
usuario lo nombre explícitamente en su prompt.

| Juego       | Estado    | classic | neon  | retro | Técnica / notas                                                                                                                                                                                                                                                                                                                                                              | Última corrida |
| ----------- | --------- | ------- | ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `asteroids` | completo  | ok      | ok    | ok    | Paleta vectorial pura (`app/games/asteroids/skins.ts`), sin spritesheet. neon: acento amarillo (`--yellow`) + cyan/magenta/verde, glow `shadowBlur 9`. retro: rampa ámbar 4 tonos `#1a1206/#c04000/#ff7b00/#ffb000`, `glow 0`. Las partículas usan `particleRgb` porque el alpha lo calcula el frame. Repinta al cambiar de skin incluso en pausa/game over vía `redrawRef`. | 2026-08-20     |
| `tetris`    | pendiente | falta   | falta | falta | Sin `app/games/tetris/skins.ts`; 3 literales de color en el camino de dibujo + array `COLORS`. `drawNext()` solo corre al fijar pieza: habrá que repintar el preview al cambiar de skin.                                                                                                                                                                                     | 2026-08-20     |
| `arkanoid`  | pendiente | falta   | falta | falta | Sin `app/games/arkanoid/skins.ts`; 2 literales de color. Usa spritesheet: requiere `app/games/skin-utils.ts` + `bakeTintedSheet` (aún no creado).                                                                                                                                                                                                                            | 2026-08-20     |
| `snake`     | pendiente | falta   | falta | falta | Sin `app/games/snake/skins.ts`; 3 literales de color + hoja de frutas (`app/games/snake/sprites.ts`) que necesitará tintado horneado.                                                                                                                                                                                                                                        | 2026-08-20     |

## Contrato compartido

- `app/games/skins.ts` — `SKIN_IDS` / `SkinId` / `DEFAULT_SKIN` / `SKIN_LABELS` / `isSkinId` /
  `skinStorageKey` (creado el 2026-08-20).
- `app/games/skin-utils.ts` — **todavía no existe**: se creará cuando entre al alcance el primer
  juego con spritesheet (`arkanoid` o `snake`).
- `RealGameProps.skin?: SkinId` en `app/games/registry.tsx`.
- Selector de 3 chips en `.hud-actions` de `app/juego/[id]/jugar/page.tsx`, persistido por juego
  en `localStorage` (`av_skin_<id>`), estilos `.hud-skin`/`.skin-chip` en `app/globals.css`.
- **Desviación del contrato a conservar**: la skin se lee con `useSyncExternalStore`
  (`subscribeSkin`/`readSkin`/`writeSkin` en `jugar/page.tsx`) en lugar de `useState` +
  `useEffect`, porque `setState` sincrónico dentro de un efecto dispara el error de ESLint
  `react-hooks/set-state-in-effect` (el mismo que ya arrastra `app/auth-context.tsx`). El
  `getServerSnapshot` devuelve `DEFAULT_SKIN`, así que la hidratación sigue siendo segura. No
  "arreglar" esto volviendo al efecto.
