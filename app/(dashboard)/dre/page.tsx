import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { DreView } from "@/components/dre-view";
import type { Comprovante, Gasto } from "@/lib/types";

export default async function DrePage() {
  const donoId = await getEffectiveDonoId();
  const supabase = await createClient();

  const [{ data: gastos }, { data: comprovantes }] = donoId
    ? await Promise.all([
        supabase.from("gastos").select("*").eq("user_id", donoId),
        supabase.from("comprovantes").select("*").eq("user_id", donoId),
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
