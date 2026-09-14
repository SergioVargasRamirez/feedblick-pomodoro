-- Freeform tags for grouping/searching rooms on the dashboard ("group them or search for all
-- related rooms without necessarily creating a tree structure"). Deliberately a flat text[] on
-- rooms itself, not a normalized tags table or a Project->Rooms hierarchy — a host-only,
-- low-cardinality, per-room list needs neither. No new RLS policy or grant: `rooms` already has
-- a full table-level grant + the owner-scoped "teacher manages own rooms" policy, which already
-- covers reading/writing this new column for the owning teacher exactly like `name` today.
ALTER TABLE public.rooms ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
