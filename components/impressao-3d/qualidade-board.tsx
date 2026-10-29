"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import {
  AreaTexto, Aviso, BotaoPrimario, BotaoTexto, Cartao, Seletor, SomenteLeitura, Vazio,
} from "@/components/impressao-3d/campos";
import { registrarInspecao } from "@/app/(dashboard)/impressao-3d/qualidade/actions";
import type { ResultadoOperacao } from "@/app/(dashboard)/impressao-3d/producao/actions";
import {
  RESULTADO_INSPECAO_ROTULO, TIPO_DEFEITO_ROTULO, TIPOS_DEFEITO,
  type Falha, type Inspecao, type Trabalho,
} from "@/lib/impressao-3d/tipos-operacao";
import type { OpcaoImpressora, OpcaoMaterial, OpcaoProduto, Opcoes } from "@/lib/impressao-3d/opcoes";
import {
  agruparIndicadores, agruparPorDefeito, resumirDesperdicio, taxaFalhaReal, type GrupoIndicador,
} from "@/lib/impressao-3d/regras-operacao";
import { formatDataHora, formatGramas, formatHoras, formatMoeda, formatPct, formatPercentualFracao } from "@/lib/impressao-3d/numeros";
import { abaInicial } from "@/lib/modulos/preferencias";

function FormInspecao({
  trabalho,
  pendente,
  executar,
  aoFechar,
}: {
  trabalho: Trabalho;
  pendente: boolean;
  executar: (fn: () => Promise<ResultadoOperacao>, aoOk: () => void) => void;
  aoFechar: () => void;
}) {
  const [resultado, setResultado] = useState("aprovado");
  return (
    <form
      action={(fd) => executar(() => registrarInspecao(trabalho.id, fd), aoFechar)}
      className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3"
    >
      <p className="text-sm font-medium text-zinc-100">Inspecionar trabalho #{trabalho.numero}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Seletor rotulo="Resultado *" name="resultado" value={resultado} onChange={(e) => setResultado(e.target.value)}>
          {Object.entries(RESULTADO_INSPECAO_ROTULO).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </Seletor>
        {resultado === "reprovado" && (
          <Seletor rotulo="Ação" name="acao" defaultValue="manter">
            <option value="manter">Só reprovar</option>
            <option value="reimprimir">Reprovar e reimprimir</option>
          </Seletor>
        )}
      </div>
      {resultado !== "aprovado" && (
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-medium text-zinc-400">
            Defeitos {resultado === "reprovado" ? "* (pelo menos um)" : "(opcional)"}
          </legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {TIPOS_DEFEITO.map((t) => (
              <label key={t} className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" name="defeitos" value={t} /> {TIPO_DEFEITO_ROTULO[t]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <AreaTexto rotulo="Observações" name="observacoes" />
      {resultado === "reprovado" && (
        <Aviso tom="alerta">
          Reprovado: o pedido não poderá ser marcado como pronto enquanto o trabalho estiver reprovado. Com &quot;reimprimir&quot;, a
          falha é registrada e uma reimpressão entra na fila.
        </Aviso>
      )}
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Registrando..." : "Registrar inspeção"}</BotaoPrimario>
      </div>
    </form>
  );
}

function TabelaIndicador({
  titulo,
  grupos,
  nome,
}: {
  titulo: string;
  grupos: GrupoIndicador[];
  nome: (chave: string) => string;
}) {
  const linhas = grupos.filter((g) => g.chave !== "" || g.falhas > 0);
  if (linhas.length === 0) return <Vazio>Sem dados de {titulo.toLowerCase()}.</Vazio>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-zinc-500">
          <tr>
            <th className="py-1.5 pr-3 font-medium">{titulo}</th>
            <th className="py-1.5 pr-3 text-right font-medium">Concluídos</th>
            <th className="py-1.5 pr-3 text-right font-medium">Falhos</th>
            <th className="py-1.5 pr-3 text-right font-medium">Falhas registradas</th>
            <th className="py-1.5 pr-3 text-right font-medium">Taxa real</th>
            <th className="py-1.5 pr-3 text-right font-medium">Peso perdido</th>
            <th className="py-1.5 text-right font-medium">Horas perdidas</th>
          </tr>
        </thead>
        <tbody className="text-zinc-300">
          {linhas.map((g) => {
            const taxa = taxaFalhaReal({ concluidos: g.concluidos, falhos: g.falhos, trabalhosComFalha: g.trabalhosComFalha });
            return (
              <tr key={g.chave || "sem"} className="border-t border-zinc-800/70">
                <td className="py-1.5 pr-3">{g.chave ? nome(g.chave) : "(sem vínculo)"}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{g.concluidos}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{g.falhos}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{g.falhas}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{taxa === null ? "—" : formatPercentualFracao(taxa)}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{formatGramas(g.pesoPerdidoG)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatHoras(g.horasPerdidas)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Indicadores({
  trabalhos,
  falhas,
  taxaEstimadaPct,
  impressoras,
  materiais,
  produtos,
  truncado,
  verCustos,
}: {
  trabalhos: Trabalho[];
  falhas: Falha[];
  taxaEstimadaPct: number | null | undefined;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  produtos: Opcoes<OpcaoProduto>;
  truncado: boolean;
  verCustos: boolean;
}) {
  const desperdicio = useMemo(() => resumirDesperdicio(falhas), [falhas]);
  const porDefeito = useMemo(() => agruparPorDefeito(falhas), [falhas]);

  const concluidos = trabalhos.filter((t) => t.status === "concluida").length;
  const falhos = trabalhos.filter((t) => t.status === "falhou").length;
  const idsComFalha = new Set(falhas.map((f) => f.producao_id));
  const taxa = taxaFalhaReal({ concluidos, falhos, trabalhosComFalha: idsComFalha.size });
  const nomeImpressora = (id: string) => impressoras.itens.find((i) => i.id === id)?.nome ?? (impressoras.acessivel ? "Impressora" : "(sem acesso a Impressoras)");
  const nomeMaterial = (id: string) => materiais.itens.find((m) => m.id === id)?.nome ?? (materiais.acessivel ? "Material" : "(sem acesso a Estoque)");
  const nomeProduto = (id: string) => produtos.itens.find((p) => p.id === id)?.nome ?? (produtos.acessivel ? "Produto" : "(sem acesso a Produtos)");

  return (
    <div className="space-y-5">
      {truncado && <Aviso tom="alerta">Só os registros mais recentes foram carregados; os indicadores podem estar incompletos.</Aviso>}

      <Cartao titulo="Taxa de falha: real × estimada">
        {taxa === null ? (
          <Vazio>Sem dados: nenhum trabalho concluído ou com falha ainda. A taxa real aparece conforme a produção acontece.</Vazio>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Taxa real</p>
              <p className="text-2xl font-semibold text-zinc-100">{formatPercentualFracao(taxa)}</p>
              <p className="text-[11px] text-zinc-600">
                {idsComFalha.size} trabalho(s) com falha ÷ {concluidos + falhos} (concluídos {concluidos} + falhos {falhos})
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Taxa estimada (Precificação)</p>
              <p className="text-2xl font-semibold text-zinc-100">
                {typeof taxaEstimadaPct === "number" ? formatPct(taxaEstimadaPct) : "—"}
              </p>
              <p className="text-[11px] text-zinc-600">
                {taxaEstimadaPct === undefined
                  ? "Sem acesso a Precificação."
                  : taxaEstimadaPct === null
                    ? "Configuração de precificação ainda não criada."
                    : "É o que os orçamentos já embutem no preço."}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Diferença</p>
              {typeof taxaEstimadaPct === "number" ? (
                <>
                  <p className={`text-2xl font-semibold ${taxa * 100 > taxaEstimadaPct ? "text-rose-400" : "text-emerald-400"}`}>
                    {taxa * 100 - taxaEstimadaPct >= 0 ? "+" : "−"}{formatPct(Math.abs(taxa * 100 - taxaEstimadaPct), 1)}
                  </p>
                  <p className="text-[11px] text-zinc-600">
                    {taxa * 100 > taxaEstimadaPct
                      ? "As falhas estão acima do que o preço embute: reveja a taxa ou as causas."
                      : "As falhas estão dentro do que o preço embute."}
                  </p>
                </>
              ) : (
                <p className="text-2xl font-semibold text-zinc-600">—</p>
              )}
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-zinc-600">
          Taxa real = trabalhos que tiveram ao menos uma falha registrada ÷ (trabalhos concluídos + trabalhos com falha). Falha parcial
          conta; a reimpressão é um trabalho próprio.
        </p>
      </Cartao>

      <Cartao titulo="Desperdício registrado em falhas">
        {falhas.length === 0 ? (
          <Vazio>Nenhuma falha registrada.</Vazio>
        ) : (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-zinc-500">Material perdido além do consumo (baixou estoque)</dt>
                <dd className="font-semibold text-zinc-100">{formatGramas(desperdicio.adicionalG)}{verCustos && ` · ${formatMoeda(desperdicio.adicionalCusto)}`}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Falhas após a conclusão (já contido no consumo)</dt>
                <dd className="font-semibold text-zinc-100">{formatGramas(desperdicio.jaContidoG)}{verCustos && ` · ${formatMoeda(desperdicio.jaContidoCusto)}`}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Tempo de máquina perdido</dt>
                <dd className="font-semibold text-zinc-100">{formatHoras(desperdicio.horasPerdidas)}{verCustos && <> · {formatMoeda(desperdicio.custoMaquina)} <span className="text-[10px] text-amber-500">estimado</span></>}</dd>
              </div>
            </dl>
            <Aviso>
              O material de uma falha registrada <strong>depois da conclusão</strong> (estoque não baixado de novo) já está
              dentro do consumo do trabalho concluído. Por isso ele aparece separado e <strong>não soma</strong> ao desperdício
              adicional: somar os dois contaria o mesmo material duas vezes.{!verCustos && " Valores em R$ ficam ocultos sem a permissão \"Ver custos das falhas\"."}
            </Aviso>
          </div>
        )}
      </Cartao>

      <Cartao titulo="Por tipo de defeito">
        {porDefeito.length === 0 ? (
          <Vazio>Sem falhas registradas.</Vazio>
        ) : (
          <div className="space-y-1.5">
            {porDefeito.map((d) => (
              <div key={d.tipo} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2 text-sm">
                <span className="text-zinc-200">{TIPO_DEFEITO_ROTULO[d.tipo as keyof typeof TIPO_DEFEITO_ROTULO] ?? d.tipo}</span>
                <span className="text-xs text-zinc-400">{d.falhas} falha(s) · {formatGramas(d.pesoPerdidoG)}</span>
              </div>
            ))}
          </div>
        )}
      </Cartao>

      <Cartao titulo="Por impressora">
        <TabelaIndicador titulo="Impressora" grupos={agruparIndicadores(trabalhos, falhas, "impressora_id")} nome={nomeImpressora} />
      </Cartao>
      <Cartao titulo="Por material">
        <TabelaIndicador titulo="Material" grupos={agruparIndicadores(trabalhos, falhas, "material_id")} nome={nomeMaterial} />
      </Cartao>
      <Cartao titulo="Por produto">
        <TabelaIndicador titulo="Produto" grupos={agruparIndicadores(trabalhos, falhas, "produto_id")} nome={nomeProduto} />
      </Cartao>
    </div>
  );
}

export function QualidadeBoard({
  inspecoes,
  falhas,
  trabalhos,
  taxaEstimadaPct,
  impressoras,
  materiais,
  produtos,
  podeEditar,
  truncado,
  verCustos,
  abas,
}: {
  inspecoes: Inspecao[];
  falhas: Falha[];
  trabalhos: Trabalho[];
  /** undefined = sem acesso a Precificação; null = sem configuração. */
  taxaEstimadaPct: number | null | undefined;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  produtos: Opcoes<OpcaoProduto>;
  podeEditar: boolean;
  truncado: boolean;
  /** Extra "custos" de Qualidade ("Ver custos das falhas"). */
  verCustos: boolean;
  /** Abas visíveis pela preferência de navegação (nunca vazia; ordem do registro). */
  abas: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendente, iniciar] = useTransition();
  const [aba, setAba] = useState<"pendentes" | "historico" | "indicadores">(abaInicial(abas, "pendentes"));
  const [inspecionando, setInspecionando] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);

  const executar = (fn: () => Promise<ResultadoOperacao>, aoOk: () => void) => {
    iniciar(async () => {
      const r = await fn();
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(r.mensagem);
      setAvisos(r.avisos);
      aoOk();
      router.refresh();
    });
  };

  const pendentes = trabalhos.filter((t) => t.status === "concluida" && t.qualidade === "pendente");
  const trabalhoPorId = useMemo(() => new Map(trabalhos.map((t) => [t.id, t])), [trabalhos]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Qualidade</h1>
        <p className="text-sm text-zinc-500">
          {pendentes.length} aguardando inspeção · {falhas.length} falha(s) registrada(s)
        </p>
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}
      {avisos.length > 0 && (
        <div className="mb-4 space-y-2">
          {avisos.map((a, i) => (
            <Aviso key={i} tom="alerta">{a}</Aviso>
          ))}
          <BotaoTexto onClick={() => setAvisos([])}>Dispensar avisos</BotaoTexto>
        </div>
      )}

      <div className="mb-6 inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {([["pendentes", "Para inspecionar"], ["historico", "Histórico"], ["indicadores", "Indicadores"]] as const).filter(([k]) => abas.includes(k)).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${aba === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {aba === "pendentes" && (
        <Cartao titulo="Trabalhos concluídos aguardando inspeção" icone={<ShieldCheck className="h-4 w-4" />}>
          {pendentes.length === 0 ? (
            <Vazio>Nenhum trabalho concluído aguardando inspeção.</Vazio>
          ) : (
            <div className="space-y-2">
              {pendentes.map((t) => (
                <div key={t.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200"><span className="text-zinc-500">#{t.numero}</span> {t.descricao} × {t.quantidade}</p>
                      <p className="text-xs text-zinc-500">
                        {t.concluido_em && `concluído ${formatDataHora(t.concluido_em)}`}
                        {t.peso_real_g !== null && ` · ${formatGramas(t.peso_real_g)}`}
                        {t.horas_reais !== null && ` · ${formatHoras(t.horas_reais)}`}
                      </p>
                    </div>
                    {podeEditar && inspecionando !== t.id && (
                      <BotaoPrimario type="button" onClick={() => setInspecionando(t.id)}>Inspecionar</BotaoPrimario>
                    )}
                  </div>
                  {inspecionando === t.id && (
                    <FormInspecao trabalho={t} pendente={pendente} executar={executar} aoFechar={() => setInspecionando(null)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </Cartao>
      )}

      {aba === "historico" && (
        <div className="space-y-5">
          <Cartao titulo="Inspeções">
            {inspecoes.length === 0 ? (
              <Vazio>Nenhuma inspeção registrada.</Vazio>
            ) : (
              <div className="space-y-2">
                {inspecoes.map((i) => {
                  const t = trabalhoPorId.get(i.producao_id);
                  return (
                    <div key={i.id} className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                        {t ? <><span className="text-zinc-500">#{t.numero}</span> {t.descricao}</> : "Trabalho"}
                        <StatusChip tone={i.resultado === "aprovado" ? "emerald" : i.resultado === "reprovado" ? "rose" : "amber"}>
                          {RESULTADO_INSPECAO_ROTULO[i.resultado]}
                        </StatusChip>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDataHora(i.created_at)}
                        {i.defeitos.length > 0 && ` · ${i.defeitos.map((d) => TIPO_DEFEITO_ROTULO[d as keyof typeof TIPO_DEFEITO_ROTULO] ?? d).join(", ")}`}
                        {i.observacoes && ` · ${i.observacoes}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Cartao>
          <Cartao titulo="Falhas">
            {falhas.length === 0 ? (
              <Vazio>Nenhuma falha registrada.</Vazio>
            ) : (
              <div className="space-y-2">
                {falhas.map((f) => {
                  const t = trabalhoPorId.get(f.producao_id);
                  return (
                    <div key={f.id} className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                        {TIPO_DEFEITO_ROTULO[f.tipo_defeito as keyof typeof TIPO_DEFEITO_ROTULO] ?? f.tipo_defeito}
                        {t && <span className="text-xs text-zinc-500">trabalho #{t.numero}</span>}
                        <StatusChip tone={f.baixou_estoque ? "amber" : "zinc"}>{f.baixou_estoque ? "Baixou estoque" : "Estoque não baixado de novo"}</StatusChip>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDataHora(f.created_at)} · {formatGramas(f.peso_perdido_g)} · {formatHoras(f.horas_perdidas)} {verCustos && ` · material ${formatMoeda(f.custo_material ?? 0)} · máquina ${formatMoeda(f.custo_maquina_estimado ?? 0)} (estimado)`}
                        {f.descricao && ` · ${f.descricao}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Cartao>
        </div>
      )}

      {aba === "indicadores" && (
        <Indicadores
          trabalhos={trabalhos}
          falhas={falhas}
          taxaEstimadaPct={taxaEstimadaPct}
          impressoras={impressoras}
          materiais={materiais}
          produtos={produtos}
          truncado={truncado}
          verCustos={verCustos}
        />
      )}
    </div>
  );
}
