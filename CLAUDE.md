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
- Specs so far (`specs/01-…` through `specs/09-…`): MVP visual, home landing, about + Resend contact form, Supabase setup, Asteroids game, Supabase-backed leaderboard, Tetris, Arkanoid, Snake. Read the two most recent before writing a new one — they carry the current naming/props conventions.
- `specs/.spec-config.yml` (if present) controls `AutoCreateBranch`; default is `true`.

## Architecture

Arcade Vault is a real (not scaffold) Next.js App Router app: an online arcade where users play real games and compete on a Supabase-backed leaderboard.

- **Routes** (`app/`): `/` (landing), `/biblioteca` (game library), `/juego/[id]` (game detail), `/juego/[id]/jugar` (player — HUD, pause, game-over, score save), `/salon-de-la-fama` (hall of fame / leaderboard), `/acerca-de` (about + contact form), `/auth` (login), `/api/contacto` (Resend email endpoint).
- **Real games** live under `app/games/<id>/<id>-game.tsx` as client components implementing the shared `RealGameProps` contract (`paused`, `onStateChange`, `onGameOver`) from `app/games/registry.tsx`. Currently registered in `REAL_GAME_IDS` (`app/data/real-games.ts`) and `REAL_GAME_COMPONENTS`: **asteroids, tetris, arkanoid, snake** and more...(see `references/implemented-games.md` when you need to check which games are implemented). Only these real games are shown — the older mock catalog (`app/data/games.ts`) is superseded for game listing but still supplies static metadata shape (`id`, `title`, `cat`, `color`, `cover`, …).
- **New real games are added via the `/add-game` → `/spec-impl` flow**, not ad hoc: generalize `real-games.ts`/`registry.tsx` (already done), add a `games` row + Supabase seed migration, a `.cover-<id>` style in `globals.css`, the game component itself, then register it.
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
