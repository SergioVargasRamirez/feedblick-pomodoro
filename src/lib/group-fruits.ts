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
  // No standalone lime emoji with reliable cross-platform support (the Unicode 15.1 "lime" is
  // a lemon+green-square ZWJ sequence that falls back to two separate glyphs on older systems)
  // — plain lemon stands in.
  { id: "lime", label: "Lime", emoji: "🍋" },
  { id: "cherry", label: "Cherry", emoji: "🍒" },
];
