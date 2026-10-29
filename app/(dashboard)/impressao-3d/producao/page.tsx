import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getOpcoesMateriais, getOpcoesPedidos, getOpcoesProdutos } from "@/lib/impressao-3d/opcoes";
import { ProducaoBoard, type ImpressoraProducao } from "@/components/impressao-3d/producao-board";
import { COLUNAS_TRABALHO, type Trabalho } from "@/lib/impressao-3d/tipos-operacao";
import { todayISO } from "@/lib/vencimentos/dates";

const LIMITE_TRABALHOS = 2000;

export default async function ProducaoPage() {
  const acesso = await getAcessoModulo("p3d_producao");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const ws = acesso.workspaceId;
  const acessoImpressoras = await getAcessoModulo("p3d_impressoras");

  const [{ data: trabalhos }, { data: impressoras }, materiais, produtos, pedidos] = await Promise.all([
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
  ]);

  return (
    <ProducaoBoard
      trabalhos={(trabalhos ?? []) as unknown as Trabalho[]}
      truncado={(trabalhos ?? []).length >= LIMITE_TRABALHOS}
      impressoras={acessoImpressoras ? ((impressoras ?? []) as unknown as ImpressoraProducao[]) : null}
      materiais={materiais}
      produtos={produtos}
      pedidos={pedidos}
      podeEditar={acesso.nivel === "edicao"}
      hoje={todayISO()}
    />
  );
}
