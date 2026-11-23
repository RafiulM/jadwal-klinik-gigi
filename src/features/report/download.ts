import type { DailyReport, DayRecap } from "./api";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number)[][]) {
  // BOM agar Excel membaca UTF-8 (nama dengan tanda baca tetap benar).
  const BOM = "\uFEFF";
  return BOM + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Rincian per dokter untuk satu hari, plus baris total. */
export function dayCsv(day: DayRecap) {
  return toCsv([
    [
      "Tanggal",
      "Dokter",
      "Janji",
      "Selesai",
      "Tidak datang",
      "Belum ditangani",
    ],
    ...day.doctors.map((r) => [
      day.date,
      r.name,
      r.total,
      r.completed,
      r.noShow,
      r.waiting,
    ]),
    [day.date, "Total", day.total, day.completed, day.noShow, day.waiting],
  ]);
}

/** Ringkasan per hari untuk seluruh jendela rekap. */
export function periodCsv(report: DailyReport) {
  return toCsv([
    [
      "Tanggal",
      "Dokter praktik",
      "Janji",
      "Selesai",
      "Tidak datang",
      "Belum ditangani",
    ],
    ...report.days.map((d) => [
      d.date,
      d.doctors.length,
      d.total,
      d.completed,
      d.noShow,
      d.waiting,
    ]),
  ]);
}

/** Simpan teks sebagai berkas lewat tautan sementara. */
export function saveFile(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
