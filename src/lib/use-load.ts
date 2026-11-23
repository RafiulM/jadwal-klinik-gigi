import { useCallback, useEffect, useRef, useState } from "react";
import { messageOf } from "@/lib/api-client";

export type Load<T> =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "error"; message: string };

/** Muat data dari API setiap kali `key` berubah; `reload` untuk tombol Coba lagi. */
export function useLoad<T>(
  key: string | null,
  load: (key: string) => Promise<T>,
) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{
    token: string;
    result: Load<T>;
  } | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (!key) return;
    let active = true;
    const token = `${key}#${attempt}`;
    loadRef.current(key).then(
      (data) => {
        if (active) setSettled({ token, result: { state: "ready", data } });
      },
      (error) => {
        if (active)
          setSettled({
            token,
            result: { state: "error", message: messageOf(error) },
          });
      },
    );
    return () => {
      active = false;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const token = key ? `${key}#${attempt}` : null;
  // Belum ada hasil untuk permintaan terbaru berarti masih memuat.
  const result: Load<T> = !token
    ? { state: "idle" }
    : settled?.token === token
      ? settled.result
      : { state: "loading" };
  return [result, reload] as const;
}
