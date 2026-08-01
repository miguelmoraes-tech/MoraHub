"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  MARKETING_DONO_COOKIE,
  MARKETING_DONO_COOKIE_MAX_AGE,
} from "@/lib/marketing";

export async function entrarMarketing(donoId: string) {
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
    .eq("papel", "marketing")
    .eq("status", "ativo")
    .maybeSingle();

  if (!data) redirect("/colaborador");

  const cookieStore = await cookies();
  cookieStore.set(MARKETING_DONO_COOKIE, donoId, {
    path: "/",
    maxAge: MARKETING_DONO_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  redirect("/marketing");
}
