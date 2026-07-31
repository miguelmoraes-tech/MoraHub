import { ShieldCheck, FileStack, Copyright } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PessoalPropriedadeIntelectualSection } from "@/components/pessoal/pessoal-propriedade-intelectual-section";
import { PessoalComplianceSection } from "@/components/pessoal/pessoal-compliance-section";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import type { PessoalCompliance, PessoalPropriedadeIntelectual } from "@/lib/types";

export default async function PessoalJuridicoPage() {
  const supabase = await createClient();

  const [{ data: propriedadeIntelectual }, { data: compliance }, { count: modelosCount }] =
    (await Promise.all([
      supabase
        .from("pessoal_propriedade_intelectual")
        .select("*")
        .order("data_renovacao", { ascending: true }),
      supabase.from("pessoal_compliance").select("*").order("created_at"),
      supabase.from("modelos_contrato").select("id", { count: "exact", head: true }),
    ])) as [
      { data: PessoalPropriedadeIntelectual[] | null },
      { data: PessoalCompliance[] | null },
      { count: number | null },
    ];

  const hoje = todayISO();
  const complianceRegistros = compliance ?? [];
  const complianceConforme = complianceRegistros.filter(
    (c) => c.status === "conforme"
  ).length;

  const propriedadesItens = propriedadeIntelectual ?? [];
  const piEmAtencao = propriedadesItens.filter((p) => {
    if (p.status === "vencido") return true;
    if (!p.data_renovacao) return false;
    const dias = diffInDays(hoje, p.data_renovacao);
    return dias >= 0 && dias <= 30;
  }).length;

  const cards: VisaoGeralCard[] = [
    {
      icon: ShieldCheck,
      label: "Compliance",
      value: `${complianceConforme} de ${complianceRegistros.length}`,
      hint: "itens conformes",
      tone: complianceRegistros.length > 0 && complianceConforme === complianceRegistros.length ? "emerald" : "zinc",
      href: "#pessoal-compliance",
    },
    {
      icon: FileStack,
      label: "Modelos disponíveis",
      value: String(modelosCount ?? 0),
      href: "/documentos",
    },
    {
      icon: Copyright,
      label: "Propriedade Intelectual em atenção",
      value: String(piEmAtencao),
      tone: piEmAtencao > 0 ? "amber" : "zinc",
      href: "#pessoal-propriedade-intelectual",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Jurídico</h1>
        <p className="text-sm text-zinc-500">
          Propriedade intelectual e compliance da sua própria conta.
        </p>
      </div>

      <VisaoGeralCards cards={cards} />

      <div id="pessoal-propriedade-intelectual" className="scroll-mt-6">
        <PessoalPropriedadeIntelectualSection itens={propriedadesItens} />
      </div>
      <div id="pessoal-compliance" className="scroll-mt-6">
        <PessoalComplianceSection registros={complianceRegistros} />
      </div>
    </div>
  );
}
