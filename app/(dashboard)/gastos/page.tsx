import { createClient } from "@/lib/supabase/server";
import { GastosSection } from "@/components/gastos-section";
import type { Gasto, Cliente } from "@/lib/types";

export default async function GastosPage() {
  const supabase = await createClient();

  const [{ data: gastos }, { data: clientes }] = (await Promise.all([
    supabase.from("gastos").select("*").order("data", { ascending: false }),
    supabase.from("clientes").select("*").order("nome"),
  ])) as [{ data: Gasto[] | null }, { data: Cliente[] | null }];

  return <GastosSection gastos={gastos ?? []} clientes={clientes ?? []} />;
}
