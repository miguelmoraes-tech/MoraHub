"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PessoalTarefaSchema } from "@/lib/validations/pessoal-tarefa";
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

function parseTarefaForm(formData: FormData) {
  return PessoalTarefaSchema.safeParse({
    title: formData.get("title"),
    description: textOrNull(formData.get("description")) ?? undefined,
    due_date: textOrNull(formData.get("due_date")) ?? undefined,
    priority: formData.get("priority") ?? "media",
    project_id: textOrNull(formData.get("project_id")) ?? undefined,
  });
}

export async function createPessoalTarefa(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTarefaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("pessoal_tasks").insert({
    user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    due_date: parsed.data.due_date ?? null,
    priority: parsed.data.priority,
    project_id: parsed.data.project_id ?? null,
  });
  if (error) return { error: "Não foi possível salvar a tarefa." };

  revalidatePath("/pessoal/tarefas");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function updatePessoalTarefa(
  tarefaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseTarefaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("pessoal_tasks")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      due_date: parsed.data.due_date ?? null,
      priority: parsed.data.priority,
      project_id: parsed.data.project_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tarefaId);
  if (error) return { error: "Não foi possível atualizar a tarefa." };

  revalidatePath("/pessoal/tarefas");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function togglePessoalTarefaConcluida(
  tarefaId: string,
  currentStatus: string
) {
  const { supabase } = await requireUser();
  const nextStatus = currentStatus === "concluida" ? "pendente" : "concluida";
  await supabase
    .from("pessoal_tasks")
    .update({
      status: nextStatus,
      completed_at: nextStatus === "concluida" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tarefaId);
  revalidatePath("/pessoal/tarefas");
  revalidatePath("/pessoal");
}

export async function deletePessoalTarefa(tarefaId: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_tasks").delete().eq("id", tarefaId);
  revalidatePath("/pessoal/tarefas");
  revalidatePath("/pessoal");
}
