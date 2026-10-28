/**
 * Testes da regra de acesso por papel na empresa ativa (sem banco, sem rede).
 *
 *   node --import ./scripts/register-alias.mjs scripts/testar-acesso.mts
 *
 * Cobre: vendedor sem empresa própria, funcionário que criou empresa, cookie
 * forjado, falhas de consulta, papel legado e a ausência de loops entre
 * /dashboard e /vendedor/leads.
 */
import assert from "node:assert/strict";
import { decidirAcesso, SEM_ACESSO, type EntradaAcesso } from "@/lib/acesso";
import {
  escolherEmpresa,
  resolverEmpresaAtiva,
  type EmpresaVinculo,
  type ResolucaoEmpresa,
} from "@/lib/empresas";
import { HOME_DONO } from "@/lib/modulos/registry";
import { VENDEDOR_HOME } from "@/lib/vendedor-access";

let total = 0;
function teste(nome: string, fn: () => void | Promise<void>) {
  total++;
  return Promise.resolve(fn()).then(
    () => console.log(`  ok   ${nome}`),
    (e) => {
      console.log(`  FALHOU ${nome}\n         ${e.message.split("\n")[0]}`);
      process.exitCode = 1;
    }
  );
}

const WS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // empresa onde sou dono
const WS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // empresa onde sou vendedor
const WS_ALHEIA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // de outra pessoa

const ok = (papel: "dono" | "comercial" | "socio", corrigirCookie = false): ResolucaoEmpresa => ({
  status: "ok",
  workspaceId: papel === "comercial" ? WS_B : WS_A,
  papel,
  corrigirCookie,
});

function decide(
  path: string,
  resolucao: ResolucaoEmpresa,
  habilitados: string[] = ["leads", "clientes", "vendedores", "agenda"],
  funcionarioSemVinculo = false
) {
  const e: EntradaAcesso = { path, resolucao, habilitados, funcionarioSemVinculo };
  return decidirAcesso(e);
}
const vaiPara = (d: ReturnType<typeof decidirAcesso>) =>
  d.tipo === "seguir" ? "seguir" : d.para;

// --- Banco falso -----------------------------------------------------------

type Rpc = (nome: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
function bancoFalso(rpc: Rpc) {
  const chamadas: string[] = [];
  const client = {
    rpc: (nome: string, args?: Record<string, unknown>) => {
      chamadas.push(nome);
      return rpc(nome, args);
    },
  };
  return { client: client as never, chamadas };
}
const linhas = [
  { workspace_id: WS_A, nome: "Minha Empresa", papel: "dono", dono_id: "eu" },
  { workspace_id: WS_B, nome: "Empresa do Chefe", papel: "comercial", dono_id: "chefe" },
];
const papelNoBanco: Record<string, string | null> = { [WS_A]: "dono", [WS_B]: "comercial" };
const bancoNormal = () =>
  bancoFalso(async (nome, args) =>
    nome === "meu_papel_na_empresa"
      ? { data: papelNoBanco[String(args?.p_workspace_id)] ?? null, error: null }
      : { data: linhas, error: null }
  );

const PATHS = [
  "/", "/dashboard", "/modulos", "/configuracoes", "/leads", "/clientes", "/renegados", "/agenda",
  "/vendedores", "/atividade-vendedores", "/rh", "/contas-pagar", "/pessoal", "/pessoal/contas",
  "/vendedor", "/vendedor/leads", "/vendedor/agenda", "/acesso-vendedor", "/acesso-vendedor/aguardando",
  "/nova-empresa", "/login", "/signup", "/convite/abc", "/api/export/leads", "/colaborador", "/metas",
  "/sem-acesso",
];

console.log("\nCaso 1 — funcionário que NUNCA criou empresa (só vínculo comercial)");
await teste("fica trancado em /vendedor/*: /dashboard, /leads, /modulos, /pessoal, / e /login voltam a /vendedor/leads", () => {
  for (const p of ["/dashboard", "/leads", "/modulos", "/pessoal", "/", "/login", "/colaborador", "/api/export/leads"]) {
    assert.equal(vaiPara(decide(p, ok("comercial"))), VENDEDOR_HOME, p);
  }
});
await teste("continua podendo usar /vendedor/*, as telas do código, /nova-empresa e o convite", () => {
  for (const p of ["/vendedor", "/vendedor/leads", "/vendedor/agenda", "/acesso-vendedor", "/acesso-vendedor/aguardando", "/nova-empresa", "/convite/abc", "/sem-acesso"]) {
    assert.equal(vaiPara(decide(p, ok("comercial"))), "seguir", p);
  }
});

console.log("\nCaso 2 — funcionário que CRIOU empresa e também é vendedor em outra");
await teste("com a empresa dele ativa (dono): painel liberado e /vendedor/* bloqueado", () => {
  assert.equal(vaiPara(decide("/dashboard", ok("dono"))), "seguir");
  assert.equal(vaiPara(decide("/leads", ok("dono"))), "seguir");
  assert.equal(vaiPara(decide("/vendedor/leads", ok("dono"))), HOME_DONO);
  assert.equal(vaiPara(decide("/vendedor/agenda", ok("dono"))), HOME_DONO);
});
await teste("com a empresa do vínculo ativa (comercial): só /vendedor/*", () => {
  assert.equal(vaiPara(decide("/dashboard", ok("comercial"))), VENDEDOR_HOME);
  assert.equal(vaiPara(decide("/vendedor/leads", ok("comercial"))), "seguir");
});
await teste("módulo desligado na empresa do dono redireciona para a primeira rota ligada", () => {
  assert.equal(vaiPara(decide("/rh", ok("dono"), ["leads"])), "/leads");
  assert.equal(vaiPara(decide("/contas-pagar", ok("dono"), [])), HOME_DONO);
  assert.equal(vaiPara(decide("/metas", ok("dono"), ["leads"])), "/leads");
});
await teste("o papel de uma empresa não vaza para a outra: a mesma rota muda com a empresa ativa", () => {
  // Troca A (dono) -> B (vendedor) -> A: o resultado segue sempre o papel da ativa.
  const sequencia: [ResolucaoEmpresa, string][] = [
    [ok("dono"), "seguir"],
    [ok("comercial"), VENDEDOR_HOME],
    [ok("dono"), "seguir"],
  ];
  for (const [res, esperado] of sequencia) assert.equal(vaiPara(decide("/clientes", res)), esperado);
});

console.log("\nCaso 3 — cookie forjado com id de empresa alheia");
await teste("meu_papel_na_empresa devolve null: cai no fallback (empresa própria) e regrava o cookie", async () => {
  const { client, chamadas } = bancoNormal();
  const r = await resolverEmpresaAtiva(client, WS_ALHEIA);
  assert.deepEqual(r, { status: "ok", workspaceId: WS_A, papel: "dono", corrigirCookie: true });
  assert.deepEqual(chamadas, ["meu_papel_na_empresa", "minhas_empresas"]);
});
await teste("o fallback prefere o dono; o forjado não ganha acesso a nada da empresa alheia", async () => {
  const { client } = bancoNormal();
  const r = await resolverEmpresaAtiva(client, WS_ALHEIA);
  assert.equal(r.status === "ok" && r.workspaceId !== WS_ALHEIA, true);
});
await teste("sem nenhuma empresa, o cookie forjado não vale nada (sem_empresa)", async () => {
  const { client } = bancoFalso(async (nome) => ({ data: nome === "minhas_empresas" ? [] : null, error: null }));
  assert.deepEqual(await resolverEmpresaAtiva(client, WS_ALHEIA), { status: "sem_empresa" });
});
await teste("cookie que não é UUID nem chega ao banco como parâmetro", async () => {
  const { client, chamadas } = bancoNormal();
  const r = await resolverEmpresaAtiva(client, "'; drop table x; --");
  assert.equal(r.status, "ok");
  assert.deepEqual(chamadas, ["minhas_empresas"]);
});
await teste("o cookie regravado no fallback aponta para uma empresa que passa na MESMA regra (sem ciclo)", async () => {
  const { client } = bancoNormal();
  const r1 = await resolverEmpresaAtiva(client, WS_ALHEIA);
  assert.equal(r1.status, "ok");
  if (r1.status !== "ok") return;
  const r2 = await resolverEmpresaAtiva(client, r1.workspaceId);
  assert.deepEqual(r2, { ...r1, corrigirCookie: false });
});

console.log("\nFalhas de consulta: negar por padrão");
await teste("erro na RPC de papel => erro (nunca dono)", async () => {
  const { client } = bancoFalso(async () => ({ data: null, error: { message: "boom" } }));
  assert.deepEqual(await resolverEmpresaAtiva(client, WS_A), { status: "erro" });
});
await teste("erro em minhas_empresas => erro", async () => {
  const { client } = bancoFalso(async (nome) =>
    nome === "minhas_empresas" ? { data: null, error: { message: "boom" } } : { data: null, error: null }
  );
  assert.deepEqual(await resolverEmpresaAtiva(client, WS_ALHEIA), { status: "erro" });
});
await teste("exceção de rede => erro", async () => {
  const { client } = bancoFalso(async () => {
    throw new Error("ECONNRESET");
  });
  assert.deepEqual(await resolverEmpresaAtiva(client, WS_A), { status: "erro" });
});
await teste("erro nunca libera rota alguma, só /sem-acesso", () => {
  for (const p of PATHS.filter((x) => x !== SEM_ACESSO && !x.startsWith("/convite/"))) {
    const d = decide(p, { status: "erro" });
    assert.equal(d.tipo, "redirecionar", p);
    if (d.tipo === "redirecionar") assert.ok(d.para.startsWith(SEM_ACESSO), p);
  }
});
await teste("falha na leitura de módulos (lista vazia) nega as rotas de módulo do dono", () => {
  assert.equal(vaiPara(decide("/leads", ok("dono"), [])), HOME_DONO);
});

console.log("\nPapel legado ou desconhecido");
await teste("financeiro/rh/marketing/contador/advogado no cookie => legado => /sem-acesso", async () => {
  for (const papel of ["financeiro", "rh", "marketing", "contador", "advogado", "qualquer"]) {
    const { client } = bancoFalso(async () => ({ data: papel, error: null }));
    const r = await resolverEmpresaAtiva(client, WS_A);
    assert.equal(r.status, "legado", papel);
    assert.equal(vaiPara(decide("/dashboard", r)), SEM_ACESSO, papel);
    assert.equal(vaiPara(decide("/vendedor/leads", r)), SEM_ACESSO, papel);
  }
});
await teste("/sem-acesso nunca é redirecionada (sem ciclo)", () => {
  for (const r of [{ status: "erro" }, { status: "legado", workspaceId: WS_A, papel: "rh" }, ok("dono"), ok("comercial"), { status: "sem_empresa" }] as ResolucaoEmpresa[]) {
    assert.equal(vaiPara(decide(SEM_ACESSO, r)), "seguir");
  }
});

console.log("\nFuncionário sem vínculo e sem empresa");
await teste("só o código, o aguardando e /nova-empresa; o resto volta ao código", () => {
  const res: ResolucaoEmpresa = { status: "sem_empresa" };
  for (const p of ["/acesso-vendedor", "/acesso-vendedor/aguardando", "/nova-empresa"]) {
    assert.equal(vaiPara(decide(p, res, [], true)), "seguir", p);
  }
  for (const p of ["/dashboard", "/leads", "/vendedor/leads", "/"]) {
    assert.equal(vaiPara(decide(p, res, [], true)), "/acesso-vendedor", p);
  }
});
await teste("empreendedor sem empresa ainda vê /dashboard e /nova-empresa; módulos voltam ao /dashboard", () => {
  const res: ResolucaoEmpresa = { status: "sem_empresa" };
  assert.equal(vaiPara(decide("/dashboard", res)), "seguir");
  assert.equal(vaiPara(decide("/nova-empresa", res)), "seguir");
  assert.equal(vaiPara(decide("/leads", res)), HOME_DONO);
  assert.equal(vaiPara(decide("/vendedor/leads", res)), HOME_DONO);
});

console.log("\nSem loops (propriedade): todo destino de redirecionamento passa na mesma regra");
await teste("para qualquer resolução x rota, o destino devolve 'seguir' (ponto fixo em 1 salto)", () => {
  const resolucoes: ResolucaoEmpresa[] = [
    ok("dono"), ok("comercial"), ok("socio"), ok("dono", true), ok("comercial", true),
    { status: "sem_empresa" }, { status: "erro" }, { status: "legado", workspaceId: WS_A, papel: "rh" },
  ];
  const modulos = [[], ["leads"], ["leads", "clientes", "vendedores", "agenda"], ["rh"]];
  let casos = 0;
  for (const res of resolucoes)
    for (const hab of modulos)
      for (const semVinculo of [false, true])
        for (const p of PATHS) {
          const d = decide(p, res, hab, semVinculo);
          if (d.tipo === "seguir") continue;
          const destino = d.para.split("?")[0];
          const d2 = decide(destino, res, hab, semVinculo);
          assert.equal(d2.tipo, "seguir", `${res.status}/${"papel" in res ? res.papel : ""} ${p} -> ${d.para} -> ${vaiPara(d2)}`);
          casos++;
        }
  assert.ok(casos > 500, `poucos casos exercitados (${casos})`);
});
await teste("/dashboard e /vendedor/leads nunca se redirecionam mutuamente, para nenhum papel", () => {
  for (const papel of ["dono", "comercial", "socio"] as const) {
    const a = vaiPara(decide("/dashboard", ok(papel)));
    const b = vaiPara(decide("/vendedor/leads", ok(papel)));
    assert.ok(!(a === "/vendedor/leads" && b === "/dashboard"), papel);
  }
});

console.log("\nTroca de empresa (cookie válido escolhe, cookie inválido cai no fallback)");
await teste("escolherEmpresa respeita o cookie entre empresas com vínculo e ignora o que não é da conta", () => {
  const empresas: EmpresaVinculo[] = [
    { workspaceId: WS_A, nome: "A", papel: "dono", donoId: "eu" },
    { workspaceId: WS_B, nome: "B", papel: "comercial", donoId: "chefe" },
  ];
  assert.equal(escolherEmpresa(empresas, WS_B)?.workspaceId, WS_B);
  assert.equal(escolherEmpresa(empresas, WS_A)?.workspaceId, WS_A);
  assert.equal(escolherEmpresa(empresas, WS_ALHEIA)?.workspaceId, WS_A);
  assert.equal(escolherEmpresa(empresas, undefined)?.papel, "dono");
  assert.equal(escolherEmpresa([], WS_A), null);
});

console.log(`\n${total} testes`);
if (process.exitCode) console.log("HÁ FALHAS");
