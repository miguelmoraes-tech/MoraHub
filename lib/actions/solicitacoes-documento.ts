"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SolicitacaoDocumentoSchema } from "@/lib/validations/solicitacao-documento";
import type { ActionState } from "@/lib/actions/types";
import type { SolicitacaoDocumentoStatus } from "@/lib/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function revalidateWorkspaces() {
  revalidatePath("/colaborador/advogado/solicitacoes");
  revalidatePath("/colaborador/contador/solicitacoes");
}

/** Shared by both workspaces — `solicitacoes_documento` has no papel column. */
export async function createSolicitacaoDocumento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = SolicitacaoDocumentoSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    titulo: formData.get("titulo"),
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("user_id")
    .eq("id", parsed.data.cliente_id)
    .maybeSingle();
  const donoId = (cliente as { user_id: string } | null)?.user_id;
  if (!donoId) return { error: "Cliente inválido." };

  const { error } = await supabase.from("solicitacoes_documento").insert({
    user_id: donoId,
    cliente_id: parsed.data.cliente_id,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao ?? null,
  });
  if (error) return { error: "Não foi possível criar a solicitação." };

  revalidateWorkspaces();
  return { ok: true };
}

export async function updateSolicitacaoDocumentoStatus(
  solicitacaoId: string,
  status: SolicitacaoDocumentoStatus
) {
  const supabase = await createClient();
  await supabase
    .from("solicitacoes_documento")
    .update({ status })
    .eq("id", solicitacaoId);
  revalidateWorkspaces();
}

export async function deleteSolicitacaoDocumento(solicitacaoId: string) {
  const supabase = await createClient();
  await supabase
    .from("solicitacoes_documento")
    .delete()
    .eq("id", solicitacaoId);
  revalidateWorkspaces();
}
