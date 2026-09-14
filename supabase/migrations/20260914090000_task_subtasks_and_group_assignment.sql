-- Subtasks: room_tasks gains a self-referencing parent_id, turning the flat list into a
-- (deliberately shallow) tree. A task with subtasks becomes assignable to a GROUP
-- (assigned_group) rather than an individual — its children are the ones individually
-- claimable via the existing claimed_by/completed mechanism, exactly like today's flat tasks.
--
-- No DB constraint enforces "exactly one level of nesting" — parent_id can technically
-- self-reference arbitrarily deep at the schema level. The one-level cap is enforced only by
-- the markdown parser and the UI (src/lib/markdown-tasks.ts, the "+ Add subtask" control),
-- deliberately, rather than a CHECK constraint/trigger for a case the app's own UI can never
-- reach. See CLAUDE.md's Known Gaps.
ALTER TABLE public.room_tasks ADD COLUMN parent_id uuid REFERENCES public.room_tasks(id) ON DELETE CASCADE;
CREATE INDEX room_tasks_parent_id_idx ON public.room_tasks (parent_id);

-- Host-only by design (no participant GRANT below, unlike claimed_by/completed): assigning a
-- whole task cluster to a group is a planning decision, closer to editing task text than to an
-- individual claiming their own work. Already covered by the existing full table-level grant to
-- `authenticated` + the owner-scoped "teacher manages own room tasks" policy — no new grant or
-- policy needed for the teacher to write it, and no participant grant is added, so anon/
-- authenticated participants get read-only access to this column (via the existing row-level
-- SELECT policy) same as `text`/`position` today.
ALTER TABLE public.room_tasks ADD COLUMN assigned_group text;

-- room_tasks already has REPLICA IDENTITY FULL (20260830130000_replica_identity_full.sql),
-- table-wide — cascade-deleted subtasks still emit correct realtime DELETE events without any
-- further change here.
