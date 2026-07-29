"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { HUB_MODE_COOKIE, MODE_HOME_ROUTE } from "@/lib/hub-mode";

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
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  const cookieStore = await cookies();
  const lastMode = cookieStore.get(HUB_MODE_COOKIE)?.value;
  redirect(lastMode === "pessoal" ? MODE_HOME_ROUTE.pessoal : "/clientes");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
