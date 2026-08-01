import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForMarketing } from "@/lib/marketing";
import { getResponsaveisMarketing } from "@/lib/marketing/get-responsaveis";
import { CalendarioConteudoBoard } from "@/components/marketing/calendario-conteudo-board";
import type { CalendarioConteudo } from "@/lib/types";

export default async function MarketingCalendarioPage() {
  const donoId = await getEffectiveDonoIdForMarketing();
  const supabase = await createClient();

  const [{ data: itens }, responsaveis] = donoId
    ? ((await Promise.all([
        supabase
          .from("calendario_conteudo")
          .select("*")
          .eq("user_id", donoId)
          .order("data_publicacao", { ascending: true, nullsFirst: false }),
        getResponsaveisMarketing(donoId),
      ])) as [{ data: CalendarioConteudo[] | null }, Awaited<ReturnType<typeof getResponsaveisMarketing>>])
    : [{ data: [] as CalendarioConteudo[] }, []];

  return <CalendarioConteudoBoard itens={itens ?? []} responsaveis={responsaveis} />;
}
