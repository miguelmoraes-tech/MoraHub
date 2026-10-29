"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { Aviso, Cartao, Seletor, Vazio, useAcao } from "@/components/impressao-3d/campos";
import { AtualizadorAlertas } from "@/components/impressao-3d/atualizador-alertas";
import { marcarNotificacao } from "@/app/(dashboard)/impressao-3d/notificacoes/actions";
import {
  SEVERIDADE_ROTULO, destinoDaReferencia, estaAberta, maisNovasPrimeiro, rotuloDoTipo,
  type Notificacao, type Severidade,
} from "@/lib/impressao-3d/alertas";
import { formatDataHora } from "@/lib/impressao-3d/numeros";
import { abaInicial } from "@/lib/modulos/preferencias";

const TOM: Record<Severidade, "rose" | "amber" | "sky"> = { critico: "rose", aviso: "amber", info: "sky" };

export function NotificacoesBoard({
  abas, empresaId, notificacoes, erro, truncado, acessiveis, podeEditar,
}: {
  /** Situações visíveis pela preferência de navegação (abertas, resolvidas, todas). */
  abas: string[];
  empresaId: string;
  notificacoes: Notificacao[];
  erro: string | null;
  truncado: boolean;
  acessiveis: string[];
  podeEditar: boolean;
}) {
  const [estado, setEstado] = useState<"abertas" | "resolvidas" | "todas">(abaInicial(abas, "abertas"));
  const [tipo, setTipo] = useState("");
  const [severidade, setSeveridade] = useState("");
  const { executar, pendente } = useAcao();

  // Tipos que existem nos dados: o banco decide os tipos, o app não mantém lista fechada.
  const tipos = useMemo(() => [...new Set(notificacoes.map((n) => n.tipo))].sort(), [notificacoes]);
  const visiveis = useMemo(
    () =>
      maisNovasPrimeiro(
        notificacoes.filter(
          (n) =>
            (estado === "todas" || (estado === "abertas") === estaAberta(n)) &&
            (!tipo || n.tipo === tipo) &&
            (!severidade || n.severidade === severidade)
        )
      ),
    [notificacoes, estado, tipo, severidade]
  );
  const abertas = notificacoes.filter(estaAberta).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <AtualizadorAlertas empresaId={empresaId} recarregar />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Notificações e alertas</h1>
          <p className="text-sm text-zinc-500">
            {abertas === 0 ? "Nenhum alerta aberto." : `${abertas} alerta${abertas > 1 ? "s" : ""} aberto${abertas > 1 ? "s" : ""}.`}
          </p>
        </div>
        <Link
          href="/impressao-3d/notificacoes/alertas"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        >
          <SlidersHorizontal className="h-4 w-4" /> Configurar alertas
        </Link>
      </div>

      <Aviso>
        As notificações aparecem só dentro do app (sino do cabeçalho e esta tela). Esta etapa não envia e-mail,
        WhatsApp nem push: o envio externo depende das integrações.
      </Aviso>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {truncado && <Aviso tom="alerta">Mostrando as 500 notificações mais recentes.</Aviso>}

      <Cartao titulo="Histórico">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Seletor rotulo="Situação" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
            {abas.includes("abertas") && <option value="abertas">Abertas</option>}
            {abas.includes("resolvidas") && <option value="resolvidas">Resolvidas</option>}
            {abas.includes("todas") && <option value="todas">Todas</option>}
          </Seletor>
          <Seletor rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{rotuloDoTipo(t)}</option>
            ))}
          </Seletor>
          <Seletor rotulo="Severidade" value={severidade} onChange={(e) => setSeveridade(e.target.value)}>
            <option value="">Todas</option>
            {(Object.keys(SEVERIDADE_ROTULO) as Severidade[]).map((s) => (
              <option key={s} value={s}>{SEVERIDADE_ROTULO[s]}</option>
            ))}
          </Seletor>
        </div>

        {visiveis.length === 0 ? (
          <Vazio>Nenhuma notificação para esses filtros.</Vazio>
        ) : (
          <ul className="divide-y divide-zinc-800/70">
            {visiveis.map((n) => {
              const destino = destinoDaReferencia(n.referencia_tipo, n.referencia_id, acessiveis);
              const lida = n.lida_em !== null;
              return (
                <li key={n.id} className={`flex flex-wrap items-start justify-between gap-3 py-3 ${lida && estaAberta(n) ? "opacity-70" : ""}`}>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip tone={TOM[n.severidade]}>{SEVERIDADE_ROTULO[n.severidade]}</StatusChip>
                      <span className="text-[11px] text-zinc-500">{rotuloDoTipo(n.tipo)}</span>
                      {!estaAberta(n) && <StatusChip tone="emerald">Resolvida</StatusChip>}
                    </div>
                    {destino ? (
                      <Link href={destino} className="text-sm font-medium text-zinc-100 hover:text-copper-300">
                        {n.titulo} <span className="text-xs text-copper-400">Ver →</span>
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-zinc-100">{n.titulo}</p>
                    )}
                    {n.mensagem && <p className="text-xs text-zinc-400">{n.mensagem}</p>}
                    <p className="text-[11px] text-zinc-600">
                      Criada em {formatDataHora(n.created_at)}
                      {n.resolvida_em && ` · resolvida em ${formatDataHora(n.resolvida_em)}`}
                      {n.lida_em && ` · lida em ${formatDataHora(n.lida_em)}`}
                    </p>
                  </div>
                  {podeEditar && estaAberta(n) && (
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() => executar(() => marcarNotificacao(n.id, !lida))}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
                    >
                      {lida ? "Marcar como não lida" : "Marcar como lida"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
