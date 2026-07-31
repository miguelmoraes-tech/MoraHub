"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RH_DONO_COOKIE, RH_DONO_COOKIE_MAX_AGE } from "@/lib/rh";

export async function entrarRH(donoId: string) {
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
    .eq("papel", "rh")
    .eq("status", "ativo")
    .maybeSingle();

  if (!data) redirect("/colaborador");

  const cookieStore = await cookies();
  cookieStore.set(RH_DONO_COOKIE, donoId, {
    path: "/",
    maxAge: RH_DONO_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  redirect("/rh");
}
