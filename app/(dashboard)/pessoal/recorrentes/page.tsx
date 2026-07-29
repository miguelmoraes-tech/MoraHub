import { createClient } from "@/lib/supabase/server";
import { RecorrentesSection } from "@/components/pessoal/recorrentes-section";
import { currentReferenceMonth, ensureMonthPayments } from "@/lib/pessoal/recurring";
import type {
  PessoalAccount,
  PessoalCategory,
  PessoalRecurringExpense,
} from "@/lib/pessoal/types";

export default async function PessoalRecorrentesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: expenses }, { data: contas }, { data: categorias }] =
    (await Promise.all([
      supabase.from("pessoal_recurring_expenses").select("*").order("name"),
      supabase.from("pessoal_accounts").select("*").order("name"),
      supabase.from("pessoal_categories").select("*").order("name"),
    ])) as [
      { data: PessoalRecurringExpense[] | null },
      { data: PessoalAccount[] | null },
      { data: PessoalCategory[] | null },
    ];

  const referenceMonth = currentReferenceMonth();
  const payments = user
    ? await ensureMonthPayments(supabase, user.id, expenses ?? [], referenceMonth)
    : [];

  return (
    <RecorrentesSection
      expenses={expenses ?? []}
      payments={payments}
      contas={contas ?? []}
      categorias={categorias ?? []}
      referenceMonth={referenceMonth}
    />
  );
}
