"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  ACCOUNT_TYPE_HOME_ROUTE,
  HUB_MODE_COOKIE,
  accountTypeToHubMode,
  isCollaboratorAccountType,
  type AccountType,
} from "@/lib/hub-mode";

const HUB_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Activates an account type for the current user (idempotent — a type can
 * only be activated once, enforced by the unique(user_id, tipo) constraint)
 * and sends them to that type's home screen. Empresarial/Pessoal data
 * already exists structurally for any authenticated user (RLS scopes it by
 * user_id), so activating just records the choice and redirects — no signup
 * form needed. First activation appends `?bemvindo=<tipo>` so the target
 * screen can show a one-time welcome message.
 *
 * Contador/Advogado/Financeiro are excluded from this self-service path —
 * those only ever become active via signup's default type or by accepting
 * an invite (see aceitarConvite / the `membros` table), never through this
 * action. The UI never offers this action for them, but the check is
 * repeated here since a server action is reachable directly, not just via
 * the button that calls it.
 */
export async function ativarTipoConta(tipo: AccountType) {
  if (isCollaboratorAccountType(tipo)) {
    redirect("/colaborador");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: inserted } = await supabase
    .from("perfis_tipos_ativos")
    .upsert(
      { user_id: user.id, tipo },
      { onConflict: "user_id,tipo", ignoreDuplicates: true }
    )
    .select("id");

  const isPrimeiraAtivacao = (inserted?.length ?? 0) > 0;

  const mode = accountTypeToHubMode(tipo);
  const cookieStore = await cookies();
  cookieStore.set(HUB_MODE_COOKIE, mode, {
    path: "/",
    maxAge: HUB_MODE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  const home = ACCOUNT_TYPE_HOME_ROUTE[tipo];
  redirect(isPrimeiraAtivacao ? `${home}?bemvindo=${tipo}` : home);
}
