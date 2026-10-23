"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  AgendarReuniaoSchema,
  AtualizarReuniaoSchema,
  ReuniaoStatusSchema,
} from "@/lib/validations/reuniao";
import { rpcErrorMessage } from "@/lib/vendedor-shared";
import type { ActionState } from "@/lib/actions/types";

// Every write the vendedor can make goes through a SECURITY DEFINER RPC —
// the `leads` table is SELECT-only for them, so there is deliberately no
// direct insert/update/delete here. The RPCs are the authority on who may
// do what; these actions only validate input and translate errors.

function textOrUndefined(value: FormDataEntryValue | null) {
  if (value === null) return undefined;
  const str = value.toString().trim();
  return str === "" ? undefined : str;
}

// Deliberately NOT revalidating /vendedor/leads here: scheduling/converting
// moves the lead to another tab, which would yank the open detail dialog (and
// the success toast with it) out from under the vendedor. The detail dialog
// calls router.refresh() itself once it is closed.
function revalidateOutrasTelas() {
  revalidatePath("/vendedor/agenda");
  revalidatePath("/agenda");
  revalidatePath("/leads");
  revalidatePath("/clientes");
}

export async function agendarReuniao(
  leadId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = AgendarReuniaoSchema.safeParse({
    data_hora: formData.get("data_hora"),
    duracao_min: formData.get("duracao_min"),
    canal: formData.get("canal"),
    local_link: textOrUndefined(formData.get("local_link")),
    observacoes: textOrUndefined(formData.get("observacoes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("agendar_reuniao", {
    p_lead_id: leadId,
    p_data_hora: parsed.data.data_hora,
    p_duracao_min: parsed.data.duracao_min,
    p_canal: parsed.data.canal,
    p_local_link: parsed.data.local_link ?? null,
    p_observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: rpcErrorMessage(error.message) };

  revalidateOutrasTelas();
  return { ok: true };
}

async function atualizar(
  reuniaoId: string,
  input: { data_hora?: string; status?: string; observacoes?: string }
): Promise<ActionState> {
  const parsed = AtualizarReuniaoSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_reuniao", {
    p_id: reuniaoId,
    p_data_hora: parsed.data.data_hora ?? null,
    p_status: parsed.data.status ?? null,
    p_observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: rpcErrorMessage(error.message) };

  revalidatePath("/vendedor/agenda");
  revalidatePath("/agenda");
  return { ok: true };
}

export async function remarcarReuniao(
  reuniaoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const dataHora = textOrUndefined(formData.get("data_hora"));
  if (!dataHora) return { error: "Informe a nova data e hora." };
  return atualizar(reuniaoId, {
    data_hora: dataHora,
    // A rescheduled meeting is open again (e.g. a cancelled one being revived).
    status: "agendada",
    observacoes: textOrUndefined(formData.get("observacoes")),
  });
}

export async function atualizarStatusReuniao(
  reuniaoId: string,
  status: string
): Promise<ActionState> {
  const parsed = ReuniaoStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "Status inválido." };
  return atualizar(reuniaoId, { status: parsed.data });
}

export async function converterLeadEmCliente(
  leadId: string,
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("converter_lead_em_cliente", {
    p_lead_id: leadId,
  });
  if (error) return { error: rpcErrorMessage(error.message) };

  revalidateOutrasTelas();
  return { ok: true };
}
