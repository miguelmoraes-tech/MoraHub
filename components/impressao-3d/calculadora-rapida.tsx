"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ClipboardCopy, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/toast";
import {
  Aviso, BotaoPrimario, BotaoTexto, Campo, CLASSE_CAMPO, Entrada, Numero, Rotulado, Seletor,
} from "@/components/impressao-3d/campos";
import { simularPreco } from "@/app/(dashboard)/impressao-3d/precificacao/simulacao";
import { salvarTarifaPadrao } from "@/app/(dashboard)/impressao-3d/precificacao/actions";
import { usarSimulacaoEmOrcamento } from "@/app/(dashboard)/impressao-3d/orcamentos/actions";
import { COMPOSICAO_ROTULO, lerSimulacao, type ResultadoSimulacao } from "@/lib/impressao-3d/calculo";
import { FilamentosLista } from "@/components/impressao-3d/filamentos-lista";
import { faltaDeEstoque, type MaterialEntrada } from "@/lib/impressao-3d/filamentos";
import {
  EXTRAS_RAPIDOS, estadoInicialRapido, explicarMargem, explicarMultiplicador, montarEntradaRapida,
  resumoWhatsapp, valoresIniciaisExtras, type EstadoRapido,
} from "@/lib/impressao-3d/calculadora-rapida";
import { formatMoeda, formatNumero, formatPercentualFracao, parseNumero } from "@/lib/impressao-3d/numeros";
import type { OpcaoImpressora, OpcaoMaterialCusto, Opcoes } from "@/lib/impressao-3d/opcoes";
import type { ConfigPrecificacao } from "@/lib/impressao-3d/tipos";
import type { RascunhoOpcao } from "@/components/impressao-3d/simulador";

const ATRASO_MS = 400;

interface Props {
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterialCusto>;
  config: ConfigPrecificacao;
  podeEditar: boolean;
  /** Só com Orçamentos ligado e edição: oferece "Criar orçamento com este cálculo". */
  usarEmOrcamento: { podeUsar: boolean; rascunhos: RascunhoOpcao[] };
}

type Guardado<T> = { chave: string; valor: T };

function Alternador<T extends string>({
  valor, opcoes, aoMudar,
}: {
  valor: T;
  opcoes: readonly (readonly [T, string])[];
  aoMudar: (v: T) => void;
}) {
  return (
    <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
      {opcoes.map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => aoMudar(k)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${valor === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Linha({ rotulo, valor, destaque, sub }: { rotulo: string; valor: string; destaque?: boolean; sub?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 ${destaque ? "text-sm font-semibold text-zinc-100" : "text-xs text-zinc-300"}`}>
      <span className={destaque ? "" : "text-zinc-400"}>
        {rotulo}
        {sub && <span className="ml-1.5 text-[11px] text-zinc-600">{sub}</span>}
      </span>
      <span className="whitespace-nowrap tabular-nums">{valor}</span>
    </div>
  );
}

export function CalculadoraRapida({ impressoras, materiais, config, podeEditar, usarEmOrcamento }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [estado, setEstado] = useState<EstadoRapido>(() => {
    const inicial = estadoInicialRapido(config);
    const podeEstoque = materiais.acessivel && materiais.itens.length > 0;
    return { ...inicial, filamentos: inicial.filamentos.map((f) => ({ ...f, origem: podeEstoque ? "estoque" : "manual" })) };
  });
  const [resultado, setResultado] = useState<Guardado<ResultadoSimulacao | null> | null>(null);
  const [erroRpc, setErroRpc] = useState<Guardado<string> | null>(null);
  const [tarifaSalva, setTarifaSalva] = useState(config.tarifa_kwh);
  const [copiado, setCopiado] = useState(false);
  const [salvandoTarifa, salvarTarifa] = useTransition();
  const [salvandoOrc, salvarOrc] = useTransition();
  const [painelOrc, setPainelOrc] = useState(false);
  const [destino, setDestino] = useState("novo");
  const [tituloNovo, setTituloNovo] = useState("");
  const [descricaoItem, setDescricaoItem] = useState("");
  const [erroOrc, setErroOrc] = useState<string | null>(null);
  const contador = useRef(0);

  const montada = useMemo(
    () => montarEntradaRapida(estado, { semImpressoras: impressoras.acessivel && impressoras.itens.length === 0 }),
    [estado, impressoras.acessivel, impressoras.itens.length]
  );
  const erroDeCampo = montada.erros[0] ?? null;
  // Só pede o cálculo com dados mínimos e sem erro de preenchimento.
  const chave = montada.pronta && montada.erros.length === 0 ? JSON.stringify(montada.entrada) : null;

  useEffect(() => {
    if (!chave) return;
    const id = ++contador.current;
    const timer = setTimeout(async () => {
      const r = await simularPreco(JSON.parse(chave) as Record<string, unknown>, "precificacao");
      if (id !== contador.current) return;
      if ("error" in r) {
        setErroRpc({ chave, valor: r.error });
        return;
      }
      const lido = lerSimulacao(r.dados);
      setErroRpc(lido ? null : { chave, valor: "A simulação não devolveu um cálculo válido." });
      setResultado({ chave, valor: lido });
    }, ATRASO_MS);
    return () => clearTimeout(timer);
  }, [chave]);

  const sim = resultado && resultado.chave === chave ? resultado.valor : null;
  const erroServidor = erroRpc && erroRpc.chave === chave ? erroRpc.valor : null;
  const calculando = !!chave && !sim && !erroServidor;
  // Última resposta ainda na tela enquanto o novo cálculo não volta.
  const anterior = !sim && resultado?.valor ? resultado.valor : null;
  const exibido = sim ?? anterior;

  function alterar(parcial: Partial<EstadoRapido>) {
    setEstado((e) => ({ ...e, ...parcial }));
  }
  function valor(chaveCampo: string, texto: string) {
    setEstado((e) => ({ ...e, valores: { ...e.valores, [chaveCampo]: texto } }));
  }
  function escolherImpressora(id: string) {
    const nova = impressoras.itens.find((i) => i.id === id) ?? null;
    setEstado((e) => ({
      ...e,
      impressora_id: id,
      // A manutenção vem da impressora; o que foi digitado em outros campos fica como está.
      valores: {
        ...e.valores,
        ...(({ manutencao_hora, manutencao_ciclo }) => ({ manutencao_hora, manutencao_ciclo }))(
          valoresIniciaisExtras(null, nova)
        ),
      },
    }));
  }

  const quantidade = Number(exibido?.entrada.quantidade) || 1;
  const nomeCopiar = estado.nomePeca;

  async function copiarResumo() {
    if (!exibido) return;
    const texto = resumoWhatsapp({
      nomePeca: nomeCopiar,
      quantidade,
      precoUnidade: formatMoeda(exibido.calculo.por_unidade.preco),
      precoTotal: formatMoeda(exibido.calculo.preco_final),
    });
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Tente de novo ou selecione o texto manualmente.");
    }
  }

  function guardarTarifa() {
    const n = parseNumero(estado.tarifa_kwh);
    if (n === null || Number.isNaN(n) || n < 0) {
      toast.error("Tarifa de energia: informe um número válido.");
      return;
    }
    salvarTarifa(async () => {
      const r = await salvarTarifaPadrao(n);
      if (r && "error" in r) {
        toast.error(r.error);
        return;
      }
      setTarifaSalva(n);
      toast.success("Tarifa salva como padrão da empresa.");
    });
  }

  function criarOrcamento() {
    if (montada.erros.length > 0) {
      setErroOrc(montada.erros[0]);
      return;
    }
    const descricao = (descricaoItem || estado.nomePeca).trim();
    if (!descricao) {
      setErroOrc("Descrição do item: campo obrigatório.");
      return;
    }
    setErroOrc(null);
    salvarOrc(async () => {
      const r = await usarSimulacaoEmOrcamento({
        orcamentoId: destino === "novo" ? null : destino,
        novoTitulo: tituloNovo,
        item: { descricao, entrada: montada.entrada },
      });
      if ("error" in r) {
        setErroOrc(r.error);
        toast.error(r.error);
        return;
      }
      toast.success("Item adicionado ao orçamento.");
      router.push(`/impressao-3d/orcamentos/${r.orcamentoId}`);
    });
  }

  const tarifaDigitada = parseNumero(estado.tarifa_kwh);
  const tarifaMudou = tarifaDigitada !== null && !Number.isNaN(tarifaDigitada) && tarifaDigitada !== tarifaSalva;
  const multiplicadorDigitado = parseNumero(estado.multiplicador);
  const margemDigitada = parseNumero(estado.margem_pct);
  const explicacao =
    estado.modo === "multiplicador"
      ? multiplicadorDigitado !== null && !Number.isNaN(multiplicadorDigitado)
        ? explicarMultiplicador(multiplicadorDigitado)
        : null
      : margemDigitada !== null && !Number.isNaN(margemDigitada)
        ? explicarMargem(margemDigitada)
        : null;
  // Só filamentos em gramas entram na lista (resina em ml e insumos em un seguem no Estoque).
  const opcoesFilamento = materiais.itens
    .filter((m) => m.unidade === "g")
    .map((m) => ({ id: m.id, nome: m.nome, cor: m.cor, cor_hex: m.cor_hex, custo_por_g: m.custo_por_g, saldo: m.estoque_atual }));
  const saldos = Object.fromEntries(materiais.itens.map((m) => [m.id, m.estoque_atual]));
  const faltas = faltaDeEstoque(
    Array.isArray(montada.entrada.materiais) ? (montada.entrada.materiais as MaterialEntrada[]) : [],
    saldos
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Filamentos usados neste projeto</legend>
          <FilamentosLista
            linhas={estado.filamentos}
            aoMudar={(filamentos) => alterar({ filamentos })}
            opcoes={opcoesFilamento}
            estoqueAcessivel={materiais.acessivel}
            rotuloPeso="Peso por peça (g)"
            ajudaPeso="O fatiador (Bambu Studio, Cura, PrusaSlicer) mostra o peso de cada filamento."
            faltas={faltas}
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Impressora</legend>
          {impressoras.acessivel ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Seletor
                rotulo="Impressora (opcional)"
                value={estado.impressora_id}
                onChange={(e) => escolherImpressora(e.target.value)}
              >
                <option value="">Nenhuma</option>
                {impressoras.itens.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </Seletor>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-600">Sem acesso a Impressoras: energia e depreciação ficam zeradas.</p>
          )}
          {!estado.impressora_id && impressoras.acessivel && (
            <Aviso tom="alerta">
              Sem impressora, a energia e a depreciação (desgaste da máquina) ficam zeradas.{" "}
              <Link href="/impressao-3d/impressoras" className="font-medium underline">Cadastrar uma impressora</Link>
            </Aviso>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Peça</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Entrada
              rotulo="Nome da peça (opcional)"
              value={estado.nomePeca}
              onChange={(e) => alterar({ nomePeca: e.target.value })}
              className="col-span-2"
              placeholder="Ex.: Suporte de headset"
            />
            <Numero
              rotulo="Quantidade de peças"
              step="1"
              min="1"
              value={estado.quantidade}
              onChange={(e) => alterar({ quantidade: e.target.value })}
              ajuda="Quantas peças iguais você vai imprimir."
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero
              rotulo="Tempo — horas"
              step="1"
              value={estado.horas}
              onChange={(e) => alterar({ horas: e.target.value })}
              ajuda="Tempo de impressão de UMA peça, também no fatiador."
            />
            <Numero
              rotulo="Tempo — minutos"
              step="1"
              value={estado.minutos}
              onChange={(e) => alterar({ minutos: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Energia</legend>
          <div className="flex flex-wrap items-end gap-3">
            <Numero
              rotulo="Tarifa de energia (R$/kWh)"
              value={estado.tarifa_kwh}
              onChange={(e) => alterar({ tarifa_kwh: e.target.value })}
              className="w-full sm:w-56"
              ajuda="Está na sua conta de luz (valor do kWh, com impostos)."
            />
            {podeEditar && tarifaMudou && (
              <BotaoTexto onClick={guardarTarifa} disabled={salvandoTarifa}>
                {salvandoTarifa ? "Salvando..." : "Salvar como padrão"}
              </BotaoTexto>
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Preço de venda</legend>
          <Alternador
            valor={estado.modo}
            opcoes={[["multiplicador", "Multiplicador"], ["margem", "Margem %"]] as const}
            aoMudar={(v) => alterar({ modo: v })}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {estado.modo === "multiplicador" ? (
              <Campo rotulo="Multiplicador sobre o custo">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">×</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    inputMode="decimal"
                    className={CLASSE_CAMPO}
                    value={estado.multiplicador}
                    onChange={(e) => alterar({ multiplicador: e.target.value })}
                  />
                </div>
              </Campo>
            ) : (
              <Numero
                rotulo="Margem (%)"
                max="99.99"
                value={estado.margem_pct}
                onChange={(e) => alterar({ margem_pct: e.target.value })}
              />
            )}
          </div>
          {explicacao && <p className="text-[11px] text-zinc-500">{explicacao}</p>}
          <p className="text-[11px] text-zinc-600">
            Muita gente usa custo × 5. Ajuste ao seu mercado: o preço final vem do servidor.
          </p>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Incluir também</legend>
          <p className="text-[11px] text-zinc-600">
            Por padrão o custo é só material + desgaste da impressora + energia. Marque o que mais deve entrar.
          </p>
          <div className="space-y-2">
            {EXTRAS_RAPIDOS.map((extra) => (
              <div key={extra.chave} className="rounded-lg border border-zinc-800 px-3 py-2">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={estado.extras[extra.chave]}
                    onChange={(e) => alterar({ extras: { ...estado.extras, [extra.chave]: e.target.checked } })}
                  />
                  <span>
                    {extra.rotulo}
                    <span className="block text-[11px] text-zinc-500">{extra.descricao}</span>
                  </span>
                </label>
                {estado.extras[extra.chave] && (
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {extra.campos.map((c) => (
                      <Numero
                        key={c.chave}
                        rotulo={c.rotulo}
                        value={estado.valores[c.chave] ?? ""}
                        onChange={(e) => valor(c.chave, e.target.value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        {erroDeCampo && <Aviso tom="erro">{erroDeCampo}</Aviso>}
        {erroServidor && <Aviso tom="erro">{erroServidor}</Aviso>}

        {exibido ? (
          <div className={`space-y-3 ${calculando ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <Rotulado>Estimado</Rotulado>
              {calculando && <span className="text-[11px] text-zinc-500">Calculando...</span>}
            </div>

            {montada.avisos.map((a) => (
              <Aviso key={a} tom="alerta">{a}</Aviso>
            ))}
            {exibido.calculo.avisos.map((a, i) => (
              <Aviso key={`rpc-${i}`} tom="alerta">{a}</Aviso>
            ))}

            <div className="rounded-lg border border-copper-500/40 bg-copper-600/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-copper-300">Preço sugerido por peça</p>
              <p className="text-3xl font-semibold tabular-nums text-zinc-50">
                {formatMoeda(exibido.calculo.por_unidade.preco)}
              </p>
              {quantidade > 1 && (
                <p className="mt-1 text-sm text-zinc-300">
                  Lote de {quantidade} peças: <span className="font-semibold tabular-nums">{formatMoeda(exibido.calculo.preco_final)}</span>
                </p>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Custo por peça</p>
              {COMPOSICAO_ROTULO.map(({ chave: k, rotulo }) => {
                const v = exibido.calculo.custos[k];
                if (!(v > 0)) return null;
                return <Linha key={k} rotulo={rotulo} valor={formatMoeda(v / quantidade)} />;
              })}
              <div className="mt-1 border-t border-zinc-800 pt-1">
                <Linha rotulo="Custo por peça" valor={formatMoeda(exibido.calculo.por_unidade.custo)} destaque />
                {quantidade > 1 && <Linha rotulo="Custo do lote" valor={formatMoeda(exibido.calculo.custo_total)} />}
              </div>
            </div>

            {exibido.calculo.detalhes.material.itens.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                  Filamentos{quantidade > 1 ? ` (lote de ${quantidade} peças)` : ""}
                </p>
                {exibido.calculo.detalhes.material.itens.map((it, i) => (
                  <Linha
                    key={`${it.material_id ?? it.nome}-${i}`}
                    rotulo={[it.nome, it.cor].filter(Boolean).join(" · ") || `Filamento ${i + 1}`}
                    sub={`${formatNumero(it.peso_g, 1)} g`}
                    valor={formatMoeda(it.custo)}
                  />
                ))}
              </div>
            )}

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <Linha rotulo="Lucro do lote" valor={formatMoeda(exibido.calculo.lucro)} />
              <Linha rotulo="Margem real" valor={formatPercentualFracao(exibido.calculo.margem_real)} sub="lucro ÷ preço" />
            </div>

            <div className="flex flex-wrap gap-2">
              <BotaoPrimario type="button" onClick={copiarResumo}>
                <span className="flex items-center gap-1.5">
                  {copiado ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                  {copiado ? "Copiado" : "Copiar resumo"}
                </span>
              </BotaoPrimario>
              {usarEmOrcamento.podeUsar && !painelOrc && (
                <BotaoPrimario type="button" onClick={() => { setPainelOrc(true); setDescricaoItem(estado.nomePeca); }}>
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Criar orçamento com este cálculo
                  </span>
                </BotaoPrimario>
              )}
            </div>
            <p className="text-[11px] text-zinc-600">
              O resumo para WhatsApp leva só peça, quantidade e preços, sem custos nem lucro.
            </p>

            {usarEmOrcamento.podeUsar && painelOrc && (
              <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
                <p className="text-xs font-medium text-zinc-300">Criar orçamento com este cálculo</p>
                <div className="grid grid-cols-1 gap-3">
                  <Seletor rotulo="Orçamento" value={destino} onChange={(e) => setDestino(e.target.value)}>
                    <option value="novo">Novo orçamento</option>
                    {usarEmOrcamento.rascunhos.map((r) => (
                      <option key={r.id} value={r.id}>#{r.numero} — {r.titulo}</option>
                    ))}
                  </Seletor>
                  {destino === "novo" && (
                    <Entrada rotulo="Título do novo orçamento *" value={tituloNovo} onChange={(e) => setTituloNovo(e.target.value)} />
                  )}
                  <Entrada rotulo="Descrição do item *" value={descricaoItem} onChange={(e) => setDescricaoItem(e.target.value)} />
                </div>
                {erroOrc && <Aviso tom="erro">{erroOrc}</Aviso>}
                <div className="flex gap-2">
                  <BotaoPrimario type="button" pendente={salvandoOrc} onClick={criarOrcamento}>
                    {salvandoOrc ? "Salvando..." : "Adicionar e abrir orçamento"}
                  </BotaoPrimario>
                  <BotaoTexto onClick={() => setPainelOrc(false)}>Cancelar</BotaoTexto>
                </div>
                <p className="text-[11px] text-zinc-600">O servidor recalcula e grava o item ao salvar.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600">
            {calculando
              ? "Calculando..."
              : "Informe o peso da peça e/ou o tempo de impressão. O resultado aparece aqui enquanto você digita. Os valores são estimados."}
          </div>
        )}
      </aside>
    </div>
  );
}
