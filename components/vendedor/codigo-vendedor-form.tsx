"use client";

import { useActionState, useState } from "react";
import { solicitarAcessoVendedor } from "@/lib/actions/vendedor-codigo";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import {
  CODIGO_VENDEDOR_LENGTH,
  formatarCodigoVendedor,
} from "@/lib/vendedor-shared";

export function CodigoVendedorForm() {
  const [state, formAction, pending] = useActionState(
    solicitarAcessoVendedor,
    undefined
  );
  const [codigo, setCodigo] = useState("");
  useActionToast(state);

  const completo = codigo.replace("-", "").length === CODIGO_VENDEDOR_LENGTH;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="codigo" className="text-xs font-medium text-zinc-400">
          Código do gestor
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(formatarCodigoVendedor(e.target.value))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          placeholder="XXXXX-XXXXX"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-center font-mono text-lg uppercase tracking-[0.2em] text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !completo}
        className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
