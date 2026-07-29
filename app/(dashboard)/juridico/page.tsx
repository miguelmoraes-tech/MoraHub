import { createClient } from "@/lib/supabase/server";
import { JuridicoBoard } from "@/components/juridico-board";
import type { Juridico } from "@/lib/types";

export default async function JuridicoPage() {
  const supabase = await createClient();

  const { data: items } = (await supabase
    .from("juridico")
    .select("*")
    .order("prazo", { ascending: true })) as { data: Juridico[] | null };

  return <JuridicoBoard items={items ?? []} />;
}
