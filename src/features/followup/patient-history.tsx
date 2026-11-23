import { CalendarPlus, History, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { displayTime, formatLongDate } from "@/features/booking/format";
import type { FollowUp, FollowUpStatus, HistoryVisit } from "./mock-data";
import { DueHint, FollowUpBadge } from "./follow-up-status";

/**
 * Riwayat kunjungan pasien: kapan terakhir datang, kontrol berikutnya,
 * dan garis waktu kunjungan (terbaru di atas). Tanggal kontrol pada tiap
 * kunjungan disambungkan ke data kontrolnya (lewat `sourceVisitId`) sehingga
 * terlihat apakah pasien sudah booking, sudah datang, atau terlambat.
 */
export function PatientHistory({
  visits,
  nextFollowUp,
  headingLevel = "h3",
  showHeading = true,
  followUps = [],
  today,
  highlightVisitId = null,
}: {
  visits: HistoryVisit[];
  nextFollowUp: {
    date: string;
    service: string;
    status?: FollowUpStatus;
  } | null;
  /** Data kontrol milik pasien ini, untuk status tiap tanggal kontrol. */
  followUps?: FollowUp[];
  today: string;
  /** Kunjungan yang ingin ditonjolkan, mis. asal kontrol yang sedang dibuka. */
  highlightVisitId?: string | null;
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
            <dd className="grid justify-items-start gap-1 text-sm font-semibold">
              {nextFollowUp
                ? `${formatLongDate(nextFollowUp.date)} · ${nextFollowUp.service}`
                : "Belum dijadwalkan"}
              {nextFollowUp?.status ? (
                <span className="flex flex-wrap items-center gap-2 font-normal">
                  <FollowUpBadge status={nextFollowUp.status} />
                  <DueHint
                    dueDate={nextFollowUp.date}
                    status={nextFollowUp.status}
                    today={today}
                  />
                </span>
              ) : null}
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
              <div
                className={cn(
                  "grid gap-1",
                  v.id === highlightVisitId &&
                    "-m-2 rounded-lg bg-primary-50 p-2 ring-1 ring-primary-soft",
                )}
              >
                {v.id === highlightVisitId ? (
                  <p className="text-xs font-semibold text-primary">
                    Kunjungan yang menetapkan kontrol ini
                  </p>
                ) : null}
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
                  <FollowUpLine
                    date={v.followUpDate}
                    followUp={followUps.find((f) => f.sourceVisitId === v.id)}
                    today={today}
                  />
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

function FollowUpLine({
  date,
  followUp,
  today,
}: {
  date: string;
  followUp: FollowUp | undefined;
  today: string;
}) {
  // Tanggal di data kontrol bisa sudah diubah admin/dokter setelah kunjungan.
  const dueDate = followUp?.dueDate ?? date;
  return (
    <div className="grid gap-1 text-sm text-muted-foreground">
      <p className="flex items-center gap-1">
        <CalendarPlus className="size-3.5 shrink-0" aria-hidden="true" />
        Kontrol ditetapkan: {formatLongDate(dueDate)}
      </p>
      {followUp ? (
        <span className="flex flex-wrap items-center gap-2 pl-4.5">
          <FollowUpBadge status={followUp.status} />
          <DueHint
            dueDate={followUp.dueDate}
            status={followUp.status}
            today={today}
          />
        </span>
      ) : null}
    </div>
  );
}
