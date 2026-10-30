"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  MapPin,
  User,
} from "lucide-react";
import type { ReuniaoStatus } from "@/lib/types";
import {
  DIAS_SEMANA,
  MESES,
  buildMonthCells,
  formatDiaLongo,
  formatHora,
  groupByDay,
  localDateKey,
  type ReuniaoComLead,
} from "@/lib/agenda-shared";
import {
  REUNIAO_CANAL_LABEL,
  REUNIAO_STATUS_LABEL,
  REUNIAO_STATUS_TONE,
} from "@/lib/vendedor-shared";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { StatusChip } from "@/components/status-chip";
import { ReuniaoActions } from "@/components/agenda/reuniao-actions";
import { useRotulos } from "@/components/rotulos-provider";

export type VendedorOption = { id: string; nome: string };

type Visao = "lista" | "calendario";
type Periodo = "proximas" | "anteriores" | "todas";

const STATUS_FILTROS: (ReuniaoStatus | "")[] = [
  "",
  "agendada",
  "realizada",
  "cancelada",
  "nao_compareceu",
];

const SELECT =
  "rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-copper-500";

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function ReuniaoItem({
  reuniao,
  mode,
}: {
  reuniao: ReuniaoComLead;
  mode: "vendedor" | "dono";
}) {
  const fim = new Date(
    new Date(reuniao.data_hora).getTime() + reuniao.duracao_min * 60_000
  ).toISOString();
  const leadHref =
    mode === "vendedor"
      ? `/vendedor/leads?lead=${reuniao.lead_id}`
      : `/leads?lead=${reuniao.lead_id}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">
            {formatHora(reuniao.data_hora)} – {formatHora(fim)}
            <span className="ml-2 font-normal text-zinc-500">
              {reuniao.duracao_min} min
            </span>
          </p>
          <Link
            href={leadHref}
            className="block truncate text-sm text-copper-400 hover:text-copper-300"
          >
            {reuniao.lead_nome}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusChip tone="zinc">{REUNIAO_CANAL_LABEL[reuniao.canal]}</StatusChip>
          <StatusChip tone={REUNIAO_STATUS_TONE[reuniao.status]}>
            {REUNIAO_STATUS_LABEL[reuniao.status]}
          </StatusChip>
        </div>
      </div>

      <div className="mt-2 space-y-1 text-xs text-zinc-500">
        {mode === "dono" && (
          <p className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {reuniao.vendedor_nome ?? "Vendedor removido"}
          </p>
        )}
        {reuniao.local_link && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {isUrl(reuniao.local_link) ? (
              <a
                href={reuniao.local_link}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sky-400 hover:text-sky-300"
              >
                {reuniao.local_link}
              </a>
            ) : (
              <span className="truncate">{reuniao.local_link}</span>
            )}
          </p>
        )}
        {reuniao.observacoes && (
          <p className="whitespace-pre-wrap break-words text-zinc-400">
            {reuniao.observacoes}
          </p>
        )}
      </div>

      {mode === "vendedor" && (
        <div className="mt-3 border-t border-zinc-800/80 pt-3">
          <ReuniaoActions reuniao={reuniao} />
        </div>
      )}
    </div>
  );
}

function ListaView({
  reunioes,
  mode,
  periodo,
}: {
  reunioes: ReuniaoComLead[];
  mode: "vendedor" | "dono";
  periodo: Periodo;
}) {
  const rotulos = useRotulos();
  const dias = useMemo(() => {
    const grupos = [...groupByDay(reunioes).entries()];
    // Upcoming reads top-down from today; past ones from the most recent.
    grupos.sort(([a], [b]) => (periodo === "anteriores" ? b.localeCompare(a) : a.localeCompare(b)));
    return grupos;
  }, [reunioes, periodo]);

  if (dias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-16 text-center">
        <CalendarDays className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-500">
          {rotulos.texto(
            "agenda",
            "Nenhuma reunião encontrada.",
            ({ plural }) => `Nenhum registro em ${plural} encontrado.`
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dias.map(([dia, itens]) => (
        <section key={dia}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider capitalize text-zinc-500">
            {formatDiaLongo(dia)}
          </h2>
          <div className="space-y-2">
            {itens.map((r) => (
              <ReuniaoItem key={r.id} reuniao={r} mode={mode} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CalendarioView({
  reunioes,
  mode,
}: {
  reunioes: ReuniaoComLead[];
  mode: "vendedor" | "dono";
}) {
  const rotulos = useRotulos();
  const hoje = new Date();
  const hojeKey = localDateKey(hoje);
  const [cursor, setCursor] = useState({
    year: hoje.getFullYear(),
    month: hoje.getMonth(),
  });
  const [selecionado, setSelecionado] = useState<string>(hojeKey);

  const porDia = useMemo(() => groupByDay(reunioes), [reunioes]);
  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor]
  );

  function mover(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const doDia = porDia.get(selecionado) ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label="Mês anterior"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-zinc-100">
            {MESES[cursor.month]} {cursor.year}
          </p>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label="Próximo mês"
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px text-center text-[11px] font-medium uppercase text-zinc-600">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px rounded-lg bg-zinc-800/60">
          {cells.map((cell) => {
            const itens = porDia.get(cell.key) ?? [];
            const ativo = cell.key === selecionado;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelecionado(cell.key)}
                className={`flex min-h-20 flex-col items-stretch gap-0.5 p-1.5 text-left transition-colors ${
                  ativo ? "bg-copper-600/15" : "bg-zinc-950 hover:bg-zinc-900"
                } ${cell.inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`text-xs font-medium ${
                    cell.key === hojeKey ? "text-copper-300" : "text-zinc-400"
                  }`}
                >
                  {cell.day}
                </span>
                {itens.slice(0, 2).map((r) => (
                  <span
                    key={r.id}
                    className={`truncate rounded px-1 py-0.5 text-[10px] ${
                      r.status === "cancelada"
                        ? "bg-zinc-800 text-zinc-500 line-through"
                        : r.status === "realizada"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-sky-500/10 text-sky-300"
                    }`}
                  >
                    {formatHora(r.data_hora)} {r.lead_nome}
                  </span>
                ))}
                {itens.length > 2 && (
                  <span className="text-[10px] text-zinc-500">
                    +{itens.length - 2} mais
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider capitalize text-zinc-500">
          {formatDiaLongo(selecionado)}
        </h2>
        {doDia.length > 0 ? (
          <div className="space-y-2">
            {doDia.map((r) => (
              <ReuniaoItem key={r.id} reuniao={r} mode={mode} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            {rotulos.texto(
              "agenda",
              "Nenhuma reunião neste dia.",
              ({ plural }) => `Nenhum registro em ${plural} neste dia.`
            )}
          </p>
        )}
      </section>
    </div>
  );
}

export function AgendaView({
  reunioes,
  mode,
  vendedores = [],
}: {
  reunioes: ReuniaoComLead[];
  mode: "vendedor" | "dono";
  /** Dono only: options for the "filter by vendedor" select. */
  vendedores?: VendedorOption[];
}) {
  const rotulos = useRotulos();
  const isClient = useIsClient();
  const [visao, setVisao] = useState<Visao>("lista");
  const [periodo, setPeriodo] = useState<Periodo>("proximas");
  const [status, setStatus] = useState<ReuniaoStatus | "">("");
  const [vendedorId, setVendedorId] = useState("");

  const filtradas = useMemo(() => {
    if (!isClient) return [];
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    return reunioes.filter((r) => {
      if (status && r.status !== status) return false;
      if (vendedorId && r.vendedor_id !== vendedorId) return false;
      // The calendar already navigates by month; the period only trims the list.
      if (visao === "lista") {
        const futura = new Date(r.data_hora) >= inicioHoje;
        if (periodo === "proximas" && !futura) return false;
        if (periodo === "anteriores" && futura) return false;
      }
      return true;
    });
  }, [isClient, reunioes, status, vendedorId, periodo, visao]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">{rotulos.plural("agenda")}</h1>
          <p className="text-sm text-zinc-500">
            {rotulos.texto(
              "agenda",
              mode === "dono" ? "Reuniões marcadas pelos vendedores" : "Suas reuniões com leads",
              ({ plural }) =>
                mode === "dono" ? `Lista de ${plural} dos vendedores` : `Sua lista de ${plural}`
            )}
          </p>
        </div>

        <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {(
            [
              ["lista", "Lista", List],
              ["calendario", "Calendário", CalendarDays],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisao(value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                visao === value
                  ? "bg-copper-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {visao === "lista" && (
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            className={SELECT}
            aria-label="Período"
          >
            <option value="proximas">Hoje e próximas</option>
            <option value="anteriores">Anteriores</option>
            <option value="todas">Todas</option>
          </select>
        )}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ReuniaoStatus | "")}
          className={SELECT}
          aria-label="Status"
        >
          {STATUS_FILTROS.map((s) => (
            <option key={s || "todos"} value={s}>
              {s ? REUNIAO_STATUS_LABEL[s] : "Todos os status"}
            </option>
          ))}
        </select>
        {mode === "dono" && (
          <select
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
            className={SELECT}
            aria-label="Vendedor"
          >
            <option value="">Todos os vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        )}
      </div>

      {!isClient ? (
        <p className="text-sm text-zinc-600">Carregando agenda...</p>
      ) : visao === "lista" ? (
        <ListaView reunioes={filtradas} mode={mode} periodo={periodo} />
      ) : (
        <CalendarioView reunioes={filtradas} mode={mode} />
      )}
    </div>
  );
}
