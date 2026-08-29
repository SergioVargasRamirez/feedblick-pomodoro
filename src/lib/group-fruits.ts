// Fixed, always-available group badges — no longer teacher-created. Every room has exactly
// these 8 groups; a student just picks one for themselves (self-assign, same rule as before —
// see CLAUDE.md). Emoji rather than lucide-react icons: lucide has no pineapple, watermelon,
// orange, avocado, or lime icon (checked directly against the installed package — only banana,
// apple, and cherry exist), so mixing icon sets for the other five would look inconsistent.
// Same reasoning as the tomato favicon/BrandMark.
//
// Order is stable and meaningful: badgeColor(index) in badge-colors.ts keys off each fruit's
// position here, so "Pineapple" always renders in the same color everywhere.
export type GroupFruit = {
  id: string;
  label: string;
  emoji: string;
};

export const GROUP_FRUITS: GroupFruit[] = [
  { id: "pineapple", label: "Pineapple", emoji: "🍍" },
  { id: "watermelon", label: "Watermelon", emoji: "🍉" },
  { id: "banana", label: "Banana", emoji: "🍌" },
  { id: "apple", label: "Apple", emoji: "🍎" },
  { id: "orange", label: "Orange", emoji: "🍊" },
  { id: "avocado", label: "Avocado", emoji: "🥑" },
  // Called "Lemon," not "Lime" — the emoji is a lemon (🍋), and no standalone lime emoji has
  // reliable cross-platform support (Unicode's newer "lime" is a lemon+green-square ZWJ
  // sequence that falls back to two separate glyphs on older systems), so naming it for what
  // it actually looks like beat naming it for what it was standing in for.
  { id: "lemon", label: "Lemon", emoji: "🍋" },
  { id: "cherry", label: "Cherry", emoji: "🍒" },
];

// A host can turn individual groups off to "reduce the number of groups in a session" — stored
// as the DISABLED set (opt-out, empty by default) so every existing room keeps offering all 8
// with no migration-time behavior change. Toggling never touches anyone already assigned to a
// group that gets disabled — only future picks (manual or auto-assign) stop offering it.
export function toggleDisabledFruit(disabledFruits: string[], fruitId: string): string[] {
  return disabledFruits.includes(fruitId)
    ? disabledFruits.filter((id) => id !== fruitId)
    : [...disabledFruits, fruitId];
}

// Guards against disabling the last remaining group — re-enabling is always allowed, but turning
// off the only group still standing would leave nobody able to pick (or be auto-assigned) any
// group at all.
export function canToggleFruitEnabled(disabledFruits: string[], fruitId: string): boolean {
  if (disabledFruits.includes(fruitId)) return true;
  const enabledCount = GROUP_FRUITS.length - disabledFruits.length;
  return enabledCount > 1;
}

export function enabledFruitIds(disabledFruits: string[]): string[] {
  return GROUP_FRUITS.filter((f) => !disabledFruits.includes(f.id)).map((f) => f.id);
}
