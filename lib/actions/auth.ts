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
} from "@/lib/hub-mode";
import {
  ACESSO_VENDEDOR_CODIGO,
  VENDEDOR_HOME,
  getVendedorAcesso,
  isComercialSemVinculo,
} from "@/lib/vendedor-access";
import { HOME_DONO } from "@/lib/modulos/registry";
import { NOVA_EMPRESA } from "@/lib/empresa";
import {
  garantirPerfil,
  garantirTipoAtivo,
  temEmpresaPropria,
  tipoContaDaMetadata,
} from "@/lib/perfil";
import { COMERCIAL_DONO_COOKIE, COMERCIAL_DONO_COOKIE_MAX_AGE } from "@/lib/comercial";

const HUB_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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

  // Contas antigas (e as de teste) podem não ter linha em `perfis`: cria no
  // primeiro login, de forma idempotente. Falhar aqui não impede o login.
  await garantirPerfil(supabase, data.user);

  const redirectTo = safeRedirect(formData.get("redirectTo"));
  if (redirectTo) {
    redirect(redirectTo);
  }

  // A vendedor (invited 'comercial', no company of their own) always lands
  // in their own area — the proxy keeps them there afterwards.
  const acesso = await getVendedorAcesso(supabase, data.user.id);
  if (acesso.somenteVendedor) {
    const cookieStore = await cookies();
    if (!cookieStore.get(COMERCIAL_DONO_COOKIE)?.value) {
      cookieStore.set(COMERCIAL_DONO_COOKIE, acesso.vinculos[0].dono_id, {
        path: "/",
        maxAge: COMERCIAL_DONO_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
    redirect(VENDEDOR_HOME);
  }

  // A vendedor who signed up but isn't linked to a company yet: the only
  // place for them is the screen to type the gestor's code (or wait for it).
  if (await isComercialSemVinculo(supabase, data.user, acesso)) {
    redirect(ACESSO_VENDEDOR_CODIGO);
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo_conta_padrao")
    .eq("id", data.user.id)
    .maybeSingle();

  const tipoPadrao = perfil?.tipo_conta_padrao ?? tipoContaDaMetadata(data.user);

  // Empreendedor que ainda não tem empresa (o cadastro não pede o nome): o
  // primeiro login cai na tela "Dê um nome à sua empresa".
  const cookieStore = await cookies();
  const lastMode = cookieStore.get(HUB_MODE_COOKIE)?.value;
  if (
    tipoPadrao === "empresarial" &&
    lastMode !== "pessoal" &&
    !(await temEmpresaPropria(supabase, data.user.id))
  ) {
    redirect(NOVA_EMPRESA);
  }

  // Contador/advogado/etc. e quem tem vínculo de colaborador: o seletor
  // /colaborador está fora do ar (o proxy o desviaria), então vão direto para
  // o destino em vez de depender do redirecionamento.
  if (isCollaboratorAccountType(tipoPadrao)) {
    redirect(HOME_DONO);
  }

  const { data: colaboracao } = await supabase
    .from("membros")
    .select("id")
    .eq("membro_id", data.user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  if (colaboracao) {
    redirect(HOME_DONO);
  }

  if (lastMode === "pessoal" || lastMode === "business") {
    redirect(MODE_HOME_ROUTE[lastMode]);
  }

  // No cookie yet (e.g. first login on a new device) — fall back to the
  // account's default mode chosen at signup. Missing/unknown rows default
  // to "empresarial" via accountTypeToHubMode, so old accounts still work.
  const mode = accountTypeToHubMode(tipoPadrao);
  cookieStore.set(HUB_MODE_COOKIE, mode, {
    path: "/",
    maxAge: HUB_MODE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  redirect(MODE_HOME_ROUTE[mode]);
}

const SignupSchema = z.object({
  nome: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z.string().min(6, { error: "A senha deve ter pelo menos 6 caracteres." }),
  tipoConta: z.enum(
    [
      "empresarial",
      "pessoal",
      "contador",
      "advogado",
      "financeiro",
      "rh",
      "comercial",
      "marketing",
    ],
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

  const { ok: perfilOk } = await garantirPerfil(supabase, {
    id: data.user.id,
    user_metadata: { nome: nome || undefined, tipo_conta_padrao: tipoConta },
  });

  if (!perfilOk) {
    return { error: "Conta criada, mas houve um problema ao salvar seu perfil. Tente entrar normalmente." };
  }

  // Empreendedor: a empresa nasce na tela "Dê um nome à sua empresa" (precisa
  // de nome). Os demais tipos viram o primeiro tipo ativo do switcher.
  if (tipoConta !== "empresarial") {
    await garantirTipoAtivo(supabase, data.user.id, tipoConta);
  }

  const redirectTo = safeRedirect(formData.get("redirectTo"));
  if (redirectTo) {
    redirect(redirectTo);
  }

  // Funcionário: sem empresa ainda, vai para "Entrar numa empresa".
  if (tipoConta === "comercial") {
    redirect(ACESSO_VENDEDOR_CODIGO);
  }

  if (tipoConta === "empresarial") {
    const cookieStore = await cookies();
    cookieStore.set(HUB_MODE_COOKIE, "business", {
      path: "/",
      maxAge: HUB_MODE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    redirect(NOVA_EMPRESA);
  }

  // Contador/advogado/etc.: o seletor /colaborador está fora do ar.
  if (isCollaboratorAccountType(tipoConta)) {
    redirect(HOME_DONO);
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
