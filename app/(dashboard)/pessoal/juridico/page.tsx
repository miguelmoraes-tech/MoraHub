import { createClient } from "@/lib/supabase/server";
import { PessoalPropriedadeIntelectualSection } from "@/components/pessoal/pessoal-propriedade-intelectual-section";
import { PessoalComplianceSection } from "@/components/pessoal/pessoal-compliance-section";
import type { PessoalCompliance, PessoalPropriedadeIntelectual } from "@/lib/types";

export default async function PessoalJuridicoPage() {
  const supabase = await createClient();

  const [{ data: propriedadeIntelectual }, { data: compliance }] =
    await Promise.all([
      supabase
        .from("pessoal_propriedade_intelectual")
        .select("*")
        .order("data_renovacao", { ascending: true }),
      supabase.from("pessoal_compliance").select("*").order("created_at"),
    ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Jurídico</h1>
        <p className="text-sm text-zinc-500">
          Propriedade intelectual e compliance da sua própria conta.
        </p>
      </div>

      <PessoalPropriedadeIntelectualSection
        itens={(propriedadeIntelectual ?? []) as PessoalPropriedadeIntelectual[]}
      />
      <PessoalComplianceSection
        registros={(compliance ?? []) as PessoalCompliance[]}
      />
    </div>
  );
}
