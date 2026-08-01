"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveDonoIdForMarketing } from "@/lib/marketing";
import { CampanhaSchema } from "@/lib/validations/campanha";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return CampanhaSchema.safeParse({
    nome: formData.get("nome"),
    canal: formData.get("canal") ?? "meta_ads",
    status: formData.get("status") ?? "planejada",
    data_inicio: textOrNull(formData.get("data_inicio")) ?? undefined,
    data_fim: textOrNull(formData.get("data_fim")) ?? undefined,
    orcamento_planejado: textOrNull(formData.get("orcamento_planejado")) ?? undefined,
    valor_gasto: textOrNull(formData.get("valor_gasto")) ?? undefined,
    cliques: textOrNull(formData.get("cliques")) ?? undefined,
    impressoes: textOrNull(formData.get("impressoes")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createCampanha(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const donoId = await getEffectiveDonoIdForMarketing();
  if (!donoId) return { error: "Sessão expirada. Faça login novamente." };

  const supabase = await createClient();
  const { error } = await supabase.from("campanhas").insert({
    user_id: donoId,
    nome: parsed.data.nome,
    canal: parsed.data.canal,
    status: parsed.data.status,
    data_inicio: parsed.data.data_inicio ?? null,
    data_fim: parsed.data.data_fim ?? null,
    orcamento_planejado: parsed.data.orcamento_planejado ?? null,
    valor_gasto: parsed.data.valor_gasto ?? 0,
    cliques: parsed.data.cliques ?? 0,
    impressoes: parsed.data.impressoes ?? 0,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a campanha." };

  revalidatePath("/marketing/campanhas");
  revalidatePath("/marketing");
  return { ok: true };
}

export async function updateCampanha(
  campanhaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("campanhas")
    .update({
      nome: parsed.data.nome,
      canal: parsed.data.canal,
      status: parsed.data.status,
      data_inicio: parsed.data.data_inicio ?? null,
      data_fim: parsed.data.data_fim ?? null,
      orcamento_planejado: parsed.data.orcamento_planejado ?? null,
      valor_gasto: parsed.data.valor_gasto ?? 0,
      cliques: parsed.data.cliques ?? 0,
      impressoes: parsed.data.impressoes ?? 0,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", campanhaId);
  if (error) return { error: "Não foi possível atualizar a campanha." };

  revalidatePath("/marketing/campanhas");
  revalidatePath("/marketing");
  return { ok: true };
}

export async function deleteCampanha(campanhaId: string) {
  const supabase = await createClient();
  await supabase.from("campanhas").delete().eq("id", campanhaId);
  revalidatePath("/marketing/campanhas");
  revalidatePath("/marketing");
}
