"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getContextoNavegacao, type ContextoNavegacao } from "@/lib/modulos/preferencias-servidor";
import {
  abasDe, chaveDoHref, gruposDoMenu, lerPreferencia, prepararPreferencia, type Preferencia,
} from "@/lib/modulos/preferencias";
import { CHAVE_VISAO_GERAL } from "@/lib/modulos/registry";
import type { ActionState } from "@/lib/actions/types";
import type { Json } from "@/lib/supabase/database.types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

/** Itens e telas que a pessoa vê agora: só eles podem ser alterados nesta gravação. */
function contextoDaPreferencia(ctx: ContextoNavegacao) {
  const itensVisiveis = gruposDoMenu(ctx.modulosVisiveis, ctx.painel, ctx.restrito)
    .flatMap((g) => g.itens)
    .map((i) => chaveDoHref(i.href));
  const chavesComAbas = [
    ...ctx.modulosVisiveis.filter((m) => abasDe(m).length > 0),
    ...(ctx.painel ? [CHAVE_VISAO_GERAL] : []),
  ];
  return { itensVisiveis, chavesComAbas };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Linha atual (pessoal = user_id; padrão = user_id nulo), sempre na empresa ativa. */
async function lerLinha(supabase: Supabase, ws: string, userId: string | null) {
  const q = supabase.from("menu_preferencias").select("id, itens, abas_ocultas").eq("workspace_id", ws);
  const { data, error } = await (userId ? q.eq("user_id", userId) : q.is("user_id", null)).maybeSingle();
  return { linha: data as { id: string; itens: unknown; abas_ocultas: unknown } | null, error };
}

/**
 * Grava sem upsert (o banco usa índices parciais): lê a linha; se existe, update pelo id; senão
 * insert. Se outra aba/sessão inserir no meio (violação de unicidade), relê e faz update.
 */
async function gravar(supabase: Supabase, ws: string, userId: string | null, pref: Preferencia, id: string | null) {
  const valores = { itens: pref.itens as unknown as Json, abas_ocultas: pref.abasOcultas as unknown as Json };
  if (id) {
    return supabase
      .from("menu_preferencias")
      .update({ ...valores, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("workspace_id", ws);
  }
  const ins = await supabase.from("menu_preferencias").insert({ workspace_id: ws, user_id: userId, ...valores });
  if (ins.error?.code !== "23505") return ins;
  const { linha } = await lerLinha(supabase, ws, userId);
  if (!linha) return ins;
  return supabase
    .from("menu_preferencias")
    .update({ ...valores, updated_at: new Date().toISOString() })
    .eq("id", linha.id)
    .eq("workspace_id", ws);
}

/**
 * Salva a navegação: `pessoal` (qualquer membro com painel ou módulos liberados) ou `empresa` (o
 * padrão; só fundador/cofundador). Só aparência: nada aqui liga módulo, muda permissão ou dado.
 */
export async function salvarNavegacao(entrada: unknown, escopo: "pessoal" | "empresa"): Promise<ActionState> {
  const ctx = await getContextoNavegacao();
  if (!ctx) return { error: SEM_PERMISSAO };
  if (escopo === "empresa" && !ctx.painel) return { error: "Só o fundador ou cofundador define o padrão da empresa." };
  if (escopo === "pessoal" && ctx.restrito && ctx.modulosVisiveis.length === 0) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const userId = escopo === "pessoal" ? ctx.userId : null;
  const { linha, error: erroLeitura } = await lerLinha(supabase, ctx.workspaceId, userId);
  if (erroLeitura) return { error: erroLeitura.message || "Não foi possível ler a preferência atual." };

  const preparada = prepararPreferencia(entrada, contextoDaPreferencia(ctx), lerPreferencia(linha));
  if (!preparada.ok) return { error: preparada.erro };

  const { error } = await gravar(supabase, ctx.workspaceId, userId, preparada.pref, linha?.id ?? null);
  if (error) return { error: error.message || "Não foi possível salvar a navegação." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Restaurar padrão": apaga só a linha PESSOAL; volta a valer o padrão da empresa (ou o registro). */
export async function restaurarNavegacao(): Promise<ActionState> {
  const ctx = await getContextoNavegacao();
  if (!ctx) return { error: SEM_PERMISSAO };
  const { error } = await (await createClient())
    .from("menu_preferencias")
    .delete()
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", ctx.userId);
  if (error) return { error: error.message || "Não foi possível restaurar o padrão." };
  revalidatePath("/", "layout");
  return { ok: true };
}
