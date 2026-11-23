import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChoiceCard, Pill } from "./choice-card";
import type { Doctor } from "./mock-data";
import { StepHeading } from "./step-heading";

export function DoctorAvatar({
  initials,
  active,
}: {
  initials: string;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-primary-soft text-primary",
      )}
    >
      {initials}
    </span>
  );
}

export function StepDoctor({
  doctors,
  serviceName,
  selectedId,
  onSelect,
  headingRef,
}: {
  doctors: Doctor[];
  serviceName: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <fieldset className="m-0 grid min-w-0 gap-4 border-0 p-0">
      <legend className="mb-4 p-0">
        <StepHeading
          headingRef={headingRef}
          title="Pilih dokter"
          lead={`Dokter yang melayani ${serviceName ? serviceName.toLowerCase() : "layanan ini"}.`}
        />
      </legend>
      {doctors.length === 0 ? (
        <p className="rounded-md bg-primary-50 p-6 text-center text-sm text-muted-foreground">
          Belum ada dokter yang menerima booking untuk layanan ini. Coba pilih
          layanan lain atau hubungi klinik.
        </p>
      ) : (
        <div className="grid gap-3">
          {doctors.map((doctor) => {
            const checked = selectedId === doctor.id;
            return (
              <ChoiceCard
                key={doctor.id}
                group="dokter"
                value={doctor.id}
                checked={checked}
                onSelect={onSelect}
                lead={
                  <DoctorAvatar initials={doctor.initials} active={checked} />
                }
              >
                <span className="grid gap-1">
                  <span className="text-base leading-snug font-semibold [overflow-wrap:anywhere]">
                    {doctor.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {doctor.field}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Pill icon={<Calendar aria-hidden="true" />} active={checked}>
                    {doctor.dayText}
                  </Pill>
                  <Pill icon={<Clock aria-hidden="true" />} active={checked}>
                    {doctor.hoursText}
                  </Pill>
                </span>
              </ChoiceCard>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
