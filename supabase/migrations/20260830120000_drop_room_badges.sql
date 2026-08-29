-- Group badges are now a fixed, app-wide set of 8 fruit emoji (src/lib/group-fruits.ts), not
-- teacher-created per room — this table is no longer used. Dropping it, not just abandoning it
-- in code, since it held per-room configuration (name/place/seats) nothing reads anymore.
drop table if exists public.room_badges;
