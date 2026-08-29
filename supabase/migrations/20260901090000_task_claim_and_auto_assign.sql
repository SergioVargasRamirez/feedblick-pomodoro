-- Google-Docs-style task claiming ("once something is claimed, nobody claims it again, even
-- without a locking mechanism in place" — Sergio's own framing) and a host toggle to randomly
-- auto-assign groups instead of requiring each participant to pick their own.

-- Free-text name of whoever last claimed a task, or null. No enforcement against a second
-- person reclaiming it (that's the point — same social contract as overwriting someone else's
-- text in a shared doc, not a real lock); the UI just makes the current claim visible to
-- everyone so overwriting it is an obvious, deliberate act rather than an accident.
ALTER TABLE public.room_tasks ADD COLUMN claimed_by text;

-- Column-level grant: anon/authenticated (participants, who have no other write access to
-- room_tasks at all — see the base "anyone can read tasks of a readable room" policy) may only
-- ever touch this one column, never a task's text or position. `authenticated` already has a
-- broader owner-scoped grant from the base migration for the teacher's own CRUD; this just adds
-- the narrow participant path on top of it.
GRANT UPDATE (claimed_by) ON public.room_tasks TO anon, authenticated;

CREATE POLICY "anyone can claim a task in an active room" ON public.room_tasks FOR UPDATE
  USING (exists (select 1 from public.rooms r where r.id = room_id and r.status = 'active'))
  WITH CHECK (exists (select 1 from public.rooms r where r.id = room_id and r.status = 'active'));

-- Host-controlled: when true, a joining participant with no group yet is assigned one
-- automatically (src/lib/room-presence.ts's pickAutoAssignFruit) instead of picking their own.
-- Defaults false — self-assignment (the existing behavior) stays the default.
ALTER TABLE public.rooms ADD COLUMN auto_assign_groups boolean NOT NULL DEFAULT false;
