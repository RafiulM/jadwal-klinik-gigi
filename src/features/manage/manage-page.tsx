import { useRef, useState, type KeyboardEvent } from "react";
import { Clock, Stethoscope, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DoctorsPanel } from "./doctors-panel";
import { WeekHours } from "./hours-panel";
import {
  MOCK_DOCTORS,
  MOCK_SCHEDULES,
  MOCK_SERVICES,
  type AdminDoctor,
  type AdminService,
} from "./mock-data";
import { ServicesPanel } from "./services-panel";
import { SelectField, card } from "./ui";

type TabId = "layanan" | "dokter" | "jam";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "layanan", label: "Layanan", icon: Stethoscope },
  { id: "dokter", label: "Dokter", icon: UserRound },
  { id: "jam", label: "Jam praktik", icon: Clock },
];

export function ManagePage() {
  const [services] = useState<AdminService[]>(MOCK_SERVICES);
  const [doctors] = useState<AdminDoctor[]>(MOCK_DOCTORS);
  const [tab, setTab] = useState<TabId>("layanan");
  const [scheduleDoctor, setScheduleDoctor] = useState(MOCK_DOCTORS[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const counts: Record<TabId, number | null> = {
    layanan: services.length,
    dokter: doctors.length,
    jam: null,
  };

  // Tab mengikuti pola ARIA: panah kiri/kanan, Home, End.
  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((t) => t.id === tab);
    const next =
      event.key === "ArrowRight"
        ? TABS[(index + 1) % TABS.length]
        : event.key === "ArrowLeft"
          ? TABS[(index + TABS.length - 1) % TABS.length]
          : event.key === "Home"
            ? TABS[0]
            : event.key === "End"
              ? TABS[TABS.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    setTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  const schedule = MOCK_SCHEDULES[scheduleDoctor];

  return (
    <div className="px-4 pt-5 pb-10 md:p-8 lg:px-10">
      <header className="mb-6 grid gap-1">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Admin klinik
        </p>
        <h1 className="text-2xl leading-tight font-bold tracking-tight">
          Kelola klinik
        </h1>
        <p className="text-sm text-muted-foreground">
          Atur layanan, dokter, dan jam praktik yang muncul di halaman booking
          pasien.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Bagian kelola"
        onKeyDown={onTabKeyDown}
        className="mb-5 inline-flex flex-wrap gap-1 rounded-md bg-muted p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(node) => {
              tabRefs.current[t.id] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-sm px-4 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
              tab === t.id
                ? "bg-card font-semibold text-primary shadow-[0_1px_3px_rgb(27_36_33/0.12)]"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="size-4" aria-hidden="true" />
            {t.label}
            {counts[t.id] !== null ? (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1 text-center text-xs font-bold",
                  tab === t.id
                    ? "bg-primary-50 text-primary"
                    : "bg-card text-muted-foreground",
                )}
              >
                {counts[t.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <section
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "layanan" ? <ServicesPanel services={services} /> : null}
        {tab === "dokter" ? (
          <DoctorsPanel doctors={doctors} services={services} />
        ) : null}
        {tab === "jam" ? (
          <div className="grid gap-4">
            <div className={cn(card, "grid gap-3 p-4 md:max-w-md")}>
              <SelectField
                id="jam-dokter"
                label="Dokter"
                value={scheduleDoctor}
                onChange={setScheduleDoctor}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectField>
            </div>
            {schedule ? <WeekHours schedule={schedule} /> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
