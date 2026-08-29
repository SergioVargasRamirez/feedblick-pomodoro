// Edit this list to change the pool of ephemeral student handles — nothing else needs to
// change. Kept deliberately short (8-10 entries): with MAX_STUDENTS_PER_FRUIT capping each
// one, the list length times that cap is roughly the room capacity this scheme is comfortable
// with before it starts overflowing (see pickHandle below).
export const HANDLE_FRUITS = [
  "Mango",
  "Papaya",
  "Guava",
  "Lychee",
  "Passionfruit",
  "Kiwi",
  "Dragonfruit",
  "Coconut",
  "Starfruit",
  "Lime",
] as const;

// At most this many students share a given fruit at once, e.g. only 4 "Mango"s live in a room
// at a time. Each gets the lowest free slot number for that fruit ("Mango 1", "Mango 2", ...)
// rather than a random one, so handles read as "which Mango" instead of colliding by chance.
export const MAX_STUDENTS_PER_FRUIT = 4;

function parseHandle(handle: string): { fruit: string; slot: number } | null {
  const match = /^(.+) (\d+)$/.exec(handle);
  if (!match) return null;
  return { fruit: match[1], slot: Number(match[2]) };
}

// Picks the lowest-numbered free slot among fruits that haven't hit MAX_STUDENTS_PER_FRUIT
// yet. `currentHandles` should be every OTHER student currently in the room — never include
// this client's own not-yet-assigned handle. Falls back to picking among all fruits (ignoring
// the cap) once every fruit is full — better to let a student in over-capacity than block them
// from joining at all.
export function pickHandle(currentHandles: string[]): string {
  const slotsByFruit = new Map<string, Set<number>>();
  for (const fruit of HANDLE_FRUITS) slotsByFruit.set(fruit, new Set());
  for (const handle of currentHandles) {
    const parsed = parseHandle(handle);
    if (parsed) slotsByFruit.get(parsed.fruit)?.add(parsed.slot);
  }

  const underCap = HANDLE_FRUITS.filter(
    (fruit) => (slotsByFruit.get(fruit)?.size ?? 0) < MAX_STUDENTS_PER_FRUIT,
  );
  const pool = underCap.length > 0 ? underCap : HANDLE_FRUITS;
  const fruit = pool[Math.floor(Math.random() * pool.length)];

  const takenSlots = slotsByFruit.get(fruit) ?? new Set<number>();
  let slot = 1;
  while (takenSlots.has(slot)) slot++;
  return `${fruit} ${slot}`;
}

function storageKey(roomCode: string): string {
  return `feedblick-pomodoro-handle-${roomCode}`;
}

// sessionStorage, not localStorage: a handle should survive a reload of the same tab (so a
// student doesn't reappear as a new identity on refresh) but must NOT survive past that tab
// closing — that's the actual boundary of "valid only for this session" from the product spec.
// `currentHandles` is only consulted for a brand-new handle — a returning student keeps
// whatever they already had, regardless of who else is in the room right now.
export function getOrCreateHandle(roomCode: string, currentHandles: string[]): string {
  const key = storageKey(roomCode);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const handle = pickHandle(currentHandles);
  sessionStorage.setItem(key, handle);
  return handle;
}

export function clearHandle(roomCode: string): void {
  sessionStorage.removeItem(storageKey(roomCode));
}
