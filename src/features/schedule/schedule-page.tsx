import { useRef, useState, type MouseEvent } from "react";
import { getRouteApi } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarOff,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Inbox,
  List,
  NotebookPen,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_META,
  StatusBadge,
  type AppointmentStatus,
} from "@/components/status-badge";
import {
  DAY_SHORT,
  dayNumber,
  displayTime,
  formatLongDate,
  initialsOf,
} from "@/features/booking/format";
import { AppointmentDialog } from "./appointment-dialog";
import { addDays } from "@/lib/clinic-time";
import { doctorInitials, mondayOf, weekRangeLabel } from "./schedule-format";
import { WeekCalendar } from "./week-calendar";
import { clinicNow } from "@/lib/clinic-time";
import { useLoad } from "@/lib/use-load";
import { ErrorNote, LoadingNote } from "@/features/booking/load-state";
import { scheduleApi, type ScheduleWeek } from "./api";

const route = getRouteApi("/_protected/jadwal");

const card =
  "rounded-xl border bg-card shadow-[0_1px_2px_rgb(27_36_33/0.05),0_8px_24px_rgb(27_36_33/0.05)]";
const control =
  "min-h-12 w-full rounded-md border border-border-strong bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary";

type StatusFilter = "semua" | AppointmentStatus;

const STATUS_TILES: {
  id: StatusFilter;
  label: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    id: "semua",
    label: "Semua janji",
    icon: CalendarDays,
    tone: "bg-primary-50 text-primary",
  },
  ...(["scheduled", "completed", "no_show"] as const).map((id) => ({
    id,
    label: STATUS_META[id].label,
    icon: STATUS_META[id].icon,
    tone: STATUS_META[id].className,
  })),
];

export function SchedulePage() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const today = clinicNow().date;
  const date = search.tanggal ?? today;
  const from = mondayOf(date);
  const [load, reload] = useLoad(from, (key) => scheduleApi.week(key));
  // Saat pindah minggu, tampilan minggu sebelumnya tetap terlihat sampai
  // data baru datang, supaya toolbar dan fokus tidak hilang.
  const [shown, setShown] = useState<ScheduleWeek | null>(null);
  if (load.state === "ready" && load.data !== shown) setShown(load.data);
  const week = load.state === "ready" ? load.data : shown;

  if (!week)
    return (
      <div className="grid gap-4 px-4 pt-5 pb-10 md:p-8 lg:px-10">
        <h1 className="text-2xl font-bold tracking-tight">Papan jadwal</h1>
        {load.state === "error" ? (
          <ErrorNote message={load.message} onRetry={reload} />
        ) : (
          <LoadingNote>Memuat jadwal klinik…</LoadingNote>
        )}
      </div>
    );

  const doctorId =
    search.dokter && week.doctors.some((d) => d.id === search.dokter)
      ? search.dokter
      : "semua";

  return (
    <ScheduleView
      week={week}
      date={date}
      doctorId={doctorId}
      loading={load.state === "loading"}
      error={load.state === "error" ? load.message : ""}
      onReload={reload}
      onDateChange={(tanggal) =>
        navigate({
          search: (prev) => ({
            ...prev,
            tanggal: tanggal === today ? undefined : tanggal,
          }),
          replace: true,
        })
      }
      onDoctorChange={(dokter) =>
        navigate({
          search: (prev) => ({
            ...prev,
            dokter: dokter === "semua" ? undefined : dokter,
          }),
          replace: true,
        })
      }
    />
  );
}

function ScheduleView({
  week,
  date,
  doctorId,
  loading,
  error,
  onReload,
  onDateChange,
  onDoctorChange,
}: {
  week: ScheduleWeek;
  date: string;
  doctorId: string;
  loading: boolean;
  error: string;
  onReload: () => void;
  onDateChange: (date: string) => void;
  onDoctorChange: (doctorId: string) => void;
}) {
  const [view, setView] = useState<"kalender" | "daftar">("kalender");
  const setDate = onDateChange;
  const setDoctorId = onDoctorChange;
  const [serviceId, setServiceId] = useState("semua");
  const [status, setStatus] = useState<StatusFilter>("semua");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const matches = (a: ScheduleWeek["appointments"][number]) =>
    (doctorId === "semua" || a.doctor.id === doctorId) &&
    (serviceId === "semua" || a.service.id === serviceId) &&
    (!q ||
      a.patient.name.toLowerCase().includes(q) ||
      (qDigits.length > 2 && a.patient.phone.includes(qDigits)) ||
      a.code.toLowerCase().includes(q));
  const scope = week.appointments.filter(
    (a) => matches(a) && (view === "kalender" || a.date === date),
  );
  const rows = scope.filter((a) => status === "semua" || a.status === status);
  const counts: Record<StatusFilter, number> = {
    semua: scope.length,
    scheduled: scope.filter((a) => a.status === "scheduled").length,
    completed: scope.filter((a) => a.status === "completed").length,
    no_show: scope.filter((a) => a.status === "no_show").length,
  };
  const filtered =
    doctorId !== "semua" || serviceId !== "semua" || status !== "semua" || !!q;
  // Detail diambil ulang dari API agar catatan/status terbaru dari dokter
  // terlihat; sementara itu pakai data dari papan.
  const [detail] = useLoad(openId, (id) => scheduleApi.appointment(id));
  const opened = openId
    ? detail.state === "ready" && detail.data.id === openId
      ? detail.data
      : (week.appointments.find((a) => a.id === openId) ?? null)
    : null;

  const practicing = (dayOfWeek: number) =>
    week.doctors.some(
      (d) =>
        (doctorId === "semua" || d.id === doctorId) &&
        d.practiceDays.includes(dayOfWeek),
    );
  const closedText = doctorId === "semua" ? "Tutup" : "Libur";
  const dayLabel = (day: string, dayOfWeek: number) =>
    practicing(dayOfWeek)
      ? `${rows.filter((a) => a.date === day).length} janji`
      : closedText;
  const selectedDay = week.days.find((d) => d.date === date) ?? week.days[0];

  function openDetail(id: string, event: MouseEvent<HTMLButtonElement>) {
    returnFocusRef.current = event.currentTarget;
    setOpenId(id);
  }

  function closeDetail() {
    setOpenId(null);
    returnFocusRef.current?.focus();
  }

  function resetFilters() {
    setDoctorId("semua");
    setServiceId("semua");
    setStatus("semua");
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <div className="px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Admin klinik
          </p>
          <h1 className="text-2xl leading-tight font-bold tracking-tight">
            Papan jadwal
          </h1>
          <p className="text-sm text-muted-foreground">
            Semua janji temu klinik dalam satu tempat.
          </p>
        </div>
        <div
          role="group"
          aria-label="Tampilan"
          className="inline-flex gap-1 rounded-md bg-muted p-1"
        >
          {(
            [
              ["kalender", "Kalender", CalendarRange],
              ["daftar", "Daftar", List],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-sm px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                view === id
                  ? "bg-card font-semibold text-primary shadow-[0_1px_3px_rgb(27_36_33/0.12)]"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <section
        aria-label="Filter jadwal"
        className={cn(
          card,
          "mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_auto] xl:items-end",
        )}
      >
        <div className="grid min-w-0 gap-2">
          <label htmlFor="jadwal-cari" className="text-sm font-semibold">
            Cari pasien
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              id="jadwal-cari"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nama, nomor HP, atau kode"
              className={cn(control, "pl-10")}
            />
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="jadwal-tanggal" className="text-sm font-semibold">
            Tanggal
          </label>
          <input
            id="jadwal-tanggal"
            type="date"
            value={date}
            onChange={(e) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))
                setDate(e.target.value);
            }}
            className={control}
          />
        </div>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="jadwal-dokter" className="text-sm font-semibold">
            Dokter
          </label>
          <select
            id="jadwal-dokter"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className={control}
          >
            <option value="semua">Semua dokter</option>
            {week.doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-2">
          <label htmlFor="jadwal-layanan" className="text-sm font-semibold">
            Layanan
          </label>
          <select
            id="jadwal-layanan"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={control}
          >
            <option value="semua">Semua layanan</option>
            {week.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!filtered}
          className="inline-flex min-h-12 items-center gap-2 justify-self-start rounded-md border border-border-strong bg-card px-3 text-sm font-semibold whitespace-nowrap hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground disabled:hover:bg-card"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset filter
        </button>
      </section>

      <div
        role="group"
        aria-label="Saring status"
        className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {STATUS_TILES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={status === t.id}
            onClick={() => setStatus(t.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-[border-color,box-shadow] hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
              status === t.id &&
                "border-primary shadow-[inset_0_0_0_1px_var(--color-primary),0_6px_16px_rgb(27_36_33/0.08)]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-md",
                t.tone,
              )}
            >
              <t.icon className="size-5" />
            </span>
            <span className="grid min-w-0">
              <span className="text-2xl leading-tight font-semibold">
                {counts[t.id]}
              </span>
              <span className="text-sm text-muted-foreground">{t.label}</span>
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-5">
          <ErrorNote message={error} onRetry={onReload} />
        </div>
      ) : null}
      <div className="mb-3 flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span role="status">{loading ? "Memuat jadwal…" : ""}</span>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-sm p-1 font-semibold text-primary underline-offset-3 hover:underline focus-visible:outline-2 focus-visible:outline-primary disabled:text-muted-foreground disabled:no-underline"
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              loading && "animate-spin motion-reduce:animate-none",
            )}
            aria-hidden="true"
          />
          Muat ulang
        </button>
      </div>

      {view === "kalender" ? (
        <section aria-labelledby="kalender-title" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="kalender-title" className="text-lg font-bold">
                  {weekRangeLabel(
                    week.days[0].date,
                    week.days[week.days.length - 1].date,
                  )}
                </h2>
                <WeekNav
                  onPrev={() => setDate(addDays(date, -7))}
                  onToday={() => setDate(week.today)}
                  onNext={() => setDate(addDays(date, 7))}
                />
              </div>
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Menampilkan {rows.length} janji minggu ini
                {filtered ? " (difilter)" : ""}. Klik nama hari untuk melihat
                daftarnya.
              </p>
            </div>
            <ul
              aria-label="Keterangan warna"
              className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
            >
              {(["scheduled", "completed", "no_show"] as const).map((s) => {
                const meta = STATUS_META[s];
                return (
                  <li key={s} className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded-xs",
                        meta.className,
                      )}
                    >
                      <meta.icon className="size-3" />
                    </span>
                    {meta.label}
                  </li>
                );
              })}
              {week.doctors.map((d) => (
                <li key={d.id} className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-deep px-1 text-[10px] font-bold text-on-brand-deep"
                  >
                    {doctorInitials(d.name)}
                  </span>
                  {d.name}
                </li>
              ))}
            </ul>
          </div>

          {!week.appointments.length ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-md bg-primary-50 px-4 py-3 text-sm"
            >
              <Inbox className="size-4 text-primary" aria-hidden="true" />
              Belum ada janji temu minggu ini. Booking baru dari pasien akan
              muncul di sini otomatis.
            </div>
          ) : null}

          {filtered && !rows.length ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-primary-50 px-4 py-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <SearchX className="size-4 text-primary" aria-hidden="true" />
                Tidak ada janji minggu ini yang cocok dengan filter.
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-sm p-1 font-semibold text-primary underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-primary"
              >
                Reset filter
              </button>
            </div>
          ) : null}

          <WeekCalendar
            week={week}
            appointments={rows}
            isPracticeDay={practicing}
            dayLabel={dayLabel}
            closedLabel={
              doctorId === "semua" ? "Klinik tutup" : "Tidak praktik"
            }
            onOpenDay={(day) => {
              setDate(day);
              setView("daftar");
            }}
            onOpenAppointment={openDetail}
          />
        </section>
      ) : (
        <div>
          <div
            role="group"
            aria-label="Tanggal"
            className="mb-5 grid grid-cols-4 gap-2 md:grid-cols-7"
          >
            {week.days.map((d) => {
              const count = week.appointments.filter(
                (a) => a.date === d.date && matches(a),
              ).length;
              const open = practicing(d.dayOfWeek);
              const pressed = d.date === date;
              return (
                <button
                  key={d.date}
                  type="button"
                  aria-pressed={pressed}
                  aria-label={`${formatLongDate(d.date)}, ${open ? `${count} janji` : "tidak ada praktik"}`}
                  onClick={() => setDate(d.date)}
                  className={cn(
                    "grid justify-items-center gap-1 rounded-md border px-1 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none",
                    pressed
                      ? "border-brand-deep bg-brand-deep text-on-brand-deep shadow-[0_6px_16px_rgb(13_63_55/0.3)]"
                      : "bg-card hover:border-primary",
                  )}
                >
                  <span className="text-xs leading-tight font-medium">
                    {d.date === week.today
                      ? "Hari ini"
                      : DAY_SHORT[d.dayOfWeek]}
                  </span>
                  <span className="text-xl leading-tight font-bold">
                    {dayNumber(d.date)}
                  </span>
                  <span
                    className={cn(
                      "text-xs leading-tight",
                      pressed
                        ? "text-on-brand-deep-muted"
                        : "text-muted-foreground",
                    )}
                  >
                    {open ? `${count} janji` : closedText}
                  </span>
                </button>
              );
            })}
          </div>

          <section aria-labelledby="daftar-title" className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="daftar-title" className="text-lg font-bold">
                  {formatLongDate(date)}
                </h2>
                <WeekNav
                  onPrev={() => setDate(addDays(date, -7))}
                  onToday={() => setDate(week.today)}
                  onNext={() => setDate(addDays(date, 7))}
                />
              </div>
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Menampilkan {rows.length} janji{filtered ? " (difilter)" : ""}
              </p>
            </div>

            {rows.length ? (
              <div className={cn(card, "overflow-hidden")}>
                <table className="block w-full border-collapse text-sm md:table">
                  <thead className="hidden bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase md:table-header-group">
                    <tr>
                      {["Jam", "Pasien", "Layanan", "Dokter", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            scope="col"
                            className="border-b px-4 py-3"
                          >
                            {h}
                          </th>
                        ),
                      )}
                      <th scope="col" className="border-b px-4 py-3">
                        <span className="sr-only">Aksi</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group">
                    {rows.map((a) => (
                      <tr
                        key={a.id}
                        className="grid gap-2 border-t p-4 first:border-t-0 md:table-row md:p-0 md:hover:bg-primary-50"
                      >
                        <Cell label="Jam">
                          <span className="grid justify-items-start gap-1">
                            <span className="inline-block rounded-sm bg-muted px-2 py-1 font-bold tabular-nums">
                              {displayTime(a.time)}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              s.d. {displayTime(a.endTime)}
                            </span>
                          </span>
                        </Cell>
                        <Cell label="Pasien">
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                            >
                              {initialsOf(a.patient.name)}
                            </span>
                            <span className="grid min-w-0">
                              <span className="font-semibold break-words">
                                {a.patient.name}
                              </span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {a.patient.phone} · {a.code}
                              </span>
                            </span>
                          </span>
                        </Cell>
                        <Cell label="Layanan">
                          <span className="grid gap-0.5">
                            <span>{a.service.name}</span>
                            {a.notes ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <NotebookPen
                                  className="size-3"
                                  aria-hidden="true"
                                />
                                Ada catatan dokter
                              </span>
                            ) : null}
                          </span>
                        </Cell>
                        <Cell label="Dokter">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-on-brand-deep"
                            >
                              {doctorInitials(a.doctor.name)}
                            </span>
                            <span className="break-words">{a.doctor.name}</span>
                          </span>
                        </Cell>
                        <Cell label="Status">
                          <StatusBadge status={a.status} />
                        </Cell>
                        <td className="md:border-b md:px-4 md:py-3 md:text-right">
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            aria-label={`Detail janji ${a.patient.name}, pukul ${displayTime(a.time)}`}
                            onClick={(event) => openDetail(a.id, event)}
                            className="inline-flex min-h-10 items-center gap-1 rounded-md border border-primary-soft bg-primary-50 px-3 font-semibold whitespace-nowrap text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            Detail
                            <ChevronRight
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border-strong bg-card px-4 py-10 text-center">
                {practicing(selectedDay.dayOfWeek) ? (
                  <SearchX className="size-8 text-primary" aria-hidden="true" />
                ) : (
                  <CalendarOff
                    className="size-8 text-primary"
                    aria-hidden="true"
                  />
                )}
                <p className="text-sm text-muted-foreground">
                  {!practicing(selectedDay.dayOfWeek)
                    ? doctorId === "semua"
                      ? "Klinik tutup pada hari ini."
                      : "Dokter ini tidak praktik pada hari ini."
                    : filtered
                      ? "Tidak ada janji temu yang cocok dengan filter ini."
                      : "Belum ada janji temu pada hari ini."}
                </p>
                {filtered ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    Reset filter
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}

      <AppointmentDialog appointment={opened} onClose={closeDetail} />
    </div>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <td className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 md:table-cell md:border-b md:px-4 md:py-3 md:align-middle">
      <span
        aria-hidden="true"
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase md:hidden"
      >
        {label}
      </span>
      <span className="justify-self-start">{children}</span>
    </td>
  );
}

function WeekNav({
  onPrev,
  onToday,
  onNext,
}: {
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}) {
  const button =
    "inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-border-strong bg-card px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  return (
    <div role="group" aria-label="Pindah minggu" className="flex gap-1">
      <button type="button" onClick={onPrev} className={button}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Minggu lalu</span>
      </button>
      <button type="button" onClick={onToday} className={button}>
        Hari ini
      </button>
      <button type="button" onClick={onNext} className={button}>
        <span className="sr-only sm:not-sr-only">Minggu depan</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
