import { createClient } from "@/lib/supabase/server";
import { InboxSection } from "@/components/pessoal/inbox-section";
import type { PessoalInboxItem, PessoalProject } from "@/lib/pessoal/types";

export default async function PessoalInboxPage() {
  const supabase = await createClient();

  const [{ data: itens }, { data: projetos }] = (await Promise.all([
    supabase
      .from("pessoal_inbox")
      .select("*")
      .eq("is_triaged", false)
      .order("created_at", { ascending: false }),
    supabase.from("pessoal_projects").select("id, name").order("name"),
  ])) as [
    { data: PessoalInboxItem[] | null },
    { data: Pick<PessoalProject, "id" | "name">[] | null },
  ];

  return <InboxSection itens={itens ?? []} projetos={projetos ?? []} />;
}
