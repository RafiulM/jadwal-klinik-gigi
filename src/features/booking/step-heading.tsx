import type { ReactNode } from "react";

// Judul tiap langkah. Bisa difokuskan (tabIndex -1) agar pembaca layar
// mengumumkan langkah baru saat pasien menekan Lanjut atau Kembali.
export function StepHeading({
  headingRef,
  title,
  lead,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  title: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl leading-tight font-bold tracking-tight outline-none"
      >
        {title}
      </h2>
      {lead ? <p className="text-sm text-muted-foreground">{lead}</p> : null}
    </div>
  );
}
