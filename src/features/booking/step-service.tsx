import { Clock, Repeat } from "lucide-react";
import { ChoiceCard, Pill } from "./choice-card";
import type { Service } from "./api";
import { followUpText } from "./format";
import { StepHeading } from "./step-heading";

export function StepService({
  services,
  selectedId,
  onSelect,
  headingRef,
}: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <fieldset className="m-0 grid min-w-0 gap-4 border-0 p-0">
      <legend className="mb-4 p-0">
        <StepHeading
          headingRef={headingRef}
          title="Pilih layanan"
          lead="Perawatan apa yang Anda butuhkan?"
        />
      </legend>
      {services.length === 0 ? (
        <p className="rounded-md bg-primary-50 p-6 text-center text-sm text-muted-foreground">
          Belum ada layanan yang bisa dibooking. Silakan hubungi klinik.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {services.map((service) => {
            const checked = selectedId === service.id;
            const follow = followUpText(service.followUpDays);
            return (
              <ChoiceCard
                key={service.id}
                group="layanan"
                value={service.id}
                checked={checked}
                onSelect={onSelect}
              >
                <span className="text-base leading-snug font-semibold [overflow-wrap:anywhere]">
                  {service.name}
                </span>
                <span className="-mt-1 text-sm leading-snug text-muted-foreground">
                  {service.description}
                </span>
                <span className="flex flex-wrap gap-2">
                  <Pill icon={<Clock aria-hidden="true" />} active={checked}>
                    ± {service.durationMinutes} menit
                  </Pill>
                  {follow ? (
                    <Pill icon={<Repeat aria-hidden="true" />} active={checked}>
                      {follow}
                    </Pill>
                  ) : null}
                </span>
              </ChoiceCard>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
