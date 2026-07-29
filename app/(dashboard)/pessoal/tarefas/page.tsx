import { createClient } from "@/lib/supabase/server";
import { TarefasSection } from "@/components/pessoal/tarefas-section";
import type { PessoalProject, PessoalTask } from "@/lib/pessoal/types";

export default async function PessoalTarefasPage() {
  const supabase = await createClient();

  const [{ data: tarefas }, { data: projetos }] = (await Promise.all([
    supabase.from("pessoal_tasks").select("*"),
    supabase.from("pessoal_projects").select("id, name").order("name"),
  ])) as [
    { data: PessoalTask[] | null },
    { data: Pick<PessoalProject, "id" | "name">[] | null },
  ];

  return <TarefasSection tarefas={tarefas ?? []} projetos={projetos ?? []} />;
}
