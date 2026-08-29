# Feedblick Pomodoro — Claude Code Instructions

## What this product is

**Feedblick Pomodoro** — real-time classroom coordination for high-school students working in
self-directed groups (often outside the classroom, on iPads). A teacher signs in, opens a room,
and projects a QR code / room code for students to join. Inside a room: a server-authoritative
shared pomodoro timer, a teacher-editable to-do list students check off, and three anonymous
signals (Done / Stuck / Need 2 min) the teacher sees aggregated, never attributed to an
individual.

Teacher identity is a normal Supabase Auth account. Student identity is intentionally NOT an
account: a student types their own name/nickname/codename on `/session/$code` — revised
2026-08-29 away from an earlier auto-assigned-fruit-HANDLE design (see git history) once Sergio
described the session page as a shared "virtual room" that should show a live, self-reported
list of who's here. Anonymity is now the student's own choice, not system-enforced. (Fruits came
back the very next day, 2026-08-30, in an unrelated role — as the fixed set of GROUP badges, not
student identity; don't conflate the two, they solve different problems.) Nothing is persisted
either way: group/signal/name state for students lives ONLY in a Supabase Realtime presence
channel, never in Postgres, so it's discarded automatically when a room ends — no student
accounts, no cleanup job needed.

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
- **Schema** (`supabase/migrations/20260829180000_rooms.sql` + three same-day-later ones):
  `rooms` (code, status, timer state columns —
  `timer_phase`/`timer_target_at`/`timer_remaining_seconds`/`timer_duration_seconds`/
  `timer_round`), `room_tasks`. RLS: the owning teacher has full CRUD; anon/authenticated get
  read-only access to a room (and its tasks) only while `status = 'active'` — the join code
  itself is the access control, same trust model as a Kahoot-style code. Per-student state
  (name, group, signal) is deliberately NOT a table — see the presence note below. Table-level
  `GRANT`s are required alongside the RLS policies (Postgres won't evaluate policies without
  them) — verified against a real local Supabase instance via REST (teacher CRUD, anon read of
  active rooms, anon blocked from writes, ended rooms invisible to anon, teacher still sees
  their own ended rooms). `room_badges` existed briefly (teacher-created badges with
  name/place/seats) and was dropped 2026-08-30 — see below. `code_expires_at` (a 1-hour
  join-code TTL) also existed briefly and was dropped the same day — Sergio decided the teacher
  ending the room is the only lifecycle boundary that matters; a separate timer mostly just
  risked cutting a room short mid-class.
- **REPLICA IDENTITY FULL on `rooms`/`room_tasks`** (`..._replica_identity_full.sql`) — a real
  bug, not a UI one: Realtime's `postgres_changes` filters (`room_id=eq.<uuid>`) are evaluated
  against the OLD row for DELETE events, but with the default replica identity (primary key
  only), that OLD row only ever contains `id` in a DELETE's payload — never `room_id` — so the
  filter can never match and the delete event is silently dropped before reaching any client.
  INSERT/UPDATE are unaffected (their payload always carries the full NEW row). This is _the_
  gotcha to remember if a future table's deletes ever seem to not sync live.
- **Group badges — revised 2026-08-30, no longer teacher-created**: a fixed, always-available
  set of 8 fruit-emoji badges (`src/lib/group-fruits.ts`: pineapple, watermelon, banana, apple,
  orange, avocado, lime, cherry), the same 8 in every room. A student picks one for themself —
  still self-only, never someone else's (confirmed intentional multiple times — see git
  history). No capacity/seats concept anymore (the old `room_badges.seats` cap was dropped along
  with the table; nothing currently stops every student picking the same fruit).
- **Roster table** (`src/components/RosterTable.tsx`): a sortable Name/Group table — click a
  column header to sort, click again to reverse, unassigned students always sort last. Shared
  verbatim between the teacher panel and `/session/$code` ("I want to see the same table of
  students/groups the students see") rather than two copies that could drift. The header buttons
  fill their whole `<th>` (padding zeroed on the cell, moved onto the button) — earlier they only
  wrapped the label text tightly, so clicking the header's padding around the text did nothing.
  `showSignal` (teacher-panel only, not passed on the student page) adds a third column showing
  each student's current Done/Stuck/Need-2-min badge.
- **Signal meters** (`src/components/SignalMeter.tsx`): Done/Stuck/Need-2-min render as small
  ring meters (count/total-in-room), not a categorical pie — per the dataviz skill, "a ratio
  against a limit" is a meter, and a 2-4 slice donut/pie comparing close values is an
  anti-pattern a stat number or meter reads better than. Fill uses the reserved status color
  (good=emerald/warning=amber/critical=red); the unfilled track is a lighter step of the _same_
  ramp, not neutral gray, so the color still carries meaning across the whole ring. "In room"
  has no natural limit to be a ratio of, so it stays a plain stat number both here and on
  `/display/$code`.
- **Stuck-signal toast**: the teacher panel toasts the instant a student's signal becomes
  "stuck" (`duration: Infinity` + close button — a missed stuck signal is worse than a toast
  that lingers, same reasoning as feedblick-stars' own low-rating alert). Tracked by
  presence key, not a simple "is anyone stuck" boolean, so a second student going stuck while
  the first already is still fires, and toggling stuck→done→stuck re-fires too.
- **Teacher** (`/rooms/$roomId`): laid out top-to-bottom as Timer (upper-left) + To-do list
  (upper-right), then live counts (with a per-fruit signal drill-down), then the roster table.
  The QR code is NOT inline in that layout anymore — `src/components/FloatingQrPanel.tsx` is a
  `position: fixed` corner panel (modeled on `feedblick-edu`'s `LiveQrCard` "shrunk" mode in
  `SetQrButton.tsx`) that stays visible while the rest of the page scrolls underneath it,
  instead of reserving a grid slot ("I don't want to sacrifice the space"). Its "Open display"
  button pops `/display/$code` into a separate, named, explicitly-sized browser window
  (`openDisplayWindow` in `rooms.$roomId.tsx`) rather than a new tab — meant to be dragged onto a
  projector while the room panel stays on the teacher's own screen; same `window.open(url, name,
"width=...,height=...")` pattern as `feedblick-edu`'s `openLiveDashboard.ts`, which also falls
  back to a toast if the popup is blocked.
- **Room display** (projector, unauthenticated): `/display/$code` — big countdown, QR, live
  counts (also signal meters now). No `BackgroundGlow` here on purpose (a soft blur competing
  with a large-print countdown across a room didn't serve the same "landing page" feel the glow
  was for elsewhere).
- **Student** (unauthenticated): `/session/$code` — timer (upper-left) and tasks (upper-right),
  then the three signal buttons, then "You" (a name input + the fixed fruit-badge picker), then
  the roster table. A student types a name (persisted in `sessionStorage` per room so a reload
  keeps it, debounced `NAME_COMMIT_DELAY_MS` before it's broadcast) and doesn't appear in the
  roster at all until they have. Task checkboxes stay local/per-device on purpose — never
  synced — so one student finishing a task never marks it done for anyone else.
- **Realtime**: `src/lib/room-presence.ts` — one presence channel per room code
  (`room:{code}`), shared by all three screens; `src/hooks/use-room.ts` — `postgres_changes`
  subscriptions for the `rooms`/`room_tasks` tables (the durable, teacher-authored data), reusing
  the edu/stars pattern as planned.
- **Timer**: `src/lib/timer.ts` — pure `build*` functions (`buildStartFocus`, `buildStartBreak`,
  `buildPause`, `buildResume`, `buildReset`) return the DB patch to send; `useRoomTimerDisplay`
  renders it, reusing `countdown.ts`'s target-timestamp pattern while running and a static
  `timer_remaining_seconds` while paused. `src/components/TimerWheel.tsx` is the shared circular
  countdown widget (SVG ring draining from full to empty), used by both the teacher panel and
  `/session/$code`.

## Known gaps / next up

- Task reordering (tasks currently only append; no drag-to-reorder).
- Room list has no pagination/archiving.
- No group-size cap anymore (dropped with `room_badges.seats`) — nothing stops every student
  picking the same fruit.
- Unit tests exist for the pure logic (`timer.ts`'s `build*` functions, `room-presence.ts`'s
  `summarize*` functions, `room-code.ts`, and a `RosterTable` behavior test — the last one
  caught a real sort-direction bug: "desc" used to blindly `.reverse()` the whole array, which
  put unassigned students FIRST instead of always-last). Still no Playwright/pgTAP coverage for
  any of the room/timer/signal flow end-to-end — `e2e/` and `supabase/tests/database/` are still
  just the scaffold's smoke skeleton. `TimerWheel`/`SignalMeter`/`FloatingQrPanel` have no tests
  at all yet (mostly presentational; `useRoomTimerDisplay`'s hook half is also as-yet untested).
