import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { getOpcoesMateriais } from "@/lib/impressao-3d/opcoes";
import { FornecedoresBoard } from "@/components/impressao-3d/fornecedores-board";
import {
  COLUNAS_COMPRA, COLUNAS_FORNECEDOR, COLUNAS_HISTORICO_PRECOS,
  type Compra, type Fornecedor, type HistoricoPreco,
} from "@/lib/impressao-3d/tipos-operacao";

const LIMITE_HISTORICO = 3000;

export default async function FornecedoresPage() {
  const acesso = await getAcessoModulo("p3d_fornecedores");
  if (!acesso) redirect(HOME_DONO);
  const abas = await getAbasVisiveis("p3d_fornecedores");
  const supabase = await createClient();
  const ws = acesso.workspaceId;

  const [{ data: fornecedores }, { data: compras }, { data: historico }, materiais] = await Promise.all([
    supabase.from("p3d_fornecedores").select(COLUNAS_FORNECEDOR).eq("workspace_id", ws).order("nome", { ascending: true }),
    supabase.from("p3d_compras").select(COLUNAS_COMPRA).eq("workspace_id", ws).order("numero", { ascending: false }),
    supabase
      .from("p3d_historico_precos")
      .select(COLUNAS_HISTORICO_PRECOS)
      .eq("workspace_id", ws)
      .order("data", { ascending: false })
      .limit(LIMITE_HISTORICO),
    getOpcoesMateriais(),
  ]);

  return (
    <FornecedoresBoard
      abas={abas}
      fornecedores={(fornecedores ?? []) as unknown as Fornecedor[]}
      compras={(compras ?? []) as unknown as Compra[]}
      historico={(historico ?? []) as unknown as HistoricoPreco[]}
      materiais={materiais}
      podeEditar={acesso.nivel === "edicao"}
    />
  );
}
