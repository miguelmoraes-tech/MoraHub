import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { GastosSection } from "@/components/gastos-section";
import type { Gasto, Cliente, Projeto } from "@/lib/types";

export default async function GastosPage() {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceIdAtivo();

  const [{ data: gastos }, { data: clientes }, { data: projetos }] =
    (await Promise.all([
      supabase.from("gastos").select("*").order("data", { ascending: false }),
      supabase.from("clientes").select("*").eq("workspace_id", workspaceId ?? "").order("nome"),
      supabase.from("projetos").select("*").eq("workspace_id", workspaceId ?? "").order("nome"),
    ])) as [
      { data: Gasto[] | null },
      { data: Cliente[] | null },
      { data: Projeto[] | null },
    ];

  return (
    <GastosSection
      gastos={gastos ?? []}
      clientes={clientes ?? []}
      projetos={projetos ?? []}
    />
  );
}
