# Integrasi n8n

Aplikasi tidak mengirim pesan sendiri. Semua pengingat dikirim n8n, yang
mengambil data dari API integrasi di bawah ini. Kalau n8n mati, booking dan
jadwal tetap jalan; event yang belum terkirim menunggu di tabel
`outbox_events` sampai n8n hidup lagi.

## Mengaktifkan

1. Buat kunci acak minimal 32 karakter, misalnya `openssl rand -hex 32`.
2. Isi `N8N_API_KEY` di environment server aplikasi (lokal: `.env.local`;
   Coolify: Environment Variables), lalu restart aplikasi.
3. Di n8n, buat credential **Header Auth** dengan nama header
   `Authorization` dan nilai `Bearer <kunci>`. Pakai credential itu di semua
   node HTTP Request ke aplikasi.

Tanpa `N8N_API_KEY` semua endpoint menjawab `503 INTEGRATION_DISABLED`; kunci
salah menjawab `401`.

## Endpoint

Semua di bawah `https://<domain-app>/api/integrations/n8n`, respons
`{ "data": ... }`, galat `{ "error": { "code", "message" } }`.

| Method & path                   | Untuk                                     | Jadwal di n8n         |
| ------------------------------- | ----------------------------------------- | --------------------- |
| `GET /ping`                     | Cek koneksi dan kunci                     | manual                |
| `POST /outbox/claim`            | Ambil event baru (maks. `limit`, def. 20) | tiap 1 menit          |
| `POST /outbox/:id/ack`          | Lapor hasil kirim satu event              | setelah tiap kirim    |
| `GET /reminders?date=`          | Janji temu besok untuk pengingat H-1      | tiap hari, mis. 18.00 |
| `GET /follow-ups/due?date=`     | Kontrol jatuh tempo yang belum dibooking  | tiap hari, mis. 09.00 |
| `POST /follow-ups/:id/reminded` | Catat pengingat kontrol terkirim          | setelah tiap kirim    |
| `GET /reports/daily?date=`      | Rekap harian + `text` siap kirim          | tiap hari, mis. 20.00 |

Tanggal memakai zona waktu klinik (Asia/Jakarta). `date` boleh dikosongkan:
pengingat memakai besok, kontrol dan rekap memakai hari ini.

### Outbox

`POST /outbox/claim` mengunci event 10 menit (status `processing`). n8n wajib
mengirim `POST /outbox/:id/ack` dengan salah satu:

- `{ "result": "sent" }` — selesai.
- `{ "result": "retry", "error": "...", "retryAfterSeconds": 900 }` — coba lagi nanti.
- `{ "result": "failed", "error": "..." }` — berhenti.

Event yang tidak di-ack sebelum kuncinya habis akan diambil lagi, jadi pesan
tidak hilang kalau n8n berhenti di tengah jalan.

Jenis event:

- `appointment_created` — janji baru. Payload: `code`, `date`, `time`,
  `endTime`, `serviceName`, `doctorName`, `patientName`, `patientPhone`,
  `appointmentId`, `proofUrl`. Kirim kabar ke klinik (dan konfirmasi ke pasien
  bila diinginkan).
- `follow_up_scheduled` — dokter menetapkan tanggal kontrol. Payload:
  `followUpId`, `dueDate`, `followUpDueDate`, `patientName`, `patientPhone`,
  `serviceName`, `doctorName`, `bookingUrl`. Biasanya cukup di-ack; pengingat
  dikirim saat jatuh tempo lewat `/follow-ups/due`.
- `follow_up_booked` — pasien sudah booking kontrolnya. Ack saja; kontrol itu
  otomatis tidak muncul lagi di `/follow-ups/due`.

### Pengingat kontrol

`/follow-ups/due` hanya mengembalikan kontrol berstatus belum booking, jatuh
tempo sampai `date`, paling banyak 3 kali per kontrol dengan jarak minimal 7
hari antar pengingat. Panggil `/follow-ups/:id/reminded` setiap kali pesan
terkirim.
