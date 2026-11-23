import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { displayTime } from "@/features/booking/format";
import type { DoctorWeekSchedule, ScheduleDay } from "./types";
import { card } from "./ui";

export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const TIMELINE_START = 7 * 60;
const TIMELINE_END = 21 * 60;

export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function dayError(day: ScheduleDay) {
  if (!day.open) return "";
  if (!day.start || !day.end) return "Isi jam mulai dan selesai.";
  if (toMinutes(day.end) <= toMinutes(day.start))
    return "Jam selesai harus setelah jam mulai.";
  return "";
}

export function slotCount(day: ScheduleDay, interval: number) {
  if (dayError(day) || !day.open) return 0;
  return Math.floor((toMinutes(day.end) - toMinutes(day.start)) / interval);
}

function barStyle(day: ScheduleDay) {
  const span = TIMELINE_END - TIMELINE_START;
  const start = Math.max(toMinutes(day.start), TIMELINE_START);
  const end = Math.min(toMinutes(day.end), TIMELINE_END);
  return {
    left: `${((start - TIMELINE_START) / span) * 100}%`,
    width: `${(Math.max(end - start, 0) / span) * 100}%`,
  };
}

/**
 * Jam praktik mingguan satu dokter: hari, jam, garis waktu 07.00–21.00, dan
 * jumlah slot. `renderEditor` mengganti tampilan jam dengan input bila diisi.
 */
export function WeekHours({
  schedule,
  renderEditor,
}: {
  schedule: DoctorWeekSchedule;
  renderEditor?: (day: ScheduleDay, error: string) => React.ReactNode;
}) {
  return (
    <div className={card}>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[8rem_minmax(15.5rem,1.4fr)_minmax(0,1fr)_5rem] items-center gap-4 rounded-t-xl border-b bg-muted px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid"
      >
        <span>Hari</span>
        <span>Jam praktik</span>
        <span className="relative block h-4">
          <span className="absolute left-0">07.00</span>
          <span className="absolute left-1/2 -translate-x-1/2">14.00</span>
          <span className="absolute right-0">21.00</span>
        </span>
        <span className="text-right">Slot</span>
      </div>
      <ul>
        {schedule.days.map((day, i) => {
          const error = dayError(day);
          const count = slotCount(day, schedule.slotIntervalMinutes);
          return (
            <li
              key={day.dayOfWeek}
              className={cn(
                "grid gap-3 p-4 md:grid-cols-[8rem_minmax(15.5rem,1.4fr)_minmax(0,1fr)_5rem] md:items-center md:gap-4",
                i > 0 && "border-t",
              )}
            >
              {renderEditor ? (
                renderEditor(day, error)
              ) : (
                <>
                  <span className="font-semibold">
                    {DAY_NAMES[day.dayOfWeek]}
                  </span>
                  {day.open ? (
                    <span className="tabular-nums">
                      {displayTime(day.start)}–{displayTime(day.end)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Moon className="size-4" aria-hidden="true" />
                      Libur
                    </span>
                  )}
                </>
              )}
              <span
                aria-hidden="true"
                className="relative block h-3 rounded-full bg-muted"
              >
                {day.open && !error ? (
                  <span
                    className="absolute inset-y-0 rounded-full bg-primary"
                    style={barStyle(day)}
                  />
                ) : null}
              </span>
              <p
                id={error ? `jam-error-${day.dayOfWeek}` : undefined}
                className={cn(
                  "text-sm md:text-right",
                  error ? "font-medium text-destructive" : "tabular-nums",
                )}
              >
                {error || (day.open ? `${count} slot` : "")}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
