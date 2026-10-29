import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro } from "@/lib/financeiro/acesso";
import { DreView } from "@/components/dre-view";
import { SemAcessoAviso, SemValoresAviso } from "@/components/financeiro/sem-valores";
import type { Comprovante, Gasto } from "@/lib/types";

export default async function DrePage() {
  const fin = await getAcessoFinanceiro();
  if (!fin) return <SemAcessoAviso titulo="DRE" />;
  // A tela é só receita, despesas e resultado.
  if (!fin.valores) return <SemValoresAviso titulo="DRE" />;
  const supabase = await createClient();

  const [{ data: gastos }, { data: comprovantes }] = await Promise.all([
    supabase.from("gastos").select("*").eq("workspace_id", fin.workspaceId),
    supabase.from("comprovantes").select("*").eq("workspace_id", fin.workspaceId),
  ]);

  return (
    <DreView
      gastos={(gastos ?? []) as Gasto[]}
      comprovantes={(comprovantes ?? []) as Comprovante[]}
      exportBasePath="/api/export/dre"
    />
  );
}
