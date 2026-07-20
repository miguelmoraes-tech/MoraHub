import { createClient } from "@/lib/supabase/server";
import { ClienteCard } from "@/components/cliente-card";
import { NewClienteDialog } from "@/components/new-cliente-dialog";
import { Users } from "lucide-react";
import type { Cliente } from "@/lib/types";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = (await supabase
    .from("clientes")
    .select("*")
    .order("nome")) as { data: Cliente[] | null };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-500">
            {clientes?.length ?? 0} cliente(s) na carteira
          </p>
        </div>
        <NewClienteDialog />
      </div>

      {clientes && clientes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Users className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            Nenhum cliente cadastrado ainda.
          </p>
        </div>
      )}
    </div>
  );
}
