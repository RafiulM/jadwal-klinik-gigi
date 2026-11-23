import { CircleAlert, CircleCheck, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoad } from "@/lib/use-load";
import { displayTime, followUpText } from "@/features/booking/format";
import { ErrorNote, LoadingNote } from "@/features/booking/load-state";
import { doctorInitials } from "@/features/schedule/schedule-format";
import {
  manageApi,
  type AdminDoctor,
  type AdminService,
  type DoctorWeekSchedule,
} from "./api";
import { DAY_NAMES, slotCount } from "./hours-panel";
import { Pill, card } from "./ui";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function practiceSummary(schedule: DoctorWeekSchedule | undefined) {
  if (!schedule) return { text: "", slots: 0 };
  const open = DAY_ORDER.map((dow) =>
    schedule.days.find((d) => d.dayOfWeek === dow),
  ).filter((d) => d?.open);
  const slots = open.reduce(
    (sum, day) =>
      sum + (day ? slotCount(day, schedule.slotIntervalMinutes) : 0),
    0,
  );
  const text = open
    .map(
      (d) =>
        `${DAY_NAMES[d!.dayOfWeek].slice(0, 3)} ${displayTime(d!.start)}–${displayTime(d!.end)}`,
    )
    .join(" · ");
  return { text, slots };
}

/**
 * Pratinjau pilihan yang dilihat pasien di halaman booking, dihitung dari
 * layanan & dokter aktif serta jam praktik. Memberi tahu bila sebuah layanan
 * tidak bisa dibooking karena tidak ada dokter aktif dengan jam praktik.
 */
export function BookingPreview({
  services,
  doctors,
  version,
}: {
  services: AdminService[];
  doctors: AdminDoctor[];
  /** Naik setiap jam praktik disimpan, agar pratinjau dimuat ulang. */
  version: number;
}) {
  const active = doctors.filter((d) => d.isActive);
  const key = `${active.map((d) => d.id).join(",")}#${version}`;
  const [load, reload] = useLoad(key, () =>
    Promise.all(active.map((d) => manageApi.schedule(d.id))),
  );

  if (load.state === "error")
    return <ErrorNote message={load.message} onRetry={reload} />;
  if (load.state !== "ready")
    return <LoadingNote>Menyiapkan pratinjau booking…</LoadingNote>;

  const schedules = new Map(load.data.map((s) => [s.doctorId, s]));
  const visible = services.filter((s) => s.isActive);
  const hidden = services.filter((s) => !s.isActive);

  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 rounded-md bg-primary-50 px-4 py-3 text-sm">
        <Eye
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        Ini pilihan yang dilihat pasien di halaman booking saat ini: layanan
        yang tampil, dokter yang menangani, dan jam praktiknya.
      </p>

      {visible.length === 0 ? (
        <p className={cn(card, "p-6 text-sm text-muted-foreground")}>
          Belum ada layanan yang tampil di booking. Aktifkan minimal satu
          layanan di tab Layanan.
        </p>
      ) : (
        <ol className="grid items-start gap-4 lg:grid-cols-2">
          {visible.map((service) => {
            const offering = active
              .filter((d) => d.serviceIds.includes(service.id))
              .map((d) => ({
                doctor: d,
                ...practiceSummary(schedules.get(d.id)),
              }));
            const bookable = offering.filter((o) => o.slots > 0);
            return (
              <li key={service.id} className={cn(card, "grid content-start gap-3 p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="grid gap-1">
                    <h3 className="font-bold">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      ± {service.durationMinutes} menit ·{" "}
                      {service.followUpDays
                        ? `kontrol ${followUpText(service.followUpDays)?.toLowerCase()}`
                        : "tanpa kontrol rutin"}
                    </p>
                  </div>
                  {bookable.length ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-semibold text-success">
                      <CircleCheck className="size-3" aria-hidden="true" />
                      Bisa dibooking
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs font-semibold text-warning">
                      <CircleAlert className="size-3" aria-hidden="true" />
                      Belum bisa dibooking
                    </span>
                  )}
                </div>
                {offering.length ? (
                  <ul className="grid gap-2">
                    {offering.map(({ doctor, text, slots }) => (
                      <li
                        key={doctor.id}
                        className="flex items-start gap-3 rounded-md bg-muted px-3 py-2"
                      >
                        <span
                          aria-hidden="true"
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-on-brand-deep"
                        >
                          {doctorInitials(doctor.name)}
                        </span>
                        <span className="grid min-w-0 gap-0.5 text-sm">
                          <span className="font-semibold break-words">
                            {doctor.name}
                          </span>
                          {slots > 0 ? (
                            <span className="text-muted-foreground">
                              {text} · {slots} slot/minggu
                            </span>
                          ) : (
                            <span className="font-medium text-warning">
                              Belum ada jam praktik — tidak muncul di booking.
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm font-medium text-warning">
                    Belum ada dokter aktif yang menangani layanan ini.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {hidden.length ? (
        <p className="text-sm text-muted-foreground">
          Disembunyikan dari booking:{" "}
          <span className="inline-flex flex-wrap gap-1 align-middle">
            {hidden.map((s) => (
              <Pill key={s.id}>{s.name}</Pill>
            ))}
          </span>
        </p>
      ) : null}
    </div>
  );
}
