-- Rooms: a teacher-owned classroom session. `code` is the short join code shown as a QR /
-- typed fallback; `code_expires_at` bounds how long students can join with it (the teacher
-- can keep running the room after that — only new joins are cut off). Timer state lives
-- directly on this row: `timer_target_at` + `timer_duration_seconds` is the same
-- "authoritative timestamp, client computes the countdown" shape as src/lib/countdown.ts,
-- written only by the owning teacher and read by everyone via postgres_changes.
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'ended')),
  code_expires_at timestamptz not null,
  timer_phase text not null default 'idle' check (timer_phase in ('idle', 'focus', 'break')),
  -- Non-null exactly while the timer is running: the moment the current phase ends. Null
  -- while paused or idle.
  timer_target_at timestamptz,
  -- Non-null exactly while paused: seconds left when the teacher hit pause. Null while
  -- running or idle. (Never both this and timer_target_at set at once.)
  timer_remaining_seconds integer,
  -- Full length of the current phase in seconds, set whenever a phase starts — used for
  -- progress-bar/reset display, not for computing the live countdown itself.
  timer_duration_seconds integer,
  timer_round integer not null default 1,
  created_at timestamptz not null default now()
);

create index rooms_code_idx on public.rooms (code);

-- Teacher-authored, room-wide to-do list. No per-student completion is stored here — students
-- tick items off locally on their own device (see the product spec: "read-only task list from
-- the teacher with local ticking") — this table only ever holds the shared item text/order.
create table public.room_tasks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  text text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index room_tasks_room_id_idx on public.room_tasks (room_id);

-- Teacher-authored group badges (e.g. "Group 2 · By the door"). Which student currently wears
-- a badge is NOT stored here or anywhere in Postgres — that's ephemeral, per-room-connection
-- state carried in a Supabase Realtime presence channel keyed by the room code, so it never
-- outlives the room and never needs a cleanup job. This table only holds the badge labels
-- themselves, which aren't privacy-sensitive.
create table public.room_badges (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null,
  place text not null default '',
  seats integer not null default 4,
  created_at timestamptz not null default now()
);

create index room_badges_room_id_idx on public.room_badges (room_id);

alter table public.rooms enable row level security;
alter table public.room_tasks enable row level security;
alter table public.room_badges enable row level security;

-- Teacher: full CRUD on their own rooms, regardless of status/expiry.
create policy "teacher manages own rooms" on public.rooms for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Anyone — including anonymous students — can read an active, unexpired room. The code itself
-- is the access control: no policy here allows listing rooms, only matching one already-known
-- `id`/`code`, the same trust model as a Kahoot-style join code.
create policy "anyone can read active rooms" on public.rooms for select
  using (status = 'active' and code_expires_at > now());

create policy "teacher manages own room tasks" on public.room_tasks for all
  using (exists (select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()));

create policy "anyone can read tasks of a readable room" on public.room_tasks for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.status = 'active' and r.code_expires_at > now()
    )
  );

create policy "teacher manages own room badges" on public.room_badges for all
  using (exists (select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()))
  with check (exists (select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()));

create policy "anyone can read badges of a readable room" on public.room_badges for select
  using (
    exists (
      select 1 from public.rooms r
      where r.id = room_id and r.status = 'active' and r.code_expires_at > now()
    )
  );

-- RLS policies only decide which ROWS a role can touch — Postgres still requires the base
-- table-level grant before it evaluates them at all, so these are load-bearing, not
-- decoration (matches feedblick-stars' migration convention).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT ON public.rooms TO anon;
GRANT ALL ON public.rooms TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_tasks TO authenticated;
GRANT SELECT ON public.room_tasks TO anon;
GRANT ALL ON public.room_tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_badges TO authenticated;
GRANT SELECT ON public.room_badges TO anon;
GRANT ALL ON public.room_badges TO service_role;

-- Without this, every `postgres_changes` subscription in the app (the teacher panel's own
-- task/badge/timer lists, and the room-display/join screens watching the `rooms` row) silently
-- never fires: Realtime only streams changes for tables in this publication, and a table isn't
-- added to it automatically just by existing. A write still succeeds either way — this is the
-- difference between "the UI never reflects it without a manual reload" and it updating live.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_tasks;
alter publication supabase_realtime add table public.room_badges;
