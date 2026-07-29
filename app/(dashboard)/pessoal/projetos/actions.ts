"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PessoalProjetoSchema } from "@/lib/validations/pessoal-projeto";
import type { ActionState } from "@/lib/actions/types";
import type { PessoalProjectLink } from "@/lib/pessoal/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createPessoalProjeto(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PessoalProjetoSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status") ?? "planejamento",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { data, error } = await supabase
    .from("pessoal_projects")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      status: parsed.data.status,
      links: [],
      tags: [],
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar o projeto." };

  revalidatePath("/pessoal/projetos");
  redirect(`/pessoal/projetos/${data.id}`);
}

export async function updatePessoalProjetoNome(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase } = await requireUser();
  await supabase
    .from("pessoal_projects")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/pessoal/projetos/${id}`);
  revalidatePath("/pessoal/projetos");
}

export async function updatePessoalProjetoDescricao(id: string, description: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("pessoal_projects")
    .update({
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath(`/pessoal/projetos/${id}`);
}

export async function updatePessoalProjetoStatus(id: string, status: string) {
  const { supabase } = await requireUser();
  await supabase
    .from("pessoal_projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/pessoal/projetos/${id}`);
  revalidatePath("/pessoal/projetos");
}

export async function updatePessoalProjetoLinks(
  id: string,
  links: PessoalProjectLink[]
) {
  const { supabase } = await requireUser();
  const cleaned = links
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.url !== "");
  await supabase
    .from("pessoal_projects")
    .update({ links: cleaned, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/pessoal/projetos/${id}`);
}

export async function updatePessoalProjetoTags(id: string, tags: string[]) {
  const { supabase } = await requireUser();
  await supabase
    .from("pessoal_projects")
    .update({ tags, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/pessoal/projetos/${id}`);
}

export async function deletePessoalProjeto(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("pessoal_projects").delete().eq("id", id);
  revalidatePath("/pessoal/projetos");
  redirect("/pessoal/projetos");
}
