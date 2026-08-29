import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, GripHorizontal } from "lucide-react";
import { useQrDataUrl } from "@/components/QrCard";
import { cn } from "@/lib/utils";

// A small, always-visible corner panel rather than a Card inline in the page flow — modeled on
// feedblick-edu's LiveQrCard "shrunk" mode (SetQrButton.tsx: `fixed top-20 right-4 z-30`).
// `position: fixed` keeps it pinned to the viewport as the teacher scrolls the rest of the room
// panel (timer, to-do, roster table) below it, without reserving a dedicated slot in that
// page's own layout — "I don't want to sacrifice the space." Freely draggable via the grip
// handle ("I tend to want to move it around") — once dragged, it stays wherever it's dropped
// for the rest of this page load rather than snapping back; not persisted across reloads, since
// there's no obvious "right" spot to remember it at across different rooms/screens. Hidden
// below `lg` where there usually isn't room for a floating panel alongside real content, same
// as edu's version.
export function FloatingQrPanel({
  url,
  onOpenDisplay,
}: {
  url: string;
  onOpenDisplay: () => void;
}) {
  const dataUrl = useQrDataUrl(url);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{
    pointerX: number;
    pointerY: number;
    left: number;
    top: number;
  } | null>(null);

  const onCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onGripPointerDown = (e: React.PointerEvent) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      left: rect.left,
      top: rect.top,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onGripPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const { pointerX, pointerY, left, top } = dragStart.current;
    setPos({ x: left + (e.clientX - pointerX), y: top + (e.clientY - pointerY) });
  };

  const onGripPointerUp = () => {
    dragStart.current = null;
  };

  return (
    <div
      ref={panelRef}
      className={cn("fixed z-30 hidden lg:block", !pos && "top-24 right-4")}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <div className="w-48 rounded-lg border bg-card shadow-lg">
        <div
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          className="flex cursor-grab items-center justify-center rounded-t-lg border-b py-1 touch-none active:cursor-grabbing"
        >
          <GripHorizontal className="size-4 text-muted-foreground" />
        </div>
        <div className="space-y-2 p-3">
          {dataUrl && <img src={dataUrl} alt="Room join QR code" className="mx-auto w-40" />}
          <button
            type="button"
            onClick={onCopy}
            title={url}
            className="flex w-full items-center gap-1 truncate text-[11px] text-primary underline underline-offset-2 hover:text-primary/80"
          >
            <span className="truncate">{url}</span>
            {copied ? <Check className="size-3 shrink-0" /> : <Copy className="size-3 shrink-0" />}
          </button>
          <Button size="sm" variant="outline" className="w-full" onClick={onOpenDisplay}>
            <ExternalLink className="size-3.5 mr-1" /> Open display
          </Button>
        </div>
      </div>
    </div>
  );
}
