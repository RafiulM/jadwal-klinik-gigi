import {
  CalendarSearch,
  CircleAlert,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingDate } from "./mock-data";
import { StepHeading } from "./step-heading";

export type DayOption = BookingDate & { open: boolean; label: string };

const SLOT_GROUPS = [
  { id: "pagi", label: "Pagi", icon: Sunrise, from: "00.00", to: "12.00" },
  { id: "siang", label: "Siang", icon: Sun, from: "12.00", to: "15.00" },
  { id: "sore", label: "Sore", icon: Sunset, from: "15.00", to: "24.00" },
] as const;

const chip =
  "relative grid cursor-pointer rounded-md border bg-card text-foreground transition-colors hover:border-primary has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary has-[input:checked]:border-primary has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground has-[input:checked]:shadow-[0_6px_16px_rgb(15_107_92/0.3)] has-[input:disabled]:cursor-not-allowed has-[input:disabled]:border-dashed has-[input:disabled]:border-border-strong has-[input:disabled]:bg-muted has-[input:disabled]:text-muted-foreground";

export function StepSchedule({
  doctorName,
  days,
  selectedDateId,
  onSelectDate,
  slots,
  takenSlots,
  selectedTime,
  onSelectTime,
  conflictTime,
  headingRef,
}: {
  doctorName: string;
  days: DayOption[];
  selectedDateId: string | null;
  onSelectDate: (id: string) => void;
  slots: string[];
  takenSlots: string[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  conflictTime: string | null;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const groups = SLOT_GROUPS.map((group) => ({
    ...group,
    slots: slots.filter((t) => t >= group.from && t < group.to),
  })).filter((group) => group.slots.length > 0);

  return (
    <div className="grid gap-5">
      <StepHeading
        headingRef={headingRef}
        title="Pilih tanggal & jam"
        lead={`Jadwal ${doctorName}. Hanya jam yang masih kosong yang bisa dipilih.`}
      />

      {conflictTime ? (
        <div
          role="alert"
          className="flex gap-3 rounded-md border border-destructive bg-destructive-soft p-4"
        >
          <CircleAlert
            className="size-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="grid gap-1">
            <p className="font-semibold text-destructive">
              Jam {conflictTime} baru saja diambil pasien lain
            </p>
            <p className="text-sm">
              Silakan pilih jam lain. Data Anda tetap tersimpan di formulir ini.
            </p>
          </div>
        </div>
      ) : null}

      <fieldset className="m-0 grid min-w-0 gap-3 border-0 p-0">
        <legend className="mb-3 p-0 text-sm font-semibold">
          Tanggal · November 2026
        </legend>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
          {days.map((d) => (
            <label
              key={d.id}
              className={cn(
                chip,
                "justify-items-center gap-1 px-1 py-3 text-center",
              )}
            >
              <input
                className="sr-only"
                type="radio"
                name="tanggal"
                value={d.id}
                checked={selectedDateId === d.id}
                disabled={!d.open}
                onChange={() => onSelectDate(d.id)}
                aria-label={`${d.long}, ${d.label}`}
              />
              <span className="text-xs leading-tight font-medium">
                {d.short}
              </span>
              <span className="text-xl leading-tight font-bold">{d.day}</span>
              <span
                className={cn(
                  "text-xs leading-tight",
                  selectedDateId === d.id
                    ? "text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {d.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 grid min-w-0 gap-4 border-0 p-0">
        <legend className="mb-3 p-0 text-sm font-semibold">Jam</legend>
        {selectedDateId ? (
          groups.map((group) => (
            <div key={group.id} className="grid gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <group.icon className="size-4" aria-hidden="true" />
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
                {group.slots.map((t) => {
                  const taken = takenSlots.includes(t);
                  return (
                    <label
                      key={t}
                      className={cn(
                        chip,
                        "min-h-12 place-content-center justify-items-center py-1",
                      )}
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="jam"
                        value={t}
                        checked={selectedTime === t}
                        disabled={taken}
                        onChange={() => onSelectTime(t)}
                        aria-label={`Pukul ${t}${taken ? ", penuh" : ""}`}
                      />
                      <span
                        className={cn(
                          "text-base leading-tight font-semibold tabular-nums",
                          taken && "line-through",
                        )}
                      >
                        {t}
                      </span>
                      {taken ? (
                        <span className="text-xs leading-tight">Penuh</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <p className="grid justify-items-center gap-2 rounded-md bg-primary-50 p-6 text-center text-sm text-muted-foreground">
            <CalendarSearch
              className="size-7 text-primary"
              aria-hidden="true"
            />
            Pilih tanggal dulu untuk melihat jam yang masih kosong.
          </p>
        )}
      </fieldset>
    </div>
  );
}
