import { UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RenegadoCard } from "@/components/renegado-card";
import { NewRenegadoDialog } from "@/components/new-renegado-dialog";
import type { Renegado } from "@/lib/types";

export default async function RenegadosPage() {
  const supabase = await createClient();
  const { data: renegados } = (await supabase
    .from("renegados")
    .select("*")
    .order("created_at", { ascending: false })) as {
    data: Renegado[] | null;
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Renegados</h1>
          <p className="text-sm text-zinc-500">
            {renegados?.length ?? 0} renegado(s) registrado(s)
          </p>
        </div>
        <NewRenegadoDialog />
      </div>

      {renegados && renegados.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {renegados.map((renegado) => (
            <RenegadoCard key={renegado.id} renegado={renegado} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <UserX className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            Nenhum renegado cadastrado ainda.
          </p>
        </div>
      )}
    </div>
  );
}
