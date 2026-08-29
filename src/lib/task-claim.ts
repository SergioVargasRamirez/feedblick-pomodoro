// Google-Docs-style claiming, not a lock: tapping "claim" on a task sets it to your name; nothing
// technically stops someone else from tapping it too and overwriting your claim — the same social
// contract as overwriting someone else's text in a shared doc, annoying enough that people mostly
// don't (Sergio's own framing). Tapping your OWN claim again releases it back to unclaimed.
export function nextClaimedBy(currentClaimedBy: string | null, actorName: string): string | null {
  return currentClaimedBy === actorName ? null : actorName;
}

// A task claimed by someone ELSE isn't your responsibility, so it can't block your own "Done"
// signal — only unclaimed tasks (your local checkbox) and tasks YOU claimed (the shared
// `completed` flag, since claiming turns completion into something that propagates to everyone)
// count against you. An empty task list is vacuously "all done."
export function canSignalDone(
  tasks: Array<{ id: string; claimed_by: string | null; completed: boolean }>,
  checked: Set<string>,
  actorName: string,
): boolean {
  return tasks.every((t) => {
    if (t.claimed_by && t.claimed_by !== actorName) return true;
    if (t.claimed_by === actorName) return t.completed;
    return checked.has(t.id);
  });
}
