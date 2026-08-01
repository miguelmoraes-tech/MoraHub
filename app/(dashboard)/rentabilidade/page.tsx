import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoId } from "@/lib/financeiro";
import { rankearClientesPorRentabilidade } from "@/lib/rentabilidade";
import { RentabilidadeBoard } from "@/components/rentabilidade-board";

export default async function RentabilidadePage() {
  const donoId = await getEffectiveDonoId();
  const supabase = await createClient();

  const [{ data: clientes }, { data: comprovantes }, { data: gastos }] =
    donoId
      ? await Promise.all([
          supabase
            .from("clientes")
            .select("id, nome")
            .eq("user_id", donoId),
          supabase
            .from("comprovantes")
            .select("cliente_id, valor")
            .eq("user_id", donoId),
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
