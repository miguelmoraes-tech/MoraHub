"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { definirModulo } from "@/lib/actions/modulos";
import { adicionarRecomendados } from "@/lib/actions/nichos";
import { ordemParaLigar } from "@/lib/rotulos-shared";
import { useToast } from "@/components/toast";
import { iconeDe } from "@/components/modulos/icones";
import { getModuloRegistro } from "@/lib/modulos/registry";

export interface ModuloCatalogo {
  chave: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  categoria: string | null;
  /** false = "Em breve": existe no catálogo, mas ainda não pode ser ligado. */
  ativo: boolean;
  dependeDe: string[];
  /** Faz parte dos módulos recomendados do nicho da empresa. */
  recomendado?: boolean;
}

export function ModulosBoard({
  modulos,
  habilitados,
  nichoNome = null,
}: {
  modulos: ModuloCatalogo[];
  habilitados: string[];
  /** Nome do nicho da empresa, para o selo "Recomendado para ...". */
  nichoNome?: string | null;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);

  const nomeDe = (chave: string) => modulos.find((m) => m.chave === chave)?.nome ?? chave;

  function alterar(chave: string, habilitado: boolean) {
    setEmAndamento(chave);
    startTransition(async () => {
      const resultado = await definirModulo(chave, habilitado);
      setEmAndamento(null);
      setConfirmando(null);
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      toast.success(habilitado ? "Módulo adicionado." : "Módulo removido. Os dados foram preservados.");
    });
  }

  // Recomendados do nicho que ainda não estão ligados (e que dá para ligar).
  const recomendadosFaltando = nichoNome
    ? ordemParaLigar(
        modulos.filter((m) => m.recomendado).map((m) => m.chave),
        modulos,
        habilitados
      )
    : [];

  function adicionarTodos() {
    setEmAndamento("recomendados");
    startTransition(async () => {
      const resultado = await adicionarRecomendados();
      setEmAndamento(null);
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      toast.success("Módulos recomendados adicionados.");
    });
  }

  return (
    <div className="space-y-4">
    {recomendadosFaltando.length > 0 && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-copper-600/30 bg-copper-600/5 px-4 py-3">
        <p className="text-sm text-zinc-300">
          Recomendados para <strong className="text-zinc-100">{nichoNome}</strong> que ainda não
          estão ligados: {recomendadosFaltando.map(nomeDe).join(", ")}.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={adicionarTodos}
          className="flex items-center gap-1.5 rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-copper-500 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {pending && emAndamento === "recomendados" ? "Adicionando..." : "Adicionar recomendados"}
        </button>
      </div>
    )}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modulos.map((m) => {
        const ligado = habilitados.includes(m.chave);
        const Icone = iconeDe(getModuloRegistro(m.chave)?.icone ?? m.icone);
        const faltando = m.dependeDe.filter((d) => !habilitados.includes(d));
        const dependentes = modulos.filter(
          (o) => habilitados.includes(o.chave) && o.dependeDe.includes(m.chave)
        );
        const ocupado = pending && emAndamento === m.chave;

        return (
          <div
            key={m.chave}
            className={`flex flex-col gap-3 rounded-xl border p-4 ${
              ligado ? "border-copper-600/40 bg-copper-600/5" : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  ligado ? "bg-copper-400 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <Icone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-100">{m.nome}</p>
                {m.categoria && (
                  <p className="text-[11px] uppercase tracking-wider text-zinc-600">{m.categoria}</p>
                )}
                {m.recomendado && !ligado && m.ativo && nichoNome && (
                  <p className="mt-0.5 text-[11px] font-medium text-copper-400">
                    Recomendado para {nichoNome}
                  </p>
                )}
              </div>
              {ligado && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <Check className="h-3 w-3" />
                  Ativo
                </span>
              )}
            </div>

            {m.descricao && <p className="text-xs leading-relaxed text-zinc-500">{m.descricao}</p>}

            {m.dependeDe.length > 0 && (
              <p className="text-[11px] text-zinc-600">
                Requer: {m.dependeDe.map(nomeDe).join(", ")}
              </p>
            )}

            <div className="mt-auto pt-1">
              {!m.ativo ? (
                <span className="inline-block rounded-full bg-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                  Em breve
                </span>
              ) : ligado ? (
                confirmando === m.chave ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-zinc-400">
                      Remover <strong className="text-zinc-200">{m.nome}</strong>? Ele some do menu
                      e deixa de abrir, mas todos os dados ficam guardados e voltam se você
                      adicionar o módulo de novo.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => alterar(m.chave, false)}
                        className="rounded-md bg-rose-600 px-2.5 py-1.5 font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                      >
                        {ocupado ? "Removendo..." : "Remover"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmando(null)}
                        className="rounded-md px-2.5 py-1.5 font-medium text-zinc-400 hover:text-zinc-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : dependentes.length > 0 ? (
                  <p className="text-[11px] text-zinc-600">
                    Remova antes: {dependentes.map((d) => d.nome).join(", ")}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmando(m.chave)}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-rose-800 hover:text-rose-300"
                  >
                    Remover
                  </button>
                )
              ) : faltando.length > 0 ? (
                <p className="text-[11px] text-zinc-600">
                  Adicione antes: {faltando.map(nomeDe).join(", ")}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => alterar(m.chave, true)}
                  className="flex items-center gap-1.5 rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-copper-500 disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {ocupado ? "Adicionando..." : "Adicionar"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
