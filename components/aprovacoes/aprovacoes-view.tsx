"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { cancelarAprovacao, votarAprovacao } from "@/lib/actions/aprovacoes";
import { useToast } from "@/components/toast";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { useAprovacoes } from "@/components/aprovacoes/aprovacoes-provider";
import { useIsClient } from "@/lib/hooks/use-is-client";
import {
  DIAS_HISTORICO,
  STATUS_ROTULO,
  erroDaFalha,
  historico,
  lerResultado,
  lerVotos,
  mensagemDoVoto,
  nomesDeFaltantes,
  pendentes,
  podeCancelar,
  podeVotar,
  quando,
  rotuloDoTipo,
  statusExibido,
  type Aprovacao,
  type StatusAprovacao,
} from "@/lib/aprovacoes-shared";

const TOM_STATUS: Record<StatusAprovacao, ChipTone> = {
  pendente: "amber",
  aprovada: "emerald",
  recusada: "rose",
  expirada: "zinc",
  cancelada: "zinc",
  falhou: "rose",
};

function Copiavel({ texto, rotulo }: { texto: string; rotulo: string }) {
  const toast = useToast();
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={texto}
        aria-label={rotulo}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200"
      />
      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
      >
        {copiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

/** Resultado de um pedido aprovado: link do convite ou código novo. Só fundadores chegam aqui. */
function ResultadoDoPedido({ a }: { a: Aprovacao }) {
  const r = lerResultado(a.resultado, a.status);
  if (!r) return null;
  if (r.tipo === "convite") {
    return (
      <div className="space-y-1.5 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3">
        <p className="text-xs text-emerald-300">
          Link do convite (vale por 7 dias). Envie para a pessoa por onde preferir.
        </p>
        <Copiavel texto={`${window.location.origin}${r.caminho}`} rotulo="Link do convite" />
      </div>
    );
  }
  return (
    <div className="space-y-1.5 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3">
      <p className="text-xs text-emerald-300">Novo código de acesso. O anterior deixou de valer.</p>
      <Copiavel texto={r.codigo} rotulo="Novo código" />
    </div>
  );
}

function Votos({ a }: { a: Aprovacao }) {
  const votos = lerVotos(a.votos);
  const faltam = nomesDeFaltantes(a.faltam);
  if (votos.length === 0 && faltam.length === 0) return null;
  return (
    <p className="text-xs text-zinc-500">
      {votos.length > 0 && (
        <>
          Já votaram:{" "}
          {votos
            .map((v) => `${v.nome}${v.aprovou === true ? " (aprovou)" : v.aprovou === false ? " (recusou)" : ""}`)
            .join(", ")}
          .{" "}
        </>
      )}
      {faltam.length > 0 && <>Faltam: {faltam.join(", ")}.</>}
    </p>
  );
}

function CartaoPendente({ a, meuId, agora }: { a: Aprovacao; meuId: string; agora: Date }) {
  const toast = useToast();
  const aprovacoes = useAprovacoes();
  const [pending, startTransition] = useTransition();
  const [fazendo, setFazendo] = useState<"aprovar" | "recusar" | "cancelar" | null>(null);

  function votar(aprovar: boolean) {
    setFazendo(aprovar ? "aprovar" : "recusar");
    startTransition(async () => {
      const r = await votarAprovacao(a.id, aprovar);
      setFazendo(null);
      if ("error" in r) {
        toast.error(r.error);
        await aprovacoes?.recarregar();
        return;
      }
      const m = mensagemDoVoto(r.status, aprovar);
      if (m.tom === "erro") toast.error(m.texto);
      else if (m.tom === "info") toast.info(m.texto);
      else toast.success(m.texto);
      await aprovacoes?.recarregar();
    });
  }

  function cancelar() {
    setFazendo("cancelar");
    startTransition(async () => {
      const r = await cancelarAprovacao(a.id);
      setFazendo(null);
      if ("error" in r) toast.error(r.error);
      else toast.success("Pedido cancelado.");
      await aprovacoes?.recarregar();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100">{a.resumo || rotuloDoTipo(a.tipo, a.resumo)}</p>
          <p className="text-xs text-zinc-500">
            Proposto por {a.proposto_por_nome || "um fundador"} em {quando(a.created_at)} · expira em{" "}
            {quando(a.expira_em)}
          </p>
        </div>
        <StatusChip tone="amber">{rotuloDoTipo(a.tipo, a.resumo)}</StatusChip>
      </div>

      <Votos a={a} />

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-3">
        {podeVotar(a, agora) && (
          <>
            <button
              type="button"
              onClick={() => votar(true)}
              disabled={pending}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {fazendo === "aprovar" ? "Enviando..." : "Aprovar"}
            </button>
            <button
              type="button"
              onClick={() => votar(false)}
              disabled={pending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
            >
              {fazendo === "recusar" ? "Enviando..." : "Recusar"}
            </button>
          </>
        )}
        {!podeVotar(a, agora) && (
          <span className="text-xs text-zinc-500">
            {a.proposto_por === meuId ? "Você propôs este pedido." : "Você já votou neste pedido."}
          </span>
        )}
        {podeCancelar(a, meuId, agora) && (
          <button
            type="button"
            onClick={cancelar}
            disabled={pending}
            className="ml-auto rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
          >
            {fazendo === "cancelar" ? "Cancelando..." : "Cancelar pedido"}
          </button>
        )}
      </div>
    </div>
  );
}

function CartaoHistorico({ a, agora }: { a: Aprovacao; agora: Date }) {
  const status = statusExibido(a, agora);
  return (
    <div className="space-y-2 rounded-lg border border-zinc-800/80 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-zinc-200">{a.resumo || rotuloDoTipo(a.tipo, a.resumo)}</p>
          <p className="text-xs text-zinc-500">
            {rotuloDoTipo(a.tipo, a.resumo)} · proposto por {a.proposto_por_nome || "um fundador"} ·{" "}
            {quando(a.decidido_em ?? a.expira_em ?? a.created_at)}
          </p>
        </div>
        <StatusChip tone={TOM_STATUS[status]}>{STATUS_ROTULO[status]}</StatusChip>
      </div>
      <Votos a={a} />
      <ResultadoDoPedido a={a} />
      {status === "falhou" && (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-300" title={a.erro ?? undefined}>
          {erroDaFalha(a.erro)}
        </p>
      )}
    </div>
  );
}

export function AprovacoesView({ meuId }: { meuId: string }) {
  const aprovacoes = useAprovacoes();
  // Datas e o link do convite dependem do navegador (fuso e origem): só depois da hidratação.
  const noCliente = useIsClient();
  if (!aprovacoes || !noCliente) return null;

  // Uma "foto" do relógio por renderização: os dois blocos concordam sobre o que venceu.
  const agora = new Date();
  const abertas = pendentes(aprovacoes.lista, agora);
  const passadas = historico(aprovacoes.lista, agora);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Pendentes ({abertas.length})
        </h2>
        {abertas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            <ShieldCheck className="mx-auto mb-2 h-5 w-5 text-zinc-600" />
            Nenhum pedido esperando aprovação.
          </p>
        ) : (
          abertas.map((a) => <CartaoPendente key={a.id} a={a} meuId={meuId} agora={agora} />)
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Histórico dos últimos {DIAS_HISTORICO} dias ({passadas.length})
        </h2>
        {passadas.length === 0 ? (
          <p className="text-xs text-zinc-600">Nada decidido nos últimos {DIAS_HISTORICO} dias.</p>
        ) : (
          passadas.map((a) => <CartaoHistorico key={a.id} a={a} agora={agora} />)
        )}
      </section>
    </div>
  );
}
