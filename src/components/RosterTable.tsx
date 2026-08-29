import { useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { badgeColor } from "@/lib/badge-colors";
import { GROUP_FRUITS } from "@/lib/group-fruits";
import type { PresentStudent } from "@/lib/room-presence";

type SortField = "name" | "group";

// Shared between the student session page and the teacher panel — "I want to see the same
// table of students/groups the students see" — one component, not two copies that could drift.
export function RosterTable({ students }: { students: PresentStudent[] }) {
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // Unassigned students always sort to the end, regardless of direction — "no group yet" isn't
  // meaningfully before or after any actual group name.
  const roster = useMemo(() => {
    const withGroup = students.map((s) => {
      const groupIndex = GROUP_FRUITS.findIndex((f) => f.id === s.fruit);
      return { ...s, group: groupIndex >= 0 ? GROUP_FRUITS[groupIndex] : null, groupIndex };
    });
    const sorted = [...withGroup].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (!a.group && !b.group) return 0;
      if (!a.group) return 1;
      if (!b.group) return -1;
      return a.group.label.localeCompare(b.group.label);
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [students, sortBy, sortDir]);

  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">No one here yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="p-0">
            <SortButton
              field="name"
              label="Name"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          </TableHead>
          <TableHead className="p-0">
            <SortButton
              field="group"
              label="Group"
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roster.map((s) => (
          <TableRow key={s.presenceKey}>
            <TableCell>{s.name}</TableCell>
            <TableCell>
              {s.group ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    badgeColor(s.groupIndex).idle,
                  )}
                >
                  <span aria-hidden="true">{s.group.emoji}</span>
                  {s.group.label}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortButton({
  field,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  sortBy: SortField;
  sortDir: "asc" | "desc";
  onSort: (field: SortField) => void;
}) {
  const active = sortBy === field;
  const Icon = sortDir === "asc" ? ChevronUp : ChevronDown;
  return (
    // The <th> itself has its padding zeroed (see caller) and this button fills the whole cell
    // instead — previously the button only wrapped the label text tightly inside a padded cell,
    // so clicking the padding around it (most of the header's clickable-looking area) did
    // nothing, which read as "the header can't gain focus unless I click the text."
    <button
      onClick={() => onSort(field)}
      className={cn(
        "flex h-10 w-full items-center gap-1 px-2 text-left font-medium",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      {active && <Icon className="size-3.5" />}
    </button>
  );
}
