import { useState } from "react";
import { Check, Clock, UserX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayRecap, DoctorDayRecap } from "./api";
import { card, percent } from "./format";

// Grafik batang bertumpuk: status kunjungan per dokter pada hari terpilih.
// Urutan segmen tetap (selesai → belum ditangani → tidak datang) supaya hijau
// dan merah tidak bersebelahan (aman untuk buta warna merah-hijau); segmen
// dipisah celah 2px, "tidak datang" diberi arsiran, dan setiap status punya
// ikon + label di legenda dan tooltip. Tabel rincian di bawahnya memuat angka
// yang sama.
const SEGMENTS: {
  key: "completed" | "waiting" | "noShow";
  label: string;
  icon: LucideIcon;
  fill: string;
}[] = [
  { key: "completed", label: "Selesai", icon: Check, fill: "bg-success" },
  { key: "waiting", label: "Belum ditangani", icon: Clock, fill: "bg-info" },
  {
    key: "noShow",
    label: "Tidak datang",
    icon: UserX,
    fill: "bg-destructive bg-[repeating-linear-gradient(45deg,transparent_0_3px,rgb(255_255_255/0.35)_3px_5px)]",
  },
];

type Row = Pick<
  DoctorDayRecap,
  "id" | "name" | "total" | "completed" | "noShow" | "waiting"
>;

export function StatusBars({ day }: { day: DayRecap }) {
  const rows: Row[] = [...day.doctors].sort(
    (a, b) => b.completed - a.completed || b.total - a.total,
  );
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section
      aria-labelledby="status-title"
      className={cn(card, "grid content-start gap-4 p-5")}
    >
      <div className="grid gap-1">
        <h2 id="status-title" className="font-bold">
          Status kunjungan per dokter
        </h2>
        <p className="text-sm text-muted-foreground">
          Jumlah pasien per status, diurutkan dari yang paling banyak selesai.
        </p>
      </div>
      <ul
        aria-label="Keterangan status"
        className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
      >
        {SEGMENTS.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("inline-block h-3 w-4 rounded-xs", s.fill)}
            />
            <s.icon className="size-3.5" aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <ul className="grid gap-4">
        {rows.map((row) => (
          <BarRow key={row.id} row={row} max={max} />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Total klinik: {day.completed} selesai · {day.waiting} belum ditangani ·{" "}
        {day.noShow} tidak datang dari {day.total} janji.
      </p>
    </section>
  );
}

function BarRow({ row, max }: { row: Row; max: number }) {
  const [hover, setHover] = useState(false);
  const summary = `${row.name}: ${row.completed} selesai, ${row.waiting} belum ditangani, ${row.noShow} tidak datang, dari ${row.total} janji`;
  return (
    <li className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold break-words">{row.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.completed} dari {row.total} selesai ·{" "}
          {percent(row.completed, row.total)}
        </span>
      </div>
      <div
        role="img"
        tabIndex={0}
        aria-label={summary}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        className="relative flex h-6 items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {/* Garis dasar netral; batang tumbuh dari sini. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-px bg-border-strong"
        />
        <span
          aria-hidden="true"
          className="flex h-4 gap-0.5"
          style={{ width: `${(row.total / max) * 100}%` }}
        >
          {SEGMENTS.filter((s) => row[s.key] > 0).map((s, i, shown) => (
            <span
              key={s.key}
              className={cn(
                "h-full min-w-1",
                s.fill,
                i === shown.length - 1 && "rounded-r-xs",
              )}
              style={{ flexGrow: row[s.key], flexBasis: 0 }}
            />
          ))}
        </span>
        {hover ? (
          <span
            aria-hidden="true"
            className="absolute bottom-full left-0 z-10 mb-2 grid gap-1 rounded-md border bg-card px-3 py-2 text-xs whitespace-nowrap shadow-[0_8px_24px_rgb(27_36_33/0.12)]"
          >
            <strong className="text-sm">{row.name}</strong>
            {SEGMENTS.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <s.icon className="size-3.5" />
                {s.label}: {row[s.key]} ({percent(row[s.key], row.total)})
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </li>
  );
}
