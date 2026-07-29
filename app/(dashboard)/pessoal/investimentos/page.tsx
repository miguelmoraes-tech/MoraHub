import { createClient } from "@/lib/supabase/server";
import { InvestimentosSection } from "@/components/pessoal/investimentos-section";
import type { PessoalAccount, PessoalInvestment } from "@/lib/pessoal/types";

export default async function PessoalInvestimentosPage() {
  const supabase = await createClient();

  const [{ data: investimentos }, { data: contas }] = (await Promise.all([
    supabase.from("pessoal_investments").select("*").order("name"),
    supabase.from("pessoal_accounts").select("*").order("name"),
  ])) as [
    { data: PessoalInvestment[] | null },
    { data: PessoalAccount[] | null },
  ];

  return (
    <InvestimentosSection
      investimentos={investimentos ?? []}
      contas={contas ?? []}
    />
  );
}
