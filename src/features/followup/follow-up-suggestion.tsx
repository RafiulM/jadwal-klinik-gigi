import { Check, Lightbulb, WandSparkles } from "lucide-react";
import { formatLongDate } from "@/features/booking/format";
import { addDays } from "./follow-up-field";

export function intervalText(days: number) {
  return days % 30 === 0 ? `${days / 30} bulan` : `${days} hari`;
}

/**
 * Saran tanggal kontrol dari interval bawaan layanan (diatur admin),
 * mis. behel tiap 30 hari atau scaling tiap 180 hari.
 */
export function FollowUpSuggestion({
  serviceName,
  intervalDays,
  today,
  value,
  onUse,
}: {
  serviceName: string;
  intervalDays: number | null;
  today: string;
  value: string;
  onUse: (date: string) => void;
}) {
  if (!intervalDays)
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada saran interval untuk {serviceName.toLowerCase()}. Pilih
        tanggal sendiri bila perlu.
      </p>
    );
  const suggested = addDays(today, intervalDays);
  const used = value === suggested;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary-soft bg-primary-50 px-4 py-3">
      <p className="flex items-start gap-2 text-sm leading-snug">
        <Lightbulb
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          Saran untuk {serviceName.toLowerCase()}: kontrol{" "}
          <strong className="font-semibold">
            {intervalText(intervalDays)} lagi
          </strong>
          , sekitar {formatLongDate(suggested)}.
        </span>
      </p>
      <button
        type="button"
        onClick={() => onUse(suggested)}
        disabled={used}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-default disabled:bg-card disabled:text-primary"
      >
        {used ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <WandSparkles className="size-4" aria-hidden="true" />
        )}
        {used ? "Saran dipakai" : "Pakai saran"}
      </button>
    </div>
  );
}
