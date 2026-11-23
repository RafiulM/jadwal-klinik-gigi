export const card =
  "rounded-xl border bg-card shadow-[0_1px_2px_rgb(27_36_33/0.05),0_8px_24px_rgb(27_36_33/0.05)]";

/** "3 dari 4" → "75%"; tanpa data → "–". */
export function percent(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "–";
}
