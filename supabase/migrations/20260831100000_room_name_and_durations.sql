-- A teacher-set label distinct from the auto-generated join `code` — "I want to know what's
-- inside" (the dashboard room list showed nothing but a random code before this).
alter table public.rooms add column name text not null default '';

-- The teacher's currently-chosen focus/break length, adjustable via a -/+ stepper rather than
-- fixed presets. Persisted (not just local component state) because the auto-advance-to-the-
-- next-phase logic (client-side, in the teacher's own room panel — only the teacher can write
-- per RLS) needs to know which length to reuse when a phase's countdown reaches zero on its own.
alter table public.rooms add column focus_minutes integer not null default 25;
alter table public.rooms add column break_minutes integer not null default 5;
