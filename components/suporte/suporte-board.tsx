"use client";

import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import type {
  Ticket,
  TicketCategoria,
  TicketPrioridade,
  ColaboradorParaAtribuicao,
} from "@/lib/types";
import { TicketCard } from "@/components/suporte/ticket-card";
import { NovoTicketDialog } from "@/components/suporte/novo-ticket-dialog";
import { SuporteOverviewCards } from "@/components/suporte/suporte-overview-cards";
import type { SuporteOverview } from "@/lib/tickets";

const STATUS_TABS: { value: Ticket["status"]; label: string }[] = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
];

const CATEGORIA_OPTIONS: { value: TicketCategoria; label: string }[] = [
  { value: "tecnico", label: "Técnico" },
  { value: "financeiro", label: "Financeiro" },
  { value: "juridico", label: "Jurídico" },
  { value: "contabil", label: "Contábil" },
  { value: "geral", label: "Geral" },
  { value: "outro", label: "Outro" },
];

const PRIORIDADE_OPTIONS: { value: TicketPrioridade; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export function SuporteBoard({
  tickets,
  clientes,
  colaboradores,
  overview,
  donoNomeById,
  nowMs,
}: {
  tickets: Ticket[];
  clientes: { id: string; nome: string; user_id: string }[];
  colaboradores: ColaboradorParaAtribuicao[];
  overview: SuporteOverview;
  donoNomeById?: Map<string, string>;
  nowMs: number;
}) {
  const [status, setStatus] = useState<Ticket["status"]>("aberto");
  const [categoria, setCategoria] = useState<TicketCategoria | "">("");
  const [prioridade, setPrioridade] = useState<TicketPrioridade | "">("");
  const [responsavelId, setResponsavelId] = useState("");

  const clienteNomeById = useMemo(
    () => new Map(clientes.map((c) => [c.id, c.nome])),
    [clientes]
  );
  const colaboradorNomeById = useMemo(
    () =>
      new Map(
        colaboradores.map((c) => [c.membro_id, c.nome || c.email || "Colaborador"])
      ),
    [colaboradores]
  );

  const contagemPorStatus = useMemo(() => {
    const map = new Map<Ticket["status"], number>();
    for (const t of tickets) map.set(t.status, (map.get(t.status) ?? 0) + 1);
    return map;
  }, [tickets]);

  const filtrados = tickets.filter(
    (t) =>
      t.status === status &&
      (!categoria || t.categoria === categoria) &&
      (!prioridade || t.prioridade === prioridade) &&
      (!responsavelId || t.responsavel_id === responsavelId)
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Suporte</h1>
          <p className="text-sm text-zinc-500">
            {tickets.length} ticket(s) no total
          </p>
        </div>
        <NovoTicketDialog
          clientes={clientes.map(({ id, nome }) => ({ id, nome }))}
          colaboradores={colaboradores}
        />
      </div>

      <SuporteOverviewCards overview={overview} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                status === tab.value
                  ? "bg-copper-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab.label} ({contagemPorStatus.get(tab.value) ?? 0})
            </button>
          ))}
        </div>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as TicketCategoria | "")}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as TicketPrioridade | "")}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none"
        >
          <option value="">Todas as prioridades</option>
          {PRIORIDADE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {colaboradores.length > 0 && (
          <select
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none"
          >
            <option value="">Todos os responsáveis</option>
            {colaboradores.map((c) => (
              <option key={c.membro_id} value={c.membro_id}>
                {c.nome || c.email || "Colaborador"}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              nowMs={nowMs}
              clienteNome={
                ticket.cliente_id ? clienteNomeById.get(ticket.cliente_id) : undefined
              }
              donoNome={donoNomeById?.get(ticket.user_id)}
              responsavelNome={
                ticket.responsavel_id
                  ? colaboradorNomeById.get(ticket.responsavel_id)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Inbox className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhum ticket neste status.</p>
        </div>
      )}
    </div>
  );
}
