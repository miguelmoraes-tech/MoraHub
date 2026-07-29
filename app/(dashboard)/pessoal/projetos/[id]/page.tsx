import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjetoDetailSection } from "@/components/pessoal/projeto-detail-section";
import type {
  PessoalLibraryItem,
  PessoalProject,
  PessoalTask,
} from "@/lib/pessoal/types";

export default async function PessoalProjetoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: projeto }, { data: itensBiblioteca }, { data: tarefas }] =
    (await Promise.all([
      supabase.from("pessoal_projects").select("*").eq("id", id).single(),
      supabase
        .from("pessoal_library_items")
        .select("*")
        .eq("project_id", id)
        .order("captured_at", { ascending: false }),
      supabase
        .from("pessoal_tasks")
        .select("*")
        .eq("project_id", id)
        .order("due_date", { ascending: true }),
    ])) as [
      { data: PessoalProject | null },
      { data: PessoalLibraryItem[] | null },
      { data: PessoalTask[] | null },
    ];

  if (!projeto) notFound();

  return (
    <ProjetoDetailSection
      projeto={projeto}
      itensBiblioteca={itensBiblioteca ?? []}
      tarefas={tarefas ?? []}
    />
  );
}
