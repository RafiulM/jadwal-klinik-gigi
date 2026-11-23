import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CalendarOff,
  CircleAlert,
  CircleCheck,
  RotateCcw,
  Search,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, type AppointmentStatus } from "@/components/status-badge";
import { messageOf } from "@/lib/api-client";
import { useLoad } from "@/lib/use-load";
import { ErrorNote, LoadingNote } from "@/features/booking/load-state";
import {
  doctorApi,
  type AppointmentUpdate,
  type DoctorDay,
  type TodayAppointment,
} from "./api";
import { MarkedVisit, PendingVisitActions } from "./visit-actions";
import { NoteField, SavedNote } from "./visit-note";
import {
  FollowUpDateField,
  followUpDateError,
} from "@/features/followup/follow-up-field";
import { SavedFollowUp } from "@/features/followup/saved-follow-up";
import { FollowUpSuggestion } from "@/features/followup/follow-up-suggestion";
import { PatientHistory } from "@/features/followup/patient-history";
import { followUpApi, upcomingFollowUp } from "@/features/followup/api";
import { formatLongDate } from "@/features/booking/format";

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
  const [day, reload] = useLoad("today", () => doctorApi.today());
  if (day.state === "ready") return <DoctorDayView day={day.data} />;
  return (
    <div className="grid gap-4 px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight">Jadwal hari ini</h1>
      {day.state === "error" ? (
        <ErrorNote message={day.message} onRetry={reload} />
      ) : (
        <LoadingNote>Memuat jadwal hari ini…</LoadingNote>
      )}
    </div>
  );
}

function DoctorDayView({ day }: { day: DoctorDay }) {
  const [appointments, setAppointments] = useState<TodayAppointment[]>(
    day.appointments,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState(false);
  const [followUpDrafts, setFollowUpDrafts] = useState<Record<string, string>>(
    {},
  );
  const followUpRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"done" | "no_show" | "undo" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingRef = useRef(false);
  const [selectedId, setSelectedId] = useState(
    () =>
      day.appointments.find((a) => a.status === "scheduled")?.id ??
      day.appointments[0]?.id ??
      "",
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

  // Kirim perubahan ke API lalu ganti baris janji temu dengan versi server.
  async function applyUpdate(
    input: AppointmentUpdate,
    success: (updated: TodayAppointment) => string,
  ) {
    if (!selected) return false;
    setError("");
    try {
      const updated = await doctorApi.update(selected.id, input);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );
      setMessage(success(updated));
      return true;
    } catch (failure) {
      setMessage("");
      setError(messageOf(failure));
      return false;
    }
  }

  async function changeStatus(
    status: AppointmentStatus,
    kind: "done" | "no_show" | "undo",
  ) {
    if (!selected || busy) return;
    const followUp = (
      followUpDrafts[selected.id] ?? selected.followUpDate
    ).trim();
    if (status === "completed" && followUpDateError(followUp, day.date)) {
      followUpRef.current?.focus();
      return;
    }
    setBusy(kind);
    const note = (noteDrafts[selected.id] ?? selected.notes).trim();
    const name = selected.patient.name;
    const ok = await applyUpdate(
      status === "completed"
        ? { status, notes: note, followUpDate: followUp || null }
        : { status },
      (updated) =>
        status === "completed"
          ? `${name} ditandai selesai.${updated.followUpDate ? ` Kontrol berikutnya ${formatLongDate(updated.followUpDate)} tercatat.` : ""}`
          : status === "no_show"
            ? `${name} ditandai tidak datang.`
            : `Tanda untuk ${name} dibatalkan. Status kembali menunggu.`,
    );
    if (ok) focusHeadingRef.current = true;
    setBusy(null);
  }

  async function saveNote(note: string) {
    if (!selected) return false;
    setSavingNote(true);
    const name = selected.patient.name;
    const ok = await applyUpdate(
      { notes: note },
      () => `Catatan untuk ${name} disimpan.`,
    );
    if (ok) setNoteDrafts((prev) => ({ ...prev, [selected.id]: note }));
    setSavingNote(false);
    return ok;
  }

  async function saveFollowUp(date: string) {
    if (!selected) return false;
    setSavingNote(true);
    const name = selected.patient.name;
    const ok = await applyUpdate({ followUpDate: date || null }, (updated) =>
      updated.followUpDate
        ? `Kontrol berikutnya ${name}: ${formatLongDate(updated.followUpDate)}.`
        : `Jadwal kontrol ${name} dikosongkan.`,
    );
    if (ok) setFollowUpDrafts((prev) => ({ ...prev, [selected.id]: date }));
    setSavingNote(false);
    return ok;
  }

  function goToPatient(id: string) {
    focusHeadingRef.current = true;
    setSelectedId(id);
    setMessage("");
    setError("");
  }

  // Riwayat pasien terpilih dimuat ulang setiap hasil kunjungannya berubah.
  const historyKey = selected
    ? [
        selected.patient.id,
        selected.status,
        selected.notes,
        selected.followUpDate,
      ].join("|")
    : null;
  const [history, reloadHistory] = useLoad(historyKey, (key) =>
    followUpApi.history(key.split("|")[0]),
  );
  const upcoming =
    history.state === "ready" ? upcomingFollowUp(history.data.followUps) : null;

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
              {formatLongDate(day.date)}
            </p>
            <h1
              id="dokter-title"
              className="text-2xl leading-tight font-bold tracking-tight"
            >
              Jadwal hari ini
            </h1>
            <p className="text-sm text-on-brand-deep-muted">
              {day.doctor.name} ·{" "}
              {day.doctor.hours
                ? `praktik ${displayTime(day.doctor.hours.start)}–${displayTime(day.doctor.hours.end)}`
                : "tidak ada jam praktik hari ini"}
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
          ) : counts.semua > 0 ? (
            <p className="flex items-center gap-2 rounded-md bg-brand-deep-hover px-4 py-3 font-semibold">
              <CircleCheck className="size-5" aria-hidden="true" />
              Semua pasien hari ini sudah ditangani
            </p>
          ) : null}
        </div>
        {counts.semua > 0 ? (
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
        ) : null}
      </header>

      {counts.semua === 0 ? (
        <section
          className={cn(
            card,
            "grid justify-items-center gap-3 px-6 py-12 text-center",
          )}
          aria-labelledby="kosong-title"
        >
          <CalendarOff className="size-9 text-primary" aria-hidden="true" />
          <h2 id="kosong-title" className="text-lg font-bold">
            Tidak ada pasien terjadwal hari ini
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Janji temu baru dari halaman booking akan muncul di sini secara
            otomatis.
          </p>
        </section>
      ) : (
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
                          setError("");
                          setView("detail");
                        }}
                        className={cn(
                          "grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-md border bg-card p-3 text-left sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] transition-[border-color,box-shadow] hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                          current &&
                            "border-primary bg-primary-50 ring-1 ring-primary",
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
                        <span className="hidden sm:contents">
                          <PatientAvatar
                            name={a.patient.name}
                            muted={a.status === "no_show"}
                          />
                        </span>
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
                        <StatusBadge
                          status={a.status}
                          className="col-start-2 justify-self-start sm:col-start-auto sm:justify-self-auto"
                        />
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
                    <span>
                      Pukul {displayTime(selected.time)}–
                      {displayTime(selected.endTime)}
                    </span>
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
              {error ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive"
                >
                  <CircleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {error}
                </p>
              ) : null}

              {selected.status === "scheduled" ? (
                <PendingVisitActions
                  busy={busy === "done" || busy === "no_show" ? busy : null}
                  onDone={() => changeStatus("completed", "done")}
                  onNoShow={() => changeStatus("no_show", "no_show")}
                >
                  <NoteField
                    value={noteDrafts[selected.id] ?? selected.notes}
                    onChange={(value) =>
                      setNoteDrafts((prev) => ({
                        ...prev,
                        [selected.id]: value,
                      }))
                    }
                  />
                  <FollowUpDateField
                    value={followUpDrafts[selected.id] ?? selected.followUpDate}
                    today={day.date}
                    inputRef={followUpRef}
                    showError
                    onChange={(value) =>
                      setFollowUpDrafts((prev) => ({
                        ...prev,
                        [selected.id]: value,
                      }))
                    }
                  >
                    <FollowUpSuggestion
                      serviceName={selected.service.name}
                      intervalDays={selected.service.followUpDays}
                      today={day.date}
                      value={
                        followUpDrafts[selected.id] ?? selected.followUpDate
                      }
                      onUse={(date) =>
                        setFollowUpDrafts((prev) => ({
                          ...prev,
                          [selected.id]: date,
                        }))
                      }
                    />
                  </FollowUpDateField>
                </PendingVisitActions>
              ) : (
                <MarkedVisit
                  appointment={selected}
                  nextPatient={nextPatient}
                  onNext={() => nextPatient && goToPatient(nextPatient.id)}
                  onUndo={() => changeStatus("scheduled", "undo")}
                  busy={busy !== null}
                >
                  {selected.status === "completed" ? (
                    <SavedNote
                      key={selected.id}
                      note={selected.notes}
                      saving={savingNote}
                      onSave={saveNote}
                    />
                  ) : null}
                  {selected.status === "completed" ? (
                    <SavedFollowUp
                      key={`${selected.id}-kontrol`}
                      date={selected.followUpDate}
                      today={day.date}
                      serviceName={selected.service.name}
                      intervalDays={selected.service.followUpDays}
                      saving={savingNote}
                      onSave={saveFollowUp}
                      lockedReason={
                        selected.followUpStatus === "booked"
                          ? "Pasien sudah booking kontrol ini."
                          : selected.followUpStatus === "done"
                            ? "Kontrol ini sudah dijalani."
                            : undefined
                      }
                    />
                  ) : null}
                </MarkedVisit>
              )}

              <div className="border-t pt-5">
                {history.state === "ready" ? (
                  <PatientHistory
                    visits={history.data.visits.filter(
                      // Kunjungan yang sedang dibuka belum jadi riwayat.
                      (v) =>
                        !(v.id === selected.id && v.status === "scheduled"),
                    )}
                    nextFollowUp={
                      upcoming
                        ? {
                            date: upcoming.dueDate,
                            service: upcoming.service.name,
                            status: upcoming.status,
                          }
                        : null
                    }
                    followUps={history.data.followUps}
                    today={day.date}
                  />
                ) : history.state === "error" ? (
                  <ErrorNote
                    message={history.message}
                    onRetry={reloadHistory}
                  />
                ) : (
                  <LoadingNote>Memuat riwayat pasien…</LoadingNote>
                )}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
