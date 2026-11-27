import { Download } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { shortLinkLabel } from "../lib/api";
import { cn } from "../lib/utils";
import { buttonVariants } from "./ui/button";

/**
 * What the QR code opens. Short links are tagged ?src=qr, so scans show separately in the
 * link's stats.
 */
function qrTarget(path: string, trackScans: boolean) {
  return `${window.location.origin}/${path}${trackScans ? "?src=qr" : ""}`;
}

const DARK = "#111827";

/**
 * A poster-ready PNG: the QR code with the short link printed underneath, so people who can't
 * scan can still type it.
 */
async function posterPng(path: string, trackScans: boolean): Promise<string> {
  const size = 1000;
  const margin = 80;
  const labelHeight = 150;
  const canvas = document.createElement("canvas");
  canvas.width = size + margin * 2;
  canvas.height = size + margin * 2 + labelHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, qrTarget(path, trackScans), {
    width: size,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: DARK, light: "#ffffff" },
  });
  ctx.drawImage(qr, margin, margin);

  // Shrink the label until it fits the width.
  const label = shortLinkLabel(path);
  let fontSize = 84;
  do {
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    fontSize -= 4;
  } while (ctx.measureText(label).width > canvas.width - margin && fontSize > 24);
  ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, canvas.width / 2, size + margin + labelHeight / 2 + margin / 4);

  return canvas.toDataURL("image/png");
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
}

/**
 * A QR code for a page on this site (a short link like "sunrise-zoom", or a club page like
 * "c/sunrise-speakers"), with downloads for printing (PNG) and design tools (SVG).
 */
export function QrCode({
  path,
  trackScans = true,
  size = 176,
  className,
}: {
  path: string;
  /** Tag scans with ?src=qr (short links only: their stats count scans). */
  trackScans?: boolean;
  size?: number;
  className?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(qrTarget(path, trackScans), {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: DARK, light: "#ffffff" },
    })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => !cancelled && setError("Couldn't make the QR code."));
    return () => {
      cancelled = true;
    };
  }, [path, trackScans]);

  const label = shortLinkLabel(path);
  const filename = path.replace(/\//g, "-");
  const src = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : undefined;

  const downloadPng = async () => {
    try {
      download(await posterPng(path, trackScans), `${filename}-qr.png`);
    } catch {
      setError("Couldn't make the PNG. Try the SVG instead.");
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3 sm:flex-row sm:items-start", className)}>
      <div
        className="border-border shrink-0 rounded-lg border bg-white p-2"
        style={{ width: size + 18, height: size + 18 }}
      >
        {src && <img src={src} alt={`QR code for ${label}`} width={size} height={size} />}
      </div>
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-sm text-gray-600">
          Scanning it opens <span className="font-semibold text-gray-900">{label}</span>. The poster
          download has the link printed underneath for anyone who can&apos;t scan.
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            onClick={downloadPng}
            disabled={!svg}
            className={buttonVariants({ variant: "outline", size: "sm", className: "gap-2" })}
          >
            <Download className="size-4" aria-hidden="true" />
            Download for poster (PNG)
          </button>
          <button
            type="button"
            onClick={() => svg && download(src ?? "", `${filename}-qr.svg`)}
            disabled={!svg}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-2" })}
          >
            SVG
          </button>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
