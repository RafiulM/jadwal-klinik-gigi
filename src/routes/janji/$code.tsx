import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { BookingDetailPage } from "@/features/booking/booking-detail-page";

// Bukti janji temu yang bisa dibuka lagi pasien dari kode booking (nomor janji).
export const Route = createFileRoute("/janji/$code")({
  head: () => ({
    meta: [
      { title: `Bukti janji temu | ${siteConfig.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: function JanjiRoute() {
    const { code } = Route.useParams();
    return <BookingDetailPage code={code} />;
  },
});
