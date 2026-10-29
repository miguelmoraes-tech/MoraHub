import { ShieldCheck, Copyright, Gavel } from "lucide-react";
import type {
  ComplianceJuridico,
  ComplianceStatus,
  Processo,
  ProcessoFase,
  PropriedadeIntelectual,
  PropriedadeIntelectualStatus,
} from "@/lib/types";
import { formatDate } from "@/lib/format";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { StatusChip, type ChipTone } from "@/components/status-chip";

/**
 * Read-only mirrors of the labels/tones used in the advogado workspace
 * boards (compliance-grid.tsx, propriedade-intelectual-board.tsx,
 * processos-board.tsx). Kept separate — and read-only, no create/edit
 * forms — so this page doesn't share a mutation path (and its
 * revalidatePath target) with those advogado-scoped routes.
 */
const COMPLIANCE_STATUS_LABEL: Record<ComplianceStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  conforme: "Conforme",
};

const COMPLIANCE_STATUS_TONE: Record<ComplianceStatus, ChipTone> = {
  pendente: "zinc",
  em_andamento: "amber",
  conforme: "emerald",
};

const PI_STATUS_LABEL: Record<PropriedadeIntelectualStatus, string> = {
  registrado: "Registrado",
  em_analise: "Em análise",
  pendente: "Pendente",
  vencido: "Vencido",
};

const PI_STATUS_TONE: Record<PropriedadeIntelectualStatus, ChipTone> = {
  registrado: "emerald",
  em_analise: "amber",
  pendente: "zinc",
  vencido: "rose",
};

const FASE_LABEL: Record<ProcessoFase, string> = {
  inicial: "Inicial",
  instrucao: "Instrução",
  recursal: "Recursal",
  execucao: "Execução",
  encerrado: "Encerrado",
};

const FASE_TONE: Record<ProcessoFase, ChipTone> = {
  inicial: "sky",
  instrucao: "amber",
  recursal: "copper",
  execucao: "rose",
  encerrado: "zinc",
};

function SectionShell({
  id,
  icon: Icon,
  title,
  count,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="mx-auto max-w-4xl scroll-mt-6 px-6 pb-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Icon className="h-4 w-4 text-zinc-500" />
          {title}
          <span className="text-xs font-normal text-zinc-500">({count})</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ComplianceReadonlyList({
  registros,
  clienteNome,
  clientesIndisponiveis = false,
}: {
  registros: ComplianceJuridico[];
  clienteNome: Map<string, string>;
  /** Sem permissão em Clientes: o nome do cliente aparece como "—". */
  clientesIndisponiveis?: boolean;
}) {
  return (
    <SectionShell
      id="compliance"
      icon={ShieldCheck}
      title="Compliance"
      count={registros.length}
    >
      {registros.length > 0 ? (
        <div className="space-y-2">
          {registros.map((registro) => (
            <div
              key={registro.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm text-zinc-200">
                  {registro.categoria}
                  <StatusChip tone={COMPLIANCE_STATUS_TONE[registro.status]}>
                    {COMPLIANCE_STATUS_LABEL[registro.status]}
                  </StatusChip>
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {registro.cliente_id
                    ? (clienteNome.get(registro.cliente_id) ?? (clientesIndisponiveis ? "—" : "Cliente"))
                    : "Geral"}
                  {registro.proxima_revisao &&
                    ` · próxima revisão ${formatDate(registro.proxima_revisao)}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">
          Nenhum registro de compliance cadastrado.
        </p>
      )}
    </SectionShell>
  );
}

export function PropriedadeIntelectualReadonlyList({
  itens,
  clienteNome,
  clientesIndisponiveis = false,
}: {
  itens: PropriedadeIntelectual[];
  clienteNome: Map<string, string>;
  clientesIndisponiveis?: boolean;
}) {
  const hoje = todayISO();

  return (
    <SectionShell
      id="propriedade-intelectual"
      icon={Copyright}
      title="Propriedade Intelectual"
      count={itens.length}
    >
      {itens.length > 0 ? (
        <div className="space-y-2">
          {itens.map((item) => {
            const dias = item.data_renovacao
              ? diffInDays(hoje, item.data_renovacao)
              : null;
            const atrasado = dias !== null && dias < 0;
            const proximo = dias !== null && dias >= 0 && dias <= 30;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    {item.nome}
                    <StatusChip tone={PI_STATUS_TONE[item.status]}>
                      {PI_STATUS_LABEL[item.status]}
                    </StatusChip>
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.tipo}
                    {item.cliente_id &&
                      ` · ${clienteNome.get(item.cliente_id) ?? (clientesIndisponiveis ? "—" : "Cliente")}`}
                    {item.data_renovacao &&
                      ` · renovação ${formatDate(item.data_renovacao)}${atrasado ? " (atrasado)" : proximo ? " (em breve)" : ""}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">
          Nenhum registro de propriedade intelectual cadastrado.
        </p>
      )}
    </SectionShell>
  );
}

export function ProcessosReadonlyList({
  processos,
  clienteNome,
  clientesIndisponiveis = false,
}: {
  processos: Processo[];
  clienteNome: Map<string, string>;
  clientesIndisponiveis?: boolean;
}) {
  const hoje = todayISO();

  return (
    <SectionShell id="processos" icon={Gavel} title="Processos" count={processos.length}>
      {processos.length > 0 ? (
        <div className="space-y-2">
          {processos.map((processo) => {
            const dias = processo.proximo_prazo
              ? diffInDays(hoje, processo.proximo_prazo)
              : null;
            const emAndamento = processo.fase !== "encerrado";
            const atrasado = emAndamento && dias !== null && dias < 0;
            const proximo = emAndamento && dias !== null && dias >= 0 && dias <= 7;
            return (
              <div
                key={processo.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    {processo.numero_processo || "Sem número"}
                    <StatusChip tone={FASE_TONE[processo.fase]}>
                      {FASE_LABEL[processo.fase]}
                    </StatusChip>
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {clienteNome.get(processo.cliente_id) ?? (clientesIndisponiveis ? "—" : "Cliente")}
                    {processo.parte_contraria && ` · vs ${processo.parte_contraria}`}
                    {processo.proximo_prazo &&
                      ` · prazo ${formatDate(processo.proximo_prazo)}${atrasado ? " (atrasado)" : proximo ? " (em breve)" : ""}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum processo cadastrado.</p>
      )}
    </SectionShell>
  );
}
