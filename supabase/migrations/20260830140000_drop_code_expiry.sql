-- The join code no longer expires on its own timer — the teacher ending the room is the only
-- lifecycle boundary that matters in practice; a separate time-based expiry mostly just risked
-- cutting a class short if a session ran long.
drop policy "anyone can read active rooms" on public.rooms;
create policy "anyone can read active rooms" on public.rooms for select
  using (status = 'active');

drop policy "anyone can read tasks of a readable room" on public.room_tasks;
create policy "anyone can read tasks of a readable room" on public.room_tasks for select
  using (
    exists (select 1 from public.rooms r where r.id = room_id and r.status = 'active')
  );

alter table public.rooms drop column code_expires_at;
