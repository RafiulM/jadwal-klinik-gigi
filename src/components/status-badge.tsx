import { Check, Clock, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppointmentStatus = "scheduled" | "completed" | "no_show";

// Status janji temu selalu tampil dengan ikon + teks, tidak hanya warna.
export const STATUS_META = {
  scheduled: {
    label: "Menunggu",
    icon: Clock,
    className: "bg-info-soft text-info",
  },
  completed: {
    label: "Selesai",
    icon: Check,
    className: "bg-success-soft text-success",
  },
  no_show: {
    label: "Tidak datang",
    icon: UserX,
    className: "bg-destructive-soft text-destructive",
  },
} as const;

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-tight font-semibold whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <meta.icon className="size-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
