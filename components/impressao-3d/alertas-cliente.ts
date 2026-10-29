"use client";

import { atualizarAlertas, type ResultadoAlertas } from "@/app/(dashboard)/impressao-3d/notificacoes/sino";
import { deveAtualizar } from "@/lib/impressao-3d/alertas";

/**
 * Atualização dos alertas com limite de frequência no cliente (no máximo 1 chamada a
 * p3d_atualizar_alertas por minuto por empresa e por aba). O sino, o Dashboard e a tela de
 * notificações dividem este estado: quem chega dentro do intervalo recebe o último resultado em vez
 * de chamar o banco de novo. O limite é só economia; quem decide o que existe é o banco.
 */
export const EVENTO_ALERTAS = "p3d-alertas";

let ultimaChamada: number | null = null;
let empresa: string | null = null;
let ultimoResultado: ResultadoAlertas | null = null;
let emVoo: Promise<ResultadoAlertas> | null = null;

export async function atualizarAlertasLimitado(chaveEmpresa: string, forcar = false): Promise<ResultadoAlertas | null> {
  if (empresa !== chaveEmpresa) {
    empresa = chaveEmpresa;
    ultimaChamada = null;
    ultimoResultado = null;
    emVoo = null;
  }
  if (emVoo) return emVoo;
  if (!forcar && !deveAtualizar(ultimaChamada, Date.now())) return ultimoResultado;

  ultimaChamada = Date.now();
  const chamada = atualizarAlertas().then(
    (r) => r,
    () => ({ error: "Não foi possível atualizar os alertas." }) as ResultadoAlertas
  );
  emVoo = chamada;
  const r = await chamada;
  if (empresa === chaveEmpresa) {
    emVoo = null;
    ultimoResultado = r;
    // Erro não conta como atualização: a próxima abertura tenta de novo.
    if ("error" in r) ultimaChamada = null;
    window.dispatchEvent(new CustomEvent<ResultadoAlertas>(EVENTO_ALERTAS, { detail: r }));
  }
  return r;
}
