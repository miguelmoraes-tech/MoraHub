import { createClient } from "@/lib/supabase/server";
import { AssinantesBoard } from "@/components/assinantes-board";
import type { Assinatura, Cliente } from "@/lib/types";

export default async function AssinantesPage() {
  const supabase = await createClient();

  const [{ data: assinaturas }, { data: clientes }] = (await Promise.all([
    supabase
      .from("assinaturas")
      .select("*")
      .order("plano", { ascending: true }),
    supabase.from("clientes").select("*").order("nome"),
  ])) as [{ data: Assinatura[] | null }, { data: Cliente[] | null }];

  return (
    <AssinantesBoard assinaturas={assinaturas ?? []} clientes={clientes ?? []} />
  );
}
