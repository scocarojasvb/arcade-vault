# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Next.js 16 — not the version you remember

This project runs **Next.js 16.2.11 / React 19.2.4**, which has real breaking changes from older Next.js versions that may be baked into training data. Before writing App Router code (middleware, caching, config), check `node_modules/next/dist/docs/01-app/` — especially:

- **Middleware is now Proxy**: `middleware.ts` no longer exists as a convention — use `proxy.ts` at the project root (same level as `app/`). See `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
- **Turbopack is the default** for both `next dev` and `next build` (no `--turbopack` flag needed). A custom Webpack config will make `next build` fail unless you pass `--webpack` explicitly.
- **`turbopack` config moved out of `experimental`** — it's now a top-level key in `next.config.ts` (`experimental.turbopack` is gone).
- Minimum Node.js is 20.9+, TypeScript 5.1+.
- Full upgrade notes: `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

When in doubt about an API's current shape, grep the docs under `node_modules/next/dist/docs/` rather than relying on prior knowledge of Next.js.

There is no test runner configured in `package.json` yet.

## Skills

Usa siempre /frontend-design para diseñar la interfaz de usuario.

## Architecture

- **App Router** (`app/`) — currently just the default `create-next-app` scaffold: `app/layout.tsx` (root layout, Geist fonts) and `app/page.tsx` (default landing page). No routes, data fetching, or server actions have been built yet.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`), configured through `app/globals.css` rather than a `tailwind.config.js`.
- **Path alias**: `@/*` maps to the project root (`tsconfig.json`).
- **Spec-driven workflow**: per `README.md`, this project follows spec-driven design using `/spec` and `/spec-impl` commands, based on practices from https://github.com/Klerith/fernando-skills (installed via `npx skills@latest add Klerith/fernando-skills`). Check for `.claude/skills` or similar spec tooling before assuming a plain ad-hoc workflow.
- **Product**: Arcade Vault — an online gaming platform where users compete for high scores (per `README.md`). No game logic, auth, or scoring backend exists yet in the codebase.
