import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_DONO } from "@/lib/modulos/registry";
import { garantirTipoAtivo, tipoContaDaMetadata } from "@/lib/perfil";

/**
 * A Conta Pessoal só abre para quem tem o tipo 'pessoal' ativo
 * (perfis_tipos_ativos). Sem ele, a pessoa nunca ativou a conta pessoal: volta
 * ao início, de onde o seletor de modos oferece "Criar conta pessoal"
 * (ativarTipoConta). O proxy não lê esse dado, por isso a checagem é aqui.
 *
 * Conta que se cadastrou como Pessoal mas ficou sem a linha (cadastro antigo
 * que falhou em silêncio) é regularizada em vez de barrada: o INSERT em
 * perfis_tipos_ativos continua permitido. Qualquer falha de leitura NEGA.
 */
export default async function PessoalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("perfis_tipos_ativos")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "pessoal")
    .limit(1);
  if (error) redirect(HOME_DONO);

  if ((data ?? []).length === 0) {
    const { data: perfil, error: erroPerfil } = await supabase
      .from("perfis")
      .select("tipo_conta_padrao")
      .eq("id", user.id)
      .maybeSingle();
    const cadastradoComoPessoal =
      !erroPerfil && (perfil?.tipo_conta_padrao ?? tipoContaDaMetadata(user)) === "pessoal";
    if (!cadastradoComoPessoal) redirect(HOME_DONO);

    const { ok } = await garantirTipoAtivo(supabase, user.id, "pessoal");
    if (!ok) redirect(HOME_DONO);
  }

  return children;
}
