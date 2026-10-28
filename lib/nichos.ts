import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { NichoCatalogo } from "@/lib/nichos-shared";

/**
 * Catálogo de nichos ativos (nichos, nicho_modulos, modelos), legível por
 * qualquer conta logada. Falha de leitura = lista vazia: o passo de nicho some
 * e o fluxo segue como antes.
 */
export async function listarNichosDoCatalogo(supabase: SupabaseClient): Promise<NichoCatalogo[]> {
  try {
    const [nichos, ligacoes, modelos, modulos] = await Promise.all([
      supabase.from("nichos").select("chave, nome, descricao, icone").eq("ativo", true).order("ordem"),
      supabase.from("nicho_modulos").select("nicho_chave, modulo_chave").eq("recomendado", true).order("ordem"),
      supabase.from("modelos").select("nicho_chave, chave, nome, descricao").eq("ativo", true).order("ordem"),
      supabase.from("modulos").select("chave, nome"),
    ]);
    if (nichos.error || ligacoes.error || modelos.error || modulos.error) return [];

    const nomeDoModulo = new Map(
      ((modulos.data ?? []) as { chave: string; nome: string }[]).map((m) => [m.chave, m.nome])
    );
    return ((nichos.data ?? []) as { chave: string; nome: string; descricao: string | null; icone: string | null }[]).map(
      (n) => ({
        chave: n.chave,
        nome: n.nome,
        descricao: n.descricao,
        icone: n.icone,
        modulos: ((ligacoes.data ?? []) as { nicho_chave: string; modulo_chave: string }[])
          .filter((l) => l.nicho_chave === n.chave && nomeDoModulo.has(l.modulo_chave))
          .map((l) => ({ chave: l.modulo_chave, nome: nomeDoModulo.get(l.modulo_chave)! })),
        modelos: ((modelos.data ?? []) as { nicho_chave: string; chave: string; nome: string; descricao: string | null }[])
          .filter((m) => m.nicho_chave === n.chave)
          .map((m) => ({ chave: m.chave, nome: m.nome, descricao: m.descricao })),
      })
    );
  } catch {
    return [];
  }
}

export const getNichosDoCatalogo = cache(async () => listarNichosDoCatalogo(await createClient()));
