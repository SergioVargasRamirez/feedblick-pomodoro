// Edit this list to change the pool of ephemeral student handles — nothing else needs to
// change. Kept deliberately short (8-10 entries): with a handful of students per room, a
// longer list mostly just makes "Kiwi 04" and "Kiwi 41" harder to tell apart at a glance.
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

function randomHandle(): string {
  const fruit = HANDLE_FRUITS[Math.floor(Math.random() * HANDLE_FRUITS.length)];
  const number = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
  return `${fruit} ${number}`;
}

function storageKey(roomCode: string): string {
  return `feedblick-pomodoro-handle-${roomCode}`;
}

// sessionStorage, not localStorage: a handle should survive a reload of the same tab (so a
// student doesn't reappear as a new identity on refresh) but must NOT survive past that tab
// closing — that's the actual boundary of "valid only for this session" from the product spec.
export function getOrCreateHandle(roomCode: string): string {
  const key = storageKey(roomCode);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const handle = randomHandle();
  sessionStorage.setItem(key, handle);
  return handle;
}

export function clearHandle(roomCode: string): void {
  sessionStorage.removeItem(storageKey(roomCode));
}
