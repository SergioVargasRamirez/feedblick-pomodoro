import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHostGroupNames } from "@/hooks/use-host-group-names";
import { swapPositions } from "@/lib/host-groups";

// Modeled on feedblick-stars' TableLabelsEditor add/rename/remove shape, but instant-write per
// action (matching this app's no-save-button idiom everywhere else — onAddTask, updateRoom —
// rather than TableLabelsEditor's controlled-array/eventual-Save pattern). Reorder is buttons,
// not drag-and-drop: the reasoning for choosing real DnD on the to-do list (iPad, live in-room
// use) doesn't apply to this desktop settings page edited out-of-band, and stars' own "buttons,
// not DnD, for a short list" reasoning applies here directly.
export function HostGroupNamesEditor({ teacherId }: { teacherId: string }) {
  const { groups, loading, refetch } = useHostGroupNames(teacherId);
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});

  const onAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const { error } = await supabase
      .from("host_group_names")
      .insert({ teacher_id: teacherId, label, position: groups.length });
    if (error) toast.error(error.message);
    else {
      setNewLabel("");
      refetch();
    }
  };

  const onRename = async (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from("host_group_names")
      .update({ label: trimmed })
      .eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  };

  const onRemove = async (id: string) => {
    const { error } = await supabase.from("host_group_names").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  };

  const onMove = async (index: number, direction: "up" | "down") => {
    const patch = swapPositions(groups, index, direction);
    if (!patch) return;
    const { error } = await Promise.all(
      patch.map((p) =>
        supabase.from("host_group_names").update({ position: p.position }).eq("id", p.id),
      ),
    ).then((results) => ({ error: results.find((r) => r.error)?.error }));
    if (error) toast.error(error.message);
    else refetch();
  };

  return (
    <div className="space-y-3">
      {!loading && groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No custom groups yet — rooms you run show the default fruit groups.
        </p>
      )}
      <div className="space-y-2">
        {groups.map((g, i) => (
          <div key={g.id} className="flex items-center gap-2">
            <Input
              value={editing[g.id] ?? g.label}
              onChange={(e) => setEditing((prev) => ({ ...prev, [g.id]: e.target.value }))}
              onBlur={(e) => onRename(g.id, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="h-8"
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={i === 0}
              onClick={() => onMove(i, "up")}
              aria-label="Move up"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={i === groups.length - 1}
              onClick={() => onMove(i, "down")}
              aria-label="Move down"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(g.id)}
              aria-label="Remove group"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          placeholder="Add a group name…"
          className="h-8"
        />
        <Button size="icon" variant="outline" className="size-8" onClick={onAdd}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
