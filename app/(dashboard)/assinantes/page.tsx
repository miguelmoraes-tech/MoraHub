import { createClient } from "@/lib/supabase/server";
import { getAcessoFinanceiro, getAuxiliaresFinanceiro } from "@/lib/financeiro/acesso";
import { AssinantesBoard } from "@/components/assinantes-board";
import type { Assinatura, Cliente } from "@/lib/types";

export default async function AssinantesPage() {
  const supabase = await createClient();
  const fin = await getAcessoFinanceiro();
  const aux = await getAuxiliaresFinanceiro();

  // Assinaturas são escritas no detalhe do cliente (só fundador/cofundador) e
  // lidas aqui; os nomes dos clientes são leitura auxiliar.
  const [{ data: assinaturas }, { data: clientes }] = fin
    ? ((await Promise.all([
        supabase
          .from("assinaturas")
          .select("*")
          .eq("workspace_id", fin.workspaceId)
          .order("plano", { ascending: true }),
        aux.clientes
          ? supabase
              .from("clientes")
              .select("*")
              .eq("workspace_id", aux.clientes.workspaceId)
              .order("nome")
          : Promise.resolve({ data: [] }),
      ])) as [{ data: Assinatura[] | null }, { data: Cliente[] | null }])
    : [{ data: [] as Assinatura[] }, { data: [] as Cliente[] }];

  return (
    <AssinantesBoard
      assinaturas={(assinaturas ?? []).map((a) =>
        fin?.valores ? a : { ...a, valor: null }
      )}
      clientes={clientes ?? []}
      somenteLeitura={!fin || fin.somenteLeitura || !aux.clientes}
      semValores={!fin?.valores}
      clientesIndisponiveis={!aux.clientes}
      // O detalhe do cliente (/clientes/[id]) é só do fundador/cofundador.
      semLinkCliente={!fin?.acesso.ehDono}
    />
  );
}
