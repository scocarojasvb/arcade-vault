# Juegos implementados

Juegos reales (jugables) actualmente registrados en `REAL_GAME_IDS` (`app/data/real-games.ts`) y presentes en la tabla `games` de Supabase. Cada uno vive en `app/games/<id>/<id>-game.tsx` e implementa el contrato `RealGameProps`.

| id          | Título    | Categoría | Color   | Fecha de creación |
| ----------- | --------- | --------- | ------- | ----------------- |
| `asteroids` | ASTEROIDS | SHOOTER   | yellow  | 2026-07-29        |
| `tetris`    | TETRIS    | PUZZLE    | cyan    | 2026-08-03        |
| `arkanoid`  | ARKANOID  | ARCADE    | magenta | 2026-08-05        |
| `snake`     | SNAKE     | ARCADE    | green   | 2026-08-05        |

---

**Nota**: la tabla `games` en Supabase también contiene filas heredadas del catálogo mock antiguo (`bloque-buster`, `caida`, `duelo-pixel`, `gloton`, `invasores`, `ranaria`, `rocas`, `serpentina`) que **no** son juegos reales jugables — solo aportan metadata estática superada. La lista de juegos realmente implementados y jugables es la definida en `REAL_GAME_IDS` (`app/data/real-games.ts`): `asteroids`, `tetris`, `arkanoid`, `snake`.
