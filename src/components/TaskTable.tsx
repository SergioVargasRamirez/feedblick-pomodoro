import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { RoomTask } from "@/lib/room";

// Shared table shell for the to-do list — "look more like a table in the student and teacher
// views" — used by both the teacher's editor (a delete button per row) and the student's
// checklist (a checkbox per row). Using the same <Table> primitives as RosterTable also fixes
// a separate complaint for free: the table's own `text-sm` default is what "In this room"
// already renders at, so putting tasks in the same component matches that size automatically
// instead of needing a font size picked by hand.
export function TaskTable({
  tasks,
  renderAction,
  renderText,
}: {
  tasks: RoomTask[];
  renderAction: (task: RoomTask, index: number) => ReactNode;
  // Defaults to plain "1. text" — the student view overrides this to add a strikethrough
  // label wired to its own checkbox instead.
  renderText?: (task: RoomTask, index: number) => ReactNode;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks yet.</p>;
  }

  return (
    <Table>
      <TableBody>
        {tasks.map((t, i) => (
          <TableRow key={t.id}>
            <TableCell>
              {renderText ? (
                renderText(t, i)
              ) : (
                <>
                  {i + 1}. {t.text}
                </>
              )}
            </TableCell>
            <TableCell className="w-10">{renderAction(t, i)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
