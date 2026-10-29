"use client";

import { useActionState, useState } from "react";
import { Calculator } from "lucide-react";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import {
  Aviso, BotaoPrimario, Cartao, ErroForm, Numero, Seletor, SomenteLeitura,
} from "@/components/impressao-3d/campos";
import { Simulador, type RascunhoOpcao } from "@/components/impressao-3d/simulador";
import { CalculadoraRapida } from "@/components/impressao-3d/calculadora-rapida";
import { salvarConfigPrecificacao } from "@/app/(dashboard)/impressao-3d/precificacao/actions";
import { FAIXA_DESPERDICIO, FAIXA_FALHAS } from "@/lib/impressao-3d/validacao";
import type { OpcaoImpressora, OpcaoMaterial, OpcaoMaterialCusto, Opcoes } from "@/lib/impressao-3d/opcoes";
import type { ConfigPrecificacao } from "@/lib/impressao-3d/tipos";
import { abaInicial } from "@/lib/modulos/preferencias";

function foraDaFaixa(valor: string, faixa: { min: number; max: number }): boolean {
  if (valor.trim() === "") return false;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) && (n < faixa.min || n > faixa.max);
}

function ConfigForm({
  config,
  configSalva,
  podeEditar,
}: {
  config: ConfigPrecificacao;
  configSalva: boolean;
  podeEditar: boolean;
}) {
  const [state, formAction, pendente] = useActionState(salvarConfigPrecificacao, undefined);
  useActionToast(state, { success: "Configurações salvas." });
  const [desperdicio, setDesperdicio] = useState(String(config.desperdicio_pct));
  const [falhas, setFalhas] = useState(String(config.falha_pct));
  const [modo, setModo] = useState(config.modo_preco);
  const desab = !podeEditar;

  return (
    <form action={formAction} className="space-y-5">
      {!configSalva && (
        <Aviso tom="alerta">
          A configuração desta empresa ainda não foi criada. Os valores abaixo são os padrões; salve para criá-la.
        </Aviso>
      )}
      <fieldset disabled={desab} className="space-y-5 disabled:opacity-80">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Custos base</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero rotulo="Tarifa de energia (R$/kWh)" name="tarifa_kwh" defaultValue={config.tarifa_kwh} ajuda="Está na sua conta de luz. Usada com a potência de cada impressora." />
            <Numero rotulo="Hora de mão de obra (R$)" name="valor_hora_mao_obra" defaultValue={config.valor_hora_mao_obra} ajuda="Quanto vale uma hora do seu trabalho (acabamento, montagem...)." />
            <Seletor rotulo="Custo do material" name="base_custo_material" defaultValue={config.base_custo_material} ajuda="Cadastro = preço do rolo ÷ peso. Médio = custo médio das entradas.">
              <option value="cadastro">Custo de cadastro</option>
              <option value="medio">Custo médio do estoque</option>
            </Seletor>
            <Numero rotulo="Despesas fixas (%)" name="despesas_fixas_pct" defaultValue={config.despesas_fixas_pct} ajuda="Rateio de aluguel, internet etc. como % do custo." />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Desperdício e falhas</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Numero
                rotulo="Margem de desperdício (%)"
                name="desperdicio_pct"
                max="50"
                value={desperdicio}
                onChange={(e) => setDesperdicio(e.target.value)}
                ajuda="Perdas de material (purga, trocas de filamento, material que sobra). Faixa usual: 5–15%."
              />
              {foraDaFaixa(desperdicio, FAIXA_DESPERDICIO) && (
                <p className="text-[11px] text-amber-400">Fora da faixa usual de 5% a 15%. Confira se está correto.</p>
              )}
            </div>
            <div className="space-y-1">
              <Numero
                rotulo="Taxa de falhas (%)"
                name="falha_pct"
                max="50"
                value={falhas}
                onChange={(e) => setFalhas(e.target.value)}
                ajuda="Impressões que falham e precisam ser refeitas. Faixa usual: 5–10%."
              />
              {foraDaFaixa(falhas, FAIXA_FALHAS) && (
                <p className="text-[11px] text-amber-400">Fora da faixa usual de 5% a 10%. Confira se está correto.</p>
              )}
            </div>
            <Numero rotulo="Fração perdida na falha (0–1)" name="falha_fracao_perdida" max="1" defaultValue={config.falha_fracao_perdida} ajuda="1 = perde a impressão inteira; 0,5 = perde metade." />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Preço de venda</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Seletor rotulo="Modo de preço" name="modo_preco" value={modo} onChange={(e) => setModo(e.target.value as ConfigPrecificacao["modo_preco"])} ajuda="Margem = lucro ÷ preço. Markup = lucro ÷ custo.">
              <option value="margem">Margem</option>
              <option value="markup">Markup</option>
            </Seletor>
            <Numero rotulo="Margem (%)" name="margem_pct" max="99.99" defaultValue={config.margem_pct} ajuda="Menor que 100%." />
            <Numero rotulo="Markup (%)" name="markup_pct" defaultValue={config.markup_pct} />
            <Numero rotulo="Preço mínimo (R$)" name="preco_minimo" defaultValue={config.preco_minimo} ajuda="Nenhum lote fica abaixo disto." />
            <Numero rotulo="Arredondar para (R$)" name="arredondar_para" defaultValue={config.arredondar_para} ajuda="Ex.: 0,50 arredonda de 50 em 50 centavos. 0 = sem arredondamento." />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Impostos e taxas (sobre o preço)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero rotulo="Impostos (%)" name="impostos_pct" max="100" defaultValue={config.impostos_pct} />
            <Numero rotulo="Taxa de pagamento (%)" name="taxa_pagamento_pct" max="100" defaultValue={config.taxa_pagamento_pct} />
            <Numero rotulo="Comissão (%)" name="comissao_pct" max="100" defaultValue={config.comissao_pct} />
            <Numero rotulo="Taxa fixa por venda (R$)" name="taxa_fixa_pagamento" defaultValue={config.taxa_fixa_pagamento} />
          </div>
        </div>
      </fieldset>

      <ErroForm state={state} />
      {podeEditar ? (
        <div className="flex justify-end">
          <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar configurações"}</BotaoPrimario>
        </div>
      ) : (
        <SomenteLeitura />
      )}
    </form>
  );
}

export function PrecificacaoBoard({
  config,
  configSalva,
  impressoras,
  materiais,
  materiaisComCusto,
  podeEditar,
  usarEmOrcamento,
  abas,
}: {
  config: ConfigPrecificacao;
  configSalva: boolean;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  materiaisComCusto: Opcoes<OpcaoMaterialCusto>;
  podeEditar: boolean;
  usarEmOrcamento: { podeUsar: boolean; rascunhos: RascunhoOpcao[] };
  /** Abas visíveis pela preferência de navegação (nunca vazia; ordem do registro). */
  abas: string[];
}) {
  const [aba, setAba] = useState<"calculadora" | "simulador" | "config">(abaInicial(abas, "calculadora"));
  // O modo avançado (simulador completo e configurações) fica atrás de um botão; nada foi removido.
  const [avancado, setAvancado] = useState(aba !== "calculadora");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Calculadora de preço</h1>
          <p className="text-sm text-zinc-500">
            {avancado
              ? "Modo avançado: simulador completo e regras da empresa. Todos os valores são estimados."
              : "Veja o custo por peça e o preço sugerido. Todos os valores são estimados."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAvancado((v) => !v);
            setAba(avancado ? "calculadora" : abas.includes("simulador") ? "simulador" : "config");
          }}
          className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-900"
        >
          {avancado ? "Voltar à calculadora rápida" : "Modo avançado"}
        </button>
      </div>

      {avancado && (
        <div className="mb-6 inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {([["simulador", "Simulador"], ["config", "Configurações da empresa"]] as const).filter(([k]) => abas.includes(k)).map(([k, l]) => (
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
      )}

      {!avancado ? (
        <Cartao titulo="Calculadora rápida" icone={<Calculator className="h-4 w-4" />}>
          <CalculadoraRapida
            impressoras={impressoras}
            materiais={materiaisComCusto}
            config={config}
            podeEditar={podeEditar}
            usarEmOrcamento={usarEmOrcamento}
          />
        </Cartao>
      ) : aba === "simulador" ? (
        <Cartao titulo="Simulador de preço" icone={<Calculator className="h-4 w-4" />}>
          <Simulador
            impressoras={impressoras}
            materiais={materiais}
            config={config}
            verCustos
            contexto="precificacao"
            usarEmOrcamento={usarEmOrcamento}
          />
        </Cartao>
      ) : (
        <Cartao titulo="Configurações da empresa">
          <ConfigForm config={config} configSalva={configSalva} podeEditar={podeEditar} />
        </Cartao>
      )}
    </div>
  );
}
