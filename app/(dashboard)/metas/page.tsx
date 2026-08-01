import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdGeral } from "@/lib/dono-efetivo";
import { getColaboradoresParaResponsavel } from "@/lib/tickets";
import { MetasBoard } from "@/components/metas/metas-board";
import type { MetaOkr } from "@/lib/types";

export default async function MetasPage() {
  const donoId = await getEffectiveDonoIdGeral();
  const supabase = await createClient();

  const [{ data: itens }, responsaveis] = donoId
    ? ((await Promise.all([
        supabase.from("metas_okr").select("*").eq("user_id", donoId).order("created_at"),
        getColaboradoresParaResponsavel([donoId]),
      ])) as [{ data: MetaOkr[] | null }, Awaited<ReturnType<typeof getColaboradoresParaResponsavel>>])
    : [{ data: [] as MetaOkr[] }, []];

  return <MetasBoard itens={itens ?? []} responsaveis={responsaveis} />;
}
