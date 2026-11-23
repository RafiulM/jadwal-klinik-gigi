import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SummaryRow = { id: string; label: string; icon: ReactNode; value: string };

export function SummaryList({
  rows,
  onEdit,
}: {
  rows: (SummaryRow & { step?: number })[];
  onEdit?: (step: number) => void;
}) {
  return (
    <dl className="grid">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={cn(
            "grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 py-3",
            i > 0 && "border-t",
          )}
        >
          <span
            aria-hidden="true"
            className="inline-flex size-10 items-center justify-center rounded-md bg-primary-50 text-primary [&_svg]:size-[18px]"
          >
            {row.icon}
          </span>
          <div className="grid min-w-0 gap-1">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="flex items-baseline justify-between gap-3">
              <span
                className={cn(
                  "min-w-0 text-base leading-snug [overflow-wrap:anywhere]",
                  row.value ? "font-semibold" : "text-muted-foreground",
                )}
              >
                {row.value || "Belum dipilih"}
              </span>
              {onEdit && row.step !== undefined ? (
                <button
                  type="button"
                  onClick={() => onEdit(row.step!)}
                  aria-label={`Ubah ${row.label.toLowerCase()}`}
                  className="shrink-0 rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Ubah
                </button>
              ) : null}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
