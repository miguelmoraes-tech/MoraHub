"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteSchema } from "@/lib/validations/cliente";
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

function parseClienteForm(formData: FormData) {
  return ClienteSchema.safeParse({
    nome: formData.get("nome"),
    telefone: textOrNull(formData.get("telefone")) ?? undefined,
    email: textOrNull(formData.get("email")) ?? undefined,
    resumo: textOrNull(formData.get("resumo")) ?? undefined,
    site_link: textOrNull(formData.get("site_link")) ?? undefined,
    status: formData.get("status") ?? "em_andamento",
    abordado_por: textOrNull(formData.get("abordado_por")) ?? undefined,
  });
}

export async function createCliente(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseClienteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("clientes").insert({
    nome: parsed.data.nome,
    telefone: parsed.data.telefone ?? null,
    email: parsed.data.email ?? null,
    resumo: parsed.data.resumo ?? null,
    site_link: parsed.data.site_link ?? null,
    status: parsed.data.status,
    abordado_por: parsed.data.abordado_por ?? null,
    user_id: user.id,
  });

  if (error) return { error: "Não foi possível criar o cliente." };

  revalidatePath("/clientes");
  return { ok: true };
}

export async function updateCliente(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseClienteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase
    .from("clientes")
    .update({
      nome: parsed.data.nome,
      telefone: parsed.data.telefone ?? null,
      email: parsed.data.email ?? null,
      resumo: parsed.data.resumo ?? null,
      site_link: parsed.data.site_link ?? null,
      status: parsed.data.status,
      abordado_por: parsed.data.abordado_por ?? null,
    })
    .eq("id", clienteId);

  if (error) return { error: "Não foi possível atualizar o cliente." };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteCliente(clienteId: string) {
  const { supabase, user } = await requireUser();
  if (!user) return;

  await supabase.from("clientes").delete().eq("id", clienteId);

  revalidatePath("/clientes");
  redirect("/clientes");
}
