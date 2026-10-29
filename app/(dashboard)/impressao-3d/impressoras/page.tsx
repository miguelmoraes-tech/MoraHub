import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { ImpressorasBoard, type TrabalhoAtual } from "@/components/impressao-3d/impressoras-board";
import {
  COLUNAS_IMPRESSORA,
  type Impressora,
  type Manutencao,
  type PecaDesgaste,
} from "@/lib/impressao-3d/tipos";

export default async function ImpressorasPage() {
  const acesso = await getAcessoModulo("p3d_impressoras");
  if (!acesso) redirect(HOME_DONO);
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const [{ data: impressoras }, { data: pecas }, { data: manutencoes }] = await Promise.all([
    supabase
      .from("p3d_impressoras")
      .select(COLUNAS_IMPRESSORA)
      .eq("workspace_id", ws)
      .order("nome", { ascending: true }),
    supabase
      .from("p3d_pecas_desgaste")
      .select("id, impressora_id, nome, categoria, custo, vida_util_horas, horas_ultima_troca")
      .eq("workspace_id", ws)
      .order("nome", { ascending: true }),
    supabase
      .from("p3d_manutencoes")
      .select("id, impressora_id, tipo, descricao, custo, data, horas_uso_no_momento")
      .eq("workspace_id", ws)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  // Trabalho atual de cada impressora ocupada: só para quem também tem acesso a Produção.
  const trabalhosAtuais: Record<string, TrabalhoAtual> = {};
  if (await getAcessoModulo("p3d_producao")) {
    const { data: imprimindo } = await supabase
      .from("p3d_producao")
      .select("impressora_id, numero, descricao")
      .eq("workspace_id", ws)
      .eq("status", "imprimindo");
    for (const t of (imprimindo ?? []) as { impressora_id: string | null; numero: number; descricao: string }[]) {
      if (t.impressora_id) trabalhosAtuais[t.impressora_id] = { numero: t.numero, descricao: t.descricao };
    }
  }

  return (
    <ImpressorasBoard
      impressoras={(impressoras ?? []) as unknown as Impressora[]}
      pecas={(pecas ?? []) as unknown as PecaDesgaste[]}
      manutencoes={(manutencoes ?? []) as unknown as Manutencao[]}
      podeEditar={acesso.nivel === "edicao"}
      trabalhosAtuais={trabalhosAtuais}
    />
  );
}
