"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { usePopoverFixo } from "@/lib/hooks/use-popover-fixo";
import { useToast } from "@/components/toast";
import { EVENTO_ALERTAS, atualizarAlertasLimitado } from "@/components/impressao-3d/alertas-cliente";
import { marcarNotificacao } from "@/app/(dashboard)/impressao-3d/notificacoes/actions";
import type { ResultadoAlertas } from "@/app/(dashboard)/impressao-3d/notificacoes/sino";
import {
  SEVERIDADE_ROTULO, agruparPorSeveridade, destinoDaReferencia, type Notificacao, type Severidade,
} from "@/lib/impressao-3d/alertas";
import { formatDataHora } from "@/lib/impressao-3d/numeros";

export interface ConfigSino {
  /** Quem tem leitura em Automações vê a lista; quem só tem o Dashboard vê apenas o total. */
  podeListar: boolean;
  /** Edição em Automações: pode marcar como lida. */
  podeMarcar: boolean;
  /** Módulos que a pessoa pode abrir: decide quais notificações viram link. */
  acessiveis: string[];
}

const COR: Record<Severidade, string> = {
  critico: "text-rose-400",
  aviso: "text-amber-400",
  info: "text-sky-400",
};

/**
 * Sino do cabeçalho: contador de alertas abertos e lista agrupada por severidade. Atualiza ao
 * montar e ao abrir (no máximo a cada 60 s). Item com acesso ao módulo de referência vira link; sem
 * acesso, só o título. Só notificações dentro do app: não envia e-mail, WhatsApp nem push.
 * O popover abre para baixo a partir do cabeçalho em que está (ancestral posicionado).
 */
export function SinoAlertas({ empresaId, config }: { empresaId: string; config: ConfigSino }) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAlertas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pendente, iniciar] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);
  const pos = usePopoverFixo(caixa, aberto);

  const atualizar = useCallback(
    async (forcar = false) => {
      setCarregando(true);
      const r = await atualizarAlertasLimitado(empresaId, forcar);
      if (r) setResultado(r);
      setCarregando(false);
    },
    [empresaId]
  );

  useEffect(() => {
    let ativo = true;
    atualizarAlertasLimitado(empresaId).then((r) => {
      if (!ativo) return;
      if (r) setResultado(r);
      setCarregando(false);
    });
    function aoAtualizar(e: Event) {
      setResultado((e as CustomEvent<ResultadoAlertas>).detail);
      setCarregando(false);
    }
    window.addEventListener(EVENTO_ALERTAS, aoAtualizar);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_ALERTAS, aoAtualizar);
    };
  }, [empresaId]);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const ok = resultado && "ok" in resultado ? resultado : null;
  const erro = resultado && "error" in resultado ? resultado.error : null;
  const total = ok?.total ?? 0;
  const itens = ok?.itens ?? null;
  const grupos = itens ? agruparPorSeveridade(itens) : [];

  function alternar() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir) void atualizar();
  }

  function marcar(n: Notificacao, lida: boolean) {
    iniciar(async () => {
      const r = await marcarNotificacao(n.id, lida);
      if (r && "error" in r) {
        toast.error(r.error);
        return;
      }
      setResultado((atual) =>
        atual && "ok" in atual && atual.itens
          ? {
              ...atual,
              itens: atual.itens.map((x) =>
                x.id === n.id ? { ...x, lida_em: lida ? new Date().toISOString() : null } : x
              ),
            }
          : atual
      );
    });
  }

  return (
    <div ref={caixa}>
      <button
        type="button"
        onClick={alternar}
        title="Alertas do nicho: estoque, prazos, manutenção, pagamentos e falhas"
        aria-label={total > 0 ? `Alertas do nicho: ${total} aberto${total > 1 ? "s" : ""}` : "Alertas do nicho"}
        aria-expanded={aberto}
        className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Alertas da operação"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-96 max-w-[calc(100vw-1.5rem)] rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl shadow-black/40"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-100">Alertas da operação</p>
            <button
              type="button"
              onClick={() => void atualizar(true)}
              disabled={carregando}
              className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
            >
              {carregando ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          <div className="max-h-96 space-y-3 overflow-y-auto p-3">
            {erro && <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">{erro}</p>}

            {!erro && !carregando && itens === null && (
              <p className="px-1 py-3 text-center text-xs text-zinc-500">
                {total === 0
                  ? "Nenhum alerta aberto."
                  : `${total} alerta${total > 1 ? "s" : ""} aberto${total > 1 ? "s" : ""}. Você não tem acesso à lista de notificações.`}
              </p>
            )}

            {!erro && !carregando && itens !== null && grupos.length === 0 && (
              <p className="px-1 py-3 text-center text-xs text-zinc-500">Nenhum alerta aberto.</p>
            )}

            {grupos.map((g) => (
              <section key={g.severidade} className="space-y-1.5">
                <h3 className={`px-1 text-[11px] font-semibold uppercase tracking-wide ${COR[g.severidade]}`}>
                  {SEVERIDADE_ROTULO[g.severidade]} ({g.itens.length})
                </h3>
                {g.itens.map((n) => {
                  const destino = destinoDaReferencia(n.referencia_tipo, n.referencia_id, config.acessiveis);
                  const lida = n.lida_em !== null;
                  return (
                    <div
                      key={n.id}
                      className={`rounded-lg border px-3 py-2 ${lida ? "border-zinc-800/60 opacity-70" : "border-zinc-800"}`}
                    >
                      {destino ? (
                        <Link
                          href={destino}
                          onClick={() => setAberto(false)}
                          className="text-sm font-medium text-zinc-100 hover:text-copper-300"
                        >
                          {n.titulo} <span className="text-xs text-copper-400">Ver →</span>
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-zinc-100">{n.titulo}</p>
                      )}
                      {n.mensagem && <p className="mt-0.5 text-xs text-zinc-400">{n.mensagem}</p>}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-600">{formatDataHora(n.created_at)}</span>
                        {config.podeMarcar && (
                          <button
                            type="button"
                            disabled={pendente}
                            onClick={() => marcar(n, !lida)}
                            className="text-[11px] text-zinc-500 hover:text-zinc-200 disabled:opacity-60"
                          >
                            {lida ? "Marcar como não lida" : "Marcar como lida"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          {config.podeListar && (
            <div className="border-t border-zinc-800 px-4 py-2.5">
              <Link
                href="/impressao-3d/notificacoes"
                onClick={() => setAberto(false)}
                className="text-xs font-medium text-copper-400 hover:text-copper-300"
              >
                Ver histórico de notificações →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
