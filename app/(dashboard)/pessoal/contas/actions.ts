"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalContaSchema } from "@/lib/validations/pessoal-conta";
import type { ActionState } from "@/lib/actions/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseContaForm(formData: FormData) {
  return PessoalContaSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    balance: formData.get("balance"),
  });
}

export async function createPessoalConta(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseContaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    balance: parsed.data.balance,
  });
  if (error) return { error: "Não foi possível salvar a conta." };

  revalidatePath("/pessoal/contas");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function updatePessoalConta(
  contaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseContaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_accounts")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      balance: parsed.data.balance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contaId);
  if (error) return { error: "Não foi possível atualizar a conta." };

  revalidatePath("/pessoal/contas");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function deletePessoalConta(contaId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_accounts").delete().eq("id", contaId);
  revalidatePath("/pessoal/contas");
  revalidatePath("/pessoal");
}
