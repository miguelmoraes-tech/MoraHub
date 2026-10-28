/**
 * Fotografia do comportamento das empresas atuais (os 5 módulos de hoje):
 * menu do dono e, para cada papel x caminho, a decisão do proxy. O arquivo
 * scripts/snapshot-empresas-atuais.json foi gerado a partir do commit 615495d
 * (antes dos módulos novos); testar-acesso.mts exige que o código novo gere
 * exatamente o mesmo. Para regerar (só se a mudança for intencional):
 *
 *   node --import ./scripts/register-alias.mjs scripts/snapshot-empresas-atuais.mts > scripts/snapshot-empresas-atuais.json
 */
import { decidirAcesso } from "@/lib/acesso";
import { MODULOS, menuDoDono, rotaPermitida, primeiraRotaHabilitada } from "@/lib/modulos/registry";

export const MODULOS_ATUAIS = ["leads", "renegados", "clientes", "agenda", "vendedores"];
// Catálogo atual (permite_membros = true): ignorado pelo código antigo.
const PERMITE_MEMBROS = ["leads", "renegados", "clientes", "agenda", "marketing", "financeiro", "juridico"];

const extras = [
  "/", "/dashboard", "/dashboard/leads", "/dashboard/clientes", "/dashboard/financeiro", "/modulos", "/socios",
  "/configuracoes", "/pessoal", "/pessoal/juridico", "/pessoal/contas", "/api/pessoal/x", "/api/auth/x",
  "/vendedor", "/vendedor/leads", "/vendedor/agenda", "/acesso-vendedor", "/nova-empresa", "/login", "/signup",
  "/convite/abc", "/sem-acesso", "/clientes/abc", "/colaborador", "/colaborador/x", "/metas", "/chat",
  "/suporte", "/comercial", "/leads/abc", "/marketing/x", "/rh/x", "/juridico/x", "/api/export/leads",
  "/api/export/clientes", "/api/export/renegados", "/api/export/dre", "/inexistente",
];
const caminhos = [
  ...new Set([...MODULOS.flatMap((m) => [...m.rotas, ...m.menu.map((i) => i.href)]), ...extras]),
].sort();

const WS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const papeis = ["dono", "cofundador", "socio", "funcionario", "comercial"] as const;
const permissoesPossiveis = [[], ["leads"], ["clientes"], ["agenda", "renegados"], ["leads", "renegados", "clientes", "agenda"]];

const decisoes: Record<string, string> = {};
for (const papel of papeis)
  for (const perm of permissoesPossiveis)
    for (const p of caminhos) {
      const d = decidirAcesso({
        path: p,
        resolucao: { status: "ok", workspaceId: WS, papel, corrigirCookie: false },
        habilitados: MODULOS_ATUAIS,
        permissoes: perm,
        permiteMembros: PERMITE_MEMBROS,
        funcionarioSemVinculo: false,
      });
      decisoes[`${papel}|${perm.join(",")}|${p}`] = d.tipo === "seguir" ? "seguir" : d.para;
    }

const snapshot = {
  menu: menuDoDono(MODULOS_ATUAIS),
  primeiraRota: primeiraRotaHabilitada(MODULOS_ATUAIS),
  rotaPermitida: Object.fromEntries(caminhos.map((p) => [p, rotaPermitida(p, MODULOS_ATUAIS)])),
  decisoes,
};
console.log(JSON.stringify(snapshot, null, 1));
