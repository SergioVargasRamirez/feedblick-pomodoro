import { Users } from "lucide-react";

// A plain count has no "limit" to be a ratio of, so it doesn't get a progress ring like
// SignalMeter's — but it sits next to those meters, so it borrows their circular shape and
// sizing to read as one family of stats instead of a mismatched leftover stat-tile box.
export function InRoomBadge({ count, size = 128 }: { count: number; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-transparent px-2 py-3">
      <div
        className="flex shrink-0 items-center justify-center rounded-full border-[12px] border-muted"
        style={{ width: size, height: size }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-2xl font-semibold tabular-nums">{count}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">In room</span>
    </div>
  );
}
