import { CalendarDays, Megaphone, Wallet, Percent } from "lucide-react";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import { formatCurrency } from "@/lib/format";
import type { MarketingOverview } from "@/lib/marketing/get-overview";

export function VisaoGeralMarketing({ overview }: { overview: MarketingOverview }) {
  const cards: VisaoGeralCard[] = [
    {
      icon: CalendarDays,
      label: "Conteúdo publicado no mês",
      value: String(overview.conteudoPublicadoMes),
      href: "/marketing/calendario",
    },
    {
      icon: Megaphone,
      label: "Campanhas ativas",
      value: String(overview.campanhasAtivasCount),
      href: "/marketing/campanhas",
    },
    {
      icon: Wallet,
      label: "Total investido no mês",
      value: formatCurrency(overview.totalInvestidoMes),
      href: "/marketing/campanhas",
    },
    {
      icon: Percent,
      label: "ROI médio (campanhas ativas)",
      value:
        overview.roiMedioAtivas !== null ? `${overview.roiMedioAtivas.toFixed(1)}%` : "—",
      tone:
        overview.roiMedioAtivas === null
          ? "zinc"
          : overview.roiMedioAtivas >= 0
            ? "emerald"
            : "rose",
      href: "/marketing/campanhas",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Visão Geral do Marketing</h1>
        <p className="text-sm text-zinc-500">
          Resumo do calendário de conteúdo e do desempenho das campanhas
        </p>
      </div>

      <VisaoGeralCards cards={cards} />
    </div>
  );
}
