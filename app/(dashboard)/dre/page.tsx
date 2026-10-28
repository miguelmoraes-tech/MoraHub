import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo, getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { DreView } from "@/components/dre-view";
import type { Comprovante, Gasto } from "@/lib/types";

export default async function DrePage() {
  const donoId = await getDonoIdAtivo();
  const workspaceId = await getWorkspaceIdAtivo();
  const supabase = await createClient();

  const [{ data: gastos }, { data: comprovantes }] = donoId && workspaceId
    ? await Promise.all([
        supabase.from("gastos").select("*").eq("user_id", donoId),
        supabase.from("comprovantes").select("*").eq("workspace_id", workspaceId),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <DreView
      gastos={((gastos ?? []) as Gasto[]).map((g) => ({ ...g, donoId: g.user_id }))}
      comprovantes={((comprovantes ?? []) as Comprovante[]).map((c) => ({
        ...c,
        donoId: c.user_id,
      }))}
      exportBasePath="/api/export/dre"
    />
  );
}
