"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { VENDEDOR_HOME, getVendedorAcesso } from "@/lib/vendedor-access";
import { COMERCIAL_DONO_COOKIE, COMERCIAL_DONO_COOKIE_MAX_AGE } from "@/lib/comercial";
import { HOME_DONO } from "@/lib/modulos/registry";

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

  // Someone whose only role is the 'comercial' they just accepted goes
  // straight to the vendedor area instead of the colaborador picker.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const acesso = await getVendedorAcesso(supabase, user.id);
    if (acesso.somenteVendedor && acesso.vinculos.some((v) => v.dono_id === donoId)) {
      const cookieStore = await cookies();
      cookieStore.set(COMERCIAL_DONO_COOKIE, donoId, {
        path: "/",
        maxAge: COMERCIAL_DONO_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
      redirect(VENDEDOR_HOME);
    }
  }

  // O seletor /colaborador está fora do ar: vai direto para o destino.
  redirect(HOME_DONO);
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
