import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

// Logo Klinik Gigi: gigi geraham dengan tanda centang (janji temu beres) dan
// kilau kecil (gigi bersih), di dalam ubin bulat hijau tua. Bentuk yang sama
// dipakai berkas public/icon.svg (favicon), public/logo.svg, dan
// public/logo-putih.svg (untuk latar gelap).

export const TOOTH_PATH =
  "M24 12C22.5 10.9 20.4 9.6 17.9 9.6C13.8 9.6 11.4 12.9 11.6 17C11.8 21 13.7 23.6 14.6 27.2C15.5 30.8 15.7 34.6 17 37.9C17.7 39.8 20.2 39.8 20.7 37.8L22.1 32C22.5 30.6 25.5 30.6 25.9 32L27.3 37.8C27.8 39.8 30.3 39.8 31 37.9C32.3 34.6 32.5 30.8 33.4 27.2C34.3 23.6 36.2 21 36.4 17C36.6 12.9 34.2 9.6 30.1 9.6C27.6 9.6 25.5 10.9 24 12Z";

export const CHECK_PATH = "M18.4 19.9L22.3 23.6L29.8 16.1";

export const SPARKLE_PATH =
  "M39.6 5.4C39.9 7.6 40.5 8.2 42.7 8.5C40.5 8.8 39.9 9.4 39.6 11.6C39.3 9.4 38.7 8.8 36.5 8.5C38.7 8.2 39.3 7.6 39.6 5.4Z";

/**
 * Logomark dalam ubin bulat. `tone="inverse"` untuk latar hijau tua (sidebar,
 * hero booking, halaman masuk): ubin dibuat terang transparan.
 */
export function LogoMark({
  tone = "default",
  className,
}: {
  tone?: "default" | "inverse";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={cn("size-9 shrink-0", className)}
    >
      <rect
        width="48"
        height="48"
        rx="13"
        className={
          tone === "inverse" ? "fill-on-brand-deep/15" : "fill-brand-deep"
        }
      />
      <path d={TOOTH_PATH} className="fill-white" />
      <path
        d={CHECK_PATH}
        fill="none"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
      />
      <path d={SPARKLE_PATH} className="fill-primary-soft" />
    </svg>
  );
}

/** Logomark + nama klinik + keterangan kecil (mis. "Area staf"). */
export function Logo({
  subtitle,
  tone = "default",
  size = "md",
  className,
}: {
  subtitle?: string;
  tone?: "default" | "inverse";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} className={size === "lg" ? "size-11" : "size-9"} />
      <span className="grid leading-tight">
        <span
          className={cn(
            "font-bold tracking-tight",
            size === "lg" ? "text-xl" : "text-lg",
            tone === "inverse" ? "text-on-brand-deep" : "text-brand-deep",
          )}
        >
          {siteConfig.name}
        </span>
        {subtitle ? (
          <span
            className={cn(
              "text-xs",
              tone === "inverse"
                ? "text-on-brand-deep-muted"
                : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
