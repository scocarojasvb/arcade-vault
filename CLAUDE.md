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

There is no test runner configured in `package.json` yet. Available scripts: `npm run dev`, `build`, `start`, `lint` (eslint), `format`/`format:check` (prettier). A `PostToolUse` hook (`.claude/hooks/format-file.mjs`, wired in `.claude/settings.json`) runs ESLint `--fix` + Prettier on every file Claude writes/edits — don't hand-format, the hook does it. `.claude/settings.local.json` holds the permission allowlist and `enabledMcpjsonServers: ["supabase"]`.

## Spec-driven workflow

This project follows spec-driven design: every non-trivial feature starts as a markdown spec in `specs/` before any code is written. The canonical flow for adding a new game is **`game-planner` (decide which game) → `/add-game` (write the spec) → `/spec-impl-game` (implement + reskin + mobile-port)** — see `## Agents` below for the subagents.

- **`/spec`** — guided spec designer. Asks clarifying questions section by section, saves `specs/NN-slug.md` as `Draft`/`Borrador`.
- **`/spec-impl NN-slug`** — implements an **Approved** spec: creates a git branch named after it, then implements step by step with pauses to review diffs.
- **`/add-game`** — specialized variant of `/spec` for adding a new real game to the catalog (port from `references/started-games/` or from a prompt). Only writes a spec file, never code.
- **`/spec-impl-game NN-slug`** — variant of `/spec-impl` for specs that add a real game: runs the same 4 phases as `/spec-impl`, then once acceptance criteria and `npm run build` pass, automatically chains `skin-designer` → `mobile-porter` **strictly in series, never in parallel**, scoped to the game id and routes derived from the spec.

`/spec` and `/spec-impl` are external (`Klerith/fernando-skills`, installed via `npx skills@latest add Klerith/fernando-skills`, tracked in `skills-lock.json`) and live in `.agents/skills/`; `.claude/skills/spec` and `.claude/skills/spec-impl` are **symlinks** to them. `add-game` and `spec-impl-game` are project-local: their `.claude/skills/` copies are **plain duplicates** of `.agents/skills/`, not symlinks — edit both or they'll drift.

Specs so far: `specs/01-…` through `specs/12-…` (visual MVP, home, about+Resend, Supabase setup, Asteroids, Supabase leaderboard, Tetris, Arkanoid, Snake, touch controls, Frogger, Frogger render performance). `specs/game-jam/<game-id>/01-....md`/`02-....md` holds competing proposals written by the `game-jam` agent, not yet promoted. Read the two most recent top-level specs before writing a new one — they carry the current naming/props conventions. `specs/.spec-config.yml` controls `AutoCreateBranch` (default `true`).

## Agents (`.claude/agents/`)

Each agent's own file is the contract — read it before invoking, don't infer scope from this list.

- **`game-planner`** — decides _which_ game to add next (catalog gaps by category/color/mechanic), never re-suggests a rejected one. Read-only except its memory. Memory: `references/suggested-games.md`. → `.claude/agents/game-planner.md`
- **`game-jam`** — given a theme, writes 2 competing implementation-proposal specs for one game under `specs/game-jam/<game-id>/`. Never touches code or Supabase. → `.claude/agents/game-jam.md`
- **`skin-designer`** — audits and implements the missing `classic`/`neon`/`retro` skins per game. Writes code (`app/games/skins.ts`, per-game `app/games/<id>/skins.ts`, HUD selector). Memory: `references/games-with-theme.md`. → `.claude/agents/skin-designer.md`
- **`mobile-porter`** — makes the 7 real routes work on mobile (CSS inside `@media`, pages, only the canvas wrapper — never game logic or resolution constants). Memory: `references/mobile-ready-pages.md`. → `.claude/agents/mobile-porter.md`
- **`game-performance`** — profiles a game's draw loop (Chrome headless + CDP Tracing) before touching code, applies the Frogger-proven fix playbook, re-measures. Never changes mechanics, collisions, scoring or timing. Memory: `references/games-performance.md`. → `.claude/agents/game-performance.md`
- **`security-auditor`** — audits app/DB security across 4 domains (Supabase RLS/policies, Auth/sessions, HTTP headers/input validation, secrets/dependencies) against real evidence (Supabase advisors, `pg_policies`, deterministic greps, `npm audit`) and reports prioritized findings with proposed SQL/diffs. Read-only except its memory. Memory: `references/security/audit-status.md`. → `.claude/agents/security-auditor.md`

`skin-designer` and `mobile-porter` must never run in parallel — both can touch `app/juego/[id]/jugar/page.tsx` and `app/globals.css`. `security-auditor` is safe to run alongside any other agent — it never writes to `app/` or `app/globals.css`.

## Architecture

Arcade Vault is a real (not scaffold) Next.js App Router app: an online arcade where users play real games and compete on a Supabase-backed leaderboard.

- **Routes** (`app/`): `/` (landing), `/biblioteca` (game library), `/juego/[id]` (game detail), `/juego/[id]/jugar` (player — HUD, pause, game-over, score save), `/salon-de-la-fama` (hall of fame / leaderboard), `/acerca-de` (about + contact form), `/auth` (login), `/api/contacto` (Resend email endpoint).
- **Real games** live under `app/games/<id>/<id>-game.tsx` as client components implementing the shared `RealGameProps` contract (`paused`, `skin?: SkinId`, `onStateChange`, `onGameOver`) and `RealGameState` (`score`, `level`, `lives?`, `lines?`) from `app/games/registry.tsx`. Currently registered in `REAL_GAME_IDS` (`app/data/real-games.ts`) and `REAL_GAME_COMPONENTS`: **asteroids, tetris, arkanoid, snake, frogger** (see `references/implemented-games.md`). Only these real games are shown — the older mock catalog (`app/data/games.ts`) is superseded for game listing but still supplies static metadata shape (`id`, `title`, `cat`, `color`, `cover`, …).
- **Shared game systems**: `app/games/skins.ts` (`SKIN_IDS`, `DEFAULT_SKIN`, `skinStorageKey()`), `skin-utils.ts`, and `touch-controls.tsx` + `use-is-touch-device.ts` (SPEC 10 D-pad/action button). Each game has its own `app/games/<id>/skins.ts` palette except `tetris` (still pending — see `references/games-with-theme.md`).
- **New real games are added via the `game-planner` → `/add-game` → `/spec-impl-game` flow** (see `## Spec-driven workflow`), not ad hoc: a `games` row + Supabase seed migration, a `.cover-<id>` style in `globals.css`, the game component itself, then registration in `real-games.ts`/`registry.tsx`. Most games ship their own seed migration (tetris/arkanoid/snake/frogger); asteroids predates that convention and is seeded in `0001_games_and_scores.sql`/`supabase/seed.sql`.
- **Supabase backend** (`app/lib/supabase/client.ts` browser client, `app/lib/supabase/server.ts` server client, `proxy.ts` for session refresh): two tables, no RLS (deliberate decision from spec 06) — `games` (id, title, short, long, cat, cover, color, best, plays) and `scores` (id, game_id → games.id, user_id, name, score, created_at). Schema in `supabase/migrations/0001_games_and_scores.sql`. MCP server `supabase` is configured in `.mcp.json` (project ref `uzyvtejaqvfkcxtkdgrc`) — use `mcp__supabase__*` tools (`list_tables`, `execute_sql`, `get_advisors`, `get_logs`, migrations) instead of guessing schema state.
- **Auth**: `app/auth-context.tsx` is a lightweight client-side `AuthProvider` (`localStorage`-backed `User`), separate from Supabase auth used server-side for session cookies via `proxy.ts`. `saveScore` writes directly to the Supabase `scores` table.
- **Contact form**: `/acerca-de` posts to `app/api/contacto/route.ts`, which validates and sends via `Resend` (`RESEND_API_KEY` env var) to a fixed address.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`), configured through `app/globals.css` rather than a `tailwind.config.js`. Each game/cover adds its own `.cover-<id>` block there.
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`).
- **`references/`** doubles as persistent memory for the subagents above, plus raw source material:
  - `implemented-games.md` (game-catalog snapshot), `suggested-games.md` (`game-planner`), `games-with-theme.md` (`skin-designer`), `mobile-ready-pages.md` (`mobile-porter`), `games-performance.md` (`game-performance`).
  - `started-games/0N-<game>` holds the original vanilla-JS canvas games being ported (asteroids, tetris, arkanoid); `source-assets/` holds sprite/asset sources (e.g. `snake-assets`) for games designed from scratch; `templates/` holds the original visual mockups migrated in specs 01–03.
- **Env vars** (`.env`, template in `.env.template`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY` are read via `process.env` in app code; `SUPABASE_DB_PASSWORD` is CLI/tooling-only (not read in code).

## UI design

Use `/frontend-design` for UI work. **Not currently installed** in this environment (only the `github@claude-plugins-official` marketplace plugin is; `/plugin install frontend-design@claude-plugins-official` first) — fall back to matching existing component/Tailwind patterns if it's unavailable.
