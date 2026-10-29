import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro, getAuxiliaresFinanceiro } from "@/lib/financeiro/acesso";
import { rankearClientesPorRentabilidade } from "@/lib/rentabilidade";
import { RentabilidadeBoard } from "@/components/rentabilidade-board";
import { SemAcessoAviso, SemValoresAviso } from "@/components/financeiro/sem-valores";

export default async function RentabilidadePage() {
  const fin = await getAcessoFinanceiro();
  if (!fin) return <SemAcessoAviso titulo="Rentabilidade" />;
  // A tela é só receita, custo e lucro.
  if (!fin.valores) return <SemValoresAviso titulo="Rentabilidade" />;
  // O ranking é por cliente: precisa do módulo Clientes (leitura auxiliar).
  const { clientes: acessoClientes } = await getAuxiliaresFinanceiro();
  if (!acessoClientes) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-lg font-semibold text-zinc-100">Rentabilidade</h1>
        <p className="mt-4 text-sm text-zinc-500">
          — O ranking por cliente depende do módulo Clientes, que não está liberado para você.
        </p>
      </div>
    );
  }
  const supabase = await createClient();

  const [{ data: clientes }, { data: comprovantes }, { data: gastos }] = await Promise.all([
    supabase.from("clientes").select("id, nome").eq("workspace_id", acessoClientes.workspaceId),
    supabase.from("comprovantes").select("cliente_id, valor").eq("workspace_id", fin.workspaceId),
    supabase.from("gastos").select("cliente_id, valor").eq("workspace_id", fin.workspaceId),
  ]);

  const ranking = rankearClientesPorRentabilidade(
    (clientes ?? []) as { id: string; nome: string }[],
    (comprovantes ?? []) as { cliente_id: string; valor: number }[],
    (gastos ?? []) as { cliente_id: string | null; valor: number }[]
  );

  return <RentabilidadeBoard ranking={ranking} />;
}
