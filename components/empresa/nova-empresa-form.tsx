"use client";

import { useActionState } from "react";
import { criarEmpresaInicial } from "@/lib/actions/empresa";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { EMPRESA_NOME_MAX, EMPRESA_NOME_MIN } from "@/lib/empresa";

export function NovaEmpresaForm() {
  const [state, formAction, pending] = useActionState(criarEmpresaInicial, undefined);
  useActionToast(state);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="nome" className="text-xs font-medium text-zinc-400">
          Nome da empresa
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          minLength={EMPRESA_NOME_MIN}
          maxLength={EMPRESA_NOME_MAX}
          autoFocus
          autoComplete="organization"
          placeholder="Ex.: Studio Aurora"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-copper-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar empresa"}
      </button>
    </form>
  );
}
