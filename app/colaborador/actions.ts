"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COLAB_DONO_COOKIE, COLAB_DONO_COOKIE_MAX_AGE } from "@/lib/colaborador";

export async function entrarContaVinculada(donoId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COLAB_DONO_COOKIE, donoId, {
    path: "/",
    maxAge: COLAB_DONO_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  redirect("/colaborador/juridico");
}
