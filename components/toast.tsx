"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Bell, X } from "lucide-react";
import { AVISO_ENVIADO, ROTA_APROVACOES } from "@/lib/aprovacoes-shared";

type ToastTone = "success" | "error" | "info";
type ToastLink = { href: string; label: string };
type ToastItem = { id: number; tone: ToastTone; message: string; link?: ToastLink };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /**
   * "Enviado para aprovação dos outros fundadores", com link para /aprovacoes.
   * Use no lugar do sucesso quando a ação voltou `pendente` (2+ fundadores).
   */
  aprovacao: (detalhe?: string) => void;
};

const TOAST_DURATION_MS = 5000;

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, link?: ToastLink) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message, link }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
      aprovacao: (detalhe) =>
        push("info", detalhe ? `${AVISO_ENVIADO}. ${detalhe}` : AVISO_ENVIADO, {
          href: ROTA_APROVACOES,
          label: "Ver aprovações",
        }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm shadow-lg shadow-black/30 ${
              t.tone === "error"
                ? "border-rose-900/60 bg-rose-950 text-rose-200"
                : t.tone === "info"
                  ? "border-sky-900/60 bg-sky-950 text-sky-200"
                  : "border-emerald-900/60 bg-emerald-950 text-emerald-200"
            }`}
          >
            {t.tone === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : t.tone === "info" ? (
              <Bell className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="min-w-0 flex-1 break-words">
              {t.message}
              {t.link && (
                <>
                  {" "}
                  <Link
                    href={t.link.href}
                    onClick={() => dismiss(t.id)}
                    className="font-medium underline underline-offset-2 hover:opacity-80"
                  >
                    {t.link.label}
                  </Link>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
