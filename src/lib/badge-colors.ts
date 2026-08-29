// A rotating color per group badge, picked by its position in the (stably-ordered) badges
// list — the teacher panel and the student session page both fetch badges via useRoomBadges
// (ordered by created_at), so the same badge lands on the same color in both places without
// needing to store a color anywhere.
const PALETTE = [
  {
    idle: "border-blue-500/40 text-blue-700 dark:text-blue-400",
    active: "border-blue-500 bg-blue-500 text-white",
    dot: "bg-blue-500",
  },
  {
    idle: "border-purple-500/40 text-purple-700 dark:text-purple-400",
    active: "border-purple-500 bg-purple-500 text-white",
    dot: "bg-purple-500",
  },
  {
    idle: "border-teal-500/40 text-teal-700 dark:text-teal-400",
    active: "border-teal-500 bg-teal-500 text-white",
    dot: "bg-teal-500",
  },
  {
    idle: "border-pink-500/40 text-pink-700 dark:text-pink-400",
    active: "border-pink-500 bg-pink-500 text-white",
    dot: "bg-pink-500",
  },
  {
    idle: "border-indigo-500/40 text-indigo-700 dark:text-indigo-400",
    active: "border-indigo-500 bg-indigo-500 text-white",
    dot: "bg-indigo-500",
  },
  {
    idle: "border-lime-600/40 text-lime-700 dark:text-lime-400",
    active: "border-lime-600 bg-lime-600 text-white",
    dot: "bg-lime-600",
  },
] as const;

export function badgeColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
