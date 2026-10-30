"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import {
  atualizarPecaEstoque, criarPecaEstoque, criarProdutoRapido, excluirPecaEstoque, movimentarPecas,
} from "@/app/(dashboard)/impressao-3d/estoque/actions";
import { useToast } from "@/components/toast";
import { origemMovimentoPeca, pecaAbaixoDoMinimo, type NumerosReferencia } from "@/lib/impressao-3d/pecas";
import {
  TIPO_MOVIMENTO_PECA_ROTULO, type MovimentoPeca, type PecaEstoque, type TipoPecaNaTela,
} from "@/lib/impressao-3d/tipos";
import type { OpcaoProduto, Opcoes } from "@/lib/impressao-3d/opcoes";
import { formatDataHora, formatMoeda, formatNumero } from "@/lib/impressao-3d/numeros";

export interface DadosPecas {
  itens: PecaEstoque[];
  movimentos: MovimentoPeca[];
  produtos: Opcoes<OpcaoProduto>;
  /** false = o módulo Produtos está desligado: a aba convida a adicioná-lo em Módulos. */
  produtosLigado: boolean;
  /** Pode criar produtos (edição em Produtos): oferece "criar produto rápido". */
  podeCriarProduto: boolean;
  nomesProduto: Record<string, string>;
  nomesVariacao: Record<string, string>;
  numeros: NumerosReferencia;
}

const TITULO_ACAO: Record<TipoPecaNaTela, string> = {
  entrada_manual: "Entrada manual",
  devolucao: "Devolução",
  perda: "Registrar perda",
  ajuste: "Ajuste de estoque",
};

function nomeDaPeca(p: PecaEstoque, d: Pick<DadosPecas, "nomesProduto" | "nomesVariacao">): string {
  const produto = d.nomesProduto[p.produto_id] ?? "Produto";
  const variacao = p.variacao_id ? d.nomesVariacao[p.variacao_id] : null;
  return variacao ? `${produto} — ${variacao}` : produto;
}

function FormNovaPeca({
  dados,
  verCustos,
  aoFechar,
}: {
  dados: DadosPecas;
  verCustos: boolean;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pendente] = useActionState(criarPecaEstoque, undefined);
  useActionSuccess(state, aoFechar);
  const [produtoId, setProdutoId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [criando, criar] = useTransition();
  const produto = dados.produtos.itens.find((p) => p.id === produtoId);

  function criarRapido() {
    criar(async () => {
      const r = await criarProdutoRapido(novoNome);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Produto criado.");
      setProdutoId(r.id);
      setNovoNome("");
      router.refresh();
    });
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Seletor
          rotulo="Produto *"
          name="produto_id"
          required
          value={produtoId}
          onChange={(e) => setProdutoId(e.target.value)}
          className="col-span-2"
        >
          <option value="">Escolha um produto</option>
          {dados.produtos.itens.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </Seletor>
        <Seletor rotulo="Variação" name="variacao_id" defaultValue="" key={produtoId}>
          <option value="">Sem variação</option>
          {(produto?.variacoes ?? []).map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </Seletor>
        <Numero rotulo="Quantidade inicial" name="quantidade_inicial" step="1" ajuda="0 = só cadastra a linha." />
        {verCustos && <Numero rotulo="Custo por peça (R$)" name="custo_unitario" ajuda="Opcional, da quantidade inicial." />}
        <Numero rotulo="Estoque mínimo" name="estoque_minimo" step="1" ajuda="0 = sem alerta." />
        <Entrada rotulo="Localização" name="localizacao" />
      </div>
      {dados.podeCriarProduto && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-zinc-800 p-3">
          <Entrada
            rotulo="Não achou? Criar produto rápido (só o nome)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="min-w-56 flex-1"
            placeholder="Ex.: Suporte de headset"
          />
          <BotaoTexto onClick={criarRapido} disabled={criando || !novoNome.trim()}>
            {criando ? "Criando..." : "Criar produto"}
          </BotaoTexto>
        </div>
      )}
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function FormEditarPeca({ peca, aoFechar }: { peca: PecaEstoque; aoFechar: () => void }) {
  const [state, formAction, pendente] = useActionState(atualizarPecaEstoque.bind(null, peca.id), undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Estoque mínimo" name="estoque_minimo" step="1" defaultValue={peca.estoque_minimo} ajuda="0 = sem alerta." />
        <Entrada rotulo="Localização" name="localizacao" defaultValue={peca.localizacao ?? ""} />
        <p className="col-span-2 self-end text-[11px] text-zinc-600">
          O saldo e o custo médio não são editados aqui: use Entrada manual, Perda ou Ajuste.
        </p>
      </div>
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function FormMovimentoPeca({
  peca,
  nome,
  tipo,
  verCustos,
  aoFechar,
}: {
  peca: PecaEstoque;
  nome: string;
  tipo: TipoPecaNaTela;
  verCustos: boolean;
  aoFechar: () => void;
}) {
  const [state, formAction, pendente] = useActionState(movimentarPecas.bind(null, peca.id), undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <input type="hidden" name="tipo" value={tipo} />
      <p className="text-sm font-medium text-zinc-100">
        {TITULO_ACAO[tipo]} · {nome}{" "}
        <span className="text-xs font-normal text-zinc-500">(saldo atual {formatNumero(peca.quantidade, 0)} peça(s))</span>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero
          rotulo={tipo === "ajuste" ? "Quantidade com sinal *" : "Quantidade *"}
          name="quantidade"
          required
          step="1"
          min={tipo === "ajuste" ? undefined : "1"}
          ajuda={tipo === "ajuste" ? "Positivo soma, negativo subtrai. Ex.: -2 retira 2 peças." : undefined}
        />
        {tipo === "entrada_manual" && verCustos && (
          <Numero rotulo="Custo por peça (R$)" name="custo_unitario" ajuda="Vazio = entrada sem custo informado." />
        )}
        <Entrada
          rotulo={tipo === "ajuste" ? "Motivo do ajuste *" : "Observação"}
          name="observacao"
          required={tipo === "ajuste"}
          className="col-span-2"
        />
      </div>
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Registrar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function LinhaPeca({
  peca,
  dados,
  podeEditar,
  verCustos,
}: {
  peca: PecaEstoque;
  dados: DadosPecas;
  podeEditar: boolean;
  verCustos: boolean;
}) {
  const [modo, setModo] = useState<"nenhum" | "editar" | TipoPecaNaTela>("nenhum");
  const { executar, pendente } = useAcao();
  const baixo = pecaAbaixoDoMinimo(peca);
  const nome = nomeDaPeca(peca, dados);
  const fechar = () => setModo("nenhum");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
            {nome}
            {baixo && <StatusChip tone="rose">Abaixo do mínimo</StatusChip>}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {peca.localizacao ? `${peca.localizacao} · ` : ""}
            mín. {peca.estoque_minimo > 0 ? `${formatNumero(peca.estoque_minimo, 0)} peça(s)` : "—"}
            {verCustos && ` · custo médio ${peca.custo_medio && peca.custo_medio > 0 ? formatMoeda(peca.custo_medio) : "— (sem entradas)"} por peça`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className={`text-sm font-semibold ${baixo ? "text-rose-400" : "text-zinc-100"}`}>
            {formatNumero(peca.quantidade, 0)} peça(s)
          </p>
          {podeEditar && (
            <div className="flex items-center gap-0.5">
              <BotaoTexto onClick={() => setModo("entrada_manual")}>Entrada manual</BotaoTexto>
              <BotaoTexto onClick={() => setModo("perda")}>Perda</BotaoTexto>
              <BotaoTexto onClick={() => setModo("ajuste")}>Ajuste</BotaoTexto>
              <button type="button" aria-label="Editar peça" onClick={() => setModo("editar")} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={pendente}
                aria-label="Excluir peça do estoque"
                onClick={() => executar(() => excluirPecaEstoque(peca.id), { confirmar: `Excluir "${nome}" do estoque de peças? Só linhas sem saldo e sem histórico podem ser excluídas.`, sucesso: "Peça excluída do estoque." })}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      {modo === "editar" && <FormEditarPeca peca={peca} aoFechar={fechar} />}
      {(modo === "entrada_manual" || modo === "perda" || modo === "ajuste") && (
        <FormMovimentoPeca peca={peca} nome={nome} tipo={modo} verCustos={verCustos} aoFechar={fechar} />
      )}
    </div>
  );
}

function HistoricoPecas({ dados, verCustos, limite }: { dados: DadosPecas; verCustos: boolean; limite: number }) {
  const porId = useMemo(() => new Map(dados.itens.map((p) => [p.id, p])), [dados.itens]);
  if (dados.movimentos.length === 0) return <Vazio>Nenhum movimento de peças registrado ainda.</Vazio>;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900 text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Peça</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 text-right font-medium">Variação</th>
              <th className="px-3 py-2 text-right font-medium">Saldo após</th>
              {verCustos && <th className="px-3 py-2 text-right font-medium">Custo unit.</th>}
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {dados.movimentos.map((m) => {
              const peca = porId.get(m.peca_id);
              return (
                <tr key={m.id} className="text-zinc-300">
                  <td className="whitespace-nowrap px-3 py-2">{formatDataHora(m.created_at)}</td>
                  <td className="px-3 py-2">{peca ? nomeDaPeca(peca, dados) : "—"}</td>
                  <td className="px-3 py-2">{TIPO_MOVIMENTO_PECA_ROTULO[m.tipo] ?? m.tipo}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right ${m.delta < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {m.delta > 0 ? "+" : ""}{formatNumero(m.delta, 0)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{formatNumero(m.saldo_apos, 0)}</td>
                  {verCustos && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">{m.custo_unitario != null ? formatMoeda(m.custo_unitario) : "—"}</td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2">{origemMovimentoPeca(m, dados.numeros)}</td>
                  <td className="px-3 py-2 text-zinc-500">{m.observacao ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dados.movimentos.length >= limite && (
        <p className="text-[11px] text-zinc-600">Mostrando os {limite} movimentos mais recentes.</p>
      )}
    </div>
  );
}

/** Aba "Peças" do Estoque: peças impressas prontas, com entrada manual, perda, ajuste e histórico. */
export function PecasEstoque({
  dados,
  podeEditar,
  verCustos,
  limiteMovimentos,
}: {
  dados: DadosPecas;
  podeEditar: boolean;
  verCustos: boolean;
  limiteMovimentos: number;
}) {
  const [novo, setNovo] = useState(false);
  const baixas = dados.itens.filter((p) => pecaAbaixoDoMinimo(p));

  return (
    <div className="space-y-5">
      {!dados.produtosLigado && (
        <Aviso tom="info">
          O estoque de peças usa os produtos do catálogo. Adicione <strong>Produtos e catálogo</strong> em{" "}
          <Link href="/modulos" className="font-medium underline">Módulos</Link> para cadastrar peças prontas.
        </Aviso>
      )}
      {dados.produtosLigado && !dados.produtos.acessivel && (
        <Aviso tom="alerta">Você não tem acesso a Produtos: não é possível escolher o produto de uma nova peça.</Aviso>
      )}
      {baixas.length > 0 && (
        <Aviso tom="alerta">
          Abaixo do mínimo: {baixas.map((p) => `${nomeDaPeca(p, dados)} (${formatNumero(p.quantidade, 0)})`).join(", ")}.
        </Aviso>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">{dados.itens.length} item(ns) no estoque de peças</p>
        {podeEditar && dados.produtosLigado && dados.produtos.acessivel && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Nova peça no estoque
          </BotaoNovo>
        )}
      </div>
      {novo && <FormNovaPeca dados={dados} verCustos={verCustos} aoFechar={() => setNovo(false)} />}

      <Cartao titulo="Peças prontas" icone={<Package className="h-4 w-4" />}>
        {dados.itens.length === 0 ? (
          <Vazio>
            Nenhuma peça no estoque. Peças entram sozinhas quando um trabalho de produção avulso é concluído, ou você pode dar
            entrada manual.
          </Vazio>
        ) : (
          <div className="space-y-2">
            {dados.itens.map((p) => (
              <LinhaPeca key={p.id} peca={p} dados={dados} podeEditar={podeEditar} verCustos={verCustos} />
            ))}
          </div>
        )}
      </Cartao>

      <Cartao titulo="Histórico de peças">
        <HistoricoPecas dados={dados} verCustos={verCustos} limite={limiteMovimentos} />
      </Cartao>
    </div>
  );
}
