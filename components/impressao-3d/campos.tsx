"use client";

import { useState, useTransition } from "react";
import { Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/toast";
import type { ActionState } from "@/lib/actions/types";

/**
 * Peças de formulário do nicho Impressão 3D, no padrão visual do app (zinc +
 * copper). Campos numéricos usam type="number" step="any"; o servidor também
 * aceita vírgula (lib/impressao-3d/numeros.ts).
 */

export const CLASSE_CAMPO =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500 disabled:opacity-60";

export function Campo({
  rotulo,
  ajuda,
  className = "",
  children,
}: {
  rotulo: string;
  ajuda?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-medium text-zinc-400">{rotulo}</label>
      {children}
      {ajuda && <p className="text-[11px] leading-snug text-zinc-600">{ajuda}</p>}
    </div>
  );
}

export function Entrada({
  rotulo,
  ajuda,
  className,
  ...props
}: { rotulo: string; ajuda?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} className={className}>
      <input className={CLASSE_CAMPO} {...props} />
    </Campo>
  );
}

export function Numero({
  rotulo,
  ajuda,
  className,
  ...props
}: { rotulo: string; ajuda?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} className={className}>
      <input type="number" step="any" min="0" inputMode="decimal" className={CLASSE_CAMPO} {...props} />
    </Campo>
  );
}

export function Seletor({
  rotulo,
  ajuda,
  className,
  children,
  ...props
}: { rotulo: string; ajuda?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} className={className}>
      <select className={CLASSE_CAMPO} {...props}>
        {children}
      </select>
    </Campo>
  );
}

export function AreaTexto({
  rotulo,
  ajuda,
  className,
  ...props
}: { rotulo: string; ajuda?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} className={className}>
      <textarea rows={2} className={CLASSE_CAMPO} {...props} />
    </Campo>
  );
}

export function BotaoPrimario({
  pendente,
  children,
  type = "submit",
  disabled,
  ...props
}: { pendente?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className="rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
      {...props}
      disabled={pendente || disabled}
    >
      {children}
    </button>
  );
}

export function BotaoNovo({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );
}

export function BotaoTexto({
  children,
  perigo,
  ...props
}: { perigo?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-60 ${
        perigo ? "text-rose-400 hover:bg-rose-950/50" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Cartao({
  titulo,
  icone,
  acoes,
  children,
}: {
  titulo: string;
  icone?: React.ReactNode;
  acoes?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          {icone && <span className="text-zinc-500">{icone}</span>}
          {titulo}
        </div>
        {acoes}
      </div>
      {children}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-600">{children}</p>;
}

export function Aviso({
  tom = "info",
  children,
}: {
  tom?: "info" | "alerta" | "erro";
  children: React.ReactNode;
}) {
  const classe = {
    info: "border-sky-500/20 bg-sky-500/5 text-sky-300",
    alerta: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    erro: "border-rose-500/20 bg-rose-500/5 text-rose-300",
  }[tom];
  const Icone = tom === "info" ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${classe}`}>
      <Icone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function SomenteLeitura() {
  return <p className="text-xs text-zinc-500">Você tem acesso somente de leitura a este módulo.</p>;
}

export function Rotulado({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
      {children}
    </span>
  );
}

/** Texto do erro de uma action (ActionState) dentro de um formulário. */
export function ErroForm({ state }: { state: ActionState }) {
  if (!state || !("error" in state)) return null;
  return <p className="text-xs text-rose-400">{state.error}</p>;
}

/**
 * Roda uma action avulsa (excluir, arquivar...) com toast de erro/sucesso.
 * `confirmar` pede confirmação nativa antes.
 */
export function useAcao() {
  const toast = useToast();
  const [pendente, iniciar] = useTransition();
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);

  function executar(
    fn: () => Promise<ActionState>,
    opcoes: { confirmar?: string; sucesso?: string; aoConcluir?: () => void } = {}
  ) {
    if (opcoes.confirmar && !window.confirm(opcoes.confirmar)) return;
    iniciar(async () => {
      const r = await fn();
      if (r && "error" in r) {
        setUltimoErro(r.error);
        toast.error(r.error);
        return;
      }
      setUltimoErro(null);
      if (opcoes.sucesso) toast.success(opcoes.sucesso);
      opcoes.aoConcluir?.();
    });
  }

  return { executar, pendente, ultimoErro };
}
