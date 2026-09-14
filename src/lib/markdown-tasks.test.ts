import { describe, expect, test } from "bun:test";
import { parseTaskMarkdown, TEMPLATE_TASK_MARKDOWN } from "./markdown-tasks";

describe("parseTaskMarkdown", () => {
  test("empty/whitespace-only input parses to nothing, no errors", () => {
    expect(parseTaskMarkdown("")).toEqual({ tasks: [], errors: [] });
    expect(parseTaskMarkdown("   \n\n  ")).toEqual({ tasks: [], errors: [] });
  });

  test("the worked example from the requirements: one task with two subtasks", () => {
    const { tasks, errors } = parseTaskMarkdown(TEMPLATE_TASK_MARKDOWN);
    expect(errors).toEqual([]);
    expect(tasks).toEqual([
      {
        text: "Read page 45 and 46",
        subtasks: ["What are cells", "How do animal and plant cells differ"],
      },
      { text: "Do exercise 3", subtasks: [] },
    ]);
  });

  test("several top-level tasks mixed with and without subtasks", () => {
    const md = `- Task one
- Task two
  - Sub A
- Task three
  - Sub B
  - Sub C`;
    const { tasks, errors } = parseTaskMarkdown(md);
    expect(errors).toEqual([]);
    expect(tasks).toEqual([
      { text: "Task one", subtasks: [] },
      { text: "Task two", subtasks: ["Sub A"] },
      { text: "Task three", subtasks: ["Sub B", "Sub C"] },
    ]);
  });

  test("blank lines between blocks are ignored", () => {
    const md = `- Task one\n\n  - Sub A\n\n- Task two`;
    const { tasks, errors } = parseTaskMarkdown(md);
    expect(errors).toEqual([]);
    expect(tasks).toEqual([
      { text: "Task one", subtasks: ["Sub A"] },
      { text: "Task two", subtasks: [] },
    ]);
  });

  test("* bullets are accepted the same as -", () => {
    const md = `* Task one\n  * Sub A`;
    const { tasks, errors } = parseTaskMarkdown(md);
    expect(errors).toEqual([]);
    expect(tasks).toEqual([{ text: "Task one", subtasks: ["Sub A"] }]);
  });

  test("an indented line with no preceding task is an error", () => {
    const { tasks, errors } = parseTaskMarkdown("  - Orphan sub-item");
    expect(tasks).toEqual([]);
    expect(errors).toEqual(["Line 1: a sub-item must follow a task line"]);
  });

  test("a second level of indentation (grandchild) is an error", () => {
    const md = `- Task\n  - Sub\n    - Too deep`;
    const { errors } = parseTaskMarkdown(md);
    expect(errors).toEqual(["Line 3: only one level of sub-items is supported"]);
  });

  test("inconsistent (but not deeper) indentation among siblings is an error", () => {
    const md = `- Task\n   - Sub A\n  - Sub B`;
    const { errors } = parseTaskMarkdown(md);
    expect(errors).toEqual(["Line 3: inconsistent indentation"]);
  });

  test("a non-bullet, non-blank line is an error", () => {
    const { errors } = parseTaskMarkdown("Just some text");
    expect(errors).toEqual(['Line 1: expected "- " or "* ", or a blank line']);
  });

  test("errors accumulate across multiple bad lines rather than stopping at the first", () => {
    const md = `  - orphan\nnot a bullet`;
    const { errors } = parseTaskMarkdown(md);
    expect(errors).toHaveLength(2);
  });
});
