"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LeadSchema, LeadResultadoSchema } from "@/lib/validations/lead";
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

function parseLeadForm(formData: FormData) {
  return LeadSchema.safeParse({
    nome: formData.get("nome"),
    contato: textOrNull(formData.get("contato")) ?? undefined,
    tem_site: formData.get("tem_site") === "on",
    site_link: textOrNull(formData.get("site_link")) ?? undefined,
    tem_insta: formData.get("tem_insta") === "on",
    insta_link: textOrNull(formData.get("insta_link")) ?? undefined,
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
    abordado_por: textOrNull(formData.get("abordado_por")) ?? undefined,
  });
}

export async function createLead(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("leads").insert({
    user_id: user.id,
    nome: parsed.data.nome,
    contato: parsed.data.contato ?? null,
    tem_site: parsed.data.tem_site,
    site_link: parsed.data.site_link ?? null,
    tem_insta: parsed.data.tem_insta,
    insta_link: parsed.data.insta_link ?? null,
    descricao: parsed.data.descricao ?? null,
    abordado_por: parsed.data.abordado_por ?? null,
    status: "abordar",
  });
  if (error) return { error: "Não foi possível criar o lead." };

  revalidatePath("/leads");
  return { ok: true };
}

export async function updateLead(
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const update: Record<string, unknown> = {
    nome: parsed.data.nome,
    contato: parsed.data.contato ?? null,
    tem_site: parsed.data.tem_site,
    site_link: parsed.data.site_link ?? null,
    tem_insta: parsed.data.tem_insta,
    insta_link: parsed.data.insta_link ?? null,
    descricao: parsed.data.descricao ?? null,
    abordado_por: parsed.data.abordado_por ?? null,
  };

  if (formData.has("resultado")) {
    const parsedResultado = LeadResultadoSchema.safeParse({
      resultado: formData.get("resultado"),
      motivo_negou: textOrNull(formData.get("motivo_negou")) ?? undefined,
    });
    if (!parsedResultado.success) {
      return {
        error: parsedResultado.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }
    if (
      parsedResultado.data.resultado === "negou" &&
      !parsedResultado.data.motivo_negou
    ) {
      return { error: "Informe o motivo da negativa." };
    }
    update.resultado = parsedResultado.data.resultado;
    update.motivo_negou =
      parsedResultado.data.resultado === "negou"
        ? parsedResultado.data.motivo_negou
        : null;
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("leads").update(update).eq("id", leadId);
  if (error) return { error: "Não foi possível atualizar o lead." };

  revalidatePath("/leads");
  return { ok: true };
}

export async function marcarAbordado(
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = LeadResultadoSchema.safeParse({
    resultado: formData.get("resultado"),
    motivo_negou: textOrNull(formData.get("motivo_negou")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (parsed.data.resultado === "negou" && !parsed.data.motivo_negou) {
    return { error: "Informe o motivo da negativa." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("leads")
    .update({
      status: "abordado",
      resultado: parsed.data.resultado,
      motivo_negou:
        parsed.data.resultado === "negou" ? parsed.data.motivo_negou : null,
    })
    .eq("id", leadId);
  if (error) return { error: "Não foi possível atualizar o lead." };

  revalidatePath("/leads");
  return { ok: true };
}

export async function deleteLead(leadId: string) {
  const { supabase } = await requireUser();
  await supabase.from("leads").delete().eq("id", leadId);
  revalidatePath("/leads");
}
