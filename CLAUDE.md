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

**Reframed 2026-08-31 as a product for teams generally, not just classrooms**: the underlying
mechanism (a room, a shared timer, a to-do list, anonymous signals) works for any small group
coordinating synchronous work, not only students — "Pomodoro has been traditionally used for
individuals, this is a pomodoro for teams" (Sergio's own framing). User-facing copy now says
Host/Participant/team instead of Teacher/Student/classroom/school. This was a **copy-only**
rename — internal identifiers (`rooms.teacher_id`, the `StudentPresence`/`PresentStudent` types,
`useRoomPresenceChannel`'s `students` field, code comments throughout) were deliberately left
alone; renaming them would be pure churn with real migration/RLS risk for zero user-visible
benefit. Sergio remains the actual primary user (a high-school teacher) — this is a positioning
change for how the product is described and sold, not a change to who uses it today or how the
room/timer/signal mechanics work.

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

## Testing discipline — MANDATORY

Every piece of non-trivial logic (a state transition, a calculation, sorting/filtering,
aggregation, anything with a branch or an edge case) gets a `bun:test` unit test in the SAME
change that introduces it — not "later," not "if there's time." This was asked for explicitly
after two separate audits caught real bugs (`RosterTable`'s sort direction, and untested gaps
in `phaseLabel`/the tomato color math) that shipped without coverage first.

- A component that's purely presentational (renders props, no branching or derived values) does
  not need a test of its own.
- The moment a component computes something — a sort order, a color, a fraction, a formatted
  string, a "should this fire" decision — extract that computation into an exported pure
  function and test the function, not the rendered output. Same pattern already used
  throughout: `countdown.ts`'s `formatRemaining`, `timer.ts`'s `build*`/`shouldAutoAdvance`/
  `nextAutoAdvancePatch`/`phaseLabel`/`transportAction`/`buildExtend`/`nextAutoAdvanceOutcome`/
  `clampAutoRestarts`, `TomatoProgress`'s
  (superseded by `PhaseIcon`) color math, `room-code.ts`, `room-presence.ts`'s
  `summarize*`/`pickAutoAssignFruit`, `admin-emails.ts`'s `isAdminEmail`,
  `access-request-status.ts`'s `getAccessRequestAcceptanceStatus`, `task-claim.ts`'s
  `nextClaimedBy`/`canSignalDone`, `group-fruits.ts`'s
  `toggleDisabledFruit`/`canToggleFruitEnabled`/`enabledFruitIds`.
- A few things genuinely need a rendered-component test instead (interaction behavior like
  "clicking this header sorts the table") — `RosterTable.test.tsx` is the existing example;
  reach for `@testing-library/react` the same way, and read `test/setup.ts`'s comments first
  (it documents a real footgun: never import `screen` from `@testing-library/dom` or `/react` in
  this project — use the queries `render()` itself returns).
- Before calling a task done, actually run `bun test` and check the new logic has coverage —
  don't assume it does because "it's similar to something already tested."
- `test/bun-test-types.d.ts` is a deliberately hand-rolled, minimal `bun:test` type surface (see
  its own comment for why it isn't `@types/bun`) — extend it with whatever matcher a new test
  needs; that's expected maintenance, not a sign something's wrong.

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
  orange, avocado, **lemon** (id `lemon` — was `lime`, renamed since the emoji is 🍋 and no
  reliably-supported standalone lime emoji exists; named for what it looks like), cherry), the
  same 8 in every room. A student picks one for themself — still self-only, never someone
  else's (confirmed intentional multiple times — see git history). No capacity/seats concept
  anymore (the old `room_badges.seats` cap was dropped along with the table; nothing currently
  stops every student picking the same fruit).
- **Roster table** (`src/components/RosterTable.tsx`): a sortable Name/Group table — click a
  column header to sort, click again to reverse, unassigned students always sort last. Shared
  verbatim between the teacher panel and `/session/$code` ("I want to see the same table of
  students/groups the students see") rather than two copies that could drift. The header buttons
  fill their whole `<th>` (padding zeroed on the cell, moved onto the button) — earlier they only
  wrapped the label text tightly, so clicking the header's padding around the text did nothing.
  `showSignal` (teacher-panel only, not passed on the student page) adds a third column showing
  each student's current Done/Stuck/Need-2-min badge.
- **Signal meters** (`src/components/SignalMeter.tsx`, 128px default — bumped up from 88px,
  "can and should be larger"): Done/Stuck/Need-2-min render as ring meters (count/total-in-room),
  not a categorical pie — per the dataviz skill, "a ratio against a limit" is a meter, and a 2-4
  slice donut/pie comparing close values is an anti-pattern a stat number or meter reads better
  than. Fill uses the reserved status color (good=emerald/warning=amber/critical=red); the
  unfilled track is a lighter step of the _same_ ramp, not neutral gray, so the color still
  carries meaning across the whole ring. "In room" has no natural limit to be a ratio of, so it
  got its own `src/components/InRoomBadge.tsx` instead — same circular sizing as the meters (so
  the four sit together as one visual family) but a plain unfilled ring + a Users icon, no
  progress arc, since there's nothing for it to be a ratio of.
- **Stuck-signal toast**: the teacher panel toasts the instant a student's signal becomes
  "stuck" (`duration: Infinity` + close button — a missed stuck signal is worse than a toast
  that lingers, same reasoning as feedblick-stars' own low-rating alert). Tracked by
  presence key, not a simple "is anyone stuck" boolean, so a second student going stuck while
  the first already is still fires, and toggling stuck→done→stuck re-fires too.
- **Room name** (`rooms.name`, migration `20260831100000_room_name_and_durations.sql`) — a
  teacher-set label distinct from the auto-generated `code`, editable only in the room panel's
  header (plain input, saved on blur/Enter). The dashboard list shows it ("I want to know what's
  inside") instead of leading with the code. A room stays joinable until explicitly ended (see
  the dropped-expiry note above), so creating one well ahead of class already works — no extra
  "draft" state was needed for that.
- **Deletable rooms**: the dashboard's per-room trash icon opens a shadcn `AlertDialog`
  ("Delete this room? ... can't be undone") before calling straight DELETE — already allowed by
  the existing owner-CRUD RLS policy, no new grant needed.
- **Adjustable focus/break lengths, no more fixed presets**: `rooms.focus_minutes`/
  `break_minutes` (same migration as room name; defaults 25/5) replace the old
  `FOCUS_PRESET_MINUTES` button row. `MinutesStepper` in `rooms.$roomId.tsx` is a plain -/+ (in
  `MINUTES_STEP`-sized jumps, clamped to `[MIN_MINUTES, MAX_MINUTES]` via `clampMinutes` —
  `src/lib/timer.ts`). Persisted, not local component state, because the auto-advance effect
  below needs to read them too.
- **Auto-advance when a phase's countdown hits zero** — fixes a real reported bug ("when a
  break/pause ends, the timer doesn't reset to a second pomodoro"): every phase change used to
  be manual-click-only, so reaching 0:00 did nothing on its own. `shouldAutoAdvance` (zero-
  crossing detection: fires only on a running positive→zero transition, never re-fires, never
  fires while paused) and `nextAutoAdvancePatch` (focus→break using `break_minutes` + round
  bump, break→focus using `focus_minutes` + same round) in `src/lib/timer.ts` are pulled out as
  pure functions specifically so this logic has real unit test coverage — see `timer.test.ts` —
  rather than living untestable inside the `useEffect` in `rooms.$roomId.tsx` that calls them.
  Runs only in the teacher's own room panel (only the teacher can write, per RLS; running it on
  the student/display pages too would just be wasted permission-denied writes from every
  connected student's browser).
- **Phase label, no round counter** ("not sure we need the Round 1, 2, etc"): `phaseLabel()` in
  `src/lib/timer.ts` renders "Focus 🍅" / "Break 🎉" / "Paused ⏸️" / "Ready" — shared by the
  teacher panel, `/session/$code`, and `/display/$code` so the wording can't drift between them.
  `timer_round` still exists and still increments (nothing currently reads it for display, but
  removing the column/logic entirely felt premature given the tentative "not sure" framing).
- **Cassette-style transport controls** ("the different sizes are not nice... like a cassette
  recorder"): the old variable-width `Start`/`Pause`/`Resume`/`Reset`/`Skip to break` text
  buttons in `rooms.$roomId.tsx` are now three equal-sized (`size="icon"`, `size-11`) icon
  buttons — a single Play/Pause toggle (filled, primary) that does start/pause/resume duty,
  Stop (`Square` icon, outline) for Reset, and `FastForward` (outline) for Skip to break.
  "Rewind" was deliberately left out — nothing in this app goes backward for it to map to.
  Which of start/pause/resume the toggle means right now is decided by `transportAction()` in
  `src/lib/timer.ts` (idle → "start", running → "pause", stopped-but-not-idle → "resume"),
  pulled out as its own tested pure function per the mandatory testing rule rather than left as
  an inline ternary in the component. Icon-only buttons keep `aria-label`/`title` for
  accessibility.
- **Teacher** (`/rooms/$roomId`): laid out top-to-bottom as Timer (upper-left, with the
  focus/break steppers) + To-do list (upper-right), then live counts (with a per-fruit signal
  drill-down), then the roster table. The QR code is NOT inline in that layout — it's a
  freely-draggable `position: fixed` corner panel (`src/components/FloatingQrPanel.tsx`,
  modeled on `feedblick-edu`'s `LiveQrCard` "shrunk" mode in `SetQrButton.tsx`) with its own
  grip handle (pointer events, no drag library) — "I tend to want to move it around" — that
  stays wherever dropped for the rest of the page load (not persisted across reloads) instead
  of reserving a grid slot ("I don't want to sacrifice the space"). Its "Open display" button
  pops `/display/$code` into a separate, named, explicitly-sized browser window
  (`openDisplayWindow` in `rooms.$roomId.tsx`) rather than a new tab — meant to be dragged onto
  a projector while the room panel stays on the teacher's own screen; same
  `window.open(url, name, "width=...,height=...")` pattern as `feedblick-edu`'s
  `openLiveDashboard.ts`, which also falls back to a toast if the popup is blocked.
- **Room display** (projector, unauthenticated): `/display/$code`, reordered top-to-bottom to
  emoji → time → QR. `src/components/PhaseIcon.tsx` renders the real 🍅 emoji for
  idle/focus and swaps to 🎉 for break ("during break, the emoji should change as well; no
  tomato here") — it replaced an earlier custom SVG tomato that ripened green→red, dropped
  because the user wanted "the same tomato icon" as everywhere else (BrandMark/favicon), not a
  hand-drawn shape; emoji glyphs are fixed multi-color bitmaps/COLR fonts CSS `color` can't
  recolor, so phase-keyed swapping replaced color-lerp entirely. Live-counts meters and the "In
  room" number were removed from this page specifically — "this
  is just eye candy" was the ask, and the meters/count are still on the teacher panel. The QR
  card shows the raw session URL as its description instead of the room code — nobody at the
  projector needs the code once they can see (or scan) the actual link. No `BackgroundGlow` here
  on purpose (a soft blur competing with a large-print countdown across a room didn't serve the
  same "landing page" feel the glow was for elsewhere). "Powered by Feedblick" sits directly
  under the QR card (2026-09-01, direct request), with a tiny Impressum/Privacy row pinned to
  the bottom of the page — hand-rolled rather than `<Footer variant="minimal">` specifically to
  keep this page's own minimal-chrome design intact. Also shows a full-width auto-hiding banner
  for host broadcast announcements (see the "Host broadcast announcements" entry below) — the one
  piece of this page that reacts to something happening live, everything else here is static
  ambient display.
- **Student** (unauthenticated): `/session/$code` — timer (upper-left) and tasks (upper-right,
  checkboxes now right-aligned — text reads first, then the box), then the three signal buttons,
  then "You" (a name input + the fixed fruit-badge picker), then the roster table. A student
  types a name (persisted in `sessionStorage` per room so a reload keeps it, debounced
  `NAME_COMMIT_DELAY_MS` before it's broadcast) and doesn't appear in the roster at all until
  they have. Once they blur the field or hit Enter with something in it, it locks (`disabled`)
  with a pencil button to unlock — "freeze the field once typed, only allow edits upon button
  click," so it can't be half-edited or accidentally cleared later in the room. Task checkboxes
  stay local/per-device on purpose — never synced — so one student finishing a task never marks
  it done for anyone else.
- **Realtime**: `src/lib/room-presence.ts` — one presence channel per room code
  (`room:{code}`), shared by all three screens; `src/hooks/use-room.ts` — `postgres_changes`
  subscriptions for the `rooms`/`room_tasks` tables (the durable, teacher-authored data), reusing
  the edu/stars pattern as planned.
- **Timer**: `src/lib/timer.ts` — pure `build*` functions (`buildStartFocus`, `buildStartBreak`,
  `buildPause`, `buildResume`, `buildReset`, `nextAutoAdvancePatch`) return the DB patch to
  send; `useRoomTimerDisplay` renders it, reusing `countdown.ts`'s target-timestamp pattern
  while running and a static `timer_remaining_seconds` while paused. `src/components/
TimerWheel.tsx` is the shared circular countdown widget (SVG ring draining from full to
  empty), used by both the teacher panel and `/session/$code`.
- **Landing page, legal footer, and account area** (all 2026-08-31, "the different sizes are not
  nice" batch's follow-up ask) — `/` was rewritten to match edu/stars' own landing-page shape
  (hero + 4-feature grid + `Footer`), replacing the placeholder page from scaffolding.
  `src/components/Footer.tsx`/`src/lib/legal-controller.ts`/`/impressum` are ported near-verbatim
  from feedblick-edu (Sergio's explicit call: "very likely the legal stuff from edu is the most
  appropriate") — same real operator details in `CONTROLLER`, same DDG/MStV Impressum sections.
  `/privacy` is a new page adapted (not copied) from edu's own privacy policy: this app's actual
  data model is smaller (no video embeds, no donation link, no self-serve signup, and critically
  no anonymous-response table at all — a participant's name/group/signal is presence-only and
  never reaches Postgres, unlike edu's own stored, unnamed responses) so the policy describes
  that, not edu's feature set. Both legal pages state Vercel Frankfurt (eu-central-1) + Supabase
  EU (AWS eu-central-1) as the intended hosting region, matching edu/stars — this app has no
  production Supabase/Vercel project yet, so update this if the real deployment ever differs.
  `/account` (+`DeleteAccountDialog.tsx`, `src/lib/account.functions.ts`) is ported directly from
  edu's own self-serve account-deletion pattern (`requireSupabaseAuth` + the service-role
  `client.server.ts`, both already present from scaffolding) — a host's rooms/tasks cascade via
  the existing `teacher_id` FK, nothing extra to purge. The dashboard header's plain "Sign out"
  button became a `DropdownMenu` (email + chevron trigger) with Account/Sign out, plus an Admin
  entry shown only when `checkIsAdmin` returns true.
- **Request access, single-admin approval** (2026-08-31) — self-serve sign-up is gone from
  `/auth` (the `check-email.tsx` page it used went with it, now unreachable); the only way to get
  a host account is the "Request access" tab writing to a new `access_requests` table (insert-
  only RLS for `anon`/`authenticated`, no read grant at all — verified with a real anon-insert +
  service-role-select round trip against the local stack) and a `/request-submitted` page. An
  admin approves or rejects by hand on `/admin` (`src/routes/_authenticated/admin.tsx`); approving
  calls `supabaseAdmin.auth.admin.inviteUserByEmail` (redirecting to `/reset-password` to set a
  password) exactly like feedblick-stars does. This is a **deliberately thin port** of stars'
  1100-line `/admin` — stars' `has_role` RBAC table/migration/RPC was replaced with a plain
  single-admin email allowlist (`src/lib/admin-emails.ts`'s `ADMIN_EMAILS`, checked server-side
  against the caller's own JWT email claim in `admin.functions.ts`'s `assertAdmin` — never
  trusted from the client), since there's exactly one admin today; move to a real roles table
  only if that list actually grows. Also dropped: stars' rejection email (a custom Resend edge
  function this app doesn't have — rejecting here just flips `status`) and its invite-resend/
  toast-on-new-request niceties. `src/lib/access-request-status.ts` (the
  `getAccessRequestAcceptanceStatus`/`buildUsersByEmail` pure functions, with their existing
  tests) is ported byte-for-byte from stars — genuinely reusable logic with no product-specific
  assumptions baked in.
- **"Need 2 min" now has a real consequence, and the signal drill-down is gone** (2026-08-31,
  "we don't need this functionality... 'Need 2 min' has no real consequence"): the teacher
  panel's old click-a-meter-to-drill-into-per-fruit-counts interaction is removed entirely
  (`SignalMeter`'s `active` prop went with it) — Done/Stuck are now plain, non-interactive
  meters. The Need-2-min meter took over that click affordance for something real instead: tapping
  it calls `buildExtend()` (`src/lib/timer.ts`, tested), adding `EXTEND_SECONDS` (120s) to
  whatever phase is currently running or paused — extending both the target timestamp/remaining
  seconds AND `timer_duration_seconds`, so `TimerWheel`'s fraction-of-total math doesn't run past
  100%. Disabled while idle (`buildExtend` returns `null` — nothing to extend before a phase has
  started). No cross-client reset of students' own "need 2 min" signal happens (or could — a host
  can't write to another client's presence entry), so a student's signal stays lit until they
  clear it themselves once they see the extra time land.
- **Focus/Break icons, not text** (2026-08-31): `MinutesStepper` (in `rooms.$roomId.tsx`) takes
  an `icon` prop now — `phaseEmoji("focus")`/`phaseEmoji("break")` (`PhaseIcon.tsx`, already used
  everywhere else a phase needs a glyph) instead of the literal words "Focus"/"Break", with the
  accessible name preserved via `role="group" aria-label={label}` on the row.
- **Task claiming, Google-Docs style, no locks** (2026-08-31 — item 6 from the earlier
  "explore this later" list, resolved once Sergio gave the actual design: "once something is
  claimed, nobody claims it again, even without a locking mechanism in place... people editing
  other people's text [in Docs] is so annoying that most people avoid it"): `room_tasks.claimed_by`
  (migration `20260901090000_task_claim_and_auto_assign.sql`) is free-text, set to whoever last
  tapped Claim — nothing technically stops a second person from tapping it too and overwriting the
  name, by design. `nextClaimedBy()` (`src/lib/task-claim.ts`, tested) is the toggle: tapping your
  own claim releases it, tapping anyone else's (including nobody's) reassigns it to you. Chose
  Postgres over the presence channel for this one specifically — unlike name/group/signal, a claim
  needs to survive the claiming student's own disconnect (dropped wifi shouldn't un-claim a task
  before they even notice), and it's a property of the durable task, not of an ephemeral student
  session. Security: `GRANT UPDATE (claimed_by) ON room_tasks TO anon, authenticated` is
  column-scoped — participants can flip this one column and nothing else (verified live: an
  anon PATCH to `claimed_by` succeeds, the same PATCH targeting `text` gets a real Postgres
  permission-denied). Visible on both screens: the student page's claim button doubles as the
  status display (shows the claimant's name once set); the teacher's to-do list shows "Claimed
  by X" as small text next to each claimed task.
- **Auto-assign groups toggle** (2026-08-31, "is this possible?"): `rooms.auto_assign_groups`
  (same migration as claiming), a `Switch` in the "Participants & groups" card header. When on,
  a student who has typed a name but has no group yet gets one picked automatically
  (`pickAutoAssignFruit()`, `src/lib/room-presence.ts`, tested with an injectable `rng` for
  deterministic tie-breaks) instead of seeing the manual fruit picker — replaced with a read-only
  "Your group: 🍍 Pineapple" / "Waiting to be assigned a group…" line. Deliberately smarter than
  uniform `Math.random()`: it picks the currently LEAST-populated group (reusing
  `summarizeByFruit`'s own counts) so independent per-student client-side picks still land roughly
  balanced instead of piling into whichever groups got lucky first. Only fills in a missing group
  — already-assigned students are left alone even if the host flips the toggle on mid-room; there's
  no "reshuffle everyone now" action.
- **Fixed: a returning student's locked name field came back editable** (2026-08-31 bug report,
  "the 'You' text field keeps getting active without me clicking edit"): the sessionStorage-restore
  effect in `session.$code.tsx` only ever called `setName(stored)`, never `setNameLocked(true)` —
  so ANY full reload (a real page refresh, not just a dev-server hot-reload) brought the typed name
  back but left the field unlocked, looking exactly like "it got active on its own." Fixed by
  locking it in the same effect that restores it. (Some of what Sergio actually saw while testing
  was very likely this session's own heavy file-editing triggering Vite/TanStack Start's dev-time
  full-page reload on route-file saves — a one-time side effect of active development, not a
  shipped defect — but the restore-without-lock gap was real and independent of that.)
- **Joining the roster now requires locking the name field, not just pausing while typing**
  (2026-09-01, "the name of the person should only be added to the list after the person
  presses ENTER and the field flips to non-editable"): `session.$code.tsx` used to track
  presence off a 400ms-debounced `committedName`, which meant a student showed up in the roster
  a fraction of a second after they merely stopped typing — never confirming anything. Replaced
  with `identifiedName` (`nameLocked ? name.trim() : ""`), derived straight from the same lock
  state the pencil-to-edit button already uses, and the whole debounce mechanism
  (`NAME_COMMIT_DELAY_MS`, `committedName` state) is gone — once the field is locked it can't
  change anyway, so there was nothing left to debounce. Auto-assign and task-claiming (both
  added earlier and gated on `committedName`) now gate on `identifiedName` instead.
- **Claim pill: no icon** (2026-09-01, "I like the pill for 'claim' but remove the icon, looks
  weird") — the `Hand` icon next to the claim label in `session.$code.tsx` is gone; the pill is
  text-only (`Claim`, or the claimant's name once set).
- **Pomodoro cycle cap** (2026-09-01, "say, auto-restart only 2 times"): `rooms.max_auto_restarts`
  (host-adjustable, a `NumberStepper` next to Focus/Break — `MinutesStepper` was generalized into
  `NumberStepper` to share the same -/+ control shape with a different unit/step/clamp) and
  `rooms.auto_restarts_used` (migration `20260901100000_auto_restart_limit.sql`). The
  auto-advance effect now calls `nextAutoAdvanceOutcome()` (`timer.ts`, tested) instead of
  `nextAutoAdvancePatch()` directly — it returns `"advance"` (the normal phase-switch patch, plus
  the bumped counter), `"capped"` (freezes the timer at 0 in whatever phase it's in, instead of
  switching, once `auto_restarts_used` reaches the limit), or `"none"` (idle). Hitting the cap
  also toasts the host (`duration: Infinity` + close button, same convention as the stuck-signal
  toast) so a capped room doesn't just look silently stuck. `auto_restarts_used` resets to 0 on
  a manual Reset or a fresh Start-from-idle — it's a budget for THIS run, not a lifetime count.
- **Host broadcast announcements — not chat** (2026-09-01, "Lunch time at 12:30pm in Room 356" /
  "please all groups gather in room 321"): a Megaphone icon button in the room panel's header
  opens a `Dialog` with a single text field; sending calls `broadcastAnnouncement()`
  (`room-presence.ts`), a fire-and-forget Supabase Realtime `broadcast` event on the room's
  existing presence channel — no table, no history, one-way, exactly the "not chat" framing.
  `useRoomPresenceChannel()` now also listens for this event and returns `announcement`, so
  `/session/$code` and `/display/$code` both get it automatically. The student page shows it as
  an interactive toast (`duration: Infinity` + close button, since a participant IS at their
  device and can dismiss it). The display page instead shows a full-width top banner that
  auto-hides after `ANNOUNCEMENT_DISPLAY_MS` (20s) — nobody's usually standing at the projector
  to click a dismiss button, so an interactive toast would be the wrong pattern there. Verified
  live with a real two-client broadcast round trip (`send` on one channel connection, `on` on a
  separate one, same room code) before considering this done — realtime features in this app
  don't get called working without that.
- **Footer consistency + "Powered by Feedblick"** (2026-09-01, "the footer was not consistently
  applied through all the pages"): `Footer.tsx` gained a third `"minimal"` variant — just the
  Impressum/Privacy links, small, no brand lockup — for busy in-app screens where German law
  still expects the legal links reachable but a full marketing footer would be clutter:
  `/auth`, `/request-submitted`, `/dashboard`, `/account`, `/admin`, `/rooms/$roomId`, and
  `/session/$code` all got `<Footer variant="minimal" />` added. `/display/$code` gets its own
  hand-rolled tiny Impressum/Privacy row instead of the shared component (its whole design
  language is intentionally free of the chrome every other page has — see its own note below),
  plus a small "Powered by Feedblick" line directly under the QR code, per direct request.
- **Auto-restart stepper icon fixed** (2026-09-01 — Sergio's "the new icon is just horrible"
  turned out to mean the 🔁 emoji on the auto-restart-limit stepper, not the 🎉 break emoji as
  first guessed): `NumberStepper`'s `icon` prop is now `ReactNode`, not a plain emoji string, so
  a control row can take a real `lucide-react` icon (`Repeat`, sized to match the `Minus`/`Plus`
  buttons already in the same row) instead of an emoji whose rendered visual weight doesn't
  reliably match its neighbors. Focus/Break keep their emoji (still liked, just now wrapped in a
  sized `<span>` to fit the same slot).
- **Claiming toggle + thinner pill** (2026-09-01, "this is not always needed... could be
  thinner"): `rooms.claiming_enabled` (default true — claiming already shipped default-on, this
  just adds an off switch), a `Switch` on the To-do list card header mirroring the Auto-assign
  toggle's own placement. Off, the claim pill disappears from BOTH screens entirely (not just
  disabled) and every task behaves exactly like it did before claiming existed — `session.$code
  .tsx` derives `tasksForClaiming` (claimed_by/completed forced to null/false when the toggle is
  off) once and feeds it to the task table, the Done-gating check, and the checkbox logic alike,
  so there's one place that decides "does claiming even apply right now," not three. The pill
  itself also lost its `Hand` icon (previous round) and shrank its padding.
- **Claimed-task completion is exclusive and shared, unclaimed stays private** (2026-09-01, "if
  somebody claims a task, other users should not be able to check the item completed... if the
  claimer completes it, the status should propagate... just hide the checkbox for other
  users??"): `room_tasks.completed` (migration `20260901110000_...sql`, same column-scoped
  `GRANT UPDATE (completed) ON room_tasks TO anon, authenticated` pattern as `claimed_by` —
  verified live with the same claim-then-complete round trip as `claimed_by` itself) is the
  shared completion flag for a CLAIMED task only; unclaimed tasks still use the local, never-
  synced `checked` Set exactly as before ("one student finishing a task never marks it done for
  anyone else" still holds for the common case). In `session.$code.tsx`'s task row: the claimant
  sees a normal checkbox wired to `completed`; anyone else sees no checkbox at all for that row
  (`!isSomeoneElses` gate) — a real permission check isn't possible since participants have no
  verifiable identity for RLS to check against (just a self-reported name), so "hide it
  client-side" is the actual, deliberate implementation, not a shortcut standing in for one.
- **"Done" signal requires finishing your own tasks** (2026-09-01, "Done should not be active
  unless all the tasks are checked?"): `canSignalDone()` (`task-claim.ts`, tested) gates the Done
  signal button — a task claimed by someone ELSE never blocks you (not your responsibility), an
  unclaimed task needs your local checkbox, and a task YOU claimed needs the shared `completed`
  flag. An empty task list is vacuously done. Stuck/Need-2-min are unaffected; only Done gates on
  this. Already-set Done isn't retroactively cleared if a checkbox gets unchecked afterward —
  out of scope, an edge case not worth the complexity.
- **Host can disable individual groups** (2026-09-01, "reduce the number of groups in a
  session"): `rooms.disabled_fruits` (a `text[]`, same migration as claiming/completion) stores
  the opt-OUT set so every existing room keeps offering all 8 with zero behavior change.
  `group-fruits.ts` gained `toggleDisabledFruit`/`canToggleFruitEnabled` (refuses to disable the
  last group standing)/`enabledFruitIds` (all tested). A row of the same 8 pills, now
  host-clickable, sits above the roster table in "Participants & groups." Disabling a group never
  touches anyone already assigned to it — only future picks (manual or auto-assigned) stop
  offering it, same "don't disrupt existing assignments" principle auto-assign itself already
  follows. The student picker and `pickAutoAssignFruit` both filter to `enabledFruitIds` now;
  the picker specifically filters *without* re-indexing `GROUP_FRUITS`, since `badgeColor(i)`
  keys off each fruit's fixed position — using the filtered array's own index would have shifted
  colors around every time a group ahead of it got disabled.

## Known gaps / next up

- No indicator anywhere of how many auto-restarts are left before a room hits its cap — the host
  only finds out via the "cycles complete" toast when it actually happens.
- Broadcast announcements have no history — join late (or dismiss the toast, or miss the display
  banner's 20s window) and it's gone; the host would need to re-send for a latecomer.
- Task reordering (tasks currently only append; no drag-to-reorder).
- Room list has no pagination/archiving.
- No group-size cap anymore (dropped with `room_badges.seats`) — nothing stops every student
  picking the same fruit manually; auto-assign groups (see above) sidesteps this for a host who
  turns it on, but doesn't cap anything for manual self-assignment.
- `FloatingQrPanel`'s dragged position isn't persisted (resets to the default corner on reload)
  and isn't clamped to the viewport — dragging it fully off-screen is currently possible.
- The `/admin` approve/reject/delete server functions (`admin.functions.ts`) are exercised only
  by typecheck + the pure logic's own unit tests, not a real signed-in HTTP round trip — TanStack
  Start's serverFn dispatch goes through CSRF-protected `/_serverFn/<id>` POSTs that aren't
  practical to script from a plain curl call the way the `access_requests` insert/RLS path was
  verified. A local admin user matching `ADMIN_EMAILS` (`sergio.vargas@biodatum.io` /
  `password123`) and a real pending request row already exist in the local stack — click through
  Approve/Reject on `/admin` by hand at least once before relying on the invite-email path.
- No rejection email is sent (see the request-access entry above) — a rejected applicant sees no
  automatic notice, only the status flip an admin could relay by hand if needed.
- Task claiming (see above) has no UI limit on how many tasks one person claims at once, and no
  "claimed by me" filter/highlight across the whole list — just the per-row label.
- Unit tests exist for the pure logic (`timer.ts`'s `build*`/`shouldAutoAdvance`/
  `nextAutoAdvancePatch`/`buildExtend`/`transportAction` functions, `room-presence.ts`'s
  `summarize*`/`pickAutoAssignFruit` functions, `task-claim.ts`'s `nextClaimedBy`, `room-code.ts`,
  and a `RosterTable` behavior test — the last one caught a real sort-direction bug: "desc" used
  to blindly `.reverse()` the whole array, which put unassigned students FIRST instead of
  always-last). Still no Playwright/pgTAP coverage for any of the room/timer/signal flow
  end-to-end — `e2e/` and `supabase/tests/database/` are still just the scaffold's smoke
  skeleton. `TimerWheel`/`SignalMeter`/`CountBadge`/`FloatingQrPanel`'s drag behavior/
  `MinutesStepper` have no tests at all yet (mostly presentational, but the drag math and the
  stepper's clamping are real logic worth covering eventually).
