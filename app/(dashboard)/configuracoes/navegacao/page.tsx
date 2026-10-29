import { redirect } from "next/navigation";
import { HOME_DONO, ABAS_VISAO_GERAL, CHAVE_VISAO_GERAL } from "@/lib/modulos/registry";
import { getContextoNavegacao, getPreferenciasNavegacao } from "@/lib/modulos/preferencias-servidor";
import { abasDe, gruposDoMenu, itemFixo, ordenarComPreferencia } from "@/lib/modulos/preferencias";
import { getRotulos } from "@/lib/rotulos";
import { labelDoItemMenu } from "@/lib/rotulos-shared";
import { NavegacaoBoard, type GrupoEditavel, type TelaComAbas } from "@/components/empresa/navegacao-board";

/**
 * "Personalizar navegação": só o que a pessoa já vê (registro ∩ ligados ∩ permissão), na ordem
 * que vale hoje (pessoal → padrão da empresa → registro). Só aparência.
 */
export default async function NavegacaoPage() {
  const ctx = await getContextoNavegacao();
  if (!ctx || (ctx.restrito && ctx.modulosVisiveis.length === 0)) redirect(HOME_DONO);
  const [prefs, rotulos] = await Promise.all([getPreferenciasNavegacao(), getRotulos()]);

  const grupos: GrupoEditavel[] = ordenarComPreferencia(
    gruposDoMenu(ctx.modulosVisiveis, ctx.painel, ctx.restrito),
    prefs.efetiva
  ).map((g) => ({
    titulo: g.titulo,
    itens: g.itens.map((x) => ({
      chave: x.chave,
      label: itemFixo(x.chave) || !x.item.icone ? x.item.label : labelDoItemMenu(rotulos, x.item.href, x.item.label),
      fixo: itemFixo(x.chave),
      visivel: x.visivel,
    })),
  }));

  const telas: TelaComAbas[] = [
    ...(ctx.painel ? [{ chave: CHAVE_VISAO_GERAL, nome: "Visão Geral", abas: ABAS_VISAO_GERAL }] : []),
    ...ctx.modulosVisiveis
      .filter((m) => abasDe(m).length > 0)
      .map((m) => ({ chave: m, nome: rotulos.plural(m), abas: abasDe(m) })),
  ];

  return (
    <NavegacaoBoard
      key={JSON.stringify([prefs.pessoal, prefs.padrao])}
      grupos={grupos}
      telas={telas}
      abasOcultas={prefs.efetiva?.abasOcultas ?? {}}
      temPessoal={!!prefs.pessoal}
      temPadraoEmpresa={!!prefs.padrao}
      podeSalvarPadrao={ctx.painel}
    />
  );
}
