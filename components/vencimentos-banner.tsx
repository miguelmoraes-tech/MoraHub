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
      {visiveis.map((alerta) => (
        <div
          key={alerta.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200"
        >
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="truncate">{alerta.mensagem}</span>
          </div>
          <button
            type="button"
            onClick={() => dismiss(alerta.id)}
            className="shrink-0 rounded-md p-1 text-amber-400/70 hover:bg-amber-900/40 hover:text-amber-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
