"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao, temExtra } from "@/lib/empresa-ativa";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LeadSchema,
  LeadResultadoSchema,
  LeadPreviaSchema,
  FollowupLeadSchema,
} from "@/lib/validations/lead";
import { ClienteSchema } from "@/lib/validations/cliente";
import { todayISO } from "@/lib/vencimentos/dates";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

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
    nicho: textOrNull(formData.get("nicho")) ?? undefined,
    tipo_contato: formData.get("tipo_contato"),
    campanha_id: textOrNull(formData.get("campanha_id")) ?? undefined,
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

  const { supabase } = await requireUser();
  const acesso = await getAcessoEdicao("leads");
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await supabase.from("leads").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    nome: parsed.data.nome,
    contato: temExtra(acesso, "contato") ? (parsed.data.contato ?? null) : null,
    tem_site: parsed.data.tem_site,
    site_link: parsed.data.site_link ?? null,
    tem_insta: parsed.data.tem_insta,
    insta_link: parsed.data.insta_link ?? null,
    descricao: parsed.data.descricao ?? null,
    abordado_por: parsed.data.abordado_por ?? null,
    nicho: parsed.data.nicho ?? null,
    tipo_contato: parsed.data.tipo_contato,
    campanha_id: parsed.data.campanha_id ?? null,
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
    nicho: parsed.data.nicho ?? null,
    tipo_contato: parsed.data.tipo_contato,
    campanha_id: parsed.data.campanha_id ?? null,
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

  if (formData.has("previa_section")) {
    const parsedPrevia = LeadPreviaSchema.safeParse({
      previa_enviada: formData.get("previa_enviada") === "on",
      data_previa: textOrNull(formData.get("data_previa")) ?? undefined,
    });
    if (!parsedPrevia.success) {
      return {
        error: parsedPrevia.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }
    update.previa_enviada = parsedPrevia.data.previa_enviada;
    update.data_previa = parsedPrevia.data.previa_enviada
      ? parsedPrevia.data.data_previa ?? null
      : null;
  }

  const { supabase } = await requireUser();
  const acesso = await getAcessoEdicao("leads");
  if (!acesso) return { error: SEM_PERMISSAO };
  // Sem o extra "contato" o campo nem aparece no formulário: não o apaga.
  if (!temExtra(acesso, "contato")) delete update.contato;
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

  const { supabase } = await requireUser();
  if (!(await getAcessoEdicao("leads"))) return { error: SEM_PERMISSAO };
  const { error } = await supabase
    .from("leads")
    .update({
      status: "abordado",
      resultado: parsed.data.resultado,
      motivo_negou:
        parsed.data.resultado === "negou"
          ? parsed.data.motivo_negou ?? null
          : null,
    })
    .eq("id", leadId);
  if (error) return { error: "Não foi possível atualizar o lead." };

  revalidatePath("/leads");
  return { ok: true };
}

export async function registrarFollowup(
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = FollowupLeadSchema.safeParse({
    canal: formData.get("canal"),
    resumo: formData.get("resumo"),
    proximo_followup: formData.get("proximo_followup"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  const acesso = await getAcessoEdicao("leads");
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error: followupError } = await supabase.from("followups_lead").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    lead_id: leadId,
    canal: parsed.data.canal,
    resumo: parsed.data.resumo,
    proximo_followup: parsed.data.proximo_followup,
  });
  if (followupError) return { error: "Não foi possível registrar o contato." };

  const { error: leadError } = await supabase
    .from("leads")
    .update({
      ultimo_contato: todayISO(),
      proximo_followup: parsed.data.proximo_followup,
    })
    .eq("id", leadId);
  if (leadError) {
    return {
      error: "Contato registrado, mas não foi possível atualizar o lead.",
    };
  }

  revalidatePath("/leads");
  revalidatePath("/comercial");
  return { ok: true };
}

export async function deleteLead(leadId: string) {
  const { supabase } = await requireUser();
  if (!(await getAcessoEdicao("leads"))) return;
  await supabase.from("leads").delete().eq("id", leadId);
  revalidatePath("/leads");
}

export async function convertLeadToCliente(
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ClienteSchema.safeParse({
    nome: formData.get("nome"),
    telefone: textOrNull(formData.get("telefone")) ?? undefined,
    email: textOrNull(formData.get("email")) ?? undefined,
    resumo: textOrNull(formData.get("resumo")) ?? undefined,
    site_link: textOrNull(formData.get("site_link")) ?? undefined,
    status: formData.get("status") ?? "em_andamento",
    segmento: textOrNull(formData.get("segmento")) ?? undefined,
    abordado_por: textOrNull(formData.get("abordado_por")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  // Converter grava em leads e em clientes: precisa de edição nos dois.
  const [acesso, acessoClientes] = await Promise.all([
    getAcessoEdicao("leads"),
    getAcessoEdicao("clientes"),
  ]);
  if (!acesso || !acessoClientes) return { error: SEM_PERMISSAO };

  const { data: cliente, error } = await supabase
    .from("clientes")
    .insert({
      user_id: acesso.donoId,
      workspace_id: acesso.workspaceId,
      nome: parsed.data.nome,
      telefone: parsed.data.telefone ?? null,
      email: parsed.data.email ?? null,
      resumo: parsed.data.resumo ?? null,
      site_link: parsed.data.site_link ?? null,
      status: parsed.data.status,
      segmento: parsed.data.segmento ?? null,
      abordado_por: parsed.data.abordado_por ?? null,
      lead_origem_id: leadId,
    })
    .select("id")
    .single();
  if (error || !cliente) return { error: "Não foi possível criar o cliente." };

  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: "convertido" })
    .eq("id", leadId);
  if (updateError) {
    return {
      error:
        "Cliente criado, mas não foi possível atualizar o status do lead.",
    };
  }

  revalidatePath("/leads");
  revalidatePath("/clientes");
  // O detalhe do cliente é só do painel completo; os demais caem na lista.
  redirect(acesso.ehDono ? `/clientes/${(cliente as { id: string }).id}` : "/clientes");
}
