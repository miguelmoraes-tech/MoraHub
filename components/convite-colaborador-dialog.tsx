"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, X, Copy, Check } from "lucide-react";
import { convidarColaborador } from "@/app/(dashboard)/juridico/actions";
import Link from "next/link";
import { AVISO_ENVIADO, ROTA_APROVACOES } from "@/lib/aprovacoes-shared";
import type { ColaboradorPapel } from "@/lib/types";

export function ConviteColaboradorDialog({
  papelFixo,
}: {
  /** Locks the invite to one papel (the Vendedores page only invites 'comercial'). */
  papelFixo?: ColaboradorPapel;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openCount, setOpenCount] = useState(0);

  function handleOpen() {
    setOpenCount((c) => c + 1);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        {papelFixo === "comercial" ? "Convidar vendedor" : "Adicionar colaborador"}
      </button>

      {/* See new-cliente-dialog.tsx for why margin/display are handled this way. */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold">
              {papelFixo === "comercial" ? "Convidar vendedor" : "Adicionar colaborador"}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ConviteColaboradorForm
            key={openCount}
            papelFixo={papelFixo}
            onDone={() => dialogRef.current?.close()}
          />
        </div>
      </dialog>
    </>
  );
}

function ConviteColaboradorForm({
  onDone,
  papelFixo,
}: {
  onDone: () => void;
  papelFixo?: ColaboradorPapel;
}) {
  const [state, formAction, pending] = useActionState(
    convidarColaborador,
    undefined
  );
  const [copied, setCopied] = useState(false);
  const [papel, setPapel] = useState<ColaboradorPapel>(papelFixo ?? "contador");
  const created = state && "ok" in state && "inviteUrl" in state ? state : null;
  // 2+ fundadores: o convite foi só enviado para aprovação (ainda não há link).
  const enviadoParaAprovacao = !!state && "pendente" in state;

  async function handleCopy() {
    if (!created) return;
    await navigator.clipboard.writeText(created.inviteUrl);
    setCopied(true);
  }

  if (enviadoParaAprovacao) {
    return (
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-zinc-300">
          {AVISO_ENVIADO}. O link do convite aparece em{" "}
          <Link href={ROTA_APROVACOES} className="font-medium text-copper-400 underline underline-offset-2">
            Aprovações
          </Link>{" "}
          quando todos aprovarem.
        </p>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-copper-500"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  if (created) {
    return (
      <div className="space-y-4 px-5 py-4">
        <p className="text-sm text-zinc-300">
          Convite criado. Ainda não enviamos e-mail automaticamente — copie o
          link abaixo e envie para o colaborador.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-xs text-zinc-300">
            {created.inviteUrl}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1 rounded-md bg-copper-600 px-2 py-1 text-xs font-medium text-white hover:bg-copper-500"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-copper-500"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 px-5 py-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">E-mail *</label>
        <input
          name="email"
          type="email"
          required
          placeholder="contador@escritorio.com"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-400">Papel *</label>
        {papelFixo && <input type="hidden" name="papel" value={papelFixo} />}
        <select
          name={papelFixo ? undefined : "papel"}
          required
          disabled={!!papelFixo}
          value={papel}
          onChange={(e) => setPapel(e.target.value as typeof papel)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="contador">Contador</option>
          <option value="advogado">Advogado</option>
          <option value="financeiro">Financeiro</option>
          <option value="rh">RH</option>
          <option value="comercial">Comercial</option>
          <option value="marketing">Marketing</option>
        </select>
        {papel === "financeiro" && (
          <p className="text-xs text-zinc-500">
            Funcionário interno com acesso às seções financeiras desta
            empresa. Diferente de contador/advogado, um financeiro só pode
            estar vinculado a uma empresa por vez.
          </p>
        )}
        {papel === "rh" && (
          <p className="text-xs text-zinc-500">
            Funcionário interno com acesso ao módulo de RH desta empresa
            (Departamentos, Funcionários, Férias, Benefícios, Recrutamento,
            Avaliações e Ponto). Como o Financeiro, só pode estar vinculado a
            uma empresa por vez.
          </p>
        )}
        {papel === "comercial" && (
          <p className="text-xs text-zinc-500">
            Vendedor: vê os leads da empresa (somente leitura), marca
            reuniões e converte leads em clientes. Você acompanha a atividade
            dele em Atividade dos vendedores.
          </p>
        )}
        {papel === "marketing" && (
          <p className="text-xs text-zinc-500">
            Funcionário interno com acesso ao calendário de conteúdo e às
            campanhas desta empresa. Como o Financeiro, o RH e o Comercial,
            só pode estar vinculado a uma empresa por vez.
          </p>
        )}
      </div>

      {state && "error" in state && (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar convite"}
        </button>
      </div>
    </form>
  );
}
