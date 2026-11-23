// Nomor HP pasien disamarkan di tampilan yang tidak perlu nomor lengkap,
// mis. "081234569009" → "0812••••9009".
export function maskPhone(phone: string) {
  return phone.length > 8
    ? `${phone.slice(0, 4)}${"•".repeat(phone.length - 8)}${phone.slice(-4)}`
    : phone;
}
