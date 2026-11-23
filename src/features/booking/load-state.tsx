import { CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";

export type { Load } from "@/lib/use-load";

export function LoadingNote({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="flex items-center justify-center gap-2 rounded-md bg-primary-50 p-6 text-sm text-muted-foreground"
    >
      <LoaderCircle
        className="size-4 animate-spin text-primary motion-reduce:animate-none"
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="grid justify-items-start gap-3 rounded-md border border-destructive bg-destructive-soft p-4"
    >
      <p className="flex gap-2 text-sm">
        <CircleAlert
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border-strong bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Coba lagi
      </button>
    </div>
  );
}
