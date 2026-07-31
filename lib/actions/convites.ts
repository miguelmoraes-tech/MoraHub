"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COLAB_DONO_COOKIE, COLAB_DONO_COOKIE_MAX_AGE } from "@/lib/colaborador";

export type ConviteResponseState = { error: string } | undefined;

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Faça login para aceitar o convite.",
  convite_nao_encontrado: "Convite não encontrado.",
  convite_ja_respondido: "Este convite já foi respondido.",
  convite_expirado: "Este convite expirou.",
  email_nao_confere: "Este convite foi enviado para outro e-mail.",
};

function friendlyError(message: string | undefined) {
  if (!message) return "Não foi possível concluir a ação.";
  const code = Object.keys(ERROR_MESSAGES).find((key) => message.includes(key));
  return code ? ERROR_MESSAGES[code] : "Não foi possível concluir a ação.";
}

export async function aceitarConvite(
  token: string,
  _prevState: ConviteResponseState,
  _formData: FormData
): Promise<ConviteResponseState> {
  const supabase = await createClient();
  const { data: donoId, error } = await supabase.rpc("aceitar_convite", {
    p_token: token,
  });

  if (error || !donoId) return { error: friendlyError(error?.message) };

  const cookieStore = await cookies();
  cookieStore.set(COLAB_DONO_COOKIE, donoId as string, {
    path: "/",
    maxAge: COLAB_DONO_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  redirect("/colaborador/juridico");
}

export async function recusarConvite(
  token: string,
  _prevState: ConviteResponseState,
  _formData: FormData
): Promise<ConviteResponseState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("recusar_convite", { p_token: token });

  if (error) return { error: friendlyError(error.message) };

  redirect(`/convite/${token}`);
}
