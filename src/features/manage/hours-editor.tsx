import { useEffect, useState } from "react";
import { CircleCheck, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { messageOf } from "@/lib/api-client";
import { useLoad } from "@/lib/use-load";
import { ErrorNote, LoadingNote } from "@/features/booking/load-state";
import { manageApi, type AdminDoctor, type DoctorWeekSchedule } from "./api";
import { DAY_NAMES, WeekHours, dayError, slotCount } from "./hours-panel";
import type { ScheduleDay } from "./mock-data";
import { SelectField, card, control } from "./ui";

const INTERVALS = [15, 20, 30, 45, 60];

/** Atur jam praktik mingguan per dokter, dengan draf per dokter dan bar simpan. */
export function HoursEditor({
  doctors,
  doctorId,
  onDoctorChange,
  onSaved,
}: {
  doctors: AdminDoctor[];
  doctorId: string;
  onDoctorChange: (id: string) => void;
  onSaved: (message: string) => void;
}) {
  const [load, reload] = useLoad(doctorId || null, (id) =>
    manageApi.schedule(id),
  );
  // Draf disimpan per dokter supaya pindah dokter tidak membuang perubahan.
  const [drafts, setDrafts] = useState<Record<string, DoctorWeekSchedule>>({});
  const [saved, setSaved] = useState<Record<string, DoctorWeekSchedule>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasDrafts = Object.keys(drafts).length > 0;

  // Peringatkan sebelum menutup/memuat ulang tab bila ada draf jam praktik.
  useEffect(() => {
    if (!hasDrafts) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDrafts]);

  if (!doctors.length)
    return (
      <p className={cn(card, "p-6 text-sm text-muted-foreground")}>
        Tambahkan dokter dulu di tab Dokter, lalu atur jam praktiknya di sini.
      </p>
    );

  const original =
    saved[doctorId] ?? (load.state === "ready" ? load.data : null);
  const schedule = drafts[doctorId] ?? original;
  const doctor = doctors.find((d) => d.id === doctorId);
  const dirty =
    !!schedule &&
    !!original &&
    JSON.stringify(schedule) !== JSON.stringify(original);
  const errors = schedule ? schedule.days.map(dayError).filter(Boolean) : [];
  const totalSlots = schedule
    ? schedule.days.reduce(
        (sum, day) => sum + slotCount(day, schedule.slotIntervalMinutes),
        0,
      )
    : 0;

  function update(changes: Partial<DoctorWeekSchedule>) {
    if (!schedule) return;
    setDrafts((prev) => ({ ...prev, [doctorId]: { ...schedule, ...changes } }));
  }

  function updateDay(dayOfWeek: number, changes: Partial<ScheduleDay>) {
    if (!schedule) return;
    update({
      days: schedule.days.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day,
      ),
    });
  }

  async function save() {
    if (!schedule || errors.length) return;
    setSaving(true);
    setError("");
    try {
      const result = await manageApi.saveSchedule(doctorId, schedule);
      setSaved((prev) => ({ ...prev, [doctorId]: result }));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[doctorId];
        return next;
      });
      onSaved(
        `Jam praktik ${doctor?.name ?? "dokter"} disimpan. Halaman booking memakai jadwal baru.`,
      );
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[doctorId];
      return next;
    });
    setError("");
    onSaved("Perubahan jam praktik dibatalkan.");
  }

  return (
    <div className="grid gap-4">
      <div
        className={cn(
          card,
          "grid gap-3 p-4 sm:grid-cols-2 lg:max-w-2xl lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]",
        )}
      >
        <SelectField
          id="jam-dokter"
          label="Dokter"
          value={doctorId}
          onChange={onDoctorChange}
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {drafts[d.id] ? " (belum disimpan)" : ""}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="jam-interval"
          label="Jarak antar slot"
          value={String(schedule?.slotIntervalMinutes ?? 30)}
          onChange={(value) => update({ slotIntervalMinutes: Number(value) })}
        >
          {INTERVALS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} menit
            </option>
          ))}
        </SelectField>
      </div>

      {doctor && !doctor.isActive ? (
        <p className="rounded-md bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          {doctor.name} sedang tidak menerima booking. Jam praktik tetap bisa
          diatur dan berlaku setelah diaktifkan lagi.
        </p>
      ) : null}

      {!schedule ? (
        load.state === "error" ? (
          <ErrorNote message={load.message} onRetry={reload} />
        ) : (
          <LoadingNote>Memuat jam praktik…</LoadingNote>
        )
      ) : (
        <>
          <WeekHours
            schedule={schedule}
            renderEditor={(day, dayErr) => (
              <>
                <label className="flex min-h-10 cursor-pointer items-center gap-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={day.open}
                    onChange={(e) =>
                      updateDay(day.dayOfWeek, { open: e.target.checked })
                    }
                    className="size-5 accent-primary"
                  />
                  {DAY_NAMES[day.dayOfWeek]}
                </label>
                {day.open ? (
                  <span className="flex items-center gap-2">
                    <input
                      type="time"
                      step={300}
                      aria-label={`Jam mulai ${DAY_NAMES[day.dayOfWeek]}`}
                      value={day.start}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { start: e.target.value })
                      }
                      aria-invalid={Boolean(dayErr)}
                      className={cn(control, "w-[7.25rem] px-2")}
                    />
                    <span aria-hidden="true" className="text-muted-foreground">
                      –
                    </span>
                    <input
                      type="time"
                      step={300}
                      aria-label={`Jam selesai ${DAY_NAMES[day.dayOfWeek]}`}
                      value={day.end}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { end: e.target.value })
                      }
                      aria-invalid={Boolean(dayErr)}
                      aria-describedby={
                        dayErr ? `jam-error-${day.dayOfWeek}` : undefined
                      }
                      className={cn(control, "w-[7.25rem] px-2")}
                    />
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Libur</span>
                )}
              </>
            )}
          />

          {error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
              // Bar simpan menempel di bawah layar hanya saat ada perubahan.
              dirty
                ? "sticky bottom-3 z-10 border-primary bg-primary-50 shadow-[0_8px_24px_rgb(27_36_33/0.12)]"
                : "bg-card",
            )}
          >
            <p className="flex items-center gap-2 text-sm">
              {dirty ? (
                <CircleDot className="size-4 text-primary" aria-hidden="true" />
              ) : (
                <CircleCheck
                  className="size-4 text-success"
                  aria-hidden="true"
                />
              )}
              {dirty
                ? "Ada perubahan belum disimpan"
                : "Semua perubahan tersimpan"}{" "}
              · {totalSlots} slot per minggu
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={discard}
                disabled={!dirty || saving}
                className="inline-flex min-h-12 items-center rounded-md border border-border-strong bg-card px-5 font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-card"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving || errors.length > 0}
                className="inline-flex min-h-12 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Menyimpan…" : "Simpan jam praktik"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
