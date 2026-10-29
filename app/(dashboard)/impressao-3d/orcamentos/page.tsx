import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { HOME_DONO } from "@/lib/modulos/registry";
import { podeVerCustos } from "@/lib/impressao-3d/regras";
import { getOpcoesClientes } from "@/lib/impressao-3d/opcoes";
import { OrcamentosBoard } from "@/components/impressao-3d/orcamentos-board";
import type { Orcamento } from "@/lib/impressao-3d/tipos";

const COLUNAS =
  "id, numero, cliente_id, titulo, status, validade, desconto_valor, subtotal, total, observacoes, enviado_em, aprovado_em, created_at";

export default async function OrcamentosPage() {
  const acesso = await getAcessoModulo("p3d_orcamentos");
  if (!acesso) redirect(HOME_DONO);
  const verCustos = podeVerCustos(acesso);

  const [{ data }, clientes] = await Promise.all([
    (await createClient())
      .from("p3d_orcamentos")
      .select(verCustos ? `${COLUNAS}, custo_total, lucro_total` : COLUNAS)
      .eq("workspace_id", acesso.workspaceId)
      .order("numero", { ascending: false }),
    getOpcoesClientes(),
  ]);

  const orcamentos = ((data ?? []) as unknown as Partial<Orcamento>[]).map((o) => ({
    custo_total: 0,
    lucro_total: 0,
    ...o,
  })) as Orcamento[];

  return (
    <OrcamentosBoard
      orcamentos={orcamentos}
      clientes={clientes}
      podeEditar={acesso.nivel === "edicao"}
      verCustos={verCustos}
    />
  );
}
