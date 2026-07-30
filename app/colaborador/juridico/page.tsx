import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COLAB_DONO_COOKIE } from "@/lib/colaborador";
import { ColaboradorJuridicoBoard } from "@/components/colaborador-juridico-board";
import type { ContaVinculada, Juridico, JuridicoTipo } from "@/lib/types";

export default async function ColaboradorJuridicoPage() {
  const cookieStore = await cookies();
  const donoId = cookieStore.get(COLAB_DONO_COOKIE)?.value;

  if (!donoId) redirect("/colaborador");

  const supabase = await createClient();

  // Re-validated on every load (not trusted from the cookie alone): confirms
  // the collaboration is still active and gives us the current papel, so a
  // revoked access (membros.status = 'removido') sends them back to the
  // picker instead of showing stale data.
  const { data: contas } = (await supabase.rpc("get_contas_vinculadas")) as {
    data: ContaVinculada[] | null;
  };
  const conta = (contas ?? []).find((c) => c.dono_id === donoId);

  if (!conta) redirect("/colaborador");

  const tipoAlvo: JuridicoTipo =
    conta.papel === "contador" ? "Contábil" : "Jurídico";

  const { data: items } = (await supabase
    .from("juridico")
    .select("*")
    .eq("user_id", donoId)
    .eq("tipo", tipoAlvo)
    .order("prazo", { ascending: true })) as { data: Juridico[] | null };

  return (
    <ColaboradorJuridicoBoard
      items={items ?? []}
      donoId={donoId}
      donoNome={conta.dono_nome ?? conta.dono_email ?? "esta conta"}
      tipo={tipoAlvo}
    />
  );
}
