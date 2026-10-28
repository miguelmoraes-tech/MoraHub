import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { ContasPagarBoard } from "@/components/contas-pagar-board";
import type { ContaPagar } from "@/lib/types";

export default async function ContasPagarPage() {
  const donoId = await getDonoIdAtivo();
  const supabase = await createClient();

  const { data: contas } = donoId
    ? ((await supabase
        .from("contas_pagar")
        .select("*")
        .eq("user_id", donoId)
        .order("data_vencimento", { ascending: true })) as {
        data: ContaPagar[] | null;
      })
    : { data: [] as ContaPagar[] };

  return <ContasPagarBoard contas={contas ?? []} />;
}
