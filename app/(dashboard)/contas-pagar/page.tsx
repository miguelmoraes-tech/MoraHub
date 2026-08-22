import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId, getEffectiveWorkspaceId } from "@/lib/financeiro";
import { ContasPagarBoard } from "@/components/contas-pagar-board";
import type { ContaPagar } from "@/lib/types";

export default async function ContasPagarPage() {
  const donoId = await getEffectiveDonoId();
  const workspaceId = await getEffectiveWorkspaceId();
  const supabase = await createClient();

  const { data: contas } = donoId
    ? ((await supabase
        .from("contas_pagar")
        .select("*")
        .eq("workspace_id", workspaceId ?? "")
        .order("data_vencimento", { ascending: true })) as {
        data: ContaPagar[] | null;
      })
    : { data: [] as ContaPagar[] };

  return <ContasPagarBoard contas={contas ?? []} />;
}
