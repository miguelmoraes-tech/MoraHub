"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AtividadeVendedorRow, LeadView } from "@/lib/types";
import {
  ATIVIDADE_DIAS_OPCOES,
  agruparPorVendedor,
  isAtribuidoAOutro,
  isSemDesfecho,
  type AtividadeDias,
  type VendedorGrupo,
} from "@/lib/atividade-shared";
import { formatDataHora } from "@/lib/agenda-shared";
import { formatDuracao } from "@/lib/vendedor-shared";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { StatusChip } from "@/components/status-chip";

type Sessao = Pick<LeadView, "id" | "started_at" | "last_seen_at" | "duracao_seg">;

function Sessoes({
  row,
  dias,
  workspaceId,
}: {
  row: AtividadeVendedorRow;
  dias: AtividadeDias;
  workspaceId: string;
}) {
  const [sessoes, setSessoes] = useState<Sessao[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
    // The dono can read lead_views directly (RLS "dono le auditoria").
    createClient()
      .from("lead_views")
      .select("id, started_at, last_seen_at, duracao_seg")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", row.lead_id)
      .eq("user_id", row.vendedor_id)
      .gte("started_at", desde)
      .order("started_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setErro(true);
        else setSessoes((data ?? []) as Sessao[]);
      });
    return () => {
      cancelled = true;
    };
  }, [row.lead_id, row.vendedor_id, dias, workspaceId]);

  if (erro) {
    return <p className="text-xs text-rose-400">Não foi possível carregar as sessões.</p>;
  }
  if (!sessoes) return <p className="text-xs text-zinc-600">Carregando sessões...</p>;
  if (sessoes.length === 0) {
    return <p className="text-xs text-zinc-600">Nenhuma sessão no período.</p>;
  }

  return (
    <table className="w-full text-left text-xs">
      <thead className="text-zinc-600">
        <tr>
          <th className="py-1 font-medium">Início</th>
          <th className="py-1 font-medium">Última atividade</th>
          <th className="py-1 text-right font-medium">Tempo</th>
        </tr>
      </thead>
      <tbody className="text-zinc-400">
        {sessoes.map((s) => (
          <tr key={s.id} className="border-t border-zinc-800/60">
            <td className="py-1.5">{formatDataHora(s.started_at)}</td>
            <td className="py-1.5">{formatDataHora(s.last_seen_at)}</td>
            <td className="py-1.5 text-right tabular-nums">
              {formatDuracao(s.duracao_seg)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LeadRow({
  row,
  dias,
  workspaceId,
  vendedorNome,
}: {
  row: AtividadeVendedorRow;
  dias: AtividadeDias;
  workspaceId: string;
  vendedorNome: (id: string) => string;
}) {
  const [aberto, setAberto] = useState(false);
  const semDesfecho = isSemDesfecho(row);
  const outro = isAtribuidoAOutro(row);

  return (
    <div
      className={`rounded-lg border ${
        semDesfecho ? "border-rose-900/60 bg-rose-950/20" : "border-zinc-800/80"
      }`}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5 text-left"
      >
        {aberto ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
        <span className="min-w-0 flex-1 basis-48 truncate text-sm font-medium text-zinc-100">
          {row.lead_nome}
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Eye className="h-3.5 w-3.5" />
          {row.aberturas}x
        </span>
        <span className="w-14 text-right text-xs tabular-nums text-zinc-300">
          {formatDuracao(row.total_seg)}
        </span>
        <span className="w-32 text-xs text-zinc-500">
          {formatDataHora(row.ultima_abertura)}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {row.tem_reuniao && <StatusChip tone="sky">Reunião</StatusChip>}
          {row.convertido && <StatusChip tone="emerald">Convertido</StatusChip>}
          {semDesfecho && (
            <StatusChip tone="rose">
              <AlertTriangle className="h-3 w-3" />
              Sem desfecho
            </StatusChip>
          )}
          {outro && (
            <StatusChip tone="amber">
              <AlertTriangle className="h-3 w-3" />
              Atribuído a {vendedorNome(row.lead_atribuido_a as string)}
            </StatusChip>
          )}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-zinc-800/60 px-4 py-3">
          <Sessoes row={row} dias={dias} workspaceId={workspaceId} />
          <Link
            href={`/leads?lead=${row.lead_id}`}
            className="mt-2 inline-block text-xs font-medium text-copper-400 hover:text-copper-300"
          >
            Abrir lead
          </Link>
        </div>
      )}
    </div>
  );
}

function GrupoCard({
  grupo,
  dias,
  workspaceId,
  vendedorNome,
}: {
  grupo: VendedorGrupo;
  dias: AtividadeDias;
  workspaceId: string;
  vendedorNome: (id: string) => string;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          {grupo.vendedor_email ?? "Vendedor"}
        </h2>
        <p className="text-xs text-zinc-500">
          {grupo.leads.length} lead(s) · {grupo.totalAberturas} abertura(s) ·{" "}
          {formatDuracao(grupo.totalSeg)}
          {grupo.semDesfecho > 0 && (
            <span className="ml-2 font-medium text-rose-400">
              {grupo.semDesfecho} sem desfecho
            </span>
          )}
        </p>
      </div>
      <div className="space-y-2">
        {grupo.leads.map((row) => (
          <LeadRow
            key={row.lead_id}
            row={row}
            dias={dias}
            workspaceId={workspaceId}
            vendedorNome={vendedorNome}
          />
        ))}
      </div>
    </section>
  );
}

export function AtividadeVendedoresBoard({
  rows,
  dias,
  workspaceId,
  erro,
}: {
  rows: AtividadeVendedorRow[];
  dias: AtividadeDias;
  workspaceId: string;
  erro: string | null;
}) {
  const isClient = useIsClient();
  const grupos = useMemo(() => agruparPorVendedor(rows), [rows]);
  const emailPorId = useMemo(
    () => new Map(grupos.map((g) => [g.vendedor_id, g.vendedor_email])),
    [grupos]
  );
  const vendedorNome = (id: string) => emailPorId.get(id) ?? "outro vendedor";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Atividade dos vendedores
          </h1>
          <p className="text-sm text-zinc-500">
            Quais leads cada vendedor abriu e por quanto tempo
          </p>
        </div>
        <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {ATIVIDADE_DIAS_OPCOES.map((opcao) => (
            <Link
              key={opcao}
              href={`/atividade-vendedores?dias=${opcao}`}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                dias === opcao
                  ? "bg-copper-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {opcao} dias
            </Link>
          ))}
        </div>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {erro}
        </p>
      )}

      {!isClient ? (
        <p className="text-sm text-zinc-600">Carregando relatório...</p>
      ) : grupos.length > 0 ? (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <GrupoCard
              key={grupo.vendedor_id}
              grupo={grupo}
              dias={dias}
              workspaceId={workspaceId}
              vendedorNome={vendedorNome}
            />
          ))}
        </div>
      ) : (
        !erro && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-16 text-center">
            <Users className="h-8 w-8 text-zinc-700" />
            <p className="text-sm text-zinc-500">
              Nenhuma abertura de lead registrada nos últimos {dias} dias.
            </p>
          </div>
        )
      )}
    </div>
  );
}
