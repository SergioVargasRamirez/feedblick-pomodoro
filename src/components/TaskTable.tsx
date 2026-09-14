import { useState, type ReactNode } from "react";
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
import { ChevronDown, ChevronRight, CornerDownRight, GripVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { reorderSiblings, visibleTaskRows, type FlatTaskRow } from "@/lib/task-tree";

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
  // "Hide the subtasks" — purely local display state, never synced (see visibleTaskRows,
  // task-tree.ts). Collapsing never touches numbering/drag-and-drop, which both still reason
  // about the full `rows` array; it only affects what actually gets rendered below.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks yet.</p>;
  }

  const topLevelNumbers = new Map<string, number>();
  let n = 0;
  for (const row of rows) {
    if (row.depth === 0) topLevelNumbers.set(row.task.id, ++n);
  }

  // The subtask marker (an indented "corner" icon) and the collapse chevron are drawn by
  // TaskTable itself, not left to each caller's own renderText — a plain padding-left indent
  // alone read as too subtle to tell a subtask apart from its parent ("not visually easy to
  // differentiate," direct report).
  const cellsFor = (row: FlatTaskRow, i: number) => (
    <>
      <TableCell>
        <div className={cn("flex items-start gap-1.5", row.depth === 1 && "pl-5")}>
          {row.depth === 1 && (
            <CornerDownRight
              className="size-3.5 mt-0.5 shrink-0 text-muted-foreground/70"
              aria-hidden="true"
            />
          )}
          {row.depth === 0 && row.children.length > 0 && (
            <button
              onClick={() => toggleCollapsed(row.task.id)}
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={collapsedIds.has(row.task.id) ? "Show subtasks" : "Hide subtasks"}
              title={collapsedIds.has(row.task.id) ? "Show subtasks" : "Hide subtasks"}
            >
              {collapsedIds.has(row.task.id) ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          )}
          <div className="min-w-0 flex-1">
            {renderText ? (
              renderText(row, i)
            ) : row.depth === 0 ? (
              <>
                {topLevelNumbers.get(row.task.id)}. {row.task.text}
              </>
            ) : (
              row.task.text
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="w-px whitespace-nowrap">
        {/* Right-aligned regardless of what a caller returns (icons-only, or wider content
            like the group-assign Select) — otherwise shorter rows' actions hug the left edge
            of the shared (widest-row-sized) column instead of lining up with everyone else's,
            "can we right align this?" direct report. */}
        <div className="flex justify-end">{renderAction(row, i)}</div>
      </TableCell>
    </>
  );

  const visibleRows = visibleTaskRows(rows, collapsedIds);

  if (!reorder) {
    return (
      <Table>
        <TableBody>
          {visibleRows.map((row, i) => (
            <TableRow key={row.task.id}>{cellsFor(row, i)}</TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <SortableTaskTableBody
      rows={rows}
      visibleRows={visibleRows}
      cellsFor={cellsFor}
      onReorder={reorder.onReorder}
    />
  );
}

// Split out so useSensors (a hook) is only ever called when reordering is actually enabled —
// TaskTable itself can't call it conditionally. `rows` (the full tree) is what reorderSiblings
// reasons about; `visibleRows` (post-collapse) is what actually renders and becomes the
// SortableContext's item list — a collapsed subtask isn't in the DOM, so it can't be a drag
// target either way, but the two lists coincide for every row that's actually interactable.
function SortableTaskTableBody({
  rows,
  visibleRows,
  cellsFor,
  onReorder,
}: {
  rows: FlatTaskRow[];
  visibleRows: FlatTaskRow[];
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
        <SortableContext
          items={visibleRows.map((r) => r.task.id)}
          strategy={verticalListSortingStrategy}
        >
          <TableBody>
            {visibleRows.map((row, i) => (
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
