import { createClient } from "@/lib/supabase/server";
import { ClientesBoard } from "@/components/clientes-board";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = (await supabase
    .from("clientes")
    .select("*")
    .order("nome")) as { data: Cliente[] | null };

  return <ClientesBoard clientes={clientes ?? []} />;
}
