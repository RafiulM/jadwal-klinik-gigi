import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  History,
  RotateCcw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatLongDate,
  formatShortDate,
  initialsOf,
} from "@/features/booking/format";
import { PatientHistory } from "./patient-history";
import { DueHint, FollowUpBadge, daysBetween } from "./follow-up-status";
import { useLoad } from "@/lib/use-load";
import { ErrorNote, LoadingNote } from "@/features/booking/load-state";
import {
  followUpApi,
  upcomingFollowUp,
  type FollowUp,
  type FollowUpStatus,
} from "./api";

const card =
  "rounded-xl border bg-card shadow-[0_1px_2px_rgb(27_36_33/0.05),0_8px_24px_rgb(27_36_33/0.05)]";

const STATUS_TILES: { id: "semua" | FollowUpStatus; label: string }[] = [
  { id: "semua", label: "Semua kontrol" },
  { id: "pending", label: "Belum booking" },
  { id: "booked", label: "Sudah booking" },
  { id: "done", label: "Selesai" },
];

const RANGES = [
  { id: "semua", label: "Semua waktu" },
  { id: "terlambat", label: "Terlambat" },
  { id: "7", label: "7 hari ke depan" },
  { id: "30", label: "30 hari ke depan" },
] as const;

function DueLabel({
  dueDate,
  status,
  today,
}: {
  dueDate: string;
  status: FollowUpStatus;
  today: string;
}) {
  return (
    <span className="grid gap-0.5">
      <span>{formatLongDate(dueDate)}</span>
      <DueHint dueDate={dueDate} status={status} today={today} />
    </span>
  );
}

export function FollowUpPage() {
  const [list, reload] = useLoad("list", () => followUpApi.list());
  if (list.state === "ready")
    return (
      <FollowUpView today={list.data.today} followUps={list.data.followUps} />
    );
  return (
    <div className="grid gap-4 px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight">Kontrol pasien</h1>
      {list.state === "error" ? (
        <ErrorNote message={list.message} onRetry={reload} />
      ) : (
        <LoadingNote>Memuat jadwal kontrol…</LoadingNote>
      )}
    </div>
  );
}

function FollowUpView({
  today,
  followUps,
}: {
  today: string;
  followUps: FollowUp[];
}) {
  const [status, setStatus] =
    useState<(typeof STATUS_TILES)[number]["id"]>("semua");
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("semua");
  const [query, setQuery] = useState("");
  const [historyFor, setHistoryFor] = useState<FollowUp | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const inScope = followUps.filter((f) => {
    const diff = daysBetween(today, f.dueDate);
    const rangeOk =
      range === "semua" ||
      (range === "terlambat" && diff < 0) ||
      (range === "7" && diff >= 0 && diff <= 7) ||
      (range === "30" && diff >= 0 && diff <= 30);
    const queryOk =
      !q ||
      f.patient.name.toLowerCase().includes(q) ||
      f.service.name.toLowerCase().includes(q) ||
      f.doctor.name.toLowerCase().includes(q);
    return rangeOk && queryOk;
  });
  const rows = inScope
    .filter((f) => status === "semua" || f.status === status)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const counts = {
    semua: inScope.length,
    pending: inScope.filter((f) => f.status === "pending").length,
    booked: inScope.filter((f) => f.status === "booked").length,
    done: inScope.filter((f) => f.status === "done").length,
  };
  const overdue = followUps.filter(
    (f) => f.status === "pending" && daysBetween(today, f.dueDate) < 0,
  ).length;
  const filtered = status !== "semua" || range !== "semua" || q !== "";

  function resetFilters() {
    setStatus("semua");
    setRange("semua");
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <div className="px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Tindak lanjut
          </p>
          <h1 className="text-2xl leading-tight font-bold tracking-tight">
            Kontrol pasien
          </h1>
          <p className="text-sm text-muted-foreground">
            Pasien yang perlu kontrol lagi, dari jadwal yang ditentukan dokter.
          </p>
        </div>
        {overdue > 0 ? (
          <p className="flex items-center gap-2 rounded-md bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden="true" />
            {overdue} pasien terlambat kontrol dan belum booking
          </p>
        ) : null}
      </header>

      <section
        aria-label="Filter kontrol"
        className={cn(
          card,
          "mb-5 grid gap-3 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto] md:items-end",
        )}
      >
        <div className="grid gap-2">
          <label htmlFor="cari-kontrol" className="text-sm font-semibold">
            Cari pasien
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              id="cari-kontrol"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nama pasien, layanan, atau dokter"
              className="min-h-12 w-full rounded-md border border-border-strong bg-card pr-3 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="rentang-kontrol" className="text-sm font-semibold">
            Jatuh tempo
          </label>
          <select
            id="rentang-kontrol"
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
            className="min-h-12 w-full rounded-md border border-border-strong bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            {RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!filtered}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border-strong bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset filter
        </button>
      </section>

      <div
        role="group"
        aria-label="Saring status kontrol"
        className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {STATUS_TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={status === t.id}
            onClick={() => setStatus(t.id)}
            className={cn(
              "grid gap-0.5 rounded-xl border bg-card px-4 py-3 text-left transition-[border-color,box-shadow] hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
              status === t.id &&
                "border-primary shadow-[inset_0_0_0_1px_var(--color-primary),0_6px_16px_rgb(27_36_33/0.08)]",
            )}
          >
            <span className="text-2xl leading-tight font-semibold">
              {counts[t.id]}
            </span>
            <span className="text-sm text-muted-foreground">{t.label}</span>
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mb-3 text-sm text-muted-foreground">
        Menampilkan {rows.length} dari {followUps.length} jadwal kontrol
      </p>

      {rows.length ? (
        <div className={cn(card, "relative overflow-hidden")}>
          <table className="w-full border-collapse text-sm">
            <thead className="hidden bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase md:table-header-group">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Pasien
                </th>
                <th scope="col" className="px-4 py-3">
                  Layanan
                </th>
                <th scope="col" className="px-4 py-3">
                  Jatuh tempo
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {rows.map((f) => (
                <tr
                  key={f.id}
                  className="grid gap-2 border-t p-4 first:border-t-0 md:table-row md:p-0 md:hover:bg-primary-50"
                >
                  <td className="md:border-b md:px-4 md:py-3">
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                      >
                        {initialsOf(f.patient.name)}
                      </span>
                      <span className="grid min-w-0">
                        <span className="font-semibold break-words">
                          {f.patient.name}
                        </span>
                        <a
                          href={`tel:${f.patient.phone}`}
                          className="justify-self-start rounded-sm text-xs text-muted-foreground tabular-nums underline-offset-2 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                          aria-label={`Telepon ${f.patient.name}, ${f.patient.phone}`}
                        >
                          {f.patient.phone}
                        </a>
                      </span>
                    </span>
                  </td>
                  <td className="md:border-b md:px-4 md:py-3">
                    <span className="grid">
                      <span>{f.service.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {f.doctor.name}
                      </span>
                      <SourceVisitHint followUp={f} />
                    </span>
                  </td>
                  <td className="md:border-b md:px-4 md:py-3">
                    <DueLabel
                      dueDate={f.dueDate}
                      status={f.status}
                      today={today}
                    />
                  </td>
                  <td className="md:border-b md:px-4 md:py-3">
                    <FollowUpBadge status={f.status} />
                  </td>
                  <td className="md:border-b md:px-4 md:py-3 md:text-right">
                    <button
                      type="button"
                      onClick={() => setHistoryFor(f)}
                      aria-haspopup="dialog"
                      aria-label={`Riwayat kontrol ${f.patient.name}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-primary-soft bg-primary-50 px-3 text-sm font-semibold whitespace-nowrap text-primary hover:bg-primary-soft focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                    >
                      <History className="size-4" aria-hidden="true" />
                      Riwayat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className={cn(
            card,
            "grid justify-items-center gap-3 px-4 py-10 text-center",
          )}
        >
          <SearchX className="size-8 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Tidak ada jadwal kontrol yang cocok dengan filter ini.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-primary"
          >
            Reset filter
          </button>
        </div>
      )}

      <HistoryDialog
        followUp={historyFor}
        today={today}
        onClose={() => setHistoryFor(null)}
      />
    </div>
  );
}

/** Kunjungan asal yang menetapkan tanggal kontrol ini. */
function SourceVisitHint({ followUp }: { followUp: FollowUp }) {
  if (!followUp.sourceVisitDate) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Dari kunjungan {formatShortDate(followUp.sourceVisitDate)}
    </span>
  );
}

function HistoryDialog({
  followUp,
  today,
  onClose,
}: {
  followUp: FollowUp | null;
  today: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (followUp && !dialog.open) dialog.showModal();
    if (!followUp && dialog.open) dialog.close();
  }, [followUp]);
  const [history, reload] = useLoad(followUp?.patient.id ?? null, (id) =>
    followUpApi.history(id),
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="riwayat-title"
      className="m-auto w-[calc(100%-2rem)] max-w-[640px] rounded-xl border bg-card p-0 text-foreground backdrop:bg-brand-deep/55"
    >
      {followUp ? (
        <div className="grid">
          <div className="flex items-start justify-between gap-3 rounded-t-xl bg-brand-deep p-5 text-on-brand-deep">
            <div className="grid gap-1">
              <p className="text-xs font-semibold tracking-wide text-on-brand-deep-muted uppercase">
                Riwayat kontrol
              </p>
              <h2
                id="riwayat-title"
                className="text-xl font-bold tracking-tight"
              >
                {followUp.patient.name}
              </h2>
              <p className="text-sm text-on-brand-deep-muted">
                Kontrol berikutnya: {formatLongDate(followUp.dueDate)} ·{" "}
                {followUp.service.name}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-deep-hover hover:bg-brand-deep-active focus-visible:outline-2 focus-visible:outline-on-brand-deep"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="p-5">
            {history.state === "ready" ? (
              <PatientHistory
                showHeading={false}
                visits={history.data.visits}
                followUps={history.data.followUps}
                today={today}
                highlightVisitId={followUp.sourceVisitId}
                nextFollowUp={(() => {
                  const next = upcomingFollowUp(history.data.followUps);
                  return next
                    ? {
                        date: next.dueDate,
                        service: next.service.name,
                        status: next.status,
                      }
                    : null;
                })()}
              />
            ) : history.state === "error" ? (
              <ErrorNote message={history.message} onRetry={reload} />
            ) : (
              <LoadingNote>Memuat riwayat pasien…</LoadingNote>
            )}
          </div>
          <div className="flex justify-end border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 items-center rounded-md border border-border-strong bg-card px-5 font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
