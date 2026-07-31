import Link from "next/link";
import { Users, Banknote, Palmtree, Briefcase, ClipboardCheck } from "lucide-react";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import { formatCurrency } from "@/lib/format";
import type { RHOverview } from "@/lib/rh/get-overview";

const CANDIDATO_STATUS_LABEL: Record<string, string> = {
  triagem: "Triagem",
  entrevista: "Entrevista",
  teste: "Teste",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  contratado: "Contratado",
};

export function VisaoGeralRH({ overview }: { overview: RHOverview }) {
  const folhaCompleta =
    overview.folhaMes.totalFuncionarios > 0 &&
    overview.folhaMes.pagos === overview.folhaMes.totalFuncionarios;

  const cards: VisaoGeralCard[] = [
    {
      icon: Users,
      label: "Funcionários ativos",
      value: String(overview.funcionariosAtivos),
      href: "/rh/funcionarios",
    },
    {
      icon: Banknote,
      label: "Folha do mês",
      value:
        overview.folhaMes.totalFuncionarios > 0
          ? `${overview.folhaMes.pagos} de ${overview.folhaMes.totalFuncionarios} pagos`
          : "não gerada",
      hint: formatCurrency(overview.folhaMes.valorTotal),
      tone: overview.folhaMes.totalFuncionarios === 0 ? "zinc" : folhaCompleta ? "emerald" : "amber",
      href: "/rh/folha",
    },
    {
      icon: Palmtree,
      label: "Férias pendentes/vencendo",
      value: `${overview.feriasPendentesCount} / ${overview.feriasVencendoCount}`,
      tone: overview.feriasVencendoCount > 0 ? "rose" : "zinc",
      href: "/rh/ferias",
    },
    {
      icon: Briefcase,
      label: "Vagas abertas",
      value: String(overview.vagasAbertasCount),
      hint: `${overview.candidatosEmProcessoCount} candidato(s) em processo`,
      href: "/rh/recrutamento",
    },
    {
      icon: ClipboardCheck,
      label: "Avaliações pendentes",
      value: String(overview.avaliacoesPendentesCount),
      tone: overview.avaliacoesPendentesCount > 0 ? "amber" : "emerald",
      href: "/rh/avaliacoes",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Visão Geral do RH</h1>
        <p className="text-sm text-zinc-500">Resumo de pessoas, folha, férias e recrutamento</p>
      </div>

      <VisaoGeralCards cards={cards} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="mb-3 text-sm font-semibold text-zinc-100">Funcionários por departamento</p>
          {overview.funcionariosPorDepartamento.length > 0 ? (
            <div className="space-y-1.5">
              {overview.funcionariosPorDepartamento.map((d) => (
                <div key={d.departamentoNome} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{d.departamentoNome}</span>
                  <span className="font-medium text-zinc-200">{d.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhum funcionário ativo.</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="mb-3 text-sm font-semibold text-zinc-100">Férias vencendo</p>
          {overview.feriasVencendoLista.length > 0 ? (
            <div className="space-y-1.5">
              {overview.feriasVencendoLista.map((f) => (
                <Link
                  key={f.feriaId}
                  href="/rh/ferias"
                  className="flex items-center justify-between text-sm hover:text-copper-400"
                >
                  <span className="text-zinc-400">{f.funcionarioNome}</span>
                  <span
                    className={`font-medium ${f.diasRestantes < 0 ? "text-rose-400" : "text-amber-400"}`}
                  >
                    {f.diasRestantes < 0
                      ? `${Math.abs(f.diasRestantes)}d atrasado`
                      : `${f.diasRestantes}d restantes`}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhuma férias vencendo nos próximos 30 dias.</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:col-span-2">
          <p className="mb-3 text-sm font-semibold text-zinc-100">Candidatos por status</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(overview.candidatosPorStatus).map(([status, total]) => (
              <div key={status} className="rounded-lg border border-zinc-800/80 px-3 py-2 text-center">
                <p className="text-lg font-semibold text-zinc-100">{total}</p>
                <p className="text-[11px] text-zinc-500">{CANDIDATO_STATUS_LABEL[status]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
