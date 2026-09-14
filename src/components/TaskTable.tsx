import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { reorderSiblings, type FlatTaskRow } from "@/lib/task-tree";

// Shared table shell for the to-do list — used by both the teacher's editor (a delete button,
// group-assign, drag-to-reorder) and the student's checklist (a claim pill + checkbox). Callers
// pre-flatten their tree with flattenTaskTree() so this component stays tree-logic-free; it only
// owns display concerns (numbering, indentation, optional drag handles).
export function TaskTable({
  rows,
  renderAction,
  renderText,
  reorder,
}: {
  rows: FlatTaskRow[];
  renderAction: (row: FlatTaskRow, index: number) => ReactNode;
  // Defaults to plain "n. text" for top-level rows (numbered among themselves, ignoring
  // subtasks) and plain "text" — indented — for subtask rows.
  renderText?: (row: FlatTaskRow, index: number) => ReactNode;
  // Opt-in: when present, rows become drag-to-reorder within their own sibling group (top-level
  // tasks among themselves, a parent's subtasks among themselves — dragging across groups is
  // rejected, see reorderSiblings). Omitted entirely on the student page, so students pay zero
  // DnD cost and can't reorder.
  reorder?: { onReorder: (patches: Array<{ id: string; position: number }>) => void };
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks yet.</p>;
  }

  const topLevelNumbers = new Map<string, number>();
  let n = 0;
  for (const row of rows) {
    if (row.depth === 0) topLevelNumbers.set(row.task.id, ++n);
  }

  const cellsFor = (row: FlatTaskRow, i: number) => (
    <>
      <TableCell className={cn(row.depth === 1 && "pl-6")}>
        {renderText ? (
          renderText(row, i)
        ) : row.depth === 0 ? (
          <>
            {topLevelNumbers.get(row.task.id)}. {row.task.text}
          </>
        ) : (
          row.task.text
        )}
      </TableCell>
      <TableCell className="w-px whitespace-nowrap">{renderAction(row, i)}</TableCell>
    </>
  );

  if (!reorder) {
    return (
      <Table>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.task.id}>{cellsFor(row, i)}</TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return <SortableTaskTableBody rows={rows} cellsFor={cellsFor} onReorder={reorder.onReorder} />;
}

// Split out so useSensors (a hook) is only ever called when reordering is actually enabled —
// TaskTable itself can't call it conditionally.
function SortableTaskTableBody({
  rows,
  cellsFor,
  onReorder,
}: {
  rows: FlatTaskRow[];
  cellsFor: (row: FlatTaskRow, i: number) => ReactNode;
  onReorder: (patches: Array<{ id: string; position: number }>) => void;
}) {
  // TouchSensor's activation constraint (a short delay + a movement tolerance) is what lets a
  // plain tap still register as a tap on touch devices instead of every touch starting a drag —
  // same pattern already vetted in feedblick-edu's own dnd-kit usage.
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const patches = reorderSiblings(rows, String(active.id), String(over.id));
    if (patches) onReorder(patches);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <Table>
        <SortableContext items={rows.map((r) => r.task.id)} strategy={verticalListSortingStrategy}>
          <TableBody>
            {rows.map((row, i) => (
              <SortableTaskRow key={row.task.id} id={row.task.id}>
                {cellsFor(row, i)}
              </SortableTaskRow>
            ))}
          </TableBody>
        </SortableContext>
      </Table>
    </DndContext>
  );
}

function SortableTaskRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-50")}
    >
      <TableCell className="w-px">
        <button
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      {children}
    </TableRow>
  );
}
