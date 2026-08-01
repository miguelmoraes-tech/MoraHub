import Link from "next/link";
import { Target, Users, CheckCircle2, Phone } from "lucide-react";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import { formatDate } from "@/lib/format";
import type { ComercialOverview } from "@/lib/comercial/get-overview";

export function VisaoGeralComercial({ overview }: { overview: ComercialOverview }) {
  const cards: VisaoGeralCard[] = [
    {
      icon: Target,
      label: "Leads a abordar",
      value: String(overview.leadsPorStatus.abordar),
      href: "/leads",
    },
    {
      icon: Users,
      label: "Leads abordados",
      value: String(overview.leadsPorStatus.abordado),
      href: "/leads",
    },
    {
      icon: CheckCircle2,
      label: "Convertidos",
      value: String(overview.leadsPorStatus.convertido),
      tone: overview.leadsPorStatus.convertido > 0 ? "emerald" : "zinc",
      href: "/leads",
    },
    {
      icon: Phone,
      label: "Follow-ups pendentes",
      value: String(overview.followupsPendentesCount),
      tone: overview.followupsPendentesCount > 0 ? "rose" : "emerald",
      href: "/leads",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Visão Geral do Comercial</h1>
        <p className="text-sm text-zinc-500">Resumo do funil de vendas e follow-ups pendentes</p>
      </div>

      <VisaoGeralCards cards={cards} />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="mb-3 text-sm font-semibold text-zinc-100">Follow-ups pendentes hoje</p>
        {overview.followupsPendentesLista.length > 0 ? (
          <div className="space-y-1.5">
            {overview.followupsPendentesLista.map((f) => (
              <Link
                key={f.leadId}
                href={`/leads?lead=${f.leadId}`}
                className="flex items-center justify-between gap-3 text-sm hover:text-copper-400"
              >
                <span className="truncate text-zinc-400">{f.leadNome}</span>
                <span
                  className={`shrink-0 font-medium ${f.diasAtraso > 0 ? "text-rose-400" : "text-amber-400"}`}
                >
                  {f.diasAtraso > 0
                    ? `${f.diasAtraso}d atrasado`
                    : `hoje (${formatDate(f.proximoFollowup)})`}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum follow-up pendente hoje.</p>
        )}
      </div>
    </div>
  );
}
