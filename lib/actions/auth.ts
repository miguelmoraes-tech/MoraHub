"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  HUB_MODE_COOKIE,
  MODE_HOME_ROUTE,
  accountTypeToHubMode,
  isCollaboratorAccountType,
  type HubMode,
} from "@/lib/hub-mode";

const HUB_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function businessLoginRoute(mode: HubMode) {
  return mode === "pessoal" ? MODE_HOME_ROUTE.pessoal : "/clientes";
}

/** Only accept same-origin relative paths (e.g. "/convite/abc"), to avoid an open redirect. */
function safeRedirect(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value === "") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

const LoginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z.string().min(1, { error: "Informe a senha." }),
});

export type LoginState = {
  error?: string;
} | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  const redirectTo = safeRedirect(formData.get("redirectTo"));
  if (redirectTo) {
    redirect(redirectTo);
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo_conta_padrao")
    .eq("id", data.user.id)
    .maybeSingle();

  // Accountants/lawyers don't own a Business/Pessoal hub by default — they
  // always land on the linked-accounts picker, based on the type chosen at
  // signup. This doesn't stop the account from becoming an owner later too;
  // it only decides which screen it sees first on login.
  if (isCollaboratorAccountType(perfil?.tipo_conta_padrao)) {
    redirect("/colaborador");
  }

  // Collaborators (external accountants/lawyers acting on someone else's
  // account) pick which linked account to work on before landing in any hub
  // — same idea as the business/pessoal mode choice below, but for whose
  // data they're viewing.
  const { data: colaboracao } = await supabase
    .from("membros")
    .select("id")
    .eq("membro_id", data.user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (colaboracao) {
    redirect("/colaborador");
  }

  const cookieStore = await cookies();
  const lastMode = cookieStore.get(HUB_MODE_COOKIE)?.value;

  if (lastMode === "pessoal" || lastMode === "business") {
    redirect(businessLoginRoute(lastMode));
  }

  // No cookie yet (e.g. first login on a new device) — fall back to the
  // account's default mode chosen at signup. Missing/unknown rows default
  // to "empresarial" via accountTypeToHubMode, so old accounts still work.
  const mode = accountTypeToHubMode(perfil?.tipo_conta_padrao);
  cookieStore.set(HUB_MODE_COOKIE, mode, {
    path: "/",
    maxAge: HUB_MODE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  redirect(businessLoginRoute(mode));
}

const SignupSchema = z.object({
  nome: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z.string().min(6, { error: "A senha deve ter pelo menos 6 caracteres." }),
  tipoConta: z.enum(
    ["empresarial", "pessoal", "contador", "advogado", "financeiro", "rh"],
    { error: "Selecione o tipo de conta." }
  ),
});

export type SignupState = {
  error?: string;
  info?: string;
} | undefined;

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const validated = SignupSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    password: formData.get("password"),
    tipoConta: formData.get("tipoConta"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { nome, email, password, tipoConta } = validated.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome: nome || undefined, tipo_conta_padrao: tipoConta },
    },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Já existe uma conta com esse e-mail."
          : "Não foi possível criar a conta. Tente novamente.",
    };
  }

  if (!data.user) {
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  if (!data.session) {
    return {
      info: "Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.",
    };
  }

  const { error: perfilError } = await supabase
    .from("perfis")
    .upsert({ id: data.user.id, nome: nome || null, tipo_conta_padrao: tipoConta });

  if (perfilError) {
    return { error: "Conta criada, mas houve um problema ao salvar seu perfil. Tente entrar normalmente." };
  }

  // The type chosen at signup is also the first active type in the switcher.
  await supabase
    .from("perfis_tipos_ativos")
    .upsert(
      { user_id: data.user.id, tipo: tipoConta },
      { onConflict: "user_id,tipo", ignoreDuplicates: true }
    );

  const redirectTo = safeRedirect(formData.get("redirectTo"));
  if (redirectTo) {
    redirect(redirectTo);
  }

  // Accountants/lawyers don't own a Business/Pessoal hub by default — send
  // them straight to the linked-accounts picker instead of a mode home.
  if (isCollaboratorAccountType(tipoConta)) {
    redirect("/colaborador");
  }

  const mode = accountTypeToHubMode(tipoConta);
  const cookieStore = await cookies();
  cookieStore.set(HUB_MODE_COOKIE, mode, {
    path: "/",
    maxAge: HUB_MODE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  redirect(MODE_HOME_ROUTE[mode]);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
