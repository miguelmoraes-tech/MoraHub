"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { BotaoTexto, Entrada, Numero, Seletor } from "@/components/impressao-3d/campos";
import { custoPorKgDeG, formatarSaldoPeso, novaLinhaFilamento, type FaltaDeEstoque, type LinhaFilamento } from "@/lib/impressao-3d/filamentos";
import { formatMoeda, formatNumero } from "@/lib/impressao-3d/numeros";

export interface OpcaoFilamento {
  id: string;
  nome: string;
  cor: string | null;
  cor_hex: string | null;
  /** Só para quem tem o extra "custos" do Estoque. */
  custo_por_g?: number | null;
  /** Saldo do estoque em g (vindo do banco). */
  saldo?: number | null;
}

function rotuloOpcao(o: OpcaoFilamento): string {
  const partes = [o.nome];
  if (o.cor) partes.push(o.cor);
  let texto = partes.join(" · ");
  if (o.custo_por_g != null) texto += ` — ${formatMoeda(custoPorKgDeG(o.custo_por_g))}/kg`;
  if (o.saldo != null) {
    const s = formatarSaldoPeso(o.saldo);
    texto += ` — saldo ${formatNumero(s.valor, 1)} ${s.unidade}`;
  }
  return texto;
}

/**
 * Lista de filamentos usados (adicionar/remover, mínimo 1 linha): cada linha escolhe um filamento do
 * estoque OU informa na hora (nome, cor opcional, valor do kg) e o peso. Só coleta dados; custo e
 * saldo vêm do servidor.
 */
export function FilamentosLista({
  linhas,
  aoMudar,
  opcoes,
  estoqueAcessivel,
  rotuloPeso,
  ajudaPeso,
  faltas = [],
  somenteEstoque = false,
  custos,
}: {
  /** Custo e peso do LOTE de cada linha (do cálculo do banco, por `id` da linha): o preço aparece em destaque. */
  custos?: ReadonlyMap<string, { custo: number; peso_g: number }>;
  linhas: LinhaFilamento[];
  aoMudar: (linhas: LinhaFilamento[]) => void;
  opcoes: OpcaoFilamento[];
  estoqueAcessivel: boolean;
  rotuloPeso: string;
  ajudaPeso?: string;
  /** "Faltam X g": comparação informativa com o saldo (não bloqueia). */
  faltas?: FaltaDeEstoque[];
  /** Produção: só filamento do estoque (sem "informar na hora"). */
  somenteEstoque?: boolean;
}) {
  const podeEstoque = estoqueAcessivel && opcoes.length > 0;

  function mudar(id: string, parcial: Partial<LinhaFilamento>) {
    aoMudar(linhas.map((l) => (l.id === id ? { ...l, ...parcial } : l)));
  }

  return (
    <div className="space-y-3">
      {linhas.map((l, i) => {
        const origem = somenteEstoque ? "estoque" : podeEstoque ? l.origem : "manual";
        const falta = faltas.find((f) => f.material_id === l.material_id && origem === "estoque");
        const escolhido = origem === "estoque" ? opcoes.find((o) => o.id === l.material_id) : undefined;
        const custoLinha = custos?.get(l.id);
        return (
          <div key={l.id} className="space-y-2 rounded-lg border border-zinc-800 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-400">Filamento {i + 1}</span>
              <div className="flex items-center gap-1">
                {podeEstoque && !somenteEstoque && (
                  <div className="inline-flex rounded-md border border-zinc-800 bg-zinc-900/50 p-0.5">
                    {([["estoque", "Do estoque"], ["manual", "Informar na hora"]] as const).map(([k, rotulo]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => mudar(l.id, { origem: k })}
                        className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${origem === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`Remover filamento ${i + 1}`}
                  disabled={linhas.length <= 1}
                  onClick={() => aoMudar(linhas.filter((x) => x.id !== l.id))}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {origem === "estoque" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <div className="space-y-1">
                  <Seletor rotulo="Filamento" value={l.material_id} onChange={(e) => mudar(l.id, { material_id: e.target.value })}>
                    <option value="">Escolha um filamento</option>
                    {opcoes.map((o) => (
                      <option key={o.id} value={o.id}>{rotuloOpcao(o)}</option>
                    ))}
                  </Seletor>
                  {escolhido && (
                    <p className="flex items-center gap-2 text-sm">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-zinc-700"
                        style={escolhido.cor_hex ? { backgroundColor: escolhido.cor_hex } : undefined}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate text-zinc-300">{escolhido.nome}</span>
                      {escolhido.custo_por_g != null && (
                        <span className="shrink-0 font-semibold text-copper-300">{formatMoeda(custoPorKgDeG(escolhido.custo_por_g))}/kg</span>
                      )}
                    </p>
                  )}
                </div>
                <Numero rotulo={rotuloPeso} value={l.peso_g} onChange={(e) => mudar(l.id, { peso_g: e.target.value })} ajuda={i === 0 ? ajudaPeso : undefined} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Entrada rotulo="Nome" value={l.nome} onChange={(e) => mudar(l.id, { nome: e.target.value })} placeholder="PLA preto" />
                <Entrada rotulo="Cor (opcional)" value={l.cor} onChange={(e) => mudar(l.id, { cor: e.target.value })} />
                <Numero
                  rotulo="Valor do kg (R$)"
                  value={l.valor_kg}
                  onChange={(e) => mudar(l.id, { valor_kg: e.target.value })}
                  ajuda={i === 0 ? "Quanto você paga em 1 kg (nota de compra)." : undefined}
                />
                <Numero rotulo={rotuloPeso} value={l.peso_g} onChange={(e) => mudar(l.id, { peso_g: e.target.value })} ajuda={i === 0 ? ajudaPeso : undefined} />
              </div>
            )}

            {custoLinha && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-zinc-800/70 pt-2">
                <span className="text-xs text-zinc-500">Custo deste filamento</span>
                <span>
                  <span className="text-lg font-bold text-zinc-50">{formatMoeda(custoLinha.custo)}</span>
                  <span className="ml-2 text-xs text-zinc-500">{formatNumero(custoLinha.peso_g, 1)} g no projeto</span>
                </span>
              </div>
            )}
            {falta && (
              <p className="text-xs font-medium text-amber-400">
                Faltam {formatNumero(falta.falta, 1)} g: o projeto usa {formatNumero(falta.precisa, 1)} g e o saldo é{" "}
                {formatNumero(falta.tem, 1)} g.
              </p>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <BotaoTexto onClick={() => aoMudar([...linhas, novaLinhaFilamento({ origem: podeEstoque || somenteEstoque ? "estoque" : "manual" })])}>
          <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar filamento</span>
        </BotaoTexto>
        {estoqueAcessivel && opcoes.length === 0 && (
          <p className="text-[11px] text-zinc-600">
            Quer escolher da lista?{" "}
            <Link href="/impressao-3d/estoque" className="text-copper-400 hover:underline">Cadastre o filamento no estoque</Link>.
          </p>
        )}
        {!estoqueAcessivel && !somenteEstoque && <p className="text-[11px] text-zinc-600">Sem acesso ao Estoque: informe o valor do kg de cada filamento.</p>}
        {!estoqueAcessivel && somenteEstoque && <p className="text-[11px] text-zinc-600">Sem acesso ao Estoque: não é possível escolher os filamentos.</p>}
      </div>
    </div>
  );
}
