-- Realtime's postgres_changes filters (e.g. `room_id=eq.<uuid>`) are evaluated against the OLD
-- row for DELETE events, but with the default REPLICA IDENTITY (primary key only), the OLD row
-- in a DELETE's logical-decoding payload only ever contains `id` — not `room_id` — so the
-- filter can never match and the delete event is silently dropped before it reaches any client.
-- INSERT/UPDATE aren't affected (their payload always carries the full NEW row regardless of
-- replica identity); this only bites deletes, which is exactly the reported symptom ("deleting
-- a task doesn't update anyone else's view").
alter table public.room_tasks replica identity full;
alter table public.rooms replica identity full;
