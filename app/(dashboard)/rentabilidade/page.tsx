import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo, getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { rankearClientesPorRentabilidade } from "@/lib/rentabilidade";
import { RentabilidadeBoard } from "@/components/rentabilidade-board";

export default async function RentabilidadePage() {
  const donoId = await getDonoIdAtivo();
  const workspaceId = donoId ? await getWorkspaceIdAtivo() : null;
  const supabase = await createClient();

  const [{ data: clientes }, { data: comprovantes }, { data: gastos }] =
    donoId
      ? await Promise.all([
          supabase
            .from("clientes")
            .select("id, nome")
            .eq("workspace_id", workspaceId ?? ""),
          supabase
            .from("comprovantes")
            .select("cliente_id, valor")
            .eq("workspace_id", workspaceId ?? ""),
          supabase
            .from("gastos")
            .select("cliente_id, valor")
            .eq("user_id", donoId),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const ranking = rankearClientesPorRentabilidade(
    (clientes ?? []) as { id: string; nome: string }[],
    (comprovantes ?? []) as { cliente_id: string; valor: number }[],
    (gastos ?? []) as { cliente_id: string | null; valor: number }[]
  );

  return <RentabilidadeBoard ranking={ranking} />;
}
