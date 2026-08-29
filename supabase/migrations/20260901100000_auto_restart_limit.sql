-- Caps how many times the auto-advance effect (rooms.$roomId.tsx) is allowed to switch phases
-- on its own before it stops and waits for the host — "auto-restart only 2 times" (Sergio's own
-- framing). max_auto_restarts is host-adjustable (a stepper next to Focus/Break, same pattern);
-- auto_restarts_used counts actual auto-advance firings and resets on a manual Reset or a fresh
-- Start from idle. Deliberately a plain counter, not reusing timer_round — round also moves on
-- manual actions (skip-to-break, restart), which would contaminate a count that's meant to
-- track only the automatic ones.
ALTER TABLE public.rooms ADD COLUMN max_auto_restarts integer NOT NULL DEFAULT 2;
ALTER TABLE public.rooms ADD COLUMN auto_restarts_used integer NOT NULL DEFAULT 0;
