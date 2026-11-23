import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/logo";

/** Logo klinik yang menaut ke halaman booking. */
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
        "inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
      aria-label={`${siteConfig.name}, halaman booking`}
    >
      <Logo subtitle={subtitle} tone={tone} />
    </Link>
  );
}
