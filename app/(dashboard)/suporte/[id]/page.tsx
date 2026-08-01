import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getColaboradoresParaResponsavel } from "@/lib/tickets";
import { isSlaEstourado, nowMs } from "@/lib/tickets-shared";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { TicketThread } from "@/components/suporte/ticket-thread";
import { TicketStatusSelect } from "@/components/suporte/ticket-status-select";
import { TicketResponsavelSelect } from "@/components/suporte/ticket-responsavel-select";
import { formatDate } from "@/lib/format";
import type { Ticket, TicketResposta } from "@/lib/types";

const CATEGORIA_LABEL: Record<Ticket["categoria"], string> = {
  tecnico: "Técnico",
  financeiro: "Financeiro",
  juridico: "Jurídico",
  contabil: "Contábil",
  geral: "Geral",
  outro: "Outro",
};

const PRIORIDADE_LABEL: Record<Ticket["prioridade"], string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORIDADE_TONE: Record<Ticket["prioridade"], ChipTone> = {
  baixa: "zinc",
  media: "sky",
  alta: "amber",
  urgente: "rose",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: ticket } = (await supabase
    .from("tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Ticket | null };
  if (!ticket) notFound();

  const [{ data: respostas }, { data: cliente }, { data: perfilDono }, colaboradores] =
    await Promise.all([
      supabase
        .from("ticket_respostas")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true }) as unknown as Promise<{
        data: TicketResposta[] | null;
      }>,
      ticket.cliente_id
        ? (supabase
            .from("clientes")
            .select("nome")
            .eq("id", ticket.cliente_id)
            .maybeSingle() as unknown as Promise<{ data: { nome: string } | null }>)
        : Promise.resolve({ data: null }),
      supabase
        .from("perfis")
        .select("nome")
        .eq("id", ticket.user_id)
        .maybeSingle() as unknown as Promise<{ data: { nome: string | null } | null }>,
      getColaboradoresParaResponsavel([ticket.user_id]),
    ]);

  const autorNomeById: Record<string, string> = {
    [ticket.user_id]: perfilDono?.nome || "Dono da conta",
  };
  for (const colaborador of colaboradores) {
    autorNomeById[colaborador.membro_id] =
      colaborador.nome || colaborador.email || "Colaborador";
  }
  if (!autorNomeById[user.id]) autorNomeById[user.id] = "Você";

  const estourado = isSlaEstourado(ticket, nowMs());

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/suporte"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Suporte
      </Link>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-zinc-100">{ticket.titulo}</h1>
            <p className="text-xs text-zinc-500">
              {cliente?.nome && `${cliente.nome} · `}
              aberto em {formatDate(ticket.data_abertura.slice(0, 10))}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={PRIORIDADE_TONE[ticket.prioridade]}>
              {PRIORIDADE_LABEL[ticket.prioridade]}
            </StatusChip>
            <StatusChip tone="copper">{CATEGORIA_LABEL[ticket.categoria]}</StatusChip>
            {estourado && (
              <StatusChip tone="rose">
                <AlertTriangle className="h-3 w-3" />
                SLA estourado
              </StatusChip>
            )}
          </div>
        </div>

        {ticket.descricao && (
          <p className="mb-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
            {ticket.descricao}
          </p>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3 border-t border-zinc-800/80 pt-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              Status
            </p>
            <TicketStatusSelect ticketId={ticket.id} status={ticket.status} />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              Responsável
            </p>
            {colaboradores.length > 0 ? (
              <TicketResponsavelSelect
                ticketId={ticket.id}
                responsavelId={ticket.responsavel_id}
                colaboradores={colaboradores}
              />
            ) : (
              <p className="px-1 py-2 text-sm text-zinc-400">
                {ticket.responsavel_id
                  ? (autorNomeById[ticket.responsavel_id] ?? "Colaborador")
                  : "Sem responsável"}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              SLA
            </p>
            <p className="px-1 py-2 text-sm text-zinc-400">
              {ticket.sla_horas ? `${ticket.sla_horas}h` : "—"}
            </p>
          </div>
        </div>

        <TicketThread
          ticketId={ticket.id}
          currentUserId={user.id}
          podeResponder
          initialRespostas={respostas ?? []}
          autorNomeById={autorNomeById}
        />
      </div>
    </div>
  );
}
