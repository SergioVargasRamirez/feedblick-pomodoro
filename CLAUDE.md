# Feedblick Pomodoro — Claude Code Instructions

## What this product is

**Feedblick Pomodoro** — real-time classroom coordination for high-school students working in
self-directed groups (often outside the classroom, on iPads). A teacher signs in, opens a room,
and projects a QR code / room code for students to join. Inside a room: a server-authoritative
shared pomodoro timer, a teacher-editable to-do list students check off, and three anonymous
signals (Done / Stuck / Need 2 min) the teacher sees aggregated, never attributed to an
individual.

Teacher identity is a normal Supabase Auth account. Student identity is intentionally NOT an
account: each scan gets a random ephemeral handle — fruit + a two-digit number (e.g. "Mango
07"), the pool defined in `src/lib/fruit-handle.ts` — valid only for that room session,
discarded when the room expires. No student accounts, no names, no persistent tracking:
group/signal state for students lives ONLY in a Supabase Realtime presence channel, never in
Postgres, so there's nothing to clean up when a room ends.

One of three products under the Feedblick umbrella (siblings: `../feedblick-edu`,
`../feedblick-stars`), sharing an architecture but not a repo, Vercel project, or Supabase
project — see the "Local Supabase stack" section below for why port isolation between them
matters.

Scaffolded 2026-08-29 from `../feedblick-stars` (TanStack Start + Supabase + shadcn/Radix +
Tailwind + bun, its testing/CI conventions carried forward wholesale), with restaurant-domain
routes, migrations, and i18n stripped. Room/timer/task/signal/handle logic landed the same day
— see "What exists" below.

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
  reset-password), an `/_authenticated` route guard.
- **Schema** (`supabase/migrations/20260829180000_rooms.sql`): `rooms` (code, expiry, status,
  and timer state columns — `timer_phase`/`timer_target_at`/`timer_remaining_seconds`/
  `timer_duration_seconds`/`timer_round`), `room_tasks`, `room_badges`. RLS: the owning teacher
  has full CRUD; anon/authenticated get read-only access to a room (and its tasks/badges) only
  while `status = 'active' and code_expires_at > now()` — the join code itself is the access
  control, same trust model as a Kahoot-style code. Per-student state (handle, group, signal)
  is deliberately NOT a table — see the presence note above. Table-level `GRANT`s are required
  alongside the RLS policies (Postgres won't evaluate policies without them) — verified against
  a real local Supabase instance via REST (teacher CRUD, anon read of active rooms, anon blocked
  from writes, ended/expired rooms invisible to anon, teacher still sees their own ended rooms).
- **Teacher**: `/dashboard` (room list + create), `/rooms/$roomId` — QR + join-code expiry, live
  counts with a per-badge signal drill-down, timer controls (presets, pause/resume/reset/skip to
  break), to-do list editor, group badge editor.
- **Room display** (projector, unauthenticated): `/display/$code` — big countdown, QR, live
  counts.
- **Student** (unauthenticated): `/join/$code` — gets a fruit handle, countdown, the three
  signal buttons, self-assign to a group badge (capped at the badge's `seats`, own choice
  only — see below), read-only task list with local ticking, a live "who's in this room" list.
- **Handle capacity** (`src/lib/fruit-handle.ts`): at most `MAX_STUDENTS_PER_FRUIT` (4) students
  share a given fruit at once — a fresh join fills the lowest free numbered slot for a fruit
  still under the cap ("Mango 1", "Mango 2", ...), falling back to overflow past the cap only
  once every fruit is full. Assignment waits for the presence channel's first sync (`synced` on
  `useRoomPresenceChannel`) so it's deciding against a real snapshot of who's already there, not
  an empty-by-default one.
- **Badge capacity**: a badge's `seats` is enforced, not just displayed — `/join/$code` disables
  a badge once it's at capacity (self excluded, so leaving is always possible).
- **Realtime**: `src/lib/room-presence.ts` — one presence channel per room code
  (`room:{code}`), shared by all three screens; `src/hooks/use-room.ts` — `postgres_changes`
  subscriptions for the `rooms`/`room_tasks`/`room_badges` tables (the durable, teacher-authored
  data), reusing the edu/stars pattern as planned.
- **Timer**: `src/lib/timer.ts` — pure `build*` functions (`buildStartFocus`, `buildStartBreak`,
  `buildPause`, `buildResume`, `buildReset`) return the DB patch to send; `useRoomTimerDisplay`
  renders it, reusing `countdown.ts`'s target-timestamp pattern while running and a static
  `timer_remaining_seconds` while paused.

## Known gaps / next up

- **Group assignment is self-assign only — confirmed intentional**, not a placeholder: a
  student can only choose their own badge, never anyone else's. No peer/drag-onto-a-name
  assignment is planned.
- Task reordering (tasks currently only append; no drag-to-reorder).
- Room list has no pagination/archiving; no code auto-refresh from `/rooms/$roomId` (recreate
  the room if a longer join window is needed than `ROOM_CODE_TTL_MINUTES`, currently 60).
- No Playwright/pgTAP coverage yet for any of the above — `e2e/` and
  `supabase/tests/database/` are still just the scaffold's smoke skeleton.
