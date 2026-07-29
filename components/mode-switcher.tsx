"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Home, ChevronDown, Check } from "lucide-react";
import { writeHubModeCookie, MODE_HOME_ROUTE, type HubMode } from "@/lib/hub-mode";

const OPTIONS: {
  mode: HubMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    mode: "business",
    label: "Business",
    description: "Clientes, leads, gestão",
    icon: Building2,
  },
  {
    mode: "pessoal",
    label: "Pessoal",
    description: "Finanças e organização pessoal",
    icon: Home,
  },
];

export function ModeSwitcher({ mode }: { mode: HubMode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
          mode === "pessoal"
            ? "border-petrol-600/40 bg-petrol-600/10 hover:bg-petrol-600/15"
            : "border-copper-600/40 bg-copper-600/10 hover:bg-copper-600/15"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-950 ${
            mode === "pessoal" ? "bg-petrol-400" : "bg-copper-400"
          }`}
        >
          <CurrentIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Modo atual
          </span>
          <span
            className={`block truncate text-sm font-semibold ${
              mode === "pessoal" ? "text-petrol-200" : "text-copper-200"
            }`}
          >
            {current.label}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-20 origin-top rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl shadow-black/40 transition-all duration-150 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Trocar de modo
        </p>
        <div className="space-y-1">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isCurrent = option.mode === mode;

            return (
              <Link
                key={option.mode}
                href={MODE_HOME_ROUTE[option.mode]}
                onClick={() => {
                  writeHubModeCookie(option.mode);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 rounded-lg border-l-[3px] px-2.5 py-2.5 transition-colors ${
                  isCurrent
                    ? option.mode === "pessoal"
                      ? "border-petrol-400 bg-petrol-600/10"
                      : "border-copper-400 bg-copper-600/10"
                    : "border-transparent hover:bg-zinc-900"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-950 ${
                    option.mode === "pessoal" ? "bg-petrol-400" : "bg-copper-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-100">
                    {option.label}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {option.description}
                  </span>
                </span>
                {isCurrent && (
                  <Check
                    className={`h-4 w-4 shrink-0 ${
                      option.mode === "pessoal" ? "text-petrol-400" : "text-copper-400"
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
