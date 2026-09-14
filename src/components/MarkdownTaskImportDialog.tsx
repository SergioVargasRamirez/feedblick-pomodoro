import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Download } from "lucide-react";
import { parseTaskMarkdown, TEMPLATE_TASK_MARKDOWN, type ParsedTask } from "@/lib/markdown-tasks";

// Modeled on feedblick-edu's MarkdownImportDialog shell (paste + file upload + downloadable
// template + live parse-with-errors, import disabled until valid) — not copied, since that
// parser is quiz-specific. No append/replace mode here: this feature is always append, stated
// directly in the dialog copy rather than left as an assumption.
export function MarkdownTaskImportDialog({
  onImport,
}: {
  onImport: (tasks: ParsedTask[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tasks, errors } = useMemo(() => parseTaskMarkdown(text), [text]);
  const canImport = errors.length === 0 && tasks.length > 0;

  const onFileChange = async (file: File | undefined) => {
    if (!file) return;
    setText(await file.text());
  };

  const onDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_TASK_MARKDOWN], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks-template.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async () => {
    setImporting(true);
    try {
      await onImport(tasks);
      setText("");
      setOpen(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          aria-label="Import from markdown"
          title="Import from markdown"
        >
          <Upload className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import tasks from markdown</DialogTitle>
          <DialogDescription>
            Tasks are added to the end of the list — nothing existing is changed or replaced.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Upload a file
          </Button>
          <Button size="sm" variant="ghost" onClick={onDownloadTemplate}>
            <Download className="size-3.5 mr-1" /> Download template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0])}
          />
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={TEMPLATE_TASK_MARKDOWN}
          rows={10}
          className="font-mono text-sm"
        />
        {errors.length > 0 && (
          <ul className="text-sm text-destructive space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
        {errors.length === 0 && tasks.length > 0 && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} ready to import
            {tasks.some((t) => t.subtasks.length > 0) &&
              ` (${tasks.reduce((n, t) => n + t.subtasks.length, 0)} subtasks)`}
            .
          </p>
        )}
        <DialogFooter>
          <Button onClick={onSubmit} disabled={!canImport || importing}>
            {importing ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
