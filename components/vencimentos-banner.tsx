"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import type { VencimentoAlerta } from "@/lib/vencimentos/types";

const STORAGE_KEY = "hub-vencimentos-dispensados";
const EMPTY_IDS: string[] = [];

let cachedDay = "";
let cachedIds: string[] = EMPTY_IDS;
const listeners = new Set<() => void>();

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function readStoredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_IDS;
    const parsed = JSON.parse(raw) as { date: string; ids: string[] };
    return parsed.date === todayString() ? parsed.ids : EMPTY_IDS;
  } catch {
    return EMPTY_IDS;
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot(): string[] {
  const today = todayString();
  if (today !== cachedDay) {
    cachedDay = today;
    cachedIds = readStoredIds();
  }
  return cachedIds;
}

function getServerSnapshot(): string[] {
  return EMPTY_IDS;
}

function dismiss(id: string) {
  const next = [...getSnapshot(), id];
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: todayString(), ids: next })
  );
  cachedDay = todayString();
  cachedIds = next;
  for (const listener of listeners) listener();
}

export function VencimentosBanner({
  alertas,
}: {
  alertas: VencimentoAlerta[];
}) {
  const pathname = usePathname();
  const dismissedIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (pathname.startsWith("/pessoal")) return null;

  const visiveis = alertas.filter((a) => !dismissedIds.includes(a.id));
  if (visiveis.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-amber-900/40 bg-amber-950/20 px-6 py-3">
      {visiveis.map((alerta) => {
        const atrasado = alerta.diasRestantes < 0;
        return (
          <div
            key={alerta.id}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
              atrasado
                ? "border-rose-900/50 bg-rose-950/40 text-rose-200"
                : "border-amber-900/40 bg-amber-950/30 text-amber-200"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 shrink-0 ${atrasado ? "text-rose-400" : "text-amber-400"}`}
              />
              <span className="truncate">{alerta.mensagem}</span>
              {atrasado && (
                <span className="shrink-0 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
                  Atrasado
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(alerta.id)}
              className={`shrink-0 rounded-md p-1 ${
                atrasado
                  ? "text-rose-400/70 hover:bg-rose-900/40 hover:text-rose-200"
                  : "text-amber-400/70 hover:bg-amber-900/40 hover:text-amber-200"
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
