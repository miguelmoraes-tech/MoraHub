import { createClient } from "@/lib/supabase/server";
import { getEffectiveWorkspaceIdGeral } from "@/lib/dono-efetivo";
import { AssinantesBoard } from "@/components/assinantes-board";
import type { Assinatura, Cliente } from "@/lib/types";

export default async function AssinantesPage() {
  const supabase = await createClient();
  const workspaceId = await getEffectiveWorkspaceIdGeral();

  const [{ data: assinaturas }, { data: clientes }] = (await Promise.all([
    supabase
      .from("assinaturas")
      .select("*")
      .eq("workspace_id", workspaceId ?? "")
      .order("plano", { ascending: true }),
    supabase.from("clientes").select("*").eq("workspace_id", workspaceId ?? "").order("nome"),
  ])) as [{ data: Assinatura[] | null }, { data: Cliente[] | null }];

  return (
    <AssinantesBoard assinaturas={assinaturas ?? []} clientes={clientes ?? []} />
  );
}
