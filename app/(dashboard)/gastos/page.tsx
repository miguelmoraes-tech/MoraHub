import { createClient } from "@/lib/supabase/server";
import { GastosBoard } from "@/components/gastos-board";
import type { GastoFixo, GastoCliente, Cliente } from "@/lib/types";

export default async function GastosPage() {
  const supabase = await createClient();

  const [{ data: gastosFixos }, { data: gastosClientes }, { data: clientes }] =
    (await Promise.all([
      supabase
        .from("gastos_fixos")
        .select("*")
        .order("data", { ascending: false }),
      supabase
        .from("gastos_clientes")
        .select("*")
        .order("data", { ascending: false }),
      supabase.from("clientes").select("*").order("nome"),
    ])) as [
      { data: GastoFixo[] | null },
      { data: GastoCliente[] | null },
      { data: Cliente[] | null },
    ];

  return (
    <GastosBoard
      gastosFixos={gastosFixos ?? []}
      gastosClientes={gastosClientes ?? []}
      clientes={clientes ?? []}
    />
  );
}
