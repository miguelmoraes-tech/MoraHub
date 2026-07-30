import { createClient } from "@/lib/supabase/server";
import { JuridicoBoard } from "@/components/juridico-board";
import { ColaboradoresSection } from "@/components/colaboradores-section";
import type { ColaboradorVinculado, Convite, Juridico } from "@/lib/types";

export default async function JuridicoPage() {
  const supabase = await createClient();

  const { data: items } = (await supabase
    .from("juridico")
    .select("*")
    .order("prazo", { ascending: true })) as { data: Juridico[] | null };

  const { data: convites } = (await supabase
    .from("convites")
    .select("*")
    .order("created_at", { ascending: false })) as { data: Convite[] | null };

  const { data: colaboradores } = (await supabase.rpc(
    "get_colaboradores_do_dono"
  )) as { data: ColaboradorVinculado[] | null };

  return (
    <>
      <JuridicoBoard items={items ?? []} />
      <div className="mx-auto max-w-4xl px-6 pb-8">
        <ColaboradoresSection
          convites={convites ?? []}
          colaboradores={colaboradores ?? []}
        />
      </div>
    </>
  );
}
