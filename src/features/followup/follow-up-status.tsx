import {
  CalendarCheck,
  CircleAlert,
  CircleCheck,
  PhoneCall,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FollowUpStatus } from "./api";

export const FOLLOW_UP_STATUS: Record<
  FollowUpStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  pending: {
    label: "Belum booking",
    icon: PhoneCall,
    className: "bg-warning-soft text-warning",
  },
  booked: {
    label: "Sudah booking",
    icon: CalendarCheck,
    className: "bg-info-soft text-info",
  },
  done: {
    label: "Selesai",
    icon: CircleCheck,
    className: "bg-success-soft text-success",
  },
};

/** Selisih hari kalender antara dua tanggal `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Keterangan jatuh tempo: "3 hari lagi", "Hari ini", "Terlambat 2 hari". */
export function dueInfo(
  dueDate: string,
  status: FollowUpStatus,
  today: string,
) {
  const diff = daysBetween(today, dueDate);
  if (status === "done") return null;
  if (diff === 0)
    return {
      text: "Hari ini",
      tone: "font-semibold text-warning",
      late: false,
    };
  if (diff < 0)
    return {
      text: `Terlambat ${-diff} hari`,
      tone:
        status === "pending"
          ? "font-semibold text-destructive"
          : "text-muted-foreground",
      late: status === "pending",
    };
  return {
    text: `${diff} hari lagi`,
    tone: "text-muted-foreground",
    late: false,
  };
}

export function DueHint({
  dueDate,
  status,
  today,
}: {
  dueDate: string;
  status: FollowUpStatus;
  today: string;
}) {
  const info = dueInfo(dueDate, status, today);
  if (!info) return null;
  return (
    <span className={cn("flex items-center gap-1 text-xs", info.tone)}>
      {info.late ? <CircleAlert className="size-3" aria-hidden="true" /> : null}
      {info.text}
    </span>
  );
}

export function FollowUpBadge({ status }: { status: FollowUpStatus }) {
  const meta = FOLLOW_UP_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-tight font-semibold whitespace-nowrap",
        meta.className,
      )}
    >
      <meta.icon className="size-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
