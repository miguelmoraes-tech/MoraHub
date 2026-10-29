import type { SupabaseClient } from "@supabase/supabase-js";
import { getModuloRegistro } from "@/lib/modulos/registry";

/**
 * Módulos do catálogo que aceitam equipe (`modulos.permite_membros = true`).
 * Substitui a lista fixa de antes: quem decide é o banco. O catálogo é legível
 * por qualquer conta logada. Falha de leitura = nenhum módulo (nega).
 */
export async function getModulosPermiteMembrosDoCatalogo(
  supabase: SupabaseClient
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("modulos")
      .select("chave")
      .eq("permite_membros", true);
    if (error) return [];
    return ((data ?? []) as { chave: string }[])
      .map((r) => r.chave)
      .filter((c) => !!getModuloRegistro(c));
  } catch {
    return [];
  }
}
