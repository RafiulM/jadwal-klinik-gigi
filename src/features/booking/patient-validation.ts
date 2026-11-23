// Aturan data pasien yang sama dipakai di browser dan nanti di validator server.
export const PHONE_PATTERN = /^(\+62|62|0)8\d{7,11}$/;

export function normalizePhone(phone: string) {
  return phone.replace(/[\s-]/g, "");
}

export function nameError(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Isi nama lengkap Anda.";
  if (trimmed.length > 80) return "Nama terlalu panjang, maksimal 80 karakter.";
  return "";
}

export function phoneError(phone: string) {
  const digits = normalizePhone(phone);
  if (!digits) return "Isi nomor HP Anda.";
  if (!PHONE_PATTERN.test(digits))
    return "Gunakan nomor HP Indonesia, contoh 0812 3456 7890.";
  return "";
}
