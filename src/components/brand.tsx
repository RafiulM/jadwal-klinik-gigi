import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

// Text wordmark. The clinic has not supplied a logo, so none is invented.
export function Brand({
  subtitle = "Area staf",
  tone = "default",
  className,
}: {
  subtitle?: string;
  tone?: "default" | "inverse";
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
      aria-label={`${siteConfig.name}, halaman booking`}
    >
      <span
        className={cn(
          "text-lg font-bold tracking-tight",
          tone === "inverse" ? "text-on-brand-deep" : "text-primary",
        )}
      >
        {siteConfig.name}
      </span>
      {subtitle ? (
        <span
          className={cn(
            "text-sm",
            tone === "inverse"
              ? "text-on-brand-deep-muted"
              : "text-muted-foreground",
          )}
        >
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}
