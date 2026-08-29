import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Presentational QR rendering, adapted from feedblick-stars' QrCard (itself carried over from
// edu). Same options as both siblings: 'H' error correction and a 480px render so the code
// still scans reliably when projected small or viewed at an angle.
const QR_OPTIONS = { width: 480, margin: 1, errorCorrectionLevel: "H" } as const;

function useQrDataUrl(url: string): string {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toDataURL(url, QR_OPTIONS)
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);
  return dataUrl;
}

export function QrCard({
  url,
  title,
  description,
  actions,
  className,
}: {
  url: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const dataUrl = useQrDataUrl(url);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardContent className="flex-1 pt-6 flex flex-col md:flex-row gap-6 items-center justify-center">
        {dataUrl && <img src={dataUrl} alt="Room join QR code" className="size-56 shrink-0" />}
        <div className="max-w-xs space-y-3 text-center md:text-left">
          {(title || description) && (
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              {actions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
