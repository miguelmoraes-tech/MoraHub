import Link from "next/link";
import { Users, BadgeCheck, Percent, LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveWorkspaceIdGeral } from "@/lib/dono-efetivo";
import { StatCard } from "@/components/stat-card";
import { BarList } from "@/components/bar-list";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { formatDate } from "@/lib/format";
import type { ClienteStatus } from "@/lib/types";

type ClienteRow = {
  id: string;
  nome: string;
  status: ClienteStatus;
  created_at: string;
  lead_origem_id: string | null;
};

const STATUS_LABEL: Record<ClienteStatus, string> = {
  ativo: "Ativo",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

const STATUS_TONE: Record<ClienteStatus, ChipTone> = {
  ativo: "emerald",
  em_andamento: "sky",
  pausado: "amber",
  encerrado: "zinc",
};

export default async function DashboardClientesPage() {
  const supabase = await createClient();
  const workspaceId = await getEffectiveWorkspaceIdGeral();

  const [{ data: clientes }, { data: assinaturas }, { data: leads }] =
    (await Promise.all([
      supabase
        .from("clientes")
        .select("id, nome, status, created_at, lead_origem_id")
        .eq("workspace_id", workspaceId ?? "")
        .order("created_at", { ascending: false }),
      supabase.from("assinaturas").select("status"),
      supabase.from("leads").select("status").eq("workspace_id", workspaceId ?? ""),
    ])) as [
      { data: ClienteRow[] | null },
      { data: { status: string }[] | null },
      { data: { status: string }[] | null },
    ];

  const clientesList = clientes ?? [];
  const totalClientes = clientesList.length;

  const porStatus: Record<ClienteStatus, number> = {
    ativo: 0,
    em_andamento: 0,
    pausado: 0,
    encerrado: 0,
  };
  for (const c of clientesList) porStatus[c.status]++;

  const assinantesAtivos = (assinaturas ?? []).filter(
    (a) => a.status === "ativa"
  ).length;

  const leadsConvertidos = (leads ?? []).filter(
    (l) => l.status === "convertido"
  ).length;
  const clientesComOrigem = clientesList.filter((c) => c.lead_origem_id).length;
  const taxaConversao =
    leadsConvertidos > 0 ? clientesComOrigem / leadsConvertidos : null;

  const listaRapida = clientesList.filter(
    (c) => c.status === "ativo" || c.status === "em_andamento"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">
          Dashboard Clientes
        </h1>
        <p className="text-sm text-zinc-500">
          Visão geral da carteira de clientes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Total de clientes" value={String(totalClientes)} />
        <StatCard
          icon={BadgeCheck}
          label="Assinantes ativos"
          value={String(assinantesAtivos)}
        />
        {taxaConversao !== null && (
          <StatCard
            icon={Percent}
            label="Taxa de conversão de lead"
            value={`${(taxaConversao * 100).toFixed(1)}%`}
            hint={`${clientesComOrigem} de ${leadsConvertidos} leads convertidos`}
          />
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <LayoutDashboard className="h-4 w-4 text-zinc-500" />
          Clientes por status
        </h2>
        <BarList
          items={(Object.keys(porStatus) as ClienteStatus[]).map((status) => ({
            label: STATUS_LABEL[status],
            count: porStatus[status],
          }))}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Users className="h-4 w-4 text-zinc-500" />
          Clientes ativos e em andamento
        </h2>

        {listaRapida.length > 0 ? (
          <div className="space-y-2">
            {listaRapida.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm text-zinc-200">
                    {cliente.nome}
                  </span>
                  <StatusChip tone={STATUS_TONE[cliente.status]}>
                    {STATUS_LABEL[cliente.status]}
                  </StatusChip>
                </div>
                <span className="shrink-0 text-xs text-zinc-500">
                  desde {formatDate(cliente.created_at.slice(0, 10))}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhum cliente ativo ou em andamento no momento.
          </p>
        )}
      </div>
    </div>
  );
}
