-- Three independent host controls, batched into one migration since they landed in the same
-- round: whether task-claiming is even on, a shared "completed" flag for claimed tasks (so
-- completion can propagate to everyone once a task has an owner), and which of the 8 fixed
-- groups are actually offered in this room.

-- Task-claiming toggle — "this is not always needed." Defaults true since claiming already
-- shipped default-on last round; this just adds an off switch, not a behavior change for
-- existing rooms.
ALTER TABLE public.rooms ADD COLUMN claiming_enabled boolean NOT NULL DEFAULT true;

-- Shared completion state for a CLAIMED task only — "if the person claiming the task completes
-- it, the status should propagate." Unclaimed tasks keep using the existing local/per-device
-- checkbox (never written here) so the "one student finishing a task never marks it done for
-- anyone else" guarantee still holds for the common, unclaimed case. Same column-level grant
-- pattern as claimed_by: participants may flip this one column, nothing else. Deliberately NOT
-- restricted to "only the claimant may set this" at the RLS level — participants have no
-- verifiable identity (a self-reported name, not an authenticated user) for Postgres to check
-- against, so that boundary is enforced client-side only (the checkbox is hidden for everyone
-- but the claimant), same "no real lock" spirit as claiming itself.
ALTER TABLE public.room_tasks ADD COLUMN completed boolean NOT NULL DEFAULT false;
GRANT UPDATE (completed) ON public.room_tasks TO anon, authenticated;

-- Which of the 8 fixed group ids (src/lib/group-fruits.ts) are offered to participants right
-- now — "reduce the number of groups in a session." Stores the DISABLED ones (opt-out, empty by
-- default) rather than the enabled ones, so every existing room keeps offering all 8 with zero
-- migration-time behavior change. A student already assigned to a fruit that gets disabled
-- mid-room keeps their assignment — this only affects future picks (manual or auto-assigned).
ALTER TABLE public.rooms ADD COLUMN disabled_fruits text[] NOT NULL DEFAULT '{}';
