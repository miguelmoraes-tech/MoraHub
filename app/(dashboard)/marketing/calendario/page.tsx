import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { getResponsaveisMarketing } from "@/lib/marketing/get-responsaveis";
import { CalendarioConteudoBoard } from "@/components/marketing/calendario-conteudo-board";
import type { CalendarioConteudo } from "@/lib/types";

export default async function MarketingCalendarioPage() {
  const acesso = await getAcessoModulo("marketing");
  const supabase = await createClient();

  const [{ data: itens }, responsaveis] = acesso
    ? ((await Promise.all([
        supabase
          .from("calendario_conteudo")
          .select("*")
          .eq("workspace_id", acesso.workspaceId)
          .order("data_publicacao", { ascending: true, nullsFirst: false }),
        getResponsaveisMarketing(acesso.workspaceId),
      ])) as [{ data: CalendarioConteudo[] | null }, Awaited<ReturnType<typeof getResponsaveisMarketing>>])
    : [{ data: [] as CalendarioConteudo[] }, []];

  return (
    <CalendarioConteudoBoard
      itens={itens ?? []}
      responsaveis={responsaveis}
      somenteLeitura={acesso?.nivel !== "edicao"}
    />
  );
}
