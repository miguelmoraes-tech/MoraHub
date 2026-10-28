import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { ClientesBoard } from "@/components/clientes-board";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceIdAtivo();
  const { data: clientes } = (await supabase
    .from("clientes")
    .select("*")
    .eq("workspace_id", workspaceId ?? "")
    .order("nome")) as { data: Cliente[] | null };

  return <ClientesBoard clientes={clientes ?? []} />;
}
