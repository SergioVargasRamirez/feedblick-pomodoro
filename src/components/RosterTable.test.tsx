import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RosterTable } from "./RosterTable";
import type { PresentStudent } from "@/lib/room-presence";

function student(
  name: string,
  fruit: string | null,
  signal: PresentStudent["signal"] = null,
): PresentStudent {
  return { name, fruit, signal, presenceKey: name };
}

describe("RosterTable", () => {
  test("shows a friendly empty state with no students", () => {
    const { getByText } = render(<RosterTable students={[]} />);
    expect(getByText("No one here yet.")).toBeInTheDocument();
  });

  test("sorts by name alphabetically by default", () => {
    const students = [student("Charlie", null), student("Alice", null), student("Bob", null)];
    const { getAllByRole } = render(<RosterTable students={students} />);
    const names = getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent);
    expect(names).toEqual([
      expect.stringContaining("Alice"),
      expect.stringContaining("Bob"),
      expect.stringContaining("Charlie"),
    ]);
  });

  test("clicking Name again reverses the order", async () => {
    const students = [student("Charlie", null), student("Alice", null), student("Bob", null)];
    const { getAllByRole, getByRole } = render(<RosterTable students={students} />);
    await userEvent.click(getByRole("button", { name: /Name/ }));
    const rows = getAllByRole("row").slice(1);
    expect(rows[0].textContent).toContain("Charlie");
    expect(rows[2].textContent).toContain("Alice");
  });

  test("unassigned students sort last regardless of direction", async () => {
    const students = [student("Zed", "banana"), student("Amy", null)];
    const { getAllByRole, getByRole } = render(<RosterTable students={students} />);

    await userEvent.click(getByRole("button", { name: /Group/ }));
    expect(getAllByRole("row").slice(1).at(-1)?.textContent).toContain("Amy");

    // Clicking again reverses direction — the actual group ordering should flip, but the
    // "no group yet" row must stay last either way, not jump to first (regression test: the
    // sort used to do a blind array .reverse() for "desc", which put it first).
    await userEvent.click(getByRole("button", { name: /Group/ }));
    expect(getAllByRole("row").slice(1).at(-1)?.textContent).toContain("Amy");
  });

  test("showSignal renders a Signal column with each student's current signal", () => {
    const students = [student("Amy", null, "stuck")];
    const { getByText } = render(<RosterTable students={students} showSignal />);
    expect(getByText("Stuck")).toBeInTheDocument();
  });

  test("without showSignal, no Signal column is rendered", () => {
    const students = [student("Amy", null, "stuck")];
    const { queryByText } = render(<RosterTable students={students} />);
    expect(queryByText("Signal")).not.toBeInTheDocument();
  });
});
