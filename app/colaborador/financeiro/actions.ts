"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  FINANCEIRO_DONO_COOKIE,
  FINANCEIRO_DONO_COOKIE_MAX_AGE,
} from "@/lib/financeiro";

export async function entrarFinanceiro(donoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("membros")
    .select("id")
    .eq("dono_id", donoId)
    .eq("membro_id", user.id)
    .eq("papel", "financeiro")
    .eq("status", "ativo")
    .maybeSingle();

  if (!data) redirect("/colaborador");

  const cookieStore = await cookies();
  cookieStore.set(FINANCEIRO_DONO_COOKIE, donoId, {
    path: "/",
    maxAge: FINANCEIRO_DONO_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  redirect("/contas-pagar");
}
