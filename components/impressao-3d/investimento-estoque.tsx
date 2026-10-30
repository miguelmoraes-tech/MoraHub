"use client";

import { useState } from "react";
import { Aviso } from "@/components/impressao-3d/campos";
import { formatMoeda } from "@/lib/impressao-3d/numeros";
import type { ResumoInvestimento } from "@/lib/impressao-3d/estoque-uso";

/**
 * Topo do Estoque: "Total investido" (grande), "Valor em estoque hoje" e "Gasto por pessoa". Os números
 * vêm de p3d_resumo_investimento (o banco soma); a tela só mostra. Só quem pode ver custos recebe isto.
 * Clicar numa pessoa abre o detalhe (materiais, equipamentos e total).
 */
export function ResumoInvestimentoCards({ resumo, erro }: { resumo: ResumoInvestimento | null; erro: string | null }) {
  const [aberta, setAberta] = useState<string | null>(null);
  if (erro) return <Aviso tom="erro">{erro}</Aviso>;
  if (!resumo) return null;

  return (
    <section aria-label="Investimento em estoque e equipamentos" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-xl border border-copper-600/30 bg-copper-600/5 p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total investido</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-50">{formatMoeda(resumo.total_investido)}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Materiais {formatMoeda(resumo.materiais)} · equipamentos {formatMoeda(resumo.equipamentos)}
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Valor em estoque hoje</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-100">{formatMoeda(resumo.valor_em_estoque)}</p>
        <p className="mt-1 text-xs text-zinc-500">Saldo × custo médio dos itens ativos.</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Gasto por pessoa</p>
        {resumo.por_comprador.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Nenhuma compra com comprador informado.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {resumo.por_comprador.map((p) => {
              const chave = `${p.comprador_user_id ?? "sem"}-${p.nome}`;
              const detalhe = aberta === chave;
              return (
                <li key={chave}>
                  <button
                    type="button"
                    onClick={() => setAberta(detalhe ? null : chave)}
                    aria-expanded={detalhe}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm hover:bg-zinc-800/60"
                  >
                    <span className="min-w-0 truncate text-zinc-300">{p.nome}</span>
                    <span className="shrink-0 font-semibold text-zinc-100">{formatMoeda(p.total)}</span>
                  </button>
                  {detalhe && (
                    <dl className="mx-2 mb-1 grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-zinc-950/60 p-2 text-xs">
                      <dt className="text-zinc-500">Materiais</dt>
                      <dd className="text-right text-zinc-200">{formatMoeda(p.materiais)}</dd>
                      <dt className="text-zinc-500">Equipamentos</dt>
                      <dd className="text-right text-zinc-200">{formatMoeda(p.equipamentos)}</dd>
                      <dt className="font-medium text-zinc-400">Total</dt>
                      <dd className="text-right font-semibold text-zinc-100">{formatMoeda(p.total)}</dd>
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
