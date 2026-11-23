import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/components/status-badge";
import {
  DAY_SHORT,
  dayNumber,
  displayTime,
  formatLongDate,
} from "@/features/booking/format";
import { doctorInitials } from "./schedule-format";
import type { ScheduleAppointment, ScheduleWeek } from "./types";

// Kalender mingguan 09.00–20.00: satu kolom per hari, 80px per jam. Janji temu
// di jam yang sama ditaruh berdampingan. Warna mengikuti status, selalu dengan
// ikon; tanpa garis aksen di sisi kiri blok.
const START_HOUR = 9;
const END_HOUR = 20;
const HOUR_PX = 80;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i,
);

const EVENT_TONE = {
  scheduled: "bg-info-soft [&_svg]:text-info",
  completed: "bg-success-soft [&_svg]:text-success",
  no_show: "bg-destructive-soft [&_svg]:text-destructive",
} as const;

function offsetHours(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h + m / 60 - START_HOUR;
}

function durationHours(a: ScheduleAppointment) {
  return Math.max(offsetHours(a.endTime) - offsetHours(a.time), 0.5);
}

/** Janji temu yang mulai di jam sama dibagi jadi beberapa lajur. */
function layoutDay(events: ScheduleAppointment[]) {
  const byTime = new Map<string, ScheduleAppointment[]>();
  for (const a of events)
    byTime.set(a.time, [...(byTime.get(a.time) ?? []), a]);
  return events.map((a) => {
    const group = byTime.get(a.time)!;
    return { appointment: a, lane: group.indexOf(a), lanes: group.length };
  });
}

export function WeekCalendar({
  week,
  appointments,
  isPracticeDay,
  dayLabel,
  closedLabel,
  onOpenDay,
  onOpenAppointment,
}: {
  week: ScheduleWeek;
  appointments: ScheduleAppointment[];
  isPracticeDay: (dayOfWeek: number) => boolean;
  dayLabel: (date: string, dayOfWeek: number) => string;
  closedLabel: string;
  onOpenDay: (date: string) => void;
  onOpenAppointment: (id: string, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const height = (END_HOUR - START_HOUR) * HOUR_PX;
  return (
    <div className="relative overflow-x-auto rounded-xl border bg-card shadow-[0_1px_2px_rgb(27_36_33/0.05),0_8px_24px_rgb(27_36_33/0.05)]">
      <div className="grid min-w-[952px] grid-cols-[56px_repeat(7,minmax(128px,1fr))]">
        <div
          aria-hidden="true"
          className="sticky left-0 z-30 border-b bg-card"
        />
        {week.days.map((d) => {
          const today = d.date === week.today;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onOpenDay(d.date)}
              aria-label={`Lihat daftar ${formatLongDate(d.date)}, ${dayLabel(d.date, d.dayOfWeek)}`}
              className="grid justify-items-center gap-1 border-b border-l bg-card px-1 py-3 text-center hover:bg-primary-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            >
              <span className="text-xs font-semibold tracking-wide uppercase">
                {DAY_SHORT[d.dayOfWeek]}
              </span>
              <span
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full text-xl leading-tight font-bold",
                  today && "bg-brand-deep text-on-brand-deep",
                )}
              >
                {dayNumber(d.date)}
              </span>
              <span className="text-xs text-muted-foreground">
                {today ? "Hari ini · " : ""}
                {dayLabel(d.date, d.dayOfWeek)}
              </span>
            </button>
          );
        })}

        <div
          aria-hidden="true"
          className="sticky left-0 z-20 bg-card"
          style={{ height }}
        >
          {HOURS.map((h, i) => (
            <span
              key={h}
              className={cn(
                "absolute right-2 text-xs text-muted-foreground tabular-nums",
                i === 0
                  ? ""
                  : i === HOURS.length - 1
                    ? "-translate-y-full"
                    : "-translate-y-1/2",
              )}
              style={{ top: i * HOUR_PX }}
            >
              {String(h).padStart(2, "0")}.00
            </span>
          ))}
        </div>

        {week.days.map((d) => {
          const closed = !isPracticeDay(d.dayOfWeek);
          const events = layoutDay(
            appointments.filter((a) => a.date === d.date),
          );
          return (
            <div
              key={d.date}
              role="group"
              aria-label={formatLongDate(d.date)}
              className={cn(
                "relative border-l",
                closed
                  ? "bg-background"
                  : d.date === week.today
                    ? "bg-primary-50"
                    : "bg-card",
              )}
              style={{
                height,
                backgroundImage:
                  "linear-gradient(to bottom, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-muted) 1px, transparent 1px)",
                backgroundSize: `100% ${HOUR_PX}px, 100% ${HOUR_PX / 2}px`,
              }}
            >
              {closed ? (
                <p className="absolute inset-x-0 top-4 text-center text-xs font-semibold text-muted-foreground">
                  {closedLabel}
                </p>
              ) : null}
              {events.map(({ appointment: a, lane, lanes }) => {
                const meta = STATUS_META[a.status];
                const initials = doctorInitials(a.doctor.name);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`${displayTime(a.time)}, ${a.patient.name}, ${a.service.name}, ${a.doctor.name}, ${meta.label}`}
                    title={`${displayTime(a.time)} · ${a.patient.name} · ${a.service.name} · ${a.doctor.name}`}
                    onClick={(event) => onOpenAppointment(a.id, event)}
                    className={cn(
                      "absolute grid content-center overflow-hidden rounded-sm px-2 py-0.5 text-left text-xs leading-tight whitespace-nowrap text-foreground transition-shadow hover:z-10 hover:shadow-[0_4px_12px_rgb(27_36_33/0.16)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                      EVENT_TONE[a.status],
                    )}
                    style={{
                      top: offsetHours(a.time) * HOUR_PX + 2,
                      height: durationHours(a) * HOUR_PX - 4,
                      left: `calc(8px + ${lane} * ((100% - 16px - ${4 * (lanes - 1)}px) / ${lanes} + 4px))`,
                      width: `calc((100% - 16px - ${4 * (lanes - 1)}px) / ${lanes})`,
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-1">
                      <meta.icon
                        className="size-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 font-bold tabular-nums">
                        {displayTime(a.time)}
                      </span>
                      {lanes === 1 ? (
                        <span
                          aria-hidden="true"
                          className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-deep px-1 text-[10px] font-bold text-on-brand-deep"
                        >
                          {initials}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 truncate font-medium",
                        a.status === "no_show" && "line-through",
                      )}
                    >
                      {lanes > 1 ? `${initials} · ` : ""}
                      {a.patient.name}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
