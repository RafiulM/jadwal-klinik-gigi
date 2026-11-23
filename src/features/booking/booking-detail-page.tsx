import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Check,
  CircleAlert,
  Clock,
  IdCard,
  Stethoscope,
  UserRound,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/logo";
import { ApiFailure, bookingApi, type BookingDetail } from "./api";
import { displayTime, formatLongDate } from "./format";
import { LoadingNote, type Load } from "./load-state";
import { SummaryList } from "./summary-list";

const STATUS = {
  scheduled: {
    label: "Terjadwal",
    icon: Clock,
    className: "bg-info-soft text-info",
  },
  completed: {
    label: "Selesai",
    icon: Check,
    className: "bg-success-soft text-success",
  },
  no_show: {
    label: "Tidak datang",
    icon: UserX,
    className: "bg-destructive-soft text-destructive",
  },
} as const;

export function BookingDetailPage({ code }: { code: string }) {
  const [detail, setDetail] = useState<Load<BookingDetail>>({
    state: "loading",
  });

  useEffect(() => {
    let active = true;
    bookingApi.detail(code).then(
      (data) => {
        if (active) setDetail({ state: "ready", data });
      },
      (error) => {
        if (!active) return;
        setDetail({
          state: "error",
          message:
            error instanceof ApiFailure && error.status === 404
              ? "Kode booking ini tidak ditemukan. Periksa lagi kodenya."
              : "Bukti janji temu belum bisa dimuat. Coba lagi sebentar.",
        });
      },
    );
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <div className="min-h-svh bg-background">
      <header className="bg-brand-deep px-4 pt-4 pb-20 text-on-brand-deep md:px-8">
        <div className="mx-auto flex max-w-[640px]">
          <Link
            to="/"
            aria-label={`${siteConfig.name}, halaman booking`}
            className="flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-deep"
          >
            <Logo tone="inverse" subtitle="Bukti janji temu" />
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        className="relative z-10 -mt-14 px-3 pb-12 md:px-8"
      >
        <section className="mx-auto grid max-w-[640px] gap-5 rounded-xl border bg-card px-4 py-6 shadow-[0_1px_2px_rgb(27_36_33/0.06),0_12px_32px_rgb(27_36_33/0.08)] md:p-8">
          <h1 className="text-2xl leading-tight font-bold tracking-tight">
            Janji temu {code.toUpperCase()}
          </h1>
          {detail.state === "loading" ? (
            <LoadingNote>Memuat bukti janji temu…</LoadingNote>
          ) : null}
          {detail.state === "error" ? (
            <p
              role="alert"
              className="flex gap-2 rounded-md border border-destructive bg-destructive-soft p-4 text-sm"
            >
              <CircleAlert
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              {detail.message}
            </p>
          ) : null}
          {detail.state === "ready" ? (
            <DetailBody detail={detail.data} />
          ) : null}
          <Link
            to="/"
            className="justify-self-start rounded-sm text-sm font-semibold text-primary underline underline-offset-3 hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-primary"
          >
            Buat janji temu baru
          </Link>
        </section>
      </main>
    </div>
  );
}

function DetailBody({ detail }: { detail: BookingDetail }) {
  const status = STATUS[detail.status];
  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 justify-self-start rounded-full px-3 py-1 text-sm font-semibold",
          status.className,
        )}
      >
        <status.icon className="size-4" aria-hidden="true" />
        {status.label}
      </span>
      <div className="rounded-xl border px-4 py-2">
        <SummaryList
          rows={[
            {
              id: "layanan",
              label: "Layanan",
              icon: <Stethoscope />,
              value: detail.serviceName,
            },
            {
              id: "dokter",
              label: "Dokter",
              icon: <UserRound />,
              value: detail.doctorName,
            },
            {
              id: "jadwal",
              label: "Jadwal",
              icon: <CalendarClock />,
              value: `${formatLongDate(detail.date)}, pukul ${displayTime(detail.time)}`,
            },
            {
              id: "pasien",
              label: "Atas nama",
              icon: <IdCard />,
              value: `${detail.patientName} · ${detail.patientPhone}`,
            },
          ]}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Tunjukkan kode ini saat datang ke klinik. Untuk mengubah jadwal, hubungi
        klinik.
      </p>
    </>
  );
}
