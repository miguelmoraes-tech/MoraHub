"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Aviso, Rotulado } from "@/components/impressao-3d/campos";
import { COMPOSICAO_ROTULO, type CalculoPreco } from "@/lib/impressao-3d/calculo";
import {
  formatGramas, formatMoeda, formatNumero, formatPercentualFracao,
} from "@/lib/impressao-3d/numeros";

/** Ajuda curta das fórmulas (a mesma regra vale no servidor). */
export function AjudaFormulas() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
      >
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" /> Como o preço é calculado
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <ul className="list-disc space-y-1 px-8 pb-3 text-[11px] leading-relaxed text-zinc-500">
          <li><strong className="text-zinc-400">Margem</strong> = lucro ÷ preço de venda. <strong className="text-zinc-400">Markup</strong> = lucro ÷ custo.</li>
          <li>Impostos, taxa de pagamento e comissão incidem sobre o <strong className="text-zinc-400">preço</strong> de venda, não sobre o custo.</li>
          <li><strong className="text-zinc-400">Falhas</strong> = taxa ÷ (1 − taxa) × custo de uma tentativa. Isso já cobre a reimpressão; a margem de desperdício não entra de novo.</li>
          <li>A <strong className="text-zinc-400">purga</strong> do fatiador não recebe margem de desperdício.</li>
          <li>Pesos e horas informados valem para o <strong className="text-zinc-400">lote inteiro</strong> (todas as unidades).</li>
          <li>Todos os valores são <strong className="text-zinc-400">estimados</strong>: não são custos reais de produção.</li>
        </ul>
      )}
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

/**
 * Composição completa do cálculo (simulação ou snapshot de item). Sem o extra
 * "custos" (`verCustos = false`) só aparecem os preços; a resposta já chega sem
 * custo do servidor, isto só evita seções vazias.
 */
export function ComposicaoCalculo({
  calculo,
  verCustos,
  quantidade,
}: {
  calculo: CalculoPreco;
  verCustos: boolean;
  quantidade?: number;
}) {
  const c = calculo;
  const d = c.detalhes;
  const somaCustos = c.custo_total || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rotulado>Estimado</Rotulado>
          {c.versao_formula != null && <span className="text-[11px] text-zinc-600">fórmula v{c.versao_formula}</span>}
        </div>
        {quantidade != null && <span className="text-xs text-zinc-500">Lote de {quantidade} un.</span>}
      </div>

      {c.avisos.length > 0 && (
        <div className="space-y-1.5">
          {c.avisos.map((a, i) => (
            <Aviso key={i} tom="alerta">{a}</Aviso>
          ))}
        </div>
      )}

      {verCustos && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Composição do custo</p>
          {COMPOSICAO_ROTULO.map(({ chave, rotulo }) => {
            const v = c.custos[chave];
            if (!(v > 0)) return null;
            return (
              <Linha
                key={chave}
                rotulo={rotulo}
                valor={formatMoeda(v)}
                sub={`${formatNumero((v / somaCustos) * 100, 1)}%`}
              />
            );
          })}
          <div className="mt-1 border-t border-zinc-800 pt-1">
            <Linha rotulo="Custo total" valor={formatMoeda(c.custo_total)} destaque />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Preço</p>
        {verCustos && (
          <>
            <Linha rotulo="Impostos" valor={formatMoeda(c.impostos_valor)} sub="sobre o preço" />
            <Linha rotulo="Taxas de pagamento e comissão" valor={formatMoeda(c.taxas_valor)} sub="sobre o preço" />
          </>
        )}
        <Linha rotulo="Preço recomendado" valor={formatMoeda(c.preco_recomendado)} />
        <Linha rotulo="Preço final" valor={formatMoeda(c.preco_final)} destaque />
        {verCustos && (
          <>
            <Linha rotulo="Lucro" valor={formatMoeda(c.lucro)} />
            <Linha rotulo="Margem real" valor={formatPercentualFracao(c.margem_real)} sub="lucro ÷ preço" />
            <Linha rotulo="Markup real" valor={formatPercentualFracao(c.markup_real)} sub="lucro ÷ custo" />
          </>
        )}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Por unidade</p>
        {verCustos && <Linha rotulo="Custo" valor={formatMoeda(c.por_unidade.custo)} />}
        <Linha rotulo="Preço" valor={formatMoeda(c.por_unidade.preco)} destaque />
        {verCustos && <Linha rotulo="Lucro" valor={formatMoeda(c.por_unidade.lucro)} />}
      </div>

      {verCustos && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Detalhes</p>
          <Linha rotulo="Peso total do fatiador" valor={formatGramas(d.material.peso_total_g)} />
          <Linha rotulo="Margem de desperdício" valor={formatGramas(d.material.desperdicio_g)} />
          <Linha rotulo="Consumo de material" valor={formatGramas(d.material.peso_consumo_g)} />
          <Linha rotulo="Preço do material" valor={`${formatMoeda(d.material.preco_por_g, 4)}/g`} />
          <Linha rotulo="Energia" valor={`${formatNumero(d.energia.kwh, 3)} kWh`} sub={`${formatNumero(d.energia.potencia_kw, 3)} kW × ${formatMoeda(d.energia.tarifa_kwh, 4)}/kWh`} />
          <Linha rotulo="Depreciação" valor={`${formatMoeda(d.depreciacao_por_hora, 4)}/h`} />
          <Linha rotulo="Tentativas esperadas (falhas)" valor={formatNumero(d.falha.tentativas_esperadas, 3)} />
          <Linha rotulo="Custo de uma tentativa" valor={formatMoeda(d.falha.custo_de_uma_tentativa)} />
        </div>
      )}
    </div>
  );
}
