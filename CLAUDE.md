# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Next.js 16 — not the version you remember

This project runs **Next.js 16.2.11 / React 19.2.4**, which has real breaking changes from older Next.js versions that may be baked into training data. Before writing App Router code (proxy, caching, config), check `node_modules/next/dist/docs/01-app/` — especially:

- **Middleware is now Proxy**: `middleware.ts` no longer exists as a convention — this repo uses `proxy.ts` at the project root (same level as `app/`) to refresh the Supabase session cookie on every request. See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- **Turbopack is the default** for both `next dev` and `next build` (no `--turbopack` flag needed). A custom Webpack config will make `next build` fail unless you pass `--webpack` explicitly.
- **`turbopack` config moved out of `experimental`** — it's now a top-level key in `next.config.ts` (`experimental.turbopack` is gone).
- Minimum Node.js is 20.9+, TypeScript 5.1+.
- Full upgrade notes: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

When in doubt about an API's current shape, grep the docs under `node_modules/next/dist/docs/` rather than relying on prior knowledge of Next.js.

There is no test runner configured in `package.json` yet. Available scripts: `npm run dev`, `build`, `start`, `lint` (eslint), `format`/`format:check` (prettier). A `PostToolUse` hook (`.claude/hooks/format-file.mjs`) runs ESLint `--fix` + Prettier on every file Claude writes/edits — don't hand-format, the hook does it.

## Spec-driven workflow

This project follows spec-driven design: every non-trivial feature starts as a markdown spec in `specs/` before any code is written.

- **`/spec`** — guided spec designer (from `Klerith/fernando-skills`, installed via `npx skills@latest add Klerith/fernando-skills`, tracked in `skills-lock.json`). Asks clarifying questions section by section, saves `specs/NN-slug.md` as `Draft`/`Borrador`.
- **`/spec-impl NN-slug`** — implements an **Approved** spec: creates a git branch named after it, then implements step by step with pauses to review diffs.
- **`/add-game`** (project-local skill, `.claude/skills/add-game/SKILL.md`, mirrored in `.agents/skills/add-game/`) — specialized variant of `/spec` for adding a new real game to the catalog (port from `references/started-games/` or from a prompt). Only writes a spec file, never code.
- **`game-planner` subagent** (`.claude/agents/game-planner.md`) — the step _before_ `/add-game`: decides _which_ game to add next by analyzing catalog gaps (category/color/mechanic) and the implemented games, and keeps a persistent memory of past suggestions in `references/suggested-games.md` so it never re-proposes something already rejected. Only reads the repo and writes that one memory file — never touches `specs/`, `app/`, or Supabase. Output is a ranked recommendation plus the `/add-game` command to run next.
- **`game-jam` subagent** (`.claude/agents/game-jam.md`) — given a theme, derives one game and writes exactly 2 competing, self-contained implementation-proposal specs for it under `specs/game-jam/<game-id>/` (`01-...md`/`02-...md`), each following the same section structure as `specs/07-…`–`09-…`. Fully autonomous (no section-by-section dialogue like `/add-game`), writes only inside that one subdirectory, always leaves `Estado: Draft`, and never invokes `/spec-impl`. The user reviews both, promotes the chosen one to `specs/NN-slug.md`, flips it to Approved, then runs `/spec-impl`.
- **`skin-designer` subagent** (`.claude/agents/skin-designer.md`) — unlike the two agents above, this one writes code directly instead of a spec: audits that every real game has at least 3 skins (`classic` default, `neon`, `retro`) and implements the missing ones. Bootstraps the shared contract (`app/games/skins.ts`, per-game `app/games/<id>/skins.ts` palettes, optional `skin` prop on `RealGameProps`, a skin selector in the `/juego/[id]/jugar` HUD) the first time it runs, then reskins games one at a time (colors read via a ref inside the draw loop, never a remount) verifying with `npm run build` after each. Accepts an explicit list of games to target; tracks per-game status in a table at `references/games-with-theme.md` and never re-touches a game already marked `completo` there unless it's named explicitly. Never touches `specs/`, Supabase, `app/data/games.ts`/`real-games.ts`, or `:root` in `globals.css`.
- Specs so far (`specs/01-…` through `specs/09-…`): MVP visual, home landing, about + Resend contact form, Supabase setup, Asteroids game, Supabase-backed leaderboard, Tetris, Arkanoid, Snake. Read the two most recent before writing a new one — they carry the current naming/props conventions.
- `specs/.spec-config.yml` (if present) controls `AutoCreateBranch`; default is `true`.

## Architecture

Arcade Vault is a real (not scaffold) Next.js App Router app: an online arcade where users play real games and compete on a Supabase-backed leaderboard.

- **Routes** (`app/`): `/` (landing), `/biblioteca` (game library), `/juego/[id]` (game detail), `/juego/[id]/jugar` (player — HUD, pause, game-over, score save), `/salon-de-la-fama` (hall of fame / leaderboard), `/acerca-de` (about + contact form), `/auth` (login), `/api/contacto` (Resend email endpoint).
- **Real games** live under `app/games/<id>/<id>-game.tsx` as client components implementing the shared `RealGameProps` contract (`paused`, `onStateChange`, `onGameOver`) from `app/games/registry.tsx`. Currently registered in `REAL_GAME_IDS` (`app/data/real-games.ts`) and `REAL_GAME_COMPONENTS`: **asteroids, tetris, arkanoid, snake** and more...(see `references/implemented-games.md` when you need to check which games are implemented). Only these real games are shown — the older mock catalog (`app/data/games.ts`) is superseded for game listing but still supplies static metadata shape (`id`, `title`, `cat`, `color`, `cover`, …).
- **New real games are added via the `game-planner` (decide which game) → `/add-game` (write the spec) → `/spec-impl` (implement) flow**, not ad hoc: generalize `real-games.ts`/`registry.tsx` (already done), add a `games` row + Supabase seed migration, a `.cover-<id>` style in `globals.css`, the game component itself, then register it.
- **Supabase backend** (`app/lib/supabase/client.ts` browser client, `app/lib/supabase/server.ts` server client, `proxy.ts` for session refresh): two tables, no RLS (deliberate decision from spec 06) — `games` (id, title, short, long, cat, cover, color, best, plays) and `scores` (id, game_id → games.id, user_id, name, score, created_at). Schema in `supabase/migrations/0001_games_and_scores.sql`; each new game ships its own seed migration (see `20260803000000_seed_tetris_game.sql`, etc.) and/or `supabase/seed.sql`. MCP server `supabase` is configured in `.mcp.json` (project ref `uzyvtejaqvfkcxtkdgrc`) — use `mcp__supabase__*` tools (`list_tables`, `execute_sql`, `get_advisors`, `get_logs`, migrations) instead of guessing schema state.
- **Auth**: `app/auth-context.tsx` is a lightweight client-side `AuthProvider` (`localStorage`-backed `User`), separate from Supabase auth used server-side for session cookies via `proxy.ts`. `saveScore` writes directly to the Supabase `scores` table.
- **Contact form**: `/acerca-de` posts to `app/api/contacto/route.ts`, which validates and sends via `Resend` (`RESEND_API_KEY` env var) to a fixed address.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`), configured through `app/globals.css` rather than a `tailwind.config.js`. Each game/cover adds its own `.cover-<id>` block there.
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`).
- **Reference material**: `references/started-games/0N-<game>` holds the original vanilla-JS canvas games being ported (asteroids, tetris, arkanoid); `references/source-assets/` holds sprite/asset sources (e.g. `snake-assets`) for games designed from scratch; `references/templates/` holds the original visual mockups migrated in specs 01–03.
- **Env vars** (`.env`, template in `.env.template`): `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`.

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- Ver "Spec-driven workflow" arriba para `/spec`, `/spec-impl` y `/add-game`.
- Usa el subagente `game-planner` (`.claude/agents/game-planner.md`) antes de `/add-game` cuando haya que decidir qué juego nuevo agregar al catálogo — mantiene memoria de sugerencias previas en `references/suggested-games.md`.
- Usa el subagente `game-jam` (`.claude/agents/game-jam.md`) cuando el usuario dé un tema y quiera ver 2 propuestas de implementación alternativas del mismo juego antes de comprometerse con una — escribe en `specs/game-jam/<game-id>/`, nunca en `specs/` plano ni en código.
- Usa el subagente `skin-designer` (`.claude/agents/skin-designer.md`) para auditar y completar las skins (`classic`/`neon`/`retro`) de los juegos reales del catálogo — se le puede indicar una lista concreta de juegos a procesar; a diferencia de `game-planner`/`game-jam`, este sí escribe código en `app/games/` y `app/juego/[id]/jugar/page.tsx`, y mantiene una tabla de estado en `references/games-with-theme.md` (nunca reprocesa un juego ya marcado `completo` salvo que se lo pidas por nombre).
