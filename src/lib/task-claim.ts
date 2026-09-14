export type ClaimState = { claimed_by: string | null; completed: boolean };

// Google-Docs-style claiming, not a lock: tapping a task cycles it through Unclaimed -> Doing ->
// Done -> back to Unclaimed, reusing the existing claimed_by/completed columns rather than a new
// status field ("Doing" is just claimed_by set + completed=false; "Done" is both set). Tapping a
// task claimed by someone ELSE always takes it over — starting fresh at Doing, regardless of
// what state they'd left it in — nothing technically stops that, same social contract as
// overwriting someone else's text in a shared doc, annoying enough that people mostly don't
// (Sergio's own framing).
export function nextClaimState(current: ClaimState, actorName: string): ClaimState {
  if (current.claimed_by !== actorName) return { claimed_by: actorName, completed: false };
  if (!current.completed) return { claimed_by: actorName, completed: true };
  return { claimed_by: null, completed: false };
}

// A task claimed by someone ELSE isn't your responsibility, so it can't block your own "Done"
// signal — only unclaimed tasks (your local checkbox) and tasks YOU claimed (the shared
// `completed` flag — i.e. the "Done" state of the claim cycle above) count against you. An empty
// task list is vacuously "all done."
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
