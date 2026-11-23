import { addDays, dayOfWeek } from "@/lib/clinic-time";

/** Senin pada minggu tanggal itu; papan jadwal menampilkan Senin–Minggu. */
export function mondayOf(date: string) {
  return addDays(date, -((dayOfWeek(date) + 6) % 7));
}

/** Inisial dokter tanpa gelar: "drg. Rina Pratiwi" → "RP". */
export function doctorInitials(name: string) {
  return (
    name
      .split(",")[0]
      .split(/\s+/)
      .filter((word) => word && !word.endsWith("."))
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "?"
  );
}

/** "2026-11-23", "2026-11-29" → "23–29 November 2026". */
export function weekRangeLabel(first: string, last: string) {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const [y1, m1, d1] = first.split("-").map(Number);
  const [y2, m2, d2] = last.split("-").map(Number);
  if (y1 !== y2)
    return `${d1} ${months[m1 - 1]} ${y1} – ${d2} ${months[m2 - 1]} ${y2}`;
  if (m1 !== m2)
    return `${d1} ${months[m1 - 1]} – ${d2} ${months[m2 - 1]} ${y2}`;
  return `${d1}–${d2} ${months[m2 - 1]} ${y2}`;
}
