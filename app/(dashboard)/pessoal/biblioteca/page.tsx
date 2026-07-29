import { createClient } from "@/lib/supabase/server";
import { BibliotecaSection } from "@/components/pessoal/biblioteca-section";
import type { PessoalLibraryItem, PessoalProject } from "@/lib/pessoal/types";

export default async function PessoalBibliotecaPage() {
  const supabase = await createClient();

  const [{ data: itens }, { data: projetos }] = (await Promise.all([
    supabase
      .from("pessoal_library_items")
      .select("*")
      .order("captured_at", { ascending: false }),
    supabase.from("pessoal_projects").select("id, name").order("name"),
  ])) as [
    { data: PessoalLibraryItem[] | null },
    { data: Pick<PessoalProject, "id" | "name">[] | null },
  ];

  return <BibliotecaSection itens={itens ?? []} projetos={projetos ?? []} />;
}
