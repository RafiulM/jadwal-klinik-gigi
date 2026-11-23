import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { BookingPage } from "@/features/booking/booking-page";

// Halaman utama publik: link booking yang dibuka pasien dari HP, tanpa akun.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `Buat janji temu | ${siteConfig.name}` },
      {
        name: "description",
        content:
          "Pilih layanan, dokter, dan jam yang masih kosong. Tidak perlu daftar akun.",
      },
    ],
  }),
  component: BookingPage,
});
