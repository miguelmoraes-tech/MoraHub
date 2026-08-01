"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Target, AlertTriangle } from "lucide-react";
import type { Lead, Proposta, FollowupLead, Campanha } from "@/lib/types";
import { LeadCard } from "@/components/lead-card";
import { NewLeadDialog } from "@/components/new-lead-dialog";

export type CampanhaOption = Pick<Campanha, "id" | "nome" | "status" | "canal">;
import { ExportButton } from "@/components/export-button";
import { SegmentFilter } from "@/components/segment-filter";
import { todayISO } from "@/lib/vencimentos/dates";
import { isFollowupPendente } from "@/lib/leads";

const PREVIA_OPTIONS = ["Prévia enviada", "Prévia pendente"];
const CONTATO_OPTIONS = ["WhatsApp/Ambos", "Só ligação"];

export function LeadsBoard({
  leads,
  propostas = [],
  followups = [],
  campanhas = [],
}: {
  leads: Lead[];
  propostas?: Proposta[];
  followups?: FollowupLead[];
  campanhas?: CampanhaOption[];
}) {
  const searchParams = useSearchParams();
  const highlightLeadId = searchParams.get("lead");
  const highlightedLead = highlightLeadId
    ? leads.find((l) => l.id === highlightLeadId)
    : undefined;

  const [tab, setTab] = useState<"abordar" | "abordado" | "convertido">(
    highlightedLead?.status ?? "abordar"
  );
  const [nicho, setNicho] = useState("");
  const [previaFiltro, setPreviaFiltro] = useState<"" | "enviada" | "pendente">(
    ""
  );
  const [contatoFiltro, setContatoFiltro] = useState<
    "" | "whatsapp" | "ligacao"
  >("");
  const [somenteAtrasados, setSomenteAtrasados] = useState(false);
  const hoje = todayISO();

  const nichos = useMemo(
    () =>
      [...new Set(leads.map((l) => l.nicho).filter((n): n is string => !!n))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [leads]
  );

  const porNicho = nicho ? leads.filter((l) => l.nicho === nicho) : leads;
  const porContato = contatoFiltro
    ? porNicho.filter((l) =>
        contatoFiltro === "ligacao"
          ? l.tipo_contato === "ligacao"
          : l.tipo_contato !== "ligacao"
      )
    : porNicho;
  const aAbordar = porContato.filter((lead) => lead.status === "abordar");
  const abordados = porContato.filter((lead) => lead.status === "abordado");
  const convertidos = porContato.filter((lead) => lead.status === "convertido");
  const abordadosFiltrados = previaFiltro
    ? abordados.filter((lead) =>
        previaFiltro === "enviada" ? lead.previa_enviada : !lead.previa_enviada
      )
    : abordados;
  const listaBase =
    tab === "abordar"
      ? aAbordar
      : tab === "abordado"
        ? abordadosFiltrados
        : convertidos;
  const list = somenteAtrasados
    ? listaBase.filter((lead) => isFollowupPendente(lead, hoje))
    : listaBase;
  const atrasadosCount = porContato.filter((lead) =>
    isFollowupPendente(lead, hoje)
  ).length;

  const propostasPorLead = useMemo(() => {
    const map = new Map<string, Proposta[]>();
    for (const proposta of propostas) {
      if (!proposta.lead_id) continue;
      const lista = map.get(proposta.lead_id) ?? [];
      lista.push(proposta);
      map.set(proposta.lead_id, lista);
    }
    return map;
  }, [propostas]);

  const followupsPorLead = useMemo(() => {
    const map = new Map<string, FollowupLead[]>();
    for (const followup of followups) {
      const lista = map.get(followup.lead_id) ?? [];
      lista.push(followup);
      map.set(followup.lead_id, lista);
    }
    return map;
  }, [followups]);

  const exportHref = nicho
    ? `/api/export/leads?nicho=${encodeURIComponent(nicho)}`
    : "/api/export/leads";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Leads</h1>
          <p className="text-sm text-zinc-500">
            {porContato.length} lead(s) no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href={exportHref} />
          <NewLeadDialog campanhas={campanhas} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => setTab("abordar")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === "abordar"
                ? "bg-copper-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            A abordar ({aAbordar.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("abordado")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === "abordado"
                ? "bg-copper-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Abordados ({abordados.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("convertido")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === "convertido"
                ? "bg-copper-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Convertidos ({convertidos.length})
          </button>
        </div>

        {nichos.length > 0 && (
          <SegmentFilter
            value={nicho}
            options={nichos}
            allLabel="Todos os nichos"
            onChange={setNicho}
          />
        )}

        <SegmentFilter
          value={
            contatoFiltro === "whatsapp"
              ? "WhatsApp/Ambos"
              : contatoFiltro === "ligacao"
                ? "Só ligação"
                : ""
          }
          options={CONTATO_OPTIONS}
          allLabel="Todos os contatos"
          onChange={(value) =>
            setContatoFiltro(
              value === "WhatsApp/Ambos"
                ? "whatsapp"
                : value === "Só ligação"
                  ? "ligacao"
                  : ""
            )
          }
        />

        {tab === "abordado" && abordados.length > 0 && (
          <SegmentFilter
            value={
              previaFiltro === "enviada"
                ? "Prévia enviada"
                : previaFiltro === "pendente"
                  ? "Prévia pendente"
                  : ""
            }
            options={PREVIA_OPTIONS}
            allLabel="Todas as prévias"
            onChange={(value) =>
              setPreviaFiltro(
                value === "Prévia enviada"
                  ? "enviada"
                  : value === "Prévia pendente"
                    ? "pendente"
                    : ""
              )
            }
          />
        )}

        <button
          type="button"
          onClick={() => setSomenteAtrasados((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            somenteAtrasados
              ? "border-rose-700/60 bg-rose-950/40 text-rose-300"
              : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Follow-up atrasado{atrasadosCount > 0 ? ` (${atrasadosCount})` : ""}
        </button>
      </div>

      {list.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              propostas={propostasPorLead.get(lead.id) ?? []}
              followups={followupsPorLead.get(lead.id) ?? []}
              campanhas={campanhas}
              autoOpenDetail={lead.id === highlightLeadId}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Target className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {somenteAtrasados
              ? "Nenhum lead com follow-up atrasado."
              : tab === "abordar"
                ? "Nenhum lead para abordar."
                : tab === "abordado"
                  ? "Nenhum lead abordado ainda."
                  : "Nenhum lead convertido ainda."}
          </p>
        </div>
      )}
    </div>
  );
}
