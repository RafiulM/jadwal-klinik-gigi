import { CalendarPlus, History, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { displayTime, formatLongDate } from "@/features/booking/format";
import type { HistoryVisit } from "./mock-data";

/**
 * Riwayat kunjungan pasien: kapan terakhir datang, kontrol berikutnya,
 * dan garis waktu kunjungan (terbaru di atas).
 */
export function PatientHistory({
  visits,
  nextFollowUp,
  headingLevel = "h3",
  showHeading = true,
}: {
  visits: HistoryVisit[];
  nextFollowUp: { date: string; service: string } | null;
  headingLevel?: "h2" | "h3";
  /** Sembunyikan judul bila wadahnya (mis. dialog) sudah berjudul sama. */
  showHeading?: boolean;
}) {
  const ordered = [...visits].sort((a, b) =>
    `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
  );
  const lastVisit = ordered.find((v) => v.status === "completed");
  const Heading = headingLevel;

  return (
    <section className="grid gap-4" aria-label="Riwayat kontrol">
      {showHeading ? (
        <Heading className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <History className="size-4" aria-hidden="true" />
          Riwayat kontrol
        </Heading>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-md bg-muted px-3 py-2">
          <UserCheck
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="grid">
            <dt className="text-xs text-muted-foreground">Terakhir datang</dt>
            <dd className="text-sm font-semibold">
              {lastVisit ? formatLongDate(lastVisit.date) : "Belum pernah"}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md bg-muted px-3 py-2">
          <CalendarPlus
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="grid">
            <dt className="text-xs text-muted-foreground">
              Kontrol berikutnya
            </dt>
            <dd className="text-sm font-semibold">
              {nextFollowUp
                ? `${formatLongDate(nextFollowUp.date)} · ${nextFollowUp.service}`
                : "Belum dijadwalkan"}
            </dd>
          </div>
        </div>
      </dl>

      {ordered.length ? (
        <ol className="grid gap-5">
          {ordered.map((v, i) => (
            <li
              key={v.id}
              className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-3"
            >
              {i < ordered.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-6 -bottom-5 left-[7px] w-0.5 bg-border"
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 mt-1 size-4 rounded-full",
                  v.status === "completed"
                    ? "bg-success ring-3 ring-success-soft"
                    : v.status === "no_show"
                      ? "bg-card ring-2 ring-destructive ring-inset"
                      : "bg-info ring-3 ring-info-soft",
                )}
              />
              <div className="grid gap-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {formatLongDate(v.date)}, {displayTime(v.time)} · {v.service}
                  <StatusBadge status={v.status} />
                </p>
                <p className="text-sm text-muted-foreground">{v.doctor}</p>
                {v.notes ? (
                  <p className="rounded-sm bg-muted px-3 py-2 text-sm break-words">
                    {v.notes}
                  </p>
                ) : null}
                {v.followUpDate ? (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CalendarPlus className="size-3.5" aria-hidden="true" />
                    Kontrol ditetapkan: {formatLongDate(v.followUpDate)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          Belum ada riwayat. Ini kunjungan pertama pasien.
        </p>
      )}
    </section>
  );
}
