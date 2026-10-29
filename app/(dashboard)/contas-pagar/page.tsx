import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro } from "@/lib/financeiro/acesso";
import { ContasPagarBoard } from "@/components/contas-pagar-board";
import type { ContaPagar } from "@/lib/types";

export default async function ContasPagarPage() {
  const fin = await getAcessoFinanceiro();
  const supabase = await createClient();

  const { data: contas } = fin
    ? ((await supabase
        .from("contas_pagar")
        .select("*")
        .eq("workspace_id", fin.workspaceId)
        .order("data_vencimento", { ascending: true })) as {
        data: ContaPagar[] | null;
      })
    : { data: [] as ContaPagar[] };

  return (
    <ContasPagarBoard
      // Sem "valores" o valor nem vai para a tela (só interface; não é barreira).
      contas={(contas ?? []).map((c) => (fin?.valores ? c : { ...c, valor: 0 }))}
      somenteLeitura={!fin || fin.somenteLeitura}
      semValores={!fin?.valores}
    />
  );
}
