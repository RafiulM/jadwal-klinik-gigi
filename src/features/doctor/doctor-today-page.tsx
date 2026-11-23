import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, RotateCcw, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, type AppointmentStatus } from "@/components/status-badge";
import { TODAY, TODAY_APPOINTMENTS, type TodayAppointment } from "./mock-data";
import { MarkedVisit, PendingVisitActions } from "./visit-actions";

const FILTERS: { id: "semua" | AppointmentStatus; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "scheduled", label: "Menunggu" },
  { id: "completed", label: "Selesai" },
  { id: "no_show", label: "Tidak datang" },
];

const card =
  "rounded-xl border bg-card shadow-[0_1px_2px_rgb(27_36_33/0.05),0_8px_24px_rgb(27_36_33/0.05)]";

function displayTime(time: string) {
  return time.replace(":", ".");
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function PatientAvatar({
  name,
  size = "md",
  muted,
}: {
  name: string;
  size?: "md" | "lg";
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        size === "lg" ? "size-14 text-lg" : "size-10 text-sm",
        muted
          ? "bg-muted text-muted-foreground"
          : "bg-primary-soft text-primary",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function DoctorTodayPage() {
  const [appointments, setAppointments] =
    useState<TodayAppointment[]>(TODAY_APPOINTMENTS);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"done" | "no_show" | "undo" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingRef = useRef(false);
  const [selectedId, setSelectedId] = useState(
    () => TODAY_APPOINTMENTS.find((a) => a.status === "scheduled")?.id ?? "",
  );
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("semua");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "detail">("list");
  const backRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastViewRef = useRef(view);

  // Di HP daftar dan detail bergantian; fokus ikut berpindah.
  useEffect(() => {
    if (lastViewRef.current === view) return;
    lastViewRef.current = view;
    if (view === "detail") backRef.current?.focus();
    else rowRefs.current[selectedId]?.focus();
  }, [view, selectedId]);

  const counts = {
    semua: appointments.length,
    scheduled: appointments.filter((a) => a.status === "scheduled").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    no_show: appointments.filter((a) => a.status === "no_show").length,
  };
  const handled = counts.completed + counts.no_show;
  const q = query.trim().toLowerCase();
  const visible = appointments.filter(
    (a) =>
      (filter === "semua" || a.status === filter) &&
      (!q ||
        a.patient.name.toLowerCase().includes(q) ||
        a.service.name.toLowerCase().includes(q)),
  );
  const filtered = filter !== "semua" || q !== "";
  const nextUp = appointments.find((a) => a.status === "scheduled");
  const selected =
    appointments.find((a) => a.id === selectedId) ?? appointments[0];

  const afterSelected = appointments.find(
    (a) =>
      a.status === "scheduled" &&
      a.time > (selected?.time ?? "") &&
      a.id !== selected?.id,
  );
  const nextPatient =
    afterSelected ??
    appointments.find((a) => a.status === "scheduled" && a.id !== selected?.id);

  // Setelah menandai, fokus pindah ke nama pasien agar tidak hilang saat tombol berganti.
  useEffect(() => {
    if (!focusHeadingRef.current) return;
    focusHeadingRef.current = false;
    headingRef.current?.focus();
  }, [selected?.id, selected?.status]);

  // Simulasi PATCH status sampai API tersedia di layer backend.
  async function changeStatus(
    status: AppointmentStatus,
    kind: "done" | "no_show" | "undo",
  ) {
    if (!selected || busy) return;
    setBusy(kind);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setAppointments((prev) =>
      prev.map((a) => (a.id === selected.id ? { ...a, status } : a)),
    );
    focusHeadingRef.current = true;
    setMessage(
      status === "completed"
        ? `${selected.patient.name} ditandai selesai.`
        : status === "no_show"
          ? `${selected.patient.name} ditandai tidak datang.`
          : `Tanda untuk ${selected.patient.name} dibatalkan. Status kembali menunggu.`,
    );
    setBusy(null);
  }

  function goToPatient(id: string) {
    focusHeadingRef.current = true;
    setSelectedId(id);
    setMessage("");
  }

  function resetFilters() {
    setFilter("semua");
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <div className="px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <header
        className="mb-6 grid gap-5 rounded-xl bg-brand-deep p-5 text-on-brand-deep md:px-8 md:py-6"
        aria-labelledby="dokter-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <p className="flex items-center gap-2 text-sm font-medium text-on-brand-deep-muted">
              <Calendar className="size-4" aria-hidden="true" />
              Senin, 23 November 2026
            </p>
            <h1
              id="dokter-title"
              className="text-2xl leading-tight font-bold tracking-tight"
            >
              Jadwal hari ini
            </h1>
            <p className="text-sm text-on-brand-deep-muted">
              {TODAY.doctor.name} · praktik {TODAY.doctor.hours}
            </p>
          </div>
          {nextUp ? (
            <div className="grid gap-1 rounded-md bg-brand-deep-hover px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-on-brand-deep-muted uppercase">
                Pasien berikutnya
              </p>
              <p className="font-semibold">
                {displayTime(nextUp.time)} · {nextUp.patient.name}
              </p>
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold">
              {handled} dari {counts.semua} pasien sudah ditangani
            </span>
            <span className="text-on-brand-deep-muted">
              {counts.completed} selesai · {counts.no_show} tidak datang ·{" "}
              {counts.scheduled} menunggu
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progres pasien hari ini"
            aria-valuemin={0}
            aria-valuemax={counts.semua}
            aria-valuenow={handled}
            className="h-2 overflow-hidden rounded-full bg-brand-deep-active"
          >
            <span
              className="block h-full rounded-full bg-on-brand-deep"
              style={{
                width: `${counts.semua ? (handled / counts.semua) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] xl:items-start">
        <section
          aria-labelledby="daftar-pasien"
          className={cn(
            card,
            "gap-4 p-4 md:p-6",
            view === "detail" ? "hidden xl:grid" : "grid",
          )}
        >
          <div className="grid gap-3">
            <h2 id="daftar-pasien" className="text-lg font-bold">
              Daftar pasien
            </h2>
            <div className="relative">
              <label htmlFor="cari-pasien" className="sr-only">
                Cari pasien atau layanan
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                id="cari-pasien"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama pasien atau layanan"
                className="min-h-12 w-full rounded-md border border-border-strong bg-card pr-3 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div
              role="group"
              aria-label="Saring status"
              className="flex flex-wrap gap-2"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                    filter === f.id
                      ? "border-brand-deep bg-brand-deep font-semibold text-on-brand-deep"
                      : "bg-card font-medium hover:border-primary",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1 text-center text-xs font-bold",
                      filter === f.id
                        ? "bg-brand-deep-active text-on-brand-deep"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {counts[f.id]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex min-h-6 items-center justify-between gap-3">
              <p aria-live="polite" className="text-sm text-muted-foreground">
                Menampilkan {visible.length} dari {counts.semua} pasien
              </p>
              {filtered ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Reset filter
                </button>
              ) : null}
            </div>
          </div>

          {visible.length ? (
            <ol className="grid gap-2">
              {visible.map((a) => {
                const current = a.id === selected?.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      ref={(node) => {
                        rowRefs.current[a.id] = node;
                      }}
                      aria-current={current || undefined}
                      onClick={() => {
                        setSelectedId(a.id);
                        setMessage("");
                        setView("detail");
                      }}
                      className={cn(
                        "grid w-full grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-card p-3 text-left transition-[border-color,box-shadow] hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                        current &&
                          "border-primary bg-primary-50 shadow-[inset_3px_0_0_var(--color-primary)]",
                      )}
                    >
                      <span
                        className={cn(
                          "rounded-sm px-2 py-1 text-sm font-bold tabular-nums",
                          current
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        {displayTime(a.time)}
                      </span>
                      <PatientAvatar
                        name={a.patient.name}
                        muted={a.status === "no_show"}
                      />
                      <span className="grid min-w-0 gap-1">
                        <span className="leading-snug font-semibold break-words">
                          {a.patient.name}
                        </span>
                        <span className="text-sm leading-snug text-muted-foreground">
                          {a.service.name}
                          {nextUp?.id === a.id ? (
                            <strong className="font-semibold text-primary">
                              {" "}
                              · Berikutnya
                            </strong>
                          ) : null}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="grid justify-items-center gap-3 rounded-md bg-primary-50 px-4 py-8 text-center">
              <SearchX className="size-7 text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Tidak ada pasien yang cocok dengan filter ini.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-sm p-1 text-sm font-semibold text-primary underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset filter
              </button>
            </div>
          )}
        </section>

        {selected ? (
          <section
            aria-labelledby="detail-pasien"
            className={cn(
              card,
              "content-start gap-6 p-4 md:p-6",
              view === "list" ? "hidden xl:grid" : "grid",
            )}
          >
            <button
              ref={backRef}
              type="button"
              onClick={() => setView("list")}
              className="inline-flex min-h-10 items-center gap-2 justify-self-start rounded-sm text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary xl:hidden"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Daftar pasien
            </button>

            <div className="flex items-center gap-4 border-b pb-5">
              <PatientAvatar
                name={selected.patient.name}
                size="lg"
                muted={selected.status === "no_show"}
              />
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    ref={headingRef}
                    tabIndex={-1}
                    id="detail-pasien"
                    className="text-xl leading-tight font-bold tracking-tight break-words outline-none"
                  >
                    {selected.patient.name}
                  </h2>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span>Pukul {displayTime(selected.time)}</span>
                  <span>{selected.service.name}</span>
                  <span>
                    {selected.patient.firstVisit
                      ? "Kunjungan pertama"
                      : "Pasien lama"}
                  </span>
                  <span>HP {selected.patient.phone}</span>
                </p>
              </div>
            </div>

            <p
              role="status"
              aria-live="polite"
              className="rounded-md bg-success-soft px-4 py-3 text-sm font-medium text-success empty:hidden"
            >
              {message}
            </p>

            {selected.status === "scheduled" ? (
              <PendingVisitActions
                busy={busy === "done" || busy === "no_show" ? busy : null}
                onDone={() => changeStatus("completed", "done")}
                onNoShow={() => changeStatus("no_show", "no_show")}
              />
            ) : (
              <MarkedVisit
                appointment={selected}
                nextPatient={nextPatient}
                onNext={() => nextPatient && goToPatient(nextPatient.id)}
                onUndo={() => changeStatus("scheduled", "undo")}
                busy={busy !== null}
              />
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
