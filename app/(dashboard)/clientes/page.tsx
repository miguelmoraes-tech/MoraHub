import { createClient } from "@/lib/supabase/server";
import { getEffectiveWorkspaceIdGeral } from "@/lib/dono-efetivo";
import { ClientesBoard } from "@/components/clientes-board";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const workspaceId = await getEffectiveWorkspaceIdGeral();
  const { data: clientes } = (await supabase
    .from("clientes")
    .select("*")
    .eq("workspace_id", workspaceId ?? "")
    .order("nome")) as { data: Cliente[] | null };

  return <ClientesBoard clientes={clientes ?? []} />;
}
