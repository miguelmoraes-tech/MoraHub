"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Plus, Users2 } from "lucide-react";
import {
  writeHubModeCookie,
  accountTypeHubMode,
  isCollaboratorAccountType,
  ACCOUNT_TYPE_HOME_ROUTE,
  type HubMode,
  type AccountType,
} from "@/lib/hub-mode";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_STYLES, SWITCHER_ACCOUNT_TYPES } from "@/lib/account-types";
import { ativarTipoConta } from "@/lib/actions/tipos-ativos";

/** "Conta Jurídica" -> "Criar conta Jurídica" */
function criarLabel(label: string) {
  return `Criar ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

export function ModeSwitcher({
  mode,
  tiposAtivos,
}: {
  /** null outside a Business/Pessoal hub (e.g. the collaborator picker) — no option is highlighted as current. */
  mode: HubMode | null;
  tiposAtivos: AccountType[];
}) {
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

  const current =
    mode === null
      ? null
      : ACCOUNT_TYPES.find((o) => accountTypeHubMode(o.value) === mode) ??
        ACCOUNT_TYPES[0];
  const CurrentIcon = current?.icon ?? Users2;
  const currentStyles = current ? ACCOUNT_TYPE_STYLES[current.value] : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
          currentStyles?.card ?? "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-950 ${
            currentStyles?.iconBg ?? "bg-zinc-600"
          }`}
        >
          <CurrentIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {current ? "Modo atual" : "Tipos de conta"}
          </span>
          <span
            className={`block truncate text-sm font-semibold ${currentStyles?.text ?? "text-zinc-100"}`}
          >
            {current ? current.label : "Trocar ou ativar conta"}
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
          Tipos de conta
        </p>
        <div className="space-y-1">
          {ACCOUNT_TYPES.filter((option) => SWITCHER_ACCOUNT_TYPES.includes(option.value)).map((option) => {
            const Icon = option.icon;
            const styles = ACCOUNT_TYPE_STYLES[option.value];
            const isAtivo = tiposAtivos.includes(option.value);
            const optionHubMode = accountTypeHubMode(option.value);
            const isCurrent = isAtivo && optionHubMode !== null && optionHubMode === mode;

            if (!isAtivo && isCollaboratorAccountType(option.value)) {
              // Contador/Advogado/Financeiro/RH never self-activate from here
              // — they only turn on via signup's default type or by
              // accepting an invite. Shown so the switcher always lists all
              // account types, but with no action to take.
              return (
                <div
                  key={option.value}
                  className="flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-2.5 py-2.5 text-left opacity-40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-400">
                      {option.label}
                    </span>
                    <span className="block truncate text-xs text-zinc-600">
                      {option.value === "comercial"
                        ? "Entre com o código do seu gestor"
                        : "Ative aceitando um convite"}
                    </span>
                  </span>
                </div>
              );
            }

            if (!isAtivo) {
              return (
                <form key={option.value} action={ativarTipoConta.bind(null, option.value)}>
                  <button
                    type="submit"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-2.5 py-2.5 text-left opacity-50 transition-opacity hover:bg-zinc-900 hover:opacity-90"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-600 text-zinc-500">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-300">
                        {criarLabel(option.label)}
                      </span>
                      <span className="block truncate text-xs text-zinc-600">
                        {option.description}
                      </span>
                    </span>
                  </button>
                </form>
              );
            }

            return (
              <Link
                key={option.value}
                href={ACCOUNT_TYPE_HOME_ROUTE[option.value]}
                onClick={() => {
                  if (optionHubMode) writeHubModeCookie(optionHubMode);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 rounded-lg border-l-[3px] px-2.5 py-2.5 transition-colors ${
                  isCurrent ? styles.current : "border-transparent hover:bg-zinc-900"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-950 ${styles.iconBg}`}
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
                  <Check className={`h-4 w-4 shrink-0 ${styles.accentText}`} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
