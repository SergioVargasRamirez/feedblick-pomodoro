import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Presentational QR rendering, adapted from feedblick-stars' QrCard (itself carried over from
// edu). Same options as both siblings: 'H' error correction and a 480px render so the code
// still scans reliably when projected small or viewed at an angle.
const QR_OPTIONS = { width: 480, margin: 1, errorCorrectionLevel: "H" } as const;

export function useQrDataUrl(url: string): string {
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
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-1 flex-col items-center gap-3">
        {dataUrl && <img src={dataUrl} alt="Room join QR code" className="size-56" />}
        {description && (
          <p className="max-w-xs text-center text-sm text-muted-foreground">{description}</p>
        )}
        {actions}
      </CardContent>
    </Card>
  );
}
