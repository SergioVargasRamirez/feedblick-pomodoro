-- Per-host configurable group names ("I want the names to be configurable in the user
-- account"), replacing the fixed 8-fruit list once a host defines any. Structurally modeled on
-- feedblick-stars' table_labels child table (id, owner_id, label, sort_order), not on a single
-- denormalized array column on a settings row — this needs add/rename/remove/reorder as
-- independent per-row writes, the same shape table_labels already solves.
--
-- Deliberately no atomic-replace RPC (unlike stars' update_table_labels): that RPC existed to
-- give a diner-facing read a consistent snapshot during a manager's whole-array replace. Here
-- every edit is already a single, already-consistent row write (one insert, one update, one
-- delete, a 2-row position swap) — there's no "delete everything then reinsert" step to make
-- atomic in the first place.
CREATE TABLE public.host_group_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, label)
);

CREATE INDEX host_group_names_teacher_id_idx ON public.host_group_names (teacher_id);

ALTER TABLE public.host_group_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher manages own group names" ON public.host_group_names FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Participants need to read a host's custom names while sitting in one of that host's active
-- rooms — same "join through an active room" shape as room_tasks' own anon-read policy, except
-- here it's keyed off ANY active room owned by that teacher (not one specific room_id), since
-- group names are a host-level setting shared identically across every room they run at once.
CREATE POLICY "anyone can read group names of a host running an active room" ON public.host_group_names FOR SELECT
  USING (exists (select 1 from public.rooms r where r.teacher_id = host_group_names.teacher_id and r.status = 'active'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_group_names TO authenticated;
GRANT SELECT ON public.host_group_names TO anon;
GRANT ALL ON public.host_group_names TO service_role;

-- Deliberately NOT added to the supabase_realtime publication and no REPLICA IDENTITY FULL —
-- this table is only ever edited on /account, disjoint from any live room. A host renaming a
-- group mid-class (unlikely) won't propagate live, only on a participant's next page load.
-- Stated scope limit, not an oversight — add both if live propagation ever actually matters.
