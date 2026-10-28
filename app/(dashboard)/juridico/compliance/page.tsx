import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridico } from "@/lib/juridico-acesso";
import { ComplianceGrid } from "@/components/juridico/compliance-grid";
import { SemAcessoAviso } from "@/components/financeiro/sem-valores";
import type { ClienteBasico } from "@/lib/juridico-shared";
import type { ComplianceJuridico } from "@/lib/types";

export default async function JuridicoCompliancePage() {
  const jur = await getAcessoJuridico();
  if (!jur) return <SemAcessoAviso titulo="Compliance" />;

  // A grade é por cliente: sem permissão em Clientes não há linhas para mostrar.
  if (!jur.clientes) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-lg font-semibold text-zinc-100">Compliance</h1>
        <p className="mt-4 text-sm text-zinc-500">
          — A grade de compliance é organizada por cliente e depende do módulo Clientes, que não
          está liberado para você.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: registros }, { data: clientes }] = await Promise.all([
    supabase.from("compliance_juridico").select("*").eq("workspace_id", jur.workspaceId),
    supabase
      .from("clientes")
      .select("id, nome")
      .eq("workspace_id", jur.clientes.workspaceId)
      .order("nome"),
  ]);

  return (
    <ComplianceGrid
      clientes={(clientes ?? []) as ClienteBasico[]}
      registros={(registros ?? []) as ComplianceJuridico[]}
      somenteLeitura={jur.somenteLeituraPorCliente}
    />
  );
}
