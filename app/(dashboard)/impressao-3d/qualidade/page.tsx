import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getOpcoesImpressoras, getOpcoesMateriais, getOpcoesProdutos } from "@/lib/impressao-3d/opcoes";
import { QualidadeBoard } from "@/components/impressao-3d/qualidade-board";
import { COLUNAS_FALHA, COLUNAS_INSPECAO, COLUNAS_TRABALHO, type Falha, type Inspecao, type Trabalho } from "@/lib/impressao-3d/tipos-operacao";

const LIMITE = 2000;

export default async function QualidadePage() {
  const acesso = await getAcessoModulo("p3d_qualidade");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const ws = acesso.workspaceId;
  const [acessoProducao, acessoPrecificacao] = await Promise.all([
    getAcessoModulo("p3d_producao"),
    getAcessoModulo("p3d_precificacao"),
  ]);

  const [{ data: inspecoes }, { data: falhas }, { data: trabalhos }, { data: config }, impressoras, materiais, produtos] =
    await Promise.all([
      supabase.from("p3d_inspecoes").select(COLUNAS_INSPECAO).eq("workspace_id", ws).order("created_at", { ascending: false }).limit(LIMITE),
      supabase.from("p3d_falhas").select(COLUNAS_FALHA).eq("workspace_id", ws).order("created_at", { ascending: false }).limit(LIMITE),
      // Os trabalhos vêm do módulo Produção: sem acesso a ele, a tela avisa em vez de listar.
      acessoProducao
        ? supabase
            .from("p3d_producao")
            .select(COLUNAS_TRABALHO)
            .eq("workspace_id", ws)
            .in("status", ["concluida", "falhou"])
            .order("numero", { ascending: false })
            .limit(LIMITE)
        : Promise.resolve({ data: null }),
      acessoPrecificacao
        ? supabase.from("p3d_config_precificacao").select("falha_pct").eq("workspace_id", ws).maybeSingle()
        : Promise.resolve({ data: null }),
      getOpcoesImpressoras(),
      getOpcoesMateriais(),
      getOpcoesProdutos(),
    ]);

  return (
    <QualidadeBoard
      inspecoes={(inspecoes ?? []) as unknown as Inspecao[]}
      falhas={(falhas ?? []) as unknown as Falha[]}
      trabalhos={acessoProducao ? ((trabalhos ?? []) as unknown as Trabalho[]) : null}
      taxaEstimadaPct={acessoPrecificacao ? ((config as { falha_pct: number } | null)?.falha_pct ?? null) : undefined}
      impressoras={impressoras}
      materiais={materiais}
      produtos={produtos}
      podeEditar={acesso.nivel === "edicao"}
      truncado={(falhas ?? []).length >= LIMITE || (trabalhos ?? []).length >= LIMITE}
    />
  );
}
