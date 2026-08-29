# Feedblick Pomodoro — Claude Code Instructions

## What this product is

**Feedblick Pomodoro** — real-time classroom coordination for high-school students working in
self-directed groups (often outside the classroom, on iPads). A teacher signs in, opens a room,
and projects a QR code / room code for students to join. Inside a room: a server-authoritative
shared pomodoro timer, a teacher-editable to-do list students check off, and three anonymous
signals (Done / Stuck / Need 2 min) the teacher sees aggregated, never attributed to an
individual.

Teacher identity is a normal Supabase Auth account. Student identity is intentionally NOT an
account: each scan gets a random ephemeral handle (ideas: fruit names, teacher-defined —
open item) valid only for that room session, discarded when the room expires. No student
accounts, no names, no persistent tracking.

One of three products under the Feedblick umbrella (siblings: `../feedblick-edu`,
`../feedblick-stars`), sharing an architecture but not a repo, Vercel project, or Supabase
project — see the "Local Supabase stack" section below for why port isolation between them
matters.

Scaffolded 2026-08-29 from `../feedblick-stars` (TanStack Start + Supabase + shadcn/Radix +
Tailwind + bun, its testing/CI conventions carried forward wholesale), with restaurant-domain
routes, migrations, and i18n stripped. Room/timer/task/signal logic does not exist yet —
this is app-shell + teacher auth only.

## Stack

TanStack Start (React 19 + Vite + Nitro/Vercel) + Supabase (Postgres, Auth) + shadcn/Radix +
Tailwind 4, bun package manager. No i18n (unlike the edu/stars siblings — kept out deliberately
for simplicity; add back only if a real need shows up).

## Local Supabase stack — port isolation

Both sibling repos run local Supabase stacks with fixed ports, and a second `supabase start` on
an already-claimed port silently **adopts** the other repo's containers instead of creating its
own (confirmed happening for real between edu and stars — see `feedblick-stars/CLAUDE.md`).
This repo uses **563xx** (`supabase/config.toml`) and dev server **8082** (`vite.config.ts`),
distinct from edu's defaults (543xx / 8080) and stars' 553xx / 8081. If a local backend
misbehaves, run `docker ps` first and check which project name the `supabase_*` containers
carry before assuming a code problem.

## Commands

- `bun run dev` — dev server on :8082
- `bun run typecheck` — two `tsc` programs (see `tsconfig.test.json`'s own comment for why)
- `bun test` — unit tests (bun test + happy-dom + jest-dom matchers, see `test/setup.ts`)
- `bun run test:e2e` — Playwright, needs `supabase start` + `bun run dev` running
- `bun run test:db` — pgTAP tests against the local stack (`supabase/tests/database/`, empty
  until domain migrations exist)
- `bun run lint` / `bun run format`
- `git config core.hooksPath .githooks` — one-time setup for the pre-push gate (typecheck + bun
  test + lint)

## What exists

- App shell: root route/theme bootstrap, home page, teacher auth (sign in/up, check-email,
  reset-password), an `/_authenticated` route guard, and a placeholder `/dashboard`.
- Reused as-is from stars: all shadcn UI primitives (`src/components/ui/`), the
  target-timestamp countdown utility (`src/lib/countdown.ts` — this is the pattern the
  server-authoritative pomodoro timer will build on), the Supabase client/auth-middleware
  scaffolding (all marked "automatically generated" in stars, safe to treat as boilerplate).
- Visual system: kept stars' current shadcn/Tailwind look (amber/gold primary, oklch tokens in
  `src/styles.css`) — a "Modernist" redesign was considered and explicitly rejected.

## What's next (not yet built)

- Room creation + expiring room code / QR join flow
- Ephemeral per-scan student handles (fruit names, teacher-defined list — get the list from the
  user rather than inventing one)
- Server-authoritative timer state (start/pause/reset/skip, focus-length presets)
- Teacher-editable to-do list, student read-only view with local ticking
- Anonymous signal aggregation (Done / Stuck / Need 2 min) by group/location, never by individual
- Group badge editor + touch-friendly drag/tap grouping (HTML5 drag doesn't fire reliably on iOS)
- Real-time sync: Supabase Realtime `broadcast`/`presence` channels keyed by room code (not
  `postgres_changes` — there's no durable per-student row to subscribe to)
