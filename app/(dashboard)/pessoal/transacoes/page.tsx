import { createClient } from "@/lib/supabase/server";
import { TransacoesSection } from "@/components/pessoal/transacoes-section";
import type {
  PessoalAccount,
  PessoalCategory,
  PessoalTransaction,
} from "@/lib/pessoal/types";

export default async function PessoalTransacoesPage() {
  const supabase = await createClient();

  const [{ data: transacoes }, { data: contas }, { data: categorias }] =
    (await Promise.all([
      supabase
        .from("pessoal_transactions")
        .select("*")
        .order("transaction_date", { ascending: false }),
      supabase.from("pessoal_accounts").select("*").order("name"),
      supabase.from("pessoal_categories").select("*").order("name"),
    ])) as [
      { data: PessoalTransaction[] | null },
      { data: PessoalAccount[] | null },
      { data: PessoalCategory[] | null },
    ];

  return (
    <TransacoesSection
      transacoes={transacoes ?? []}
      contas={contas ?? []}
      categorias={categorias ?? []}
    />
  );
}
