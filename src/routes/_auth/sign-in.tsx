import { createFileRoute, redirect } from "@tanstack/react-router";

// Alamat lama dari template; halaman masuk staf kini di /masuk.
export const Route = createFileRoute("/_auth/sign-in")({
  beforeLoad: () => {
    throw redirect({ to: "/masuk", replace: true });
  },
});
