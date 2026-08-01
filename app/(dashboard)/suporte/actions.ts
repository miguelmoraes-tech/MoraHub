"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TicketSchema, TicketRespostaSchema } from "@/lib/validations/ticket";
import type { ActionState } from "@/lib/actions/types";
import type { TicketStatus } from "@/lib/types";

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

/** Every surface a ticket list/detail could currently be viewed from. */
function revalidateSuporte(ticketId?: string) {
  revalidatePath("/suporte");
  revalidatePath("/colaborador/advogado/suporte");
  revalidatePath("/colaborador/contador/suporte");
  if (ticketId) revalidatePath(`/suporte/${ticketId}`);
}

export async function abrirTicket(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = TicketSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    titulo: formData.get("titulo"),
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
    categoria: formData.get("categoria"),
    prioridade: formData.get("prioridade"),
    responsavel_id: textOrNull(formData.get("responsavel_id")) ?? undefined,
    sla_horas: formData.get("sla_horas") || "24",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  // The ticket's owner is derived from the selected cliente, not the
  // caller — this is what lets any linked colaborador (any papel) open a
  // ticket for the company they collaborate on, RLS-checked via clientes'
  // own "colaborador vinculado ve clientes" policy.
  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .select("user_id")
    .eq("id", parsed.data.cliente_id)
    .single();
  if (clienteError || !cliente) {
    return { error: "Cliente inválido." };
  }

  const { error } = await supabase.from("tickets").insert({
    user_id: cliente.user_id,
    cliente_id: parsed.data.cliente_id,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao ?? null,
    categoria: parsed.data.categoria,
    prioridade: parsed.data.prioridade,
    responsavel_id: parsed.data.responsavel_id ?? null,
    sla_horas: parsed.data.sla_horas,
    status: "aberto",
  });
  if (error) return { error: "Não foi possível abrir o ticket." };

  revalidateSuporte();
  return { ok: true };
}

export async function mudarStatusTicket(ticketId: string, novoStatus: TicketStatus) {
  const { supabase } = await requireUser();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("data_primeira_resposta, data_resolucao")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return;

  const update: Record<string, unknown> = {
    status: novoStatus,
    updated_at: new Date().toISOString(),
  };
  if (novoStatus === "em_andamento" && !ticket.data_primeira_resposta) {
    update.data_primeira_resposta = new Date().toISOString();
  }
  if (novoStatus === "resolvido" && !ticket.data_resolucao) {
    update.data_resolucao = new Date().toISOString();
  }

  await supabase.from("tickets").update(update).eq("id", ticketId);
  revalidateSuporte(ticketId);
}

export async function atribuirResponsavel(ticketId: string, responsavelId: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("tickets")
    .update({
      responsavel_id: responsavelId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);
  revalidateSuporte(ticketId);
}

export async function responderTicket(
  ticketId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = TicketRespostaSchema.safeParse({
    conteudo: formData.get("conteudo"),
    interna: formData.get("interna") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("ticket_respostas").insert({
    ticket_id: ticketId,
    autor_id: user.id,
    conteudo: parsed.data.conteudo,
    interna: parsed.data.interna,
  });
  if (error) return { error: "Não foi possível enviar a resposta." };

  revalidateSuporte(ticketId);
  return { ok: true };
}
