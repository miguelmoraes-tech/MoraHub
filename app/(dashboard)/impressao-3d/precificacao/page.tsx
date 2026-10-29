import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { CONFIG_PADRAO } from "@/lib/impressao-3d/regras";
import { getOpcoesImpressoras, getOpcoesMateriais, getOpcoesMateriaisComCusto } from "@/lib/impressao-3d/opcoes";
import { PrecificacaoBoard } from "@/components/impressao-3d/precificacao-board";
import type { ConfigPrecificacao } from "@/lib/impressao-3d/tipos";

const COLUNAS_CONFIG =
  "tarifa_kwh, valor_hora_mao_obra, desperdicio_pct, falha_pct, falha_fracao_perdida, modo_preco, margem_pct, markup_pct, impostos_pct, taxa_pagamento_pct, comissao_pct, taxa_fixa_pagamento, despesas_fixas_pct, arredondar_para, preco_minimo, base_custo_material";

export default async function PrecificacaoPage() {
  const acesso = await getAcessoModulo("p3d_precificacao");
  if (!acesso) redirect(HOME_DONO);
  const abas = await getAbasVisiveis("p3d_precificacao");
  const supabase = await createClient();
  const ws = acesso.workspaceId;
  const podeEditar = acesso.nivel === "edicao";

  const lerConfig = () =>
    supabase.from("p3d_config_precificacao").select(COLUNAS_CONFIG).eq("workspace_id", ws).maybeSingle();

  let { data: config } = await lerConfig();
  // Linha inicial da empresa: criada pelo banco (p3d_garantir_config), só por quem edita.
  if (!config && podeEditar) {
    await supabase.rpc("p3d_garantir_config", { p_ws: ws });
    ({ data: config } = await lerConfig());
  }

  const [impressoras, materiais, materiaisComCusto, acessoOrcamentos] = await Promise.all([
    getOpcoesImpressoras(),
    getOpcoesMateriais(),
    getOpcoesMateriaisComCusto(config?.base_custo_material === "medio" ? "medio" : "cadastro"),
    getAcessoModulo("p3d_orcamentos", "edicao"),
  ]);

  let rascunhos: { id: string; numero: number; titulo: string }[] = [];
  if (acessoOrcamentos) {
    const { data } = await supabase
      .from("p3d_orcamentos")
      .select("id, numero, titulo")
      .eq("workspace_id", ws)
      .eq("status", "rascunho")
      .order("numero", { ascending: false });
    rascunhos = (data ?? []) as typeof rascunhos;
  }

  return (
    <PrecificacaoBoard
      abas={abas}
      config={(config as unknown as ConfigPrecificacao | null) ?? CONFIG_PADRAO}
      configSalva={!!config}
      impressoras={impressoras}
      materiais={materiais}
      materiaisComCusto={materiaisComCusto}
      podeEditar={podeEditar}
      usarEmOrcamento={{ podeUsar: !!acessoOrcamentos, rascunhos }}
    />
  );
}
