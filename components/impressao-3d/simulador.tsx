"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import {
  Aviso, BotaoPrimario, BotaoTexto, Entrada, Numero, Seletor,
} from "@/components/impressao-3d/campos";
import { AjudaFormulas, ComposicaoCalculo } from "@/components/impressao-3d/composicao-calculo";
import { simularPreco } from "@/app/(dashboard)/impressao-3d/precificacao/simulacao";
import {
  salvarItemOrcamento, usarSimulacaoEmOrcamento,
} from "@/app/(dashboard)/impressao-3d/orcamentos/actions";
import { lerSimulacao, ROTULO_PARAMETRO, type ResultadoSimulacao } from "@/lib/impressao-3d/calculo";
import {
  ESTADO_VAZIO, PARAMETROS_AVANCADOS, estadoParaEdicao, montarEntrada, type EstadoSimulador,
} from "@/lib/impressao-3d/simulador";
import { novaLinhaFilamento } from "@/lib/impressao-3d/filamentos";
import { formatNumero } from "@/lib/impressao-3d/numeros";
import { FilamentosLista } from "@/components/impressao-3d/filamentos-lista";
import { montarMateriais } from "@/lib/impressao-3d/filamentos";
import type { OpcaoImpressora, OpcaoMaterial, Opcoes } from "@/lib/impressao-3d/opcoes";
import type { ConfigPrecificacao, ItemOrcamento } from "@/lib/impressao-3d/tipos";

export interface ProdutoOpcao {
  id: string;
  nome: string;
  peso_estimado_g: number | null;
  horas_estimadas: number | null;
  impressora_id: string | null;
  material_id: string | null;
  variacoes: { id: string; nome: string; peso_g: number | null; horas_estimadas: number | null; material_id: string | null }[];
}

export interface RascunhoOpcao {
  id: string;
  numero: number;
  titulo: string;
}

interface Props {
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  config: ConfigPrecificacao;
  verCustos: boolean;
  contexto: "precificacao" | "orcamentos";
  /** Simulador livre: oferece "Usar em orçamento". */
  usarEmOrcamento?: { podeUsar: boolean; rascunhos: RascunhoOpcao[] };
  /** Dentro de um orçamento: adiciona/edita um item. */
  orcamento?: {
    id: string;
    item?: ItemOrcamento | null;
    produtos: ProdutoOpcao[];
    aoConcluir: () => void;
  };
}

const CAMPO_PESO_DETALHADO: [string, string][] = [
  ["peso_peca_g", "Peso da peça (g)"],
  ["peso_suporte_g", "Peso do suporte (g)"],
  ["peso_brim_g", "Peso do brim (g)"],
  ["peso_purga_g", "Peso da purga (g)"],
];

export function Simulador({ impressoras, materiais, config, verCustos, contexto, usarEmOrcamento, orcamento }: Props) {
  const router = useRouter();
  const toast = useToast();
  const item = orcamento?.item ?? null;
  const [estado, setEstado] = useState<EstadoSimulador>(() =>
    item ? estadoParaEdicao(item.entrada, config) : { ...ESTADO_VAZIO, modo_preco: config.modo_preco }
  );
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null);
  const [desatualizado, setDesatualizado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [avancado, setAvancado] = useState(false);
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [produtoId, setProdutoId] = useState(item?.produto_id ?? "");
  const [variacaoId, setVariacaoId] = useState(item?.variacao_id ?? "");
  const [calculando, calcular] = useTransition();
  const [salvando, salvar] = useTransition();

  // "Usar em orçamento" (simulador livre)
  const [painelOrcamento, setPainelOrcamento] = useState(false);
  const [destino, setDestino] = useState("novo");
  const [tituloNovo, setTituloNovo] = useState("");
  const [descricaoLivre, setDescricaoLivre] = useState("");

  const impressora = impressoras.itens.find((i) => i.id === estado.impressora_id);

  function alterar(parcial: Partial<EstadoSimulador>) {
    setEstado((e) => ({ ...e, ...parcial }));
    setDesatualizado(true);
  }
  function campo(chave: string, valor: string) {
    setEstado((e) => ({ ...e, campos: { ...e.campos, [chave]: valor } }));
    setDesatualizado(true);
  }

  /** Valor padrão que a RPC usaria se o campo ficar vazio (só para o placeholder). */
  function padrao(chave: string): string | undefined {
    const deImpressora: Record<string, number | undefined> = impressora
      ? {
          potencia_media_kw: impressora.potencia_media_kw,
          valor_aquisicao: impressora.valor_aquisicao,
          valor_residual: impressora.valor_residual,
          vida_util_horas: impressora.vida_util_horas,
          manutencao_hora: impressora.manutencao_hora,
          manutencao_ciclo: impressora.manutencao_ciclo,
        }
      : {};
    const v = deImpressora[chave] ?? (config as unknown as Record<string, number | string>)[chave];
    return typeof v === "number" ? `padrão: ${formatNumero(v, 4)}` : undefined;
  }

  function simular() {
    const { entrada, erros } = montarEntrada(estado, config);
    if (erros.length > 0) {
      setErro(erros[0]);
      return;
    }
    setErro(null);
    calcular(async () => {
      const r = await simularPreco(entrada, contexto);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      const lido = lerSimulacao(r.dados);
      if (!lido) {
        setErro("A simulação não devolveu um cálculo válido.");
        return;
      }
      setResultado(lido);
      setDesatualizado(false);
    });
  }

  function aplicarProduto(pid: string, vid: string) {
    setProdutoId(pid);
    setVariacaoId(vid);
    const p = orcamento?.produtos.find((x) => x.id === pid);
    if (!p) return;
    const v = p.variacoes.find((x) => x.id === vid);
    const q = Math.max(1, Math.floor(Number(estado.quantidade) || 1));
    // Pesos e horas do produto são por unidade; a entrada vale para o lote inteiro.
    const peso = v?.peso_g ?? p.peso_estimado_g;
    const horas = v?.horas_estimadas ?? p.horas_estimadas;
    setDescricao(v ? `${p.nome} — ${v.nome}` : p.nome);
    setEstado((e) => ({
      ...e,
      impressora_id: p.impressora_id && impressoras.itens.some((i) => i.id === p.impressora_id) ? p.impressora_id : e.impressora_id,
      material_id: (() => {
        const m = v?.material_id ?? p.material_id;
        return m && materiais.itens.some((x) => x.id === m) ? m : e.material_id;
      })(),
      pesoModo: "detalhado",
      campos: {
        ...e.campos,
        ...(peso != null ? { peso_peca_g: String(peso * q) } : {}),
        ...(horas != null ? { horas_impressao: String(horas * q) } : {}),
      },
    }));
    setDesatualizado(true);
  }

  function salvarNoOrcamento() {
    if (!orcamento) return;
    const { entrada, erros } = montarEntrada(estado, config);
    if (erros.length > 0) {
      setErro(erros[0]);
      return;
    }
    if (!descricao.trim()) {
      setErro("Descrição do item: campo obrigatório.");
      return;
    }
    setErro(null);
    salvar(async () => {
      const r = await salvarItemOrcamento(orcamento.id, {
        descricao,
        entrada,
        itemId: item?.id ?? null,
        produtoId: produtoId || null,
        variacaoId: variacaoId || null,
      });
      if (r && "error" in r) {
        setErro(r.error);
        toast.error(r.error);
        return;
      }
      toast.success(item ? "Item atualizado." : "Item adicionado.");
      orcamento.aoConcluir();
    });
  }

  function usarEmOrc() {
    const { entrada, erros } = montarEntrada(estado, config);
    if (erros.length > 0) {
      setErro(erros[0]);
      return;
    }
    if (!descricaoLivre.trim()) {
      setErro("Descrição do item: campo obrigatório.");
      return;
    }
    setErro(null);
    salvar(async () => {
      const r = await usarSimulacaoEmOrcamento({
        orcamentoId: destino === "novo" ? null : destino,
        novoTitulo: tituloNovo,
        item: { descricao: descricaoLivre, entrada },
      });
      if ("error" in r) {
        setErro(r.error);
        toast.error(r.error);
        return;
      }
      toast.success("Item adicionado ao orçamento.");
      router.push(`/impressao-3d/orcamentos/${r.orcamentoId}`);
    });
  }

  const produtoSelecionado = orcamento?.produtos.find((p) => p.id === produtoId);
  const gruposAvancados = [...new Set(PARAMETROS_AVANCADOS.map((p) => p.grupo))];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="space-y-5">
        {orcamento && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Entrada
              rotulo="Descrição do item *"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="col-span-2"
              placeholder="Ex.: Suporte de headset — preto"
            />
            {orcamento.produtos.length > 0 && (
              <Seletor rotulo="Produto (opcional)" value={produtoId} onChange={(e) => aplicarProduto(e.target.value, "")}>
                <option value="">Sem produto</option>
                {orcamento.produtos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </Seletor>
            )}
            {produtoSelecionado && produtoSelecionado.variacoes.length > 0 && (
              <Seletor rotulo="Variação" value={variacaoId} onChange={(e) => aplicarProduto(produtoId, e.target.value)}>
                <option value="">Sem variação</option>
                {produtoSelecionado.variacoes.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </Seletor>
            )}
            {produtoSelecionado && (
              <p className="col-span-2 text-[11px] text-zinc-600 sm:col-span-4">
                Ao escolher o produto, pesos e horas são preenchidos como valor por unidade × quantidade (a entrada vale para o lote inteiro).
              </p>
            )}
          </div>
        )}

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Peça e recursos</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {impressoras.acessivel ? (
              <Seletor rotulo="Impressora" value={estado.impressora_id} onChange={(e) => alterar({ impressora_id: e.target.value })}>
                <option value="">Padrão / nenhuma</option>
                {impressoras.itens.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </Seletor>
            ) : (
              <p className="self-end text-[11px] text-zinc-600">Sem acesso a Impressoras: informe energia e depreciação nos parâmetros avançados.</p>
            )}
            {materiais.acessivel ? (
              <Seletor rotulo="Material" value={estado.material_id} onChange={(e) => alterar({ material_id: e.target.value })}>
                <option value="">Nenhum</option>
                {materiais.itens.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </Seletor>
            ) : (
              <p className="self-end text-[11px] text-zinc-600">Sem acesso ao Estoque: informe o preço do material nos parâmetros avançados.</p>
            )}
            <Numero
              rotulo="Quantidade *"
              step="1"
              min="1"
              value={estado.quantidade}
              onChange={(e) => alterar({ quantidade: e.target.value })}
              ajuda="Nº de unidades do lote."
            />
          </div>

          <details className="rounded-lg border border-zinc-800" open={estado.filamentos.length > 0}>
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200">
              Vários filamentos no mesmo trabalho (opcional)
            </summary>
            <div className="space-y-3 border-t border-zinc-800 p-3">
              <FilamentosLista
                linhas={estado.filamentos.length > 0 ? estado.filamentos : [novaLinhaFilamento({ origem: materiais.itens.length > 0 ? "estoque" : "manual" })]}
                aoMudar={(filamentos) => alterar({ filamentos })}
                opcoes={materiais.itens
                  .filter((m) => m.unidade === "g")
                  .map((m) => ({ id: m.id, nome: m.nome, cor: m.cor, cor_hex: m.cor_hex }))}
                estoqueAcessivel={materiais.acessivel}
                rotuloPeso="Peso no lote (g)"
                ajudaPeso="Peso do lote inteiro (todas as unidades)."
              />
              {montarMateriais(estado.filamentos, 1).materiais.length > 0 && (
                <Aviso tom="info">
                  Com a lista de filamentos, o peso e o preço do material vêm das linhas: o material único e os pesos abaixo são ignorados.
                </Aviso>
              )}
            </div>
          </details>

          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
            {([["detalhado", "Peso por componente"], ["total", "Total do fatiador"]] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => alterar({ pesoModo: k })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${estado.pesoModo === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                {l}
              </button>
            ))}
          </div>

          {estado.pesoModo === "detalhado" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CAMPO_PESO_DETALHADO.map(([k, l]) => (
                <Numero key={k} rotulo={l} value={estado.campos[k] ?? ""} onChange={(e) => campo(k, e.target.value)} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Numero
                rotulo="Peso total do fatiador (g)"
                value={estado.campos.peso_total_g ?? ""}
                onChange={(e) => campo("peso_total_g", e.target.value)}
                className="col-span-2"
                ajuda="Total do lote que o fatiador informa (peça + suporte + brim + purga)."
              />
              <Numero
                rotulo="Dele, purga (g)"
                value={estado.campos.peso_purga_g ?? ""}
                onChange={(e) => campo("peso_purga_g", e.target.value)}
                className="col-span-2"
                ajuda="Subconjunto do total. A purga não recebe margem de desperdício."
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero
              rotulo="Horas de impressão"
              value={estado.campos.horas_impressao ?? ""}
              onChange={(e) => campo("horas_impressao", e.target.value)}
              ajuda="Total do lote."
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Trabalho e extras</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero rotulo="Mão de obra (h)" value={estado.campos.mao_obra_horas ?? ""} onChange={(e) => campo("mao_obra_horas", e.target.value)} />
            <Numero rotulo="Acabamento (h)" value={estado.campos.acabamento_horas ?? ""} onChange={(e) => campo("acabamento_horas", e.target.value)} />
            <Numero rotulo="Montagem (h)" value={estado.campos.montagem_horas ?? ""} onChange={(e) => campo("montagem_horas", e.target.value)} />
            <Numero rotulo="Embalagem (R$)" value={estado.campos.embalagem_custo ?? ""} onChange={(e) => campo("embalagem_custo", e.target.value)} />
          </div>
          <div className="space-y-2">
            {estado.outros.map((o, i) => (
              <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                <Entrada
                  rotulo={i === 0 ? "Outros custos — nome" : "Nome"}
                  value={o.nome}
                  onChange={(e) => alterar({ outros: estado.outros.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })}
                />
                <Numero
                  rotulo="Valor (R$)"
                  value={o.valor}
                  onChange={(e) => alterar({ outros: estado.outros.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)) })}
                />
                <button
                  type="button"
                  aria-label="Remover custo"
                  onClick={() => alterar({ outros: estado.outros.filter((_, j) => j !== i) })}
                  className="mb-1 rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <BotaoTexto onClick={() => alterar({ outros: [...estado.outros, { nome: "", valor: "" }] })}>
              <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar outro custo</span>
            </BotaoTexto>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Preço de venda</legend>
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
            {([["margem", "Margem"], ["markup", "Markup"]] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => alterar({ modo_preco: k })}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${estado.modo_preco === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {estado.modo_preco === "margem" ? (
              <Numero
                rotulo="Margem (%)"
                max="99.99"
                value={estado.campos.margem_pct ?? ""}
                onChange={(e) => campo("margem_pct", e.target.value)}
                placeholder={padrao("margem_pct")}
                ajuda="Lucro ÷ preço. Menor que 100."
              />
            ) : (
              <Numero
                rotulo="Markup (%)"
                value={estado.campos.markup_pct ?? ""}
                onChange={(e) => campo("markup_pct", e.target.value)}
                placeholder={padrao("markup_pct")}
                ajuda="Lucro ÷ custo."
              />
            )}
            <Numero
              rotulo="Preço manual do lote (R$)"
              value={estado.campos.preco_manual ?? ""}
              onChange={(e) => campo("preco_manual", e.target.value)}
              ajuda="Opcional. Substitui o preço calculado e mostra o lucro resultante."
            />
          </div>
        </fieldset>

        {/* Parâmetros de custo (tarifa, depreciação, margem...) só para quem vê custos. */}
        {verCustos && (
          <div className="rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setAvancado((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Parâmetros avançados (só para esta simulação)
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${avancado ? "rotate-180" : ""}`} />
            </button>
            {avancado && (
              <div className="space-y-4 border-t border-zinc-800 p-3">
                <p className="text-[11px] text-zinc-600">
                  Vazio = usa o padrão da empresa, da impressora ou do material. O que você digitar vale só aqui e não altera nenhum cadastro.
                </p>
                {gruposAvancados.map((g) => (
                  <div key={g}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{g}</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {PARAMETROS_AVANCADOS.filter((p) => p.grupo === g).map((p) => (
                        <Numero
                          key={p.chave}
                          rotulo={ROTULO_PARAMETRO[p.chave] ?? p.chave}
                          value={estado.campos[p.chave] ?? ""}
                          onChange={(e) => campo(p.chave, e.target.value)}
                          placeholder={padrao(p.chave)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {erro && <Aviso tom="erro">{erro}</Aviso>}

        <div className="flex flex-wrap items-center gap-2">
          <BotaoPrimario type="button" pendente={calculando} onClick={simular}>
            {calculando ? "Calculando..." : "Calcular preço"}
          </BotaoPrimario>
          {orcamento && (
            <BotaoPrimario type="button" pendente={salvando} onClick={salvarNoOrcamento}>
              {salvando ? "Salvando..." : item ? "Salvar alterações do item" : "Adicionar ao orçamento"}
            </BotaoPrimario>
          )}
          {orcamento && <BotaoTexto onClick={orcamento.aoConcluir}>Cancelar</BotaoTexto>}
          {orcamento && (
            <span className="text-[11px] text-zinc-600">O servidor recalcula e grava o item ao salvar.</span>
          )}
        </div>

        {usarEmOrcamento && (
          <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
            {!usarEmOrcamento.podeUsar ? (
              <p className="text-xs text-zinc-500">Para usar esta simulação em um orçamento é preciso ter edição em Orçamentos 3D.</p>
            ) : !painelOrcamento ? (
              <BotaoPrimario type="button" onClick={() => setPainelOrcamento(true)}>
                Usar em orçamento
              </BotaoPrimario>
            ) : (
              <>
                <p className="text-xs font-medium text-zinc-300">Usar em orçamento</p>
                <div className="grid grid-cols-2 gap-3">
                  <Seletor rotulo="Orçamento" value={destino} onChange={(e) => setDestino(e.target.value)}>
                    <option value="novo">Novo orçamento</option>
                    {usarEmOrcamento.rascunhos.map((r) => (
                      <option key={r.id} value={r.id}>#{r.numero} — {r.titulo}</option>
                    ))}
                  </Seletor>
                  {destino === "novo" && (
                    <Entrada rotulo="Título do novo orçamento *" value={tituloNovo} onChange={(e) => setTituloNovo(e.target.value)} />
                  )}
                  <Entrada rotulo="Descrição do item *" value={descricaoLivre} onChange={(e) => setDescricaoLivre(e.target.value)} className="col-span-2" />
                </div>
                <div className="flex gap-2">
                  <BotaoPrimario type="button" pendente={salvando} onClick={usarEmOrc}>
                    {salvando ? "Salvando..." : "Adicionar e abrir orçamento"}
                  </BotaoPrimario>
                  <BotaoTexto onClick={() => setPainelOrcamento(false)}>Cancelar</BotaoTexto>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        {resultado ? (
          <>
            {desatualizado && <Aviso tom="alerta">Você mudou os dados depois do último cálculo. Calcule de novo.</Aviso>}
            <ComposicaoCalculo calculo={resultado.calculo} verCustos={verCustos} quantidade={Number(resultado.entrada.quantidade) || undefined} />
            {verCustos && (
              <details className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
                <summary className="cursor-pointer text-zinc-400">Parâmetros efetivamente usados</summary>
                <ParametrosUsados entrada={resultado.entrada} />
              </details>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600">
            Preencha os dados e clique em “Calcular preço” para ver a composição completa. Os valores são estimados.
          </div>
        )}
        <AjudaFormulas />
      </aside>
    </div>
  );
}

/** Lista de parâmetros (snapshot ou simulação) com rótulo em português. */
export function ParametrosUsados({ entrada }: { entrada: Record<string, unknown> }) {
  const linhas = Object.entries(entrada).filter(([k]) => k !== "impressora_id" && k !== "material_id");
  if (linhas.length === 0) return <p className="mt-2 text-zinc-600">Sem parâmetros.</p>;
  return (
    <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {linhas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2">
          <dt className="text-zinc-500">{ROTULO_PARAMETRO[k] ?? (k === "outros_custos" ? "Outros custos" : k)}</dt>
          <dd className="text-right text-zinc-300">
            {typeof v === "number"
              ? formatNumero(v, 4)
              : k === "materiais" && Array.isArray(v)
                ? v
                    .map((o) => {
                      const m = o as { nome?: string; material_id?: string; peso_g?: number };
                      return `${m.nome ?? (m.material_id ? "filamento do estoque" : "filamento")}: ${formatNumero(Number(m.peso_g) || 0, 1)} g`;
                    })
                    .join("; ")
              : Array.isArray(v)
                ? v.map((o) => `${(o as { nome?: string }).nome ?? ""}: ${formatNumero(Number((o as { valor?: number }).valor) || 0)}`).join("; ")
                : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
