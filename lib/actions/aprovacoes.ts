"use server";

import { revalidatePath } from "next/cache";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { erroDeAprovacao } from "@/lib/aprovacoes-shared";

/**
 * Votar e cancelar pedidos de aprovação. A empresa vem do servidor e só
 * fundador/cofundador passa por aqui; o banco confere de novo (aprovar_alteracao
 * só aceita quem pode votar, cancelar_alteracao só quem propôs).
 */

const SEM_PAINEL = "Só os fundadores da empresa podem decidir isto.";

export type ResultadoVotoAcao = { ok: true; status: string } | { error: string };

export async function votarAprovacao(id: string, aprovar: boolean): Promise<ResultadoVotoAcao> {
  if (!id) return { error: "Pedido não encontrado." };
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const { data, error } = await (await createClient()).rpc("aprovar_alteracao", {
    p_id: id,
    p_aprovar: aprovar,
  });
  if (error || typeof data !== "string") return { error: erroDeAprovacao(error?.message) };

  // Aprovada = a alteração rodou (módulos, nome, nicho...): menu e telas mudam.
  revalidatePath("/", "layout");
  return { ok: true, status: data };
}

export async function cancelarAprovacao(id: string): Promise<{ ok: true } | { error: string }> {
  if (!id) return { error: "Pedido não encontrado." };
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const { error } = await (await createClient()).rpc("cancelar_alteracao", { p_id: id });
  if (error) return { error: erroDeAprovacao(error.message) };

  revalidatePath("/", "layout");
  return { ok: true };
}


