import { useState, type ReactNode } from "react";
import { getRouteApi } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarOff,
  Check,
  Clock,
  Inbox,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clinicNow } from "@/lib/clinic-time";
import { useLoad } from "@/lib/use-load";
import {
  DAY_SHORT,
  dayNumber,
  formatLongDate,
} from "@/features/booking/format";
import { ErrorNote, LoadingNote } from "@/features/booking/load-state";
import { reportApi, type DailyReport, type DayRecap } from "./api";
import { DoctorTable } from "./doctor-table";
import { card, percent } from "./format";

const route = getRouteApi("/_protected/rekap");

export function ReportPage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const today = clinicNow().date;
  // Jendela 8 hari berakhir di tanggal jangkar (default hari ini).
  const anchor =
    search.tanggal && search.tanggal < today ? search.tanggal : today;
  const [load, reload] = useLoad(anchor, (date) => reportApi.daily(date));

  if (load.state !== "ready")
    return (
      <div className="grid gap-4 px-4 pt-5 pb-10 md:p-8 lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight">Rekap harian</h1>
        {load.state === "error" ? (
          <ErrorNote message={load.message} onRetry={reload} />
        ) : (
          <LoadingNote>Menyusun rekap…</LoadingNote>
        )}
      </div>
    );

  return (
    <ReportView
      key={anchor}
      report={load.data}
      onAnchorChange={(tanggal) =>
        navigate({
          search: { tanggal: tanggal === today ? undefined : tanggal },
          replace: true,
        })
      }
    />
  );
}

function ReportView({
  report,
  onAnchorChange,
}: {
  report: DailyReport;
  onAnchorChange: (date: string) => void;
}) {
  const [selected, setSelected] = useState(report.date);
  const day =
    report.days.find((d) => d.date === selected) ??
    report.days[report.days.length - 1];
  const closed = day.doctors.length === 0;
  const running = day.date === report.today;
  const absent = report.doctors.filter(
    (d) => !day.doctors.some((r) => r.id === d.id),
  );

  return (
    <div className="px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Laporan pemilik
          </p>
          <h1 className="text-2xl leading-tight font-bold tracking-tight">
            Rekap harian
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatLongDate(day.date)} · semua dokter
          </p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="rekap-tanggal" className="text-sm font-semibold">
            Tanggal lain
          </label>
          <input
            id="rekap-tanggal"
            type="date"
            max={report.today}
            value={report.date}
            onChange={(e) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                onAnchorChange(e.target.value);
            }}
            className="min-h-12 rounded-md border border-border-strong bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </header>

      <div
        role="group"
        aria-label="Pilih tanggal"
        className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-8"
      >
        {report.days.map((d) => {
          const pressed = d.date === day.date;
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={pressed}
              aria-label={`${formatLongDate(d.date)}${d.date === report.today ? ", hari ini" : ""}`}
              onClick={() => setSelected(d.date)}
              className={cn(
                "grid justify-items-center gap-1 rounded-md border px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
                pressed
                  ? "border-brand-deep bg-brand-deep text-on-brand-deep shadow-[0_6px_16px_rgb(13_63_55/0.3)]"
                  : "bg-card hover:border-primary",
              )}
            >
              <span className="text-xs leading-tight font-medium">
                {d.date === report.today ? "Hari ini" : DAY_SHORT[d.dayOfWeek]}
              </span>
              <span className="text-lg leading-tight font-bold">
                {dayNumber(d.date)}
              </span>
            </button>
          );
        })}
      </div>

      {running ? (
        <p className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="size-4" aria-hidden="true" />
          Hari ini masih berjalan. Angka berubah saat dokter menandai pasien.
        </p>
      ) : null}

      {closed ? (
        <EmptyDay day={day} today={report.today} />
      ) : (
        <Kpis
          day={day}
          today={report.today}
          previous={
            [...report.days]
              .reverse()
              .find((d) => d.date < day.date && d.total > 0) ?? null
          }
        />
      )}

      {!closed ? <DoctorTable day={day} absent={absent} /> : null}
    </div>
  );
}

/** Keadaan kosong: bedakan klinik tutup dari hari praktik tanpa janji. */
function EmptyDay({ day, today }: { day: DayRecap; today: string }) {
  const closed = day.practicingDoctors === 0;
  const Icon = closed ? CalendarOff : Inbox;
  return (
    <div className="mb-6 grid justify-items-center gap-3 rounded-xl border border-dashed border-border-strong bg-card px-6 py-10 text-center">
      <Icon className="size-8 text-primary" aria-hidden="true" />
      <p className="font-semibold">
        {closed
          ? `Klinik tutup pada ${formatLongDate(day.date)}`
          : `Belum ada janji temu pada ${formatLongDate(day.date)}`}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {closed
          ? "Tidak ada dokter yang punya jam praktik di hari ini."
          : day.date === today
            ? `${day.practicingDoctors} dokter praktik hari ini. Booking baru akan langsung terhitung di sini.`
            : `${day.practicingDoctors} dokter praktik, tetapi tidak ada pasien yang booking.`}
      </p>
    </div>
  );
}

/** "+2 dibanding Sab 21" — perubahan dari hari praktik sebelumnya. */
function compare(
  value: number,
  previous: DayRecap | null,
  key: "total" | "completed",
) {
  if (!previous) return null;
  const diff = value - previous[key];
  const when = `${DAY_SHORT[previous.dayOfWeek]} ${dayNumber(previous.date)}`;
  if (diff === 0) return { icon: Minus, text: `sama dengan ${when}` };
  return {
    icon: diff > 0 ? TrendingUp : TrendingDown,
    text: `${diff > 0 ? "+" : "−"}${Math.abs(diff)} dibanding ${when}`,
  };
}

function Kpis({
  day,
  today,
  previous,
}: {
  day: DayRecap;
  today: string;
  previous: DayRecap | null;
}) {
  const totalDelta = compare(day.total, previous, "total");
  const doneDelta =
    day.date === today ? null : compare(day.completed, previous, "completed");
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={CalendarDays}
        tone="bg-primary-50 text-primary"
        label="Janji temu"
        value={day.total}
        caption={`${day.doctors.length} dari ${day.practicingDoctors} dokter praktik punya pasien`}
        delta={totalDelta}
      />
      <StatTile
        icon={Check}
        tone="bg-success-soft text-success"
        label="Selesai"
        value={day.completed}
        caption={`${percent(day.completed, day.total)} dari janji`}
        delta={doneDelta}
      />
      <StatTile
        icon={UserX}
        tone="bg-destructive-soft text-destructive"
        label="Tidak datang"
        value={day.noShow}
        caption={`${percent(day.noShow, day.total)} dari janji`}
      />
      <StatTile
        icon={Clock}
        tone="bg-info-soft text-info"
        label="Belum ditangani"
        value={day.waiting}
        caption={
          day.waiting
            ? day.date === today
              ? "Masih menunggu"
              : "Belum ditandai dokter"
            : "Semua sudah ditandai"
        }
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  caption,
  delta,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: number;
  caption: ReactNode;
  delta?: { icon: LucideIcon; text: string } | null;
}) {
  return (
    <div
      className={cn(
        card,
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 p-4",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "row-span-3 inline-flex size-12 items-center justify-center self-start rounded-md",
          tone,
        )}
      >
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{caption}</p>
      {delta ? (
        <p className="col-start-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <delta.icon className="size-3.5" aria-hidden="true" />
          {delta.text}
        </p>
      ) : null}
    </div>
  );
}
