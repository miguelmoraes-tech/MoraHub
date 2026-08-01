import { AlertTriangle, Inbox, Clock, CheckCircle2 } from "lucide-react";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import type { SuporteOverview } from "@/lib/tickets-shared";

function formatHoras(horas: number | null) {
  if (horas === null) return "—";
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 48) return `${horas.toFixed(1)}h`;
  return `${(horas / 24).toFixed(1)}d`;
}

export function SuporteOverviewCards({ overview }: { overview: SuporteOverview }) {
  const cards: VisaoGeralCard[] = [
    {
      icon: Inbox,
      label: "Tickets abertos",
      value: String(overview.ticketsAbertos),
    },
    {
      icon: AlertTriangle,
      label: "SLA estourado",
      value: String(overview.slaEstourados),
      tone: overview.slaEstourados > 0 ? "rose" : "emerald",
    },
    {
      icon: Clock,
      label: "Tempo médio 1ª resposta",
      value: formatHoras(overview.tempoMedioPrimeiraRespostaHoras),
      hint: "últimos 30 dias",
    },
    {
      icon: CheckCircle2,
      label: "Tempo médio de resolução",
      value: formatHoras(overview.tempoMedioResolucaoHoras),
      hint: "últimos 30 dias",
    },
  ];

  return <VisaoGeralCards cards={cards} />;
}
