import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import { AtividadeVendedoresBoard } from "@/components/atividade/atividade-vendedores-board";
import { parseDias } from "@/lib/atividade-shared";
import type { AtividadeVendedorRow } from "@/lib/types";

export default async function AtividadeVendedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string | string[] }>;
}) {
  const dias = parseDias((await searchParams).dias);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = await getWorkspaceIdPadrao(user.id, "empresarial");
  if (!workspaceId) redirect("/dashboard");

  const { data, error } = (await supabase.rpc("relatorio_atividade_vendedores", {
    p_workspace_id: workspaceId,
    p_dias: dias,
  })) as { data: AtividadeVendedorRow[] | null; error: { message: string } | null };

  return (
    <AtividadeVendedoresBoard
      rows={data ?? []}
      dias={dias}
      workspaceId={workspaceId}
      erro={error ? "Não foi possível carregar o relatório." : null}
    />
  );
}
