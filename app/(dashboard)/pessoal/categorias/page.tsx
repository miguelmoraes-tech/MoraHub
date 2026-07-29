import { createClient } from "@/lib/supabase/server";
import { CategoriasSection } from "@/components/pessoal/categorias-section";
import { DEFAULT_CATEGORIES } from "@/lib/pessoal/categories";
import type { PessoalCategory } from "@/lib/pessoal/types";

/** Seeds the 8 default categories only the first time the table is empty. */
async function ensureDefaultCategories(): Promise<PessoalCategory[]> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("pessoal_categories")
    .select("*")
    .order("name");

  if (existing && existing.length > 0) return existing as PessoalCategory[];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: inserted } = await supabase
    .from("pessoal_categories")
    .insert(
      DEFAULT_CATEGORIES.map((category) => ({
        user_id: user.id,
        name: category.name,
        kind: category.kind,
        color: category.color,
      }))
    )
    .select("*");

  return (inserted ?? []) as PessoalCategory[];
}

export default async function PessoalCategoriasPage() {
  const categorias = await ensureDefaultCategories();

  return <CategoriasSection categorias={categorias} />;
}
