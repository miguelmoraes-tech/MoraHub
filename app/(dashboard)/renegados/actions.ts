"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { RenegadoSchema } from "@/lib/validations/renegado";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseRenegadoForm(formData: FormData) {
  return RenegadoSchema.safeParse({
    nome: formData.get("nome"),
    contato: textOrNull(formData.get("contato")) ?? undefined,
    tem_site: formData.get("tem_site") === "on",
    site_link: textOrNull(formData.get("site_link")) ?? undefined,
    tem_insta: formData.get("tem_insta") === "on",
    insta_link: textOrNull(formData.get("insta_link")) ?? undefined,
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
    abordado_por: formData.get("abordado_por") || "Miguel (Fundador)",
    motivo_negou: textOrNull(formData.get("motivo_negou")) ?? undefined,
    data_abordagem: textOrNull(formData.get("data_abordagem")) ?? undefined,
  });
}

export async function createRenegado(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseRenegadoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("renegados").insert({
    user_id: user.id,
    nome: parsed.data.nome,
    contato: parsed.data.contato ?? null,
    tem_site: parsed.data.tem_site,
    site_link: parsed.data.site_link ?? null,
    tem_insta: parsed.data.tem_insta,
    insta_link: parsed.data.insta_link ?? null,
    descricao: parsed.data.descricao ?? null,
    abordado_por: parsed.data.abordado_por,
    motivo_negou: parsed.data.motivo_negou ?? null,
    data_abordagem: parsed.data.data_abordagem ?? null,
  });
  if (error) return { error: "Não foi possível criar o renegado." };

  revalidatePath("/renegados");
  return { ok: true };
}

export async function updateRenegado(
  renegadoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseRenegadoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("renegados")
    .update({
      nome: parsed.data.nome,
      contato: parsed.data.contato ?? null,
      tem_site: parsed.data.tem_site,
      site_link: parsed.data.site_link ?? null,
      tem_insta: parsed.data.tem_insta,
      insta_link: parsed.data.insta_link ?? null,
      descricao: parsed.data.descricao ?? null,
      abordado_por: parsed.data.abordado_por,
      motivo_negou: parsed.data.motivo_negou ?? null,
      data_abordagem: parsed.data.data_abordagem ?? null,
    })
    .eq("id", renegadoId);
  if (error) return { error: "Não foi possível atualizar o renegado." };

  revalidatePath("/renegados");
  return { ok: true };
}

export async function deleteRenegado(renegadoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("renegados").delete().eq("id", renegadoId);
  revalidatePath("/renegados");
}
