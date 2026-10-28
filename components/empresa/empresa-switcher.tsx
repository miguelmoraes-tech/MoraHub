"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { selecionarEmpresa } from "@/lib/actions/empresa";
import { NOVA_EMPRESA } from "@/lib/empresa";
import { PAPEL_ROTULO, type EmpresaVinculo } from "@/lib/empresas";

/**
 * Seletor de empresa do topo do menu: lista todas as empresas em que a conta
 * tem vínculo ativo (dono, sócio ou vendedor) e troca a ativa sem logout. A
 * troca é uma server action, que só aceita empresas com vínculo no banco.
 */
export function EmpresaSwitcher({
  empresas,
  ativaId,
}: {
  empresas: EmpresaVinculo[];
  ativaId: string | null;
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

  const ativa = empresas.find((e) => e.workspaceId === ativaId) ?? null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-100">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {ativa ? PAPEL_ROTULO[ativa.papel] : "Empresa"}
          </span>
          <span className="block truncate text-sm font-semibold text-zinc-100">
            {ativa ? (ativa.nome ?? "Empresa sem nome") : "Sem empresa"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-30 origin-top rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl shadow-black/40 transition-all duration-150 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        {empresas.length > 0 && (
          <>
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Minhas empresas
            </p>
            <div className="space-y-0.5">
              {empresas.map((e) => {
                const atual = e.workspaceId === ativaId;
                const conteudo = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-100">
                        {e.nome ?? "Empresa sem nome"}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {PAPEL_ROTULO[e.papel]}
                      </span>
                    </span>
                    {atual && <Check className="h-4 w-4 shrink-0 text-copper-400" />}
                  </>
                );
                return atual ? (
                  <div
                    key={e.workspaceId}
                    className="flex items-center gap-3 rounded-lg border-l-[3px] border-copper-400 bg-copper-600/10 px-2.5 py-2"
                  >
                    {conteudo}
                  </div>
                ) : (
                  <form key={e.workspaceId} action={selecionarEmpresa.bind(null, e.workspaceId)}>
                    <button
                      type="submit"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-3 rounded-lg border-l-[3px] border-transparent px-2.5 py-2 text-left transition-colors hover:bg-zinc-900"
                    >
                      {conteudo}
                    </button>
                  </form>
                );
              })}
            </div>
            <div className="my-1.5 h-px bg-zinc-900" />
          </>
        )}
        <Link
          href={NOVA_EMPRESA}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-900"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-600 text-zinc-500">
            <Plus className="h-3.5 w-3.5" />
          </span>
          Criar minha empresa
        </Link>
      </div>
    </div>
  );
}
