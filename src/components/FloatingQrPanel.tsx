import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useQrDataUrl } from "@/components/QrCard";
import { cn } from "@/lib/utils";

// A small, always-visible corner panel rather than a Card inline in the page flow — modeled on
// feedblick-edu's LiveQrCard "shrunk" mode (SetQrButton.tsx: `fixed top-20 right-4 z-30`).
// `position: fixed` keeps it pinned to the viewport as the teacher scrolls the rest of the room
// panel (timer, to-do, roster table) below it, without reserving a dedicated slot in that
// page's own layout — "I don't want to sacrifice the space." Hidden below `lg` where there
// usually isn't room for a floating panel alongside real content, same as edu's version.
export function FloatingQrPanel({
  url,
  onOpenDisplay,
}: {
  url: string;
  onOpenDisplay: () => void;
}) {
  const dataUrl = useQrDataUrl(url);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed top-24 right-4 z-30 hidden lg:block">
      <div className="w-48 space-y-2 rounded-lg border bg-card p-3 shadow-lg">
        {dataUrl && <img src={dataUrl} alt="Room join QR code" className="mx-auto w-40" />}
        <button
          type="button"
          onClick={onCopy}
          title={url}
          className={cn(
            "flex w-full items-center gap-1 truncate text-[11px] text-primary underline underline-offset-2 hover:text-primary/80",
          )}
        >
          <span className="truncate">{url}</span>
          {copied ? <Check className="size-3 shrink-0" /> : <Copy className="size-3 shrink-0" />}
        </button>
        <Button size="sm" variant="outline" className="w-full" onClick={onOpenDisplay}>
          <ExternalLink className="size-3.5 mr-1" /> Open display
        </Button>
      </div>
    </div>
  );
}
