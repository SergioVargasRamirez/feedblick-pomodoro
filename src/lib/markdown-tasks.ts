// Hand-rolled, regex/line-based — no markdown library, matching this repo's existing convention
// (no markdown-parsing dependency anywhere). Grammar is deliberately narrow: top-level "- "/"* "
// bullets are tasks; exactly one level of indented bullets under a task are its subtasks —
// anything indented deeper, or inconsistently, is a parse error. This is what enforces the
// "one level of nesting only" scope limit at the parser level (room_tasks.parent_id itself has
// no DB constraint stopping deeper nesting — see CLAUDE.md's Known Gaps).
export type ParsedTask = { text: string; subtasks: string[] };

const TOP_LEVEL_RE = /^[-*] (.+)$/;
const INDENTED_RE = /^(\s+)[-*] (.+)$/;

export function parseTaskMarkdown(markdown: string): { tasks: ParsedTask[]; errors: string[] } {
  const tasks: ParsedTask[] = [];
  const errors: string[] = [];
  let current: ParsedTask | null = null;
  let childIndent: string | null = null;

  const lines = markdown.split("\n");
  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.replace(/\r$/, "");
    if (line.trim() === "") return;

    const topMatch = line.match(TOP_LEVEL_RE);
    if (topMatch) {
      current = { text: topMatch[1].trim(), subtasks: [] };
      tasks.push(current);
      childIndent = null;
      return;
    }

    const indentedMatch = line.match(INDENTED_RE);
    if (indentedMatch) {
      const [, indent, text] = indentedMatch;
      if (!current) {
        errors.push(`Line ${lineNo}: a sub-item must follow a task line`);
        return;
      }
      if (childIndent === null) {
        childIndent = indent;
      } else if (indent.length > childIndent.length) {
        errors.push(`Line ${lineNo}: only one level of sub-items is supported`);
        return;
      } else if (indent !== childIndent) {
        errors.push(`Line ${lineNo}: inconsistent indentation`);
        return;
      }
      current.subtasks.push(text.trim());
      return;
    }

    errors.push(`Line ${lineNo}: expected "- " or "* ", or a blank line`);
  });

  return { tasks, errors };
}

export const TEMPLATE_TASK_MARKDOWN = `- Read page 45 and 46
  - What are cells
  - How do animal and plant cells differ
- Do exercise 3
`;
