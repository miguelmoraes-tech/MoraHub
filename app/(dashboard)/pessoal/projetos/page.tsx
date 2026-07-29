import { createClient } from "@/lib/supabase/server";
import { ProjetosSection } from "@/components/pessoal/projetos-section";
import type { PessoalProject } from "@/lib/pessoal/types";

export default async function PessoalProjetosPage() {
  const supabase = await createClient();

  const { data: projetos } = (await supabase
    .from("pessoal_projects")
    .select("*")
    .order("updated_at", { ascending: false })) as {
    data: PessoalProject[] | null;
  };

  return <ProjetosSection projetos={projetos ?? []} />;
}
