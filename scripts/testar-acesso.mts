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
import { decidirAcesso, AGUARDANDO_LIBERACAO, SEM_ACESSO, type EntradaAcesso } from "@/lib/acesso";
import {
  escolherEmpresa,
  resolverEmpresaAtiva,
  type EmpresaVinculo,
  type ResolucaoEmpresa,
} from "@/lib/empresas";
import { HOME_DONO } from "@/lib/modulos/registry";
import { extrasDoCatalogo } from "@/lib/socios-shared";
import {
  lerPermissoesProprias,
  modulosVisiveis,
  normalizarPermissoes,
} from "@/lib/modulos/permissoes";
import { VENDEDOR_HOME } from "@/lib/vendedor-access";
import { MODULOS, menuDoDono, primeiraRotaHabilitada, rotaPermitida } from "@/lib/modulos/registry";
import { filtrarPermissoesOferecidas, modulosOferecidos } from "@/lib/socios-shared";
import { getModulosPermiteMembrosDoCatalogo } from "@/lib/modulos/catalogo";
import { readFileSync } from "node:fs";
import { resolverAcessoModulo } from "@/lib/modulos/guard";
import { computeCampanhaDerived } from "@/lib/marketing/campanha-metrics-shared";

let total = 0;
function teste(nome: string, fn: () => void | Promise<void>) {
  total++;
  return Promise.resolve().then(fn).then(
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

type Papel = "dono" | "cofundador" | "socio" | "funcionario" | "comercial";
const ok = (papel: Papel, corrigirCookie = false): ResolucaoEmpresa => ({
  status: "ok",
  workspaceId: papel === "comercial" ? WS_B : WS_A,
  papel,
  corrigirCookie,
});

// modulos.permite_membros = true hoje (rh e vendedores = false).
const CATALOGO = ["leads", "renegados", "clientes", "agenda", "marketing", "financeiro", "juridico"];

function decide(
  path: string,
  resolucao: ResolucaoEmpresa,
  habilitados: string[] = ["leads", "clientes", "vendedores", "agenda"],
  funcionarioSemVinculo = false,
  permissoes: string[] = [],
  permiteMembros: string[] = CATALOGO
) {
  const e: EntradaAcesso = { path, resolucao, habilitados, permissoes, permiteMembros, funcionarioSemVinculo };
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
  "/sem-acesso", "/socios", "/clientes/abc", "/api/export/clientes",
  "/marketing", "/marketing/calendario", "/marketing/campanhas", "/contas-receber", "/dre", "/api/export/dre",
  "/dashboard/financeiro", "/rh/folha", "/rh/ponto", "/juridico", "/documentos",
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
    ok("dono"), ok("cofundador"), ok("socio"), ok("funcionario"), ok("comercial"),
    ok("dono", true), ok("comercial", true), ok("socio", true),
    { status: "sem_empresa" }, { status: "erro" }, { status: "legado", workspaceId: WS_A, papel: "rh" },
  ];
  const modulos = [[], ["leads"], ["leads", "clientes", "vendedores", "agenda"], ["rh"], ["leads", "marketing", "financeiro", "rh", "juridico", "clientes"]];
  const permissoesPossiveis = [[], ["leads"], ["clientes"], ["leads", "renegados", "clientes", "agenda"], ["financeiro"], ["marketing", "juridico", "rh"]];
  let casos = 0;
  for (const res of resolucoes)
    for (const hab of modulos)
      for (const perm of permissoesPossiveis)
        for (const semVinculo of [false, true])
          for (const p of PATHS) {
            const d = decide(p, res, hab, semVinculo, perm);
            if (d.tipo === "seguir") continue;
            const destino = d.para.split("?")[0];
            const d2 = decide(destino, res, hab, semVinculo, perm);
            assert.equal(d2.tipo, "seguir", `${res.status}/${"papel" in res ? res.papel : ""} ${p} -> ${d.para} -> ${vaiPara(d2)}`);
            casos++;
          }
  assert.ok(casos > 2000, `poucos casos exercitados (${casos})`);
});
await teste("/dashboard e /vendedor/leads nunca se redirecionam mutuamente, para nenhum papel", () => {
  for (const papel of ["dono", "cofundador", "comercial", "socio", "funcionario"] as const) {
    const a = vaiPara(decide("/dashboard", ok(papel), undefined, false, ["leads"]));
    const b = vaiPara(decide("/vendedor/leads", ok(papel), undefined, false, ["leads"]));
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


console.log("\nFase 3 — cofundador = dono (menos /vendedor)");
await teste("cofundador decide igual ao fundador em toda rota, com qualquer conjunto de módulos", () => {
  for (const hab of [[], ["leads"], ["leads", "clientes", "vendedores", "agenda"], ["rh", "financeiro"]])
    for (const p of PATHS) {
      assert.deepEqual(decide(p, ok("cofundador"), hab), decide(p, ok("dono"), hab), `${p} ${hab}`);
    }
});
await teste("cofundador usa o painel conforme os módulos e NÃO entra em /vendedor/*", () => {
  assert.equal(vaiPara(decide("/dashboard", ok("cofundador"))), "seguir");
  assert.equal(vaiPara(decide("/leads", ok("cofundador"))), "seguir");
  assert.equal(vaiPara(decide("/socios", ok("cofundador"))), "seguir");
  assert.equal(vaiPara(decide("/modulos", ok("cofundador"))), "seguir");
  assert.equal(vaiPara(decide("/clientes/abc", ok("cofundador"))), "seguir");
  assert.equal(vaiPara(decide("/rh", ok("cofundador"), ["leads"])), "/leads");
  for (const p of ["/vendedor", "/vendedor/leads", "/vendedor/agenda"]) {
    assert.equal(vaiPara(decide(p, ok("cofundador"))), HOME_DONO, p);
  }
});

console.log("\nFase 3 — sócio e funcionário: módulos habilitados ∩ permissões");
const HAB = ["leads", "renegados", "clientes", "agenda", "vendedores"];
await teste("com permissão em leads e agenda: só essas rotas seguem; o resto volta à 1ª rota liberada", () => {
  for (const papel of ["socio", "funcionario"] as const) {
    const r = ok(papel);
    for (const p of ["/leads", "/agenda", "/api/export/leads", "/pessoal", "/pessoal/contas", "/acesso-vendedor", "/nova-empresa", "/convite/abc", "/sem-acesso"]) {
      assert.equal(vaiPara(decide(p, r, HAB, false, ["leads", "agenda"])), "seguir", `${papel} ${p}`);
    }
    for (const p of ["/renegados", "/clientes", "/vendedores", "/atividade-vendedores", "/rh", "/contas-pagar", "/metas", "/colaborador"]) {
      assert.equal(vaiPara(decide(p, r, HAB, false, ["leads", "agenda"])), "/leads", `${papel} ${p}`);
    }
  }
});
await teste("nunca abrem /vendedor/*, /modulos, /socios, /configuracoes nem /dashboard", () => {
  for (const papel of ["socio", "funcionario"] as const)
    for (const p of ["/vendedor", "/vendedor/leads", "/vendedor/agenda", "/modulos", "/socios", "/configuracoes", "/dashboard", "/", "/login", "/signup"]) {
      assert.equal(vaiPara(decide(p, ok(papel), HAB, false, ["leads", "renegados", "clientes", "agenda"])), "/leads", `${papel} ${p}`);
    }
});
await teste("o detalhe do cliente (/clientes/[id]) é vetado mesmo com permissão em clientes; a lista segue", () => {
  for (const papel of ["socio", "funcionario"] as const) {
    assert.equal(vaiPara(decide("/clientes", ok(papel), HAB, false, ["clientes"])), "seguir");
    assert.equal(vaiPara(decide("/clientes/abc", ok(papel), HAB, false, ["clientes"])), "/clientes");
    assert.equal(vaiPara(decide("/clientes/abc", ok(papel), HAB, false, ["clientes", "leads"])), "/leads");
  }
});
await teste("a casa é a 1ª rota liberada na ordem do registro (leads, renegados, clientes, agenda)", () => {
  assert.equal(vaiPara(decide("/dashboard", ok("socio"), HAB, false, ["agenda", "clientes"])), "/clientes");
  assert.equal(vaiPara(decide("/dashboard", ok("socio"), HAB, false, ["agenda"])), "/agenda");
  assert.equal(vaiPara(decide("/dashboard", ok("funcionario"), HAB, false, ["renegados", "leads"])), "/leads");
});
await teste("permissão em módulo que a empresa DESLIGOU não vale", () => {
  assert.equal(vaiPara(decide("/leads", ok("socio"), ["clientes"], false, ["leads"])), AGUARDANDO_LIBERACAO);
  assert.equal(vaiPara(decide("/leads", ok("socio"), ["clientes"], false, ["leads", "clientes"])), "/clientes");
});
await teste("módulo com permite_membros=false (rh, vendedores) nunca libera rota, mesmo com permissão gravada", () => {
  assert.deepEqual(modulosVisiveis(["financeiro", "rh", "leads"], ["rh", "vendedores"], CATALOGO), []);
  assert.equal(vaiPara(decide("/rh", ok("funcionario"), ["rh"], false, ["rh"])), AGUARDANDO_LIBERACAO);
  assert.equal(vaiPara(decide("/vendedores", ok("socio"), ["vendedores"], false, ["vendedores"])), AGUARDANDO_LIBERACAO);
});
await teste("sem o catálogo (falha de leitura) o sócio não abre módulo nenhum", () => {
  assert.deepEqual(modulosVisiveis(["leads"], ["leads"]), []);
  assert.equal(vaiPara(decide("/leads", ok("socio"), ["leads"], false, ["leads"], [])), AGUARDANDO_LIBERACAO);
});

console.log("\nFase 3 — sem permissão ou leitura falha: nega");
await teste("funcionário sem nenhuma permissão cai em /sem-acesso (Aguardando liberação de acesso)", () => {
  for (const papel of ["socio", "funcionario"] as const)
    for (const p of ["/dashboard", "/", "/leads", "/agenda", "/clientes", "/renegados", "/login", "/vendedor/leads", "/socios"]) {
      assert.equal(vaiPara(decide(p, ok(papel), HAB, false, [])), AGUARDANDO_LIBERACAO, `${papel} ${p}`);
    }
  assert.equal(AGUARDANDO_LIBERACAO.split("?")[0], SEM_ACESSO);
});
await teste("falha ao ler permissoes_membro => lista vazia => nega tudo de módulo", async () => {
  const comErro = {
    from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: null, error: { message: "boom" } }) }) }) }),
  };
  assert.deepEqual(await lerPermissoesProprias(comErro as never, WS_A, "eu"), []);
  const comExcecao = {
    from: () => {
      throw new Error("ECONNRESET");
    },
  };
  assert.deepEqual(await lerPermissoesProprias(comExcecao as never, WS_A, "eu"), []);
});
await teste("lerPermissoesProprias: normaliza linhas e descarta nível/módulo inválidos", async () => {
  const linhasBanco = [
    { modulo_chave: "leads", nivel: "edicao", extras: ["contato"] },
    { modulo_chave: "agenda", nivel: "leitura", extras: null },
    { modulo_chave: "clientes", nivel: "admin", extras: [] },
    { modulo_chave: "financeiro", nivel: "edicao", extras: [] },
    { modulo_chave: "leads", nivel: "leitura", extras: [] },
  ];
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: linhasBanco, error: null }) }) }) }),
  };
  assert.deepEqual(await lerPermissoesProprias(client as never, WS_A, "eu"), [
    { modulo: "leads", nivel: "edicao", extras: ["contato"] },
    { modulo: "agenda", nivel: "leitura", extras: [] },
    { modulo: "financeiro", nivel: "edicao", extras: [] }, // módulo conhecido; quem barra é o catálogo
  ]);
  assert.deepEqual(normalizarPermissoes("lixo"), []);
  assert.deepEqual(normalizarPermissoes([null, 3, { modulo: 7 }]), []);
});
await teste("papel vazio, nulo ou desconhecido nega: nunca vira painel", async () => {
  for (const papel of ["", null, "admin", "root"]) {
    const { client } = bancoFalso(async (nome) =>
      nome === "meu_papel_na_empresa" ? { data: papel, error: null } : { data: [], error: null }
    );
    const r = await resolverEmpresaAtiva(client, WS_A);
    assert.ok(r.status === "sem_empresa" || r.status === "legado", `${papel}: ${r.status}`);
  }
});
await teste("o banco devolve cofundador/sócio/funcionário: a resolução confirma o papel (cookie válido)", async () => {
  for (const papel of ["cofundador", "socio", "funcionario"]) {
    const { client } = bancoFalso(async () => ({ data: papel, error: null }));
    assert.deepEqual(await resolverEmpresaAtiva(client, WS_A), {
      status: "ok",
      workspaceId: WS_A,
      papel,
      corrigirCookie: false,
    });
  }
});
await teste("cookie forjado com papéis novos: o papel vem do banco e a empresa alheia cai no fallback", async () => {
  const multi = [
    { workspace_id: WS_B, nome: "Sociedade", papel: "socio", dono_id: "chefe" },
    { workspace_id: WS_A, nome: "Minha", papel: "cofundador", dono_id: "outro" },
  ];
  const { client } = bancoFalso(async (nome, args) =>
    nome === "meu_papel_na_empresa"
      ? { data: args?.p_workspace_id === WS_A ? "cofundador" : args?.p_workspace_id === WS_B ? "socio" : null, error: null }
      : { data: multi, error: null }
  );
  const r = await resolverEmpresaAtiva(client, WS_ALHEIA);
  // Fallback: cofundador antes de sócio.
  assert.deepEqual(r, { status: "ok", workspaceId: WS_A, papel: "cofundador", corrigirCookie: true });
});

console.log("\nFase 3 — tela do código para qualquer conta logada");
await teste("/acesso-vendedor e /aguardando seguem para todo papel e para sem_empresa/legado", () => {
  const todos: ResolucaoEmpresa[] = [
    ok("dono"), ok("cofundador"), ok("socio"), ok("funcionario"), ok("comercial"),
    { status: "sem_empresa" }, { status: "legado", workspaceId: WS_A, papel: "rh" },
  ];
  for (const res of todos)
    for (const p of ["/acesso-vendedor", "/acesso-vendedor/aguardando"]) {
      assert.equal(vaiPara(decide(p, res, ["leads"], false, [])), "seguir", `${res.status} ${p}`);
    }
});
await teste("com erro de consulta a tela do código NÃO é liberada", () => {
  assert.ok(vaiPara(decide("/acesso-vendedor", { status: "erro" })).startsWith(SEM_ACESSO));
});
await teste("escolherEmpresa: fundador > cofundador > sócio > funcionário > vendedor", () => {
  const e = (papel: EmpresaVinculo["papel"], id: string): EmpresaVinculo => ({ workspaceId: id, nome: papel, papel, donoId: "x" });
  const todas = [e("comercial", "1"), e("funcionario", "2"), e("socio", "3"), e("cofundador", "4"), e("dono", "5")];
  assert.equal(escolherEmpresa(todas, undefined)?.papel, "dono");
  assert.equal(escolherEmpresa(todas.filter((x) => x.papel !== "dono"), undefined)?.papel, "cofundador");
  assert.equal(escolherEmpresa(todas.filter((x) => !["dono", "cofundador"].includes(x.papel)), undefined)?.papel, "socio");
  assert.equal(escolherEmpresa(todas.slice(0, 2), undefined)?.papel, "funcionario");
});

await teste("permissoes_extras: {nome, chave} usa nome como rótulo e chave como id; aceita o formato antigo", () => {
  assert.deepEqual(extrasDoCatalogo([{ nome: "Ver contato dos leads", chave: "contato" }]), [
    { chave: "contato", rotulo: "Ver contato dos leads" },
  ]);
  assert.deepEqual(extrasDoCatalogo(["contato"]), [{ chave: "contato", rotulo: "Contato" }]);
  assert.deepEqual(extrasDoCatalogo([{ nome: "sem chave" }, 5, null]), []);
  assert.deepEqual(extrasDoCatalogo(null), []);
});

// ===========================================================================
// Fase 3.5 — Marketing, Financeiro, RH e Jurídico por empresa
// ===========================================================================

console.log("\nFase 3.5 — as empresas atuais não mudam (snapshot gerado no commit 615495d)");
const ATUAIS = ["leads", "renegados", "clientes", "agenda", "vendedores"];
const dourado = JSON.parse(
  readFileSync(new URL("./snapshot-empresas-atuais.json", import.meta.url), "utf8")
);
await teste("menu do dono com os 5 módulos de hoje é idêntico ao do snapshot", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(menuDoDono(ATUAIS))), dourado.menu);
  assert.equal(primeiraRotaHabilitada(ATUAIS), dourado.primeiraRota);
});
await teste("rotaPermitida é idêntica ao snapshot em todos os caminhos", () => {
  for (const [p, esperado] of Object.entries(dourado.rotaPermitida)) {
    assert.equal(rotaPermitida(p, ATUAIS), esperado, p);
  }
});
await teste("decisão do proxy idêntica ao snapshot para todo papel x permissões x caminho", () => {
  let n = 0;
  for (const [chave, esperado] of Object.entries(dourado.decisoes)) {
    const [papel, perm, path] = chave.split("|");
    const d = decidirAcesso({
      path,
      resolucao: { status: "ok", workspaceId: WS_A, papel: papel as Papel, corrigirCookie: false },
      habilitados: ATUAIS,
      permissoes: perm ? perm.split(",") : [],
      permiteMembros: CATALOGO,
      funcionarioSemVinculo: false,
    });
    assert.equal(d.tipo === "seguir" ? "seguir" : d.para, esperado, chave);
    n++;
  }
  assert.ok(n > 1000, `poucos casos (${n})`);
});

console.log("\nFase 3.5 — módulos novos: ligados ∩ permissão ∩ permite_membros");
const NOVOS = ["marketing", "financeiro", "juridico", "rh"];
const TODOS = [...ATUAIS, ...NOVOS];
await teste("fundador e cofundador abrem as rotas dos módulos novos quando ligados", () => {
  for (const papel of ["dono", "cofundador"] as const)
    for (const p of [
      "/marketing", "/marketing/calendario", "/marketing/campanhas", "/contas-pagar", "/dre",
      "/api/export/dre", "/dashboard/financeiro", "/rh", "/rh/folha", "/juridico", "/documentos",
    ]) {
      assert.equal(vaiPara(decide(p, ok(papel), TODOS)), "seguir", `${papel} ${p}`);
    }
});
await teste("módulo novo DESLIGADO é negado ao dono (volta à 1ª rota ligada) e ao sócio", () => {
  for (const p of ["/marketing", "/contas-pagar", "/rh", "/juridico", "/documentos", "/api/export/dre"]) {
    assert.equal(vaiPara(decide(p, ok("dono"), ATUAIS)), "/leads", p);
    assert.equal(vaiPara(decide(p, ok("socio"), ATUAIS, false, TODOS)), "/leads", `socio ${p}`);
  }
});
await teste("sócio com permissão em marketing/financeiro/juridico abre; sem permissão é negado", () => {
  for (const [modulo, rota] of [
    ["marketing", "/marketing/campanhas"],
    ["financeiro", "/contas-receber"],
    ["juridico", "/documentos"],
  ]) {
    for (const papel of ["socio", "funcionario"] as const) {
      assert.equal(vaiPara(decide(rota, ok(papel), TODOS, false, [modulo])), "seguir", `${papel} ${rota}`);
      assert.equal(vaiPara(decide(rota, ok(papel), TODOS, false, ["leads"])), "/leads", `${papel} sem permissão ${rota}`);
      assert.equal(vaiPara(decide(rota, ok(papel), TODOS, false, [])), AGUARDANDO_LIBERACAO, `${papel} nenhuma ${rota}`);
    }
  }
});
await teste("RH é negado a sócio e funcionário (permite_membros=false), mesmo ligado e com permissão", () => {
  for (const papel of ["socio", "funcionario"] as const)
    for (const p of ["/rh", "/rh/folha", "/rh/funcionarios", "/rh/ponto"]) {
      assert.equal(vaiPara(decide(p, ok(papel), TODOS, false, ["rh", "leads"])), "/leads", `${papel} ${p}`);
    }
});
await teste("a matriz (modulosOferecidos) só traz módulos ligados E com permite_membros=true", () => {
  assert.deepEqual(
    modulosOferecidos(TODOS, CATALOGO),
    ["leads", "renegados", "clientes", "agenda", "marketing", "financeiro", "juridico"]
  );
  assert.ok(!modulosOferecidos(TODOS, CATALOGO).includes("rh"));
  assert.ok(!modulosOferecidos(TODOS, CATALOGO).includes("vendedores"));
  assert.deepEqual(modulosOferecidos(ATUAIS, CATALOGO), ["leads", "renegados", "clientes", "agenda"]);
  assert.deepEqual(modulosOferecidos(TODOS, []), []);
  assert.deepEqual(modulosOferecidos(["marketing"], CATALOGO), ["marketing"]);
});
await teste("filtrarPermissoesOferecidas remove da matriz o que não foi oferecido", () => {
  const p = [
    { modulo: "rh", nivel: "edicao" as const, extras: [] },
    { modulo: "leads", nivel: "leitura" as const, extras: [] },
  ];
  assert.deepEqual(filtrarPermissoesOferecidas(p, ["leads"]).map((x) => x.modulo), ["leads"]);
});
await teste("catálogo: lê só permite_membros=true do registro; falha ou exceção = lista vazia", async () => {
  const mk = (r: unknown) => ({ from: () => ({ select: () => ({ eq: async () => r }) }) });
  assert.deepEqual(
    await getModulosPermiteMembrosDoCatalogo(
      mk({ data: [{ chave: "leads" }, { chave: "marketing" }, { chave: "inventado" }], error: null }) as never
    ),
    ["leads", "marketing"]
  );
  assert.deepEqual(
    await getModulosPermiteMembrosDoCatalogo(mk({ data: null, error: { message: "x" } }) as never),
    []
  );
  const comExcecao = {
    from: () => {
      throw new Error("rede");
    },
  };
  assert.deepEqual(await getModulosPermiteMembrosDoCatalogo(comExcecao as never), []);
});
await teste("rotas dos módulos do registro não colidem entre módulos", () => {
  const vistas = new Map<string, string>();
  for (const m of MODULOS)
    for (const r of m.rotas) {
      assert.ok(!vistas.has(r), `${r} em ${m.chave} e ${vistas.get(r)}`);
      vistas.set(r, m.chave);
    }
});

console.log("\nFase 3.5 — guard de módulo (resolverAcessoModulo)");
const perm = (modulo: string, nivel: "leitura" | "edicao", extras: string[] = []) => ({ modulo, nivel, extras });
const guard = (
  modulo: string,
  papel: string | null,
  nivelMinimo: "leitura" | "edicao",
  p: { habilitados?: string[]; permiteMembros?: string[]; permissoes?: ReturnType<typeof perm>[] } = {}
) =>
  resolverAcessoModulo({
    modulo,
    papel,
    nivelMinimo,
    habilitados: p.habilitados ?? TODOS,
    permiteMembros: p.permiteMembros ?? CATALOGO,
    permissoes: p.permissoes ?? [],
  });
await teste("fundador e cofundador: acesso total a todo módulo ligado (inclusive RH)", () => {
  for (const papel of ["dono", "cofundador"])
    for (const m of ["marketing", "financeiro", "juridico", "rh", "leads"]) {
      for (const nivel of ["leitura", "edicao"] as const) {
        const r = guard(m, papel, nivel);
        assert.ok(r?.ehDono && r.nivel === "edicao", `${papel} ${m} ${nivel}`);
      }
    }
});
await teste("módulo desligado é negado a todos, inclusive ao dono", () => {
  for (const papel of ["dono", "cofundador", "socio", "funcionario"])
    assert.equal(guard("marketing", papel, "leitura", { habilitados: ATUAIS, permissoes: [perm("marketing", "edicao")] }), null, papel);
});
await teste("sócio com leitura lê mas NÃO escreve; com edição faz os dois", () => {
  for (const papel of ["socio", "funcionario"]) {
    const leitura = [perm("financeiro", "leitura", ["valores"])];
    assert.deepEqual(guard("financeiro", papel, "leitura", { permissoes: leitura }), { ehDono: false, nivel: "leitura", extras: ["valores"] });
    assert.equal(guard("financeiro", papel, "edicao", { permissoes: leitura }), null, `${papel} escrita com leitura`);
    const edicao = [perm("financeiro", "edicao")];
    assert.equal(guard("financeiro", papel, "edicao", { permissoes: edicao })?.nivel, "edicao");
  }
});
await teste("sócio sem permissão no módulo (ou com permissão só em outro) é negado", () => {
  for (const papel of ["socio", "funcionario"]) {
    assert.equal(guard("marketing", papel, "leitura", { permissoes: [] }), null);
    assert.equal(guard("marketing", papel, "leitura", { permissoes: [perm("leads", "edicao")] }), null);
  }
});
await teste("RH negado a sócio/funcionário (permite_membros=false) mesmo com permissão gravada", () => {
  for (const papel of ["socio", "funcionario"]) {
    assert.equal(guard("rh", papel, "leitura", { permissoes: [perm("rh", "edicao")] }), null, papel);
    assert.equal(guard("rh", papel, "edicao", { permissoes: [perm("rh", "edicao")] }), null, papel);
  }
  assert.equal(guard("marketing", "socio", "leitura", { permiteMembros: [], permissoes: [perm("marketing", "edicao")] }), null);
});
await teste("vendedor (comercial), papel legado, nulo e módulo desconhecido: negado", () => {
  for (const papel of ["comercial", "financeiro", "rh", "", null, "admin"])
    assert.equal(guard("leads", papel, "leitura", { permissoes: [perm("leads", "edicao")] }), null, String(papel));
  assert.equal(guard("inventado", "dono", "leitura", { habilitados: ["inventado"] }), null);
});

console.log(`\n${total} testes`);
if (process.exitCode) console.log("HÁ FALHAS");
