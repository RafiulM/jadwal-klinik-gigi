import { CircleAlert } from "lucide-react";
import { StepHeading } from "./step-heading";
import { SummaryList, type SummaryRow } from "./summary-list";

export function StepConfirm({
  rows,
  onEdit,
  error,
  headingRef,
}: {
  rows: (SummaryRow & { step: number })[];
  onEdit: (step: number) => void;
  error: string | null;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="grid gap-4">
      <StepHeading
        headingRef={headingRef}
        title="Periksa lagi janji Anda"
        lead="Pastikan semuanya sudah benar sebelum konfirmasi."
      />
      {error ? (
        <div
          role="alert"
          className="flex gap-3 rounded-md border border-destructive bg-destructive-soft p-4 text-sm"
        >
          <CircleAlert
            className="size-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p>{error}</p>
        </div>
      ) : null}
      <div className="rounded-xl border px-4 py-2">
        <SummaryList rows={rows} onEdit={onEdit} />
      </div>
      <p className="text-sm text-muted-foreground">
        Dengan menekan Konfirmasi janji, jadwal ini langsung tercatat di klinik.
      </p>
    </div>
  );
}
