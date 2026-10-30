import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { getOpcoesMateriais, getOpcoesPedidos, getOpcoesProdutos } from "@/lib/impressao-3d/opcoes";
import { ProducaoBoard, type ImpressoraProducao } from "@/components/impressao-3d/producao-board";
import { COLUNAS_TRABALHO, type MaterialDoTrabalho, type Trabalho } from "@/lib/impressao-3d/tipos-operacao";
import { hojeSaoPaulo } from "@/lib/impressao-3d/datas";

const LIMITE_TRABALHOS = 2000;

export default async function ProducaoPage() {
  const acesso = await getAcessoModulo("p3d_producao");
  if (!acesso) redirect(HOME_DONO);
  const abas = await getAbasVisiveis("p3d_producao");
  const supabase = await createClient();
  const ws = acesso.workspaceId;
  const acessoImpressoras = await getAcessoModulo("p3d_impressoras");

  const [{ data: trabalhos }, { data: impressoras }, materiais, produtos, pedidos, { data: linhasMaterial }] = await Promise.all([
    supabase
      .from("p3d_producao")
      .select(COLUNAS_TRABALHO)
      .eq("workspace_id", ws)
      .order("numero", { ascending: false })
      .limit(LIMITE_TRABALHOS),
    acessoImpressoras
      ? supabase
          .from("p3d_impressoras")
          .select("id, nome, status, ativo, horas_uso")
          .eq("workspace_id", ws)
          .order("nome", { ascending: true })
      : Promise.resolve({ data: null }),
    getOpcoesMateriais(),
    getOpcoesProdutos(),
    getOpcoesPedidos(),
    supabase
      .from("p3d_producao_materiais")
      .select("producao_id, material_id, peso_estimado_g, peso_real_g")
      .eq("workspace_id", ws),
  ]);

  return (
    <ProducaoBoard
      abas={abas}
      trabalhos={(trabalhos ?? []) as unknown as Trabalho[]}
      truncado={(trabalhos ?? []).length >= LIMITE_TRABALHOS}
      impressoras={acessoImpressoras ? ((impressoras ?? []) as unknown as ImpressoraProducao[]) : null}
      materiais={materiais}
      linhasMaterial={(linhasMaterial ?? []) as MaterialDoTrabalho[]}
      produtos={produtos}
      pedidos={pedidos}
      podeEditar={acesso.nivel === "edicao"}
      hoje={hojeSaoPaulo()}
    />
  );
}
