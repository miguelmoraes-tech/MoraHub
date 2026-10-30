"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { cancelarCodigoCofundador, gerarCodigoCofundador } from "@/app/(dashboard)/socios/actions";
import { useToast } from "@/components/toast";
import {
  VALIDADES_CODIGO_COFUNDADOR,
  VALIDADE_PADRAO_HORAS,
  type CodigoCofundador,
} from "@/lib/socios-shared";

function formatarQuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(d);
}

/**
 * "Adicionar cofundador por código": o fundador gera um código de uso único; a pessoa digita em "Entrar
 * numa empresa com código"; o pedido chega aqui para o fundador aprovar. O código ativo é o que está na
 * tabela (workspace_codigos_cofundador, somente leitura): não usado, não cancelado e dentro da validade.
 */
export function CofundadorCodigo({ ativo }: { ativo: CodigoCofundador | null }) {
  const toast = useToast();
  const [pendente, iniciar] = useTransition();
  const [horas, setHoras] = useState(VALIDADE_PADRAO_HORAS);
  // O que acabou de ser gerado/cancelado vale até a página reler o servidor.
  const [gerado, setGerado] = useState<CodigoCofundador | null>(null);
  const [cancelado, setCancelado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const codigo = cancelado ? gerado : (gerado ?? ativo);

  function gerar() {
    setErro(null);
    iniciar(async () => {
      const r = await gerarCodigoCofundador(horas);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      if (r.pendente) {
        // Não acontece neste fluxo (a RPC gera na hora), mas nunca mostra código que não existe.
        toast.aprovacao();
        return;
      }
      setGerado({ id: "novo", codigo: r.codigo, expiraEm: r.expiraEm });
      setCancelado(false);
      toast.success("Código gerado. O anterior, se existia, foi invalidado.");
    });
  }

  function cancelar() {
    setErro(null);
    iniciar(async () => {
      const r = await cancelarCodigoCofundador();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      if (r.pendente) {
        toast.aprovacao();
        return;
      }
      setCancelado(true);
      setGerado(null);
      toast.success(r.cancelados > 0 ? "Código cancelado." : "Não havia código ativo para cancelar.");
    });
  }

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-copper-600/20 text-copper-300">
          <KeyRound className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Adicionar cofundador por código</h2>
          <p className="text-xs text-zinc-500">
            Cofundador tem o mesmo poder do fundador. Não há convite por link: a pessoa digita um código e você aprova o pedido.
          </p>
        </div>
      </div>

      {codigo && (
        <div className="space-y-3 rounded-lg border border-copper-600/40 bg-copper-600/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-copper-300">Código ativo</p>
          <div className="flex flex-wrap items-center gap-3">
            <output
              aria-label="Código de cofundador"
              className="select-all break-all rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 font-mono text-2xl font-semibold tracking-[0.2em] text-zinc-50"
            >
              {codigo.codigo}
            </output>
            <button
              type="button"
              onClick={copiar}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-zinc-400">Vale até {formatarQuando(codigo.expiraEm)} e só pode ser usado uma vez.</p>
          <p className="text-xs leading-relaxed text-zinc-300">
            Passe este código para a pessoa. Ela entra no Hub (cria a conta, se não tiver), abre &quot;Entrar numa empresa com
            código&quot; e digita o código. O pedido chega aqui para você aprovar. O código vale uma única vez e expira.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="validade-codigo" className="text-xs font-medium text-zinc-400">
            Validade
          </label>
          <select
            id="validade-codigo"
            value={horas}
            onChange={(e) => setHoras(Number(e.target.value))}
            disabled={pendente}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            {VALIDADES_CODIGO_COFUNDADOR.map((v) => (
              <option key={v.horas} value={v.horas}>{v.rotulo}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={gerar}
          disabled={pendente}
          className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:opacity-60"
        >
          {pendente ? "Aguarde..." : codigo ? "Gerar novo código" : "Gerar código"}
        </button>
        {codigo && (
          <button
            type="button"
            onClick={cancelar}
            disabled={pendente}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-rose-950/50 hover:text-rose-300 disabled:opacity-60"
          >
            Cancelar código
          </button>
        )}
      </div>
      {codigo && <p className="text-[11px] text-zinc-600">&quot;Gerar novo código&quot; invalida o código atual se ele ainda não foi usado.</p>}
      {erro && (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">{erro}</p>
      )}
    </section>
  );
}
