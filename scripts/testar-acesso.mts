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
import { MODULOS, menuDoDono, moduloDaRota, primeiraRotaHabilitada, rotaPermitida } from "@/lib/modulos/registry";
import { permissoesJuridico } from "@/lib/juridico-shared";
import { filtrarPermissoesOferecidas, modulosOferecidos } from "@/lib/socios-shared";
import { getModulosPermiteMembrosDoCatalogo } from "@/lib/modulos/catalogo";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolverAcessoModulo } from "@/lib/modulos/guard";
import { permissoesFinanceiro } from "@/lib/financeiro/permissoes";
import { computeCampanhaDerived } from "@/lib/marketing/campanha-metrics-shared";
import {
  ROTULOS_PADRAO,
  SEM_ROTULOS,
  criarRotulos,
  labelDoItemMenu,
  lerMapaRotulos,
  mesclarRotulos,
  minusculo,
  ordemParaLigar,
  rotulo,
  validarRotulo,
  type MapaRotulos,
} from "@/lib/rotulos-shared";
import { erroDeNicho, resumoModulos } from "@/lib/nichos-shared";
import { sanearPermissoes, sociosErrorMessage } from "@/lib/socios-shared";
import {
  AVISO_ATIVE_FINANCEIRO,
  AVISO_SEM_FINANCEIRO,
  EXTRA_SALARIOS,
  SEM_PERMISSAO_SALARIOS,
  erroValorSemPermissao,
  motivoNegarFolha,
  podeVerSalarios,
} from "@/lib/rh/salarios";
import {
  AVISO_ENVIADO,
  ROTA_APROVACOES,
  contarMinhasPendencias,
  deveReler,
  erroDaFalha,
  erroDeAprovacao,
  fraseDaRegra,
  historico,
  lerAprovacoes,
  lerResultado,
  lerVotos,
  mensagemDoVoto,
  nomesDeFaltantes,
  pendentes,
  podeCancelar,
  podeVotar,
  precisaAprovacao,
  statusExibido,
  textoDoResultado,
} from "@/lib/aprovacoes-shared";
import { SIGNUP_OPCOES, SWITCHER_ACCOUNT_TYPES } from "@/lib/account-types";
import {
  ACCOUNT_TYPE_HOME_ROUTE,
  MODE_HOME_ROUTE,
  accountTypeHubMode,
  accountTypeToHubMode,
} from "@/lib/hub-mode";
import { garantirTipoAtivo, tipoContaDaMetadata } from "@/lib/perfil";
import { NOVA_EMPRESA } from "@/lib/empresa";
import { ACESSO_VENDEDOR_CODIGO } from "@/lib/vendedor-access";
import {
  CONFIG_PADRAO,
  abaixoDoMinimo,
  custoPorGrama,
  depreciacaoPorHora,
  desgastePorHora,
  entradaParaRecalculo,
  gramasDeRolos,
  horasParaManutencao,
  manutencaoVencida,
  pecaVencida,
  podeVerCustos,
} from "@/lib/impressao-3d/regras";
import { formatMoeda, formatNumero, formatPct, formatPercentualFracao, parseNumero } from "@/lib/impressao-3d/numeros";
import {
  ConfigSchema,
  FAIXA_DESPERDICIO,
  FAIXA_FALHAS,
  ImpressoraSchema,
  MaterialSchema,
  MovimentoSchema,
  OrcamentoSchema,
} from "@/lib/impressao-3d/validacao";
import { LIMITE_BYTES, caminhoValido, montarCaminho, tipoPorNome } from "@/lib/impressao-3d/arquivos";
import { ESTADO_VAZIO, estadoParaEdicao, montarEntrada } from "@/lib/impressao-3d/simulador";
import { lerCalculo, normalizarFracao, ocultarCustosDoCalculo } from "@/lib/impressao-3d/calculo";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { BUCKET_P3D } from "@/lib/impressao-3d/storage-constantes";

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

// modulos.permite_membros = true hoje (só vendedores = false; o RH passou a aceitar equipe na Fase 5).
const CATALOGO = ["leads", "renegados", "clientes", "agenda", "marketing", "financeiro", "juridico", "rh"];

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
await teste("módulo com permite_membros=false (vendedores) nunca libera rota, mesmo com permissão gravada", () => {
  assert.deepEqual(modulosVisiveis(["financeiro", "leads"], ["vendedores"], CATALOGO), []);
  assert.equal(vaiPara(decide("/vendedores", ok("socio"), ["vendedores"], false, ["vendedores"])), AGUARDANDO_LIBERACAO);
  // Se o catálogo marcar o RH como permite_membros=false, ele volta a ser só do fundador.
  const semRh = CATALOGO.filter((m) => m !== "rh");
  assert.equal(vaiPara(decide("/rh", ok("funcionario"), ["rh"], false, ["rh"], semRh)), AGUARDANDO_LIBERACAO);
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
await teste("RH é por pessoa: sócio e funcionário abrem com permissão em rh e são negados sem ela", () => {
  for (const papel of ["socio", "funcionario"] as const)
    for (const p of ["/rh", "/rh/folha", "/rh/funcionarios", "/rh/ponto"]) {
      assert.equal(vaiPara(decide(p, ok(papel), TODOS, false, ["rh", "leads"])), "seguir", `${papel} ${p}`);
      assert.equal(vaiPara(decide(p, ok(papel), TODOS, false, ["leads"])), "/leads", `${papel} sem permissão ${p}`);
    }
});
await teste("a matriz (modulosOferecidos) só traz módulos ligados E com permite_membros=true", () => {
  assert.deepEqual(
    modulosOferecidos(TODOS, CATALOGO),
    ["leads", "renegados", "clientes", "agenda", "marketing", "financeiro", "juridico", "rh"]
  );
  assert.ok(modulosOferecidos(TODOS, CATALOGO).includes("rh"));
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
await teste("RH negado a sócio/funcionário só se o catálogo marcar permite_membros=false", () => {
  const semRh = CATALOGO.filter((m) => m !== "rh");
  for (const papel of ["socio", "funcionario"]) {
    assert.equal(guard("rh", papel, "leitura", { permiteMembros: semRh, permissoes: [perm("rh", "edicao")] }), null, papel);
    assert.equal(guard("rh", papel, "edicao", { permiteMembros: semRh, permissoes: [perm("rh", "edicao")] }), null, papel);
  }
  assert.equal(guard("marketing", "socio", "leitura", { permiteMembros: [], permissoes: [perm("marketing", "edicao")] }), null);
});
await teste("vendedor (comercial), papel legado, nulo e módulo desconhecido: negado", () => {
  for (const papel of ["comercial", "financeiro", "rh", "", null, "admin"])
    assert.equal(guard("leads", papel, "leitura", { permissoes: [perm("leads", "edicao")] }), null, String(papel));
  assert.equal(guard("inventado", "dono", "leitura", { habilitados: ["inventado"] }), null);
});

console.log('\nFase 3.5 — Marketing: métrica sem permissão é "—" (null), nunca zero');
await teste("computeCampanhaDerived: sem leads/receita (null) não calcula custo/lead nem ROI", () => {
  const camp = { valor_gasto: 100 };
  assert.deepEqual(
    computeCampanhaDerived(camp, { leadsGerados: null, clientesConvertidos: null, receitaGerada: null }),
    { custoPorLead: null, roi: null }
  );
  assert.deepEqual(
    computeCampanhaDerived(camp, { leadsGerados: 4, clientesConvertidos: 1, receitaGerada: null }),
    { custoPorLead: 25, roi: null }
  );
  assert.deepEqual(
    computeCampanhaDerived(camp, { leadsGerados: 0, clientesConvertidos: 0, receitaGerada: 200 }),
    { custoPorLead: null, roi: 100 }
  );
});

console.log('\nFase 3.5 — Financeiro: nível e extra "valores"');
await teste("fundador/cofundador: valores e escrita; sócio: leitura nunca escreve, sem valores nunca escreve", () => {
  const p = permissoesFinanceiro;
  assert.deepEqual(p({ ehDono: true, nivel: "edicao", extras: [] }), { valores: true, somenteLeitura: false });
  assert.deepEqual(p({ ehDono: false, nivel: "leitura", extras: ["valores"] }), { valores: true, somenteLeitura: true });
  assert.deepEqual(p({ ehDono: false, nivel: "edicao", extras: [] }), { valores: false, somenteLeitura: true });
  assert.deepEqual(p({ ehDono: false, nivel: "leitura", extras: [] }), { valores: false, somenteLeitura: true });
  assert.deepEqual(p({ ehDono: false, nivel: "edicao", extras: ["valores"] }), { valores: true, somenteLeitura: false });
  assert.deepEqual(p({ ehDono: false, nivel: "edicao", extras: ["contato", "investimento"] }), { valores: false, somenteLeitura: true });
});

console.log("\nFase 3.5 — RH: workspace_id em tudo que a folha grava");
await teste("gerarFolhaDoMes lê por workspace_id e grava workspace_id em contas_pagar e folha_pagamento", async () => {
  const inserts: { tabela: string; row: Record<string, unknown> }[] = [];
  const filtros: { tabela: string; coluna: string; valor: unknown }[] = [];
  const dados: Record<string, unknown[]> = {
    funcionarios: [{ id: "f1", nome: "Ana", salario: 3000 }, { id: "f2", nome: "Bia", salario: null }],
    folha_pagamento: [],
  };
  const fake = {
    from(tabela: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = {};
      q.select = () => q;
      q.eq = (coluna: string, valor: unknown) => {
        filtros.push({ tabela, coluna, valor });
        return q;
      };
      q.insert = (row: Record<string, unknown>) => {
        inserts.push({ tabela, row });
        return q;
      };
      q.delete = () => q;
      q.single = async () => ({ data: { id: `conta-${inserts.length}` }, error: null });
      q.then = (resolve: (v: unknown) => unknown) => resolve({ data: dados[tabela] ?? [], error: null });
      return q;
    },
  };
  const { gerarFolhaDoMes } = await import("@/lib/rh/folha-sync");
  const r = await gerarFolhaDoMes(fake as never, { workspaceId: WS_A, donoId: "dono-1" }, "2026-10-01", 5);
  assert.equal(r.criados, 2);
  const gravacoes = inserts.filter((i) => i.tabela === "contas_pagar" || i.tabela === "folha_pagamento");
  assert.equal(gravacoes.length, 4);
  for (const g of gravacoes) assert.equal(g.row.workspace_id, WS_A, g.tabela);
  for (const f of filtros.filter((x) => x.tabela === "funcionarios" || x.tabela === "folha_pagamento")) {
    assert.ok(f.coluna !== "user_id", `${f.tabela} filtrou por user_id`);
  }
  assert.ok(filtros.some((f) => f.tabela === "funcionarios" && f.coluna === "workspace_id" && f.valor === WS_A));
});

console.log("\nFase 3.5 — Jurídico: rotas, menu e escrita");
await teste("rotas do Jurídico (telas novas e /documentos) pertencem ao módulo; ligado abre, desligado nega", () => {
  for (const p of [
    "/juridico", "/juridico/processos", "/juridico/compliance",
    "/juridico/propriedade-intelectual", "/juridico/modelos-contrato", "/documentos",
  ]) {
    assert.equal(moduloDaRota(p), "juridico", p);
    assert.equal(rotaPermitida(p, ["juridico"]), true, p);
    assert.equal(rotaPermitida(p, ATUAIS), false, p);
  }
  const hrefs = menuDoDono(["juridico"]).flatMap((g) => g.itens.map((i) => i.href));
  assert.deepEqual(hrefs, [
    "/juridico", "/juridico/processos", "/juridico/compliance",
    "/juridico/propriedade-intelectual", "/juridico/modelos-contrato", "/documentos",
  ]);
});
await teste("sócio com Jurídico abre as telas do módulo; sem permissão volta; dono vê tudo", () => {
  for (const p of ["/juridico", "/juridico/processos", "/juridico/modelos-contrato", "/documentos"]) {
    assert.equal(vaiPara(decide(p, ok("socio"), TODOS, false, ["juridico"])), "seguir", p);
    assert.equal(vaiPara(decide(p, ok("funcionario"), TODOS, false, ["marketing"])), "/marketing", p);
    assert.equal(vaiPara(decide(p, ok("dono"), TODOS)), "seguir", p);
    assert.equal(vaiPara(decide(p, ok("cofundador"), TODOS)), "seguir", p);
  }
});
await teste("permissoesJuridico: leitura nunca escreve; telas por cliente exigem Clientes; modelos só o nível", () => {
  assert.deepEqual(permissoesJuridico("edicao", true), { somenteLeitura: false, somenteLeituraPorCliente: false });
  assert.deepEqual(permissoesJuridico("edicao", false), { somenteLeitura: false, somenteLeituraPorCliente: true });
  assert.deepEqual(permissoesJuridico("leitura", true), { somenteLeitura: true, somenteLeituraPorCliente: true });
  assert.deepEqual(permissoesJuridico("leitura", false), { somenteLeitura: true, somenteLeituraPorCliente: true });
});
await teste("o guard exige Jurídico ligado: o dono sem o módulo é negado; leitura de sócio não escreve", () => {
  assert.equal(guard("juridico", "dono", "edicao", { habilitados: ATUAIS }), null);
  assert.equal(guard("juridico", "socio", "edicao", { permissoes: [perm("juridico", "leitura")] }), null);
  assert.equal(guard("juridico", "socio", "leitura", { permissoes: [perm("juridico", "leitura")] })?.nivel, "leitura");
  assert.equal(guard("juridico", "socio", "leitura", { permissoes: [perm("clientes", "edicao")] }), null);
});

// ===========================================================================
// Fase 4 — nichos, modelos e rótulos por empresa
// ===========================================================================

console.log("\nFase 4 — empresa sem workspace_config fica idêntica (mesmos textos, menu e rotas)");
await teste("sem rótulos, todo item do menu de todo módulo mantém o label do registro", () => {
  const rotulos = criarRotulos(SEM_ROTULOS);
  let n = 0;
  for (const m of MODULOS)
    for (const item of m.menu) {
      assert.equal(labelDoItemMenu(rotulos, item.href, item.label), item.label, item.href);
      n++;
    }
  assert.ok(n >= 20, `poucos itens (${n})`);
});
await teste("sem rótulos, o menu renderizado (label por item) é idêntico ao do snapshot", () => {
  const rotulos = criarRotulos(lerMapaRotulos(undefined));
  const rendered = menuDoDono(ATUAIS).map((g) => ({
    titulo: g.titulo,
    itens: g.itens.map((i) => ({ ...i, label: labelDoItemMenu(rotulos, i.href, i.label) })),
  }));
  assert.deepEqual(JSON.parse(JSON.stringify(rendered)), dourado.menu);
});
await teste("sem rótulos: texto() devolve o padrão intacto e singular/plural são os nomes de hoje", () => {
  const r = criarRotulos();
  for (const m of Object.keys(ROTULOS_PADRAO)) {
    assert.equal(r.personalizado(m), false, m);
    assert.equal(r.texto(m, "texto de hoje", () => "NUNCA"), "texto de hoje", m);
  }
  assert.equal(r.plural("leads"), "Leads");
  assert.equal(r.plural("renegados"), "Renegados");
  assert.equal(r.plural("clientes"), "Clientes");
  assert.equal(r.plural("agenda"), "Agenda");
  assert.equal(r.singular("clientes"), "Cliente");
});
await teste("os padrões de plural dos módulos de um item coincidem com o menu do registro", () => {
  for (const m of MODULOS.filter((x) => x.menu.length === 1)) {
    assert.equal(ROTULOS_PADRAO[m.chave]?.plural, m.menu[0].label, m.chave);
  }
});
await teste("o código dos rótulos não muda rotas nem acesso: rotaPermitida/decisão seguem o snapshot", () => {
  for (const [p, esperado] of Object.entries(dourado.rotaPermitida)) {
    assert.equal(rotaPermitida(p, ATUAIS), esperado, p);
  }
});

console.log("\nFase 4 — rotulo() com configuração");
const SAUDE: MapaRotulos = lerMapaRotulos({
  labels: {
    clientes: { singular: "Paciente", plural: "Pacientes" },
    agenda: { singular: "Consulta", plural: "Consultas" },
  },
});
await teste("rotulo() devolve o configurado; módulo sem rótulo cai no padrão", () => {
  assert.equal(rotulo(SAUDE, "clientes", "singular"), "Paciente");
  assert.equal(rotulo(SAUDE, "clientes", "plural"), "Pacientes");
  assert.equal(rotulo(SAUDE, "agenda", "plural"), "Consultas");
  assert.equal(rotulo(SAUDE, "leads", "plural"), "Leads");
  assert.equal(rotulo(SAUDE, "modulo_que_nao_existe", "singular"), "modulo_que_nao_existe");
});
await teste("o menu troca só o módulo configurado e só quando ele tem UM item no menu", () => {
  const r = criarRotulos(SAUDE);
  assert.equal(labelDoItemMenu(r, "/clientes", "Clientes"), "Pacientes");
  assert.equal(labelDoItemMenu(r, "/agenda", "Agenda"), "Consultas");
  assert.equal(labelDoItemMenu(r, "/leads", "Leads"), "Leads");
  const financeiro = criarRotulos({ financeiro: { singular: "Caixa", plural: "Caixa" } });
  assert.equal(labelDoItemMenu(financeiro, "/contas-pagar", "Contas a Pagar"), "Contas a Pagar");
  assert.equal(labelDoItemMenu(r, "/dashboard", "Visão Geral"), "Visão Geral");
});
await teste("texto() usa formulações neutras só no módulo renomeado", () => {
  const r = criarRotulos(SAUDE);
  assert.equal(r.texto("clientes", "Novo cliente", ({ singular }) => `Adicionar ${singular}`), "Adicionar Paciente");
  assert.equal(r.texto("clientes", "x", ({ plural }) => `Lista de ${plural}`), "Lista de Pacientes");
  assert.equal(r.texto("clientes", "x", ({ pluralMin }) => `${pluralMin} hoje`), "pacientes hoje");
  assert.equal(r.texto("leads", "Novo lead", () => "NUNCA"), "Novo lead");
});
await teste("rótulo igual ao padrão (ex.: Cliente/Clientes da estética) conta como sem rótulo", () => {
  const r = criarRotulos(lerMapaRotulos({ labels: { clientes: { singular: "Cliente", plural: "Clientes" } } }));
  assert.equal(r.personalizado("clientes"), false);
  assert.equal(r.texto("clientes", "Novo cliente", () => "NUNCA"), "Novo cliente");
  assert.equal(labelDoItemMenu(r, "/clientes", "Clientes"), "Clientes");
});
await teste("minusculo preserva siglas", () => {
  assert.equal(minusculo("Consultas"), "consultas");
  assert.equal(minusculo("SST"), "SST");
  assert.equal(minusculo(""), "");
});
await teste("lerMapaRotulos ignora lixo: config ausente, tipos errados, módulo desconhecido, tamanhos", () => {
  for (const ruim of [null, undefined, 42, "x", [], {}, { labels: null }, { labels: [] }, { labels: "x" }])
    assert.deepEqual(lerMapaRotulos(ruim), {});
  const mapa = lerMapaRotulos({
    labels: {
      clientes: { singular: "  Aluno ", plural: "Alunos" },
      leads: { singular: "", plural: "Contatos" },
      agenda: { singular: "Aula" },
      renegados: { singular: "x".repeat(41), plural: "Y" },
      inexistente: { singular: "A", plural: "B" },
      marketing: "Campanhas",
    },
  });
  assert.deepEqual(mapa, { clientes: { singular: "Aluno", plural: "Alunos" } });
});

console.log("\nFase 4 — salvar_rotulos recebe o mapa COMPLETO");
await teste("mesclarRotulos parte do gravado e aplica só as edições (nada some)", () => {
  const atual: MapaRotulos = {
    clientes: { singular: "Paciente", plural: "Pacientes" },
    agenda: { singular: "Consulta", plural: "Consultas" },
  };
  const novo = mesclarRotulos(atual, { leads: { singular: "Contato", plural: "Contatos" } });
  assert.deepEqual(Object.keys(novo).sort(), ["agenda", "clientes", "leads"]);
  assert.deepEqual(novo.clientes, atual.clientes);
  assert.deepEqual(novo.agenda, atual.agenda);
  assert.deepEqual(atual, { clientes: { singular: "Paciente", plural: "Pacientes" }, agenda: { singular: "Consulta", plural: "Consultas" } });
});
await teste("mesclarRotulos: editar um módulo troca só ele; voltar ao padrão remove a entrada", () => {
  const atual: MapaRotulos = {
    clientes: { singular: "Paciente", plural: "Pacientes" },
    agenda: { singular: "Consulta", plural: "Consultas" },
  };
  const a = mesclarRotulos(atual, { clientes: { singular: " Aluno ", plural: "Alunos" } });
  assert.deepEqual(a.clientes, { singular: "Aluno", plural: "Alunos" });
  assert.deepEqual(a.agenda, atual.agenda);
  const b = mesclarRotulos(atual, { clientes: { singular: "Cliente", plural: "Clientes" } });
  assert.equal("clientes" in b, false);
  assert.deepEqual(b.agenda, atual.agenda);
  assert.deepEqual(mesclarRotulos({}, { leads: { singular: "Lead", plural: "Leads" } }), {});
});
await teste("validarRotulo: 1 a 40 caracteres em singular e plural (como a RPC)", () => {
  assert.equal(validarRotulo({ singular: "A", plural: "B" }), null);
  assert.equal(validarRotulo({ singular: "x".repeat(40), plural: "y".repeat(40) }), null);
  assert.ok(validarRotulo({ singular: "", plural: "B" }));
  assert.ok(validarRotulo({ singular: "  ", plural: "B" }));
  assert.ok(validarRotulo({ singular: "A", plural: "y".repeat(41) }));
});

console.log("\nFase 4 — erros de nicho/modelo e módulos recomendados");
await teste("nicho/modelo inválido e sem permissão viram mensagens claras (sem estourar)", () => {
  assert.match(erroDeNicho("Nicho inválido"), /tipo de negócio/);
  assert.match(erroDeNicho("Modelo inválido"), /modelo/i);
  assert.match(erroDeNicho("Sem permissão"), /dono|cofundador/);
  assert.match(erroDeNicho("Use de 1 a 40 caracteres nos rótulos de clientes"), /1 a 40/);
  assert.match(erroDeNicho("Módulo inválido para rótulo: xyz"), /inválid|Dados/);
  assert.ok(erroDeNicho(undefined));
  assert.ok(erroDeNicho("qualquer coisa"));
});
await teste("resumoModulos monta 'A, B e C'", () => {
  assert.equal(resumoModulos([]), "");
  assert.equal(resumoModulos(["Clientes"]), "Clientes");
  assert.equal(resumoModulos(["Clientes", "Agenda"]), "Clientes e Agenda");
  assert.equal(resumoModulos(["Clientes", "Agenda", "Financeiro"]), "Clientes, Agenda e Financeiro");
});
const CAT = [
  { chave: "leads", ativo: true, dependeDe: [] },
  { chave: "clientes", ativo: true, dependeDe: [] },
  { chave: "agenda", ativo: true, dependeDe: [] },
  { chave: "financeiro", ativo: true, dependeDe: ["clientes"] },
  { chave: "rh", ativo: true, dependeDe: ["financeiro"] },
  { chave: "juridico", ativo: false, dependeDe: ["clientes"] },
  { chave: "marketing", ativo: true, dependeDe: [] },
];
await teste("ordemParaLigar põe dependências antes, pula ligados, inativos e desconhecidos", () => {
  assert.deepEqual(ordemParaLigar(["rh"], CAT, []), ["clientes", "financeiro", "rh"]);
  assert.deepEqual(ordemParaLigar(["financeiro", "agenda"], CAT, ["clientes"]), ["financeiro", "agenda"]);
  assert.deepEqual(ordemParaLigar(["juridico", "desconhecido", "marketing"], CAT, []), ["marketing"]);
  assert.deepEqual(ordemParaLigar(["leads", "leads"], CAT, ["leads"]), []);
});
await teste("ordemParaLigar não entra em loop com dependência circular", () => {
  const ciclo = [
    { chave: "leads", ativo: true, dependeDe: ["clientes"] },
    { chave: "clientes", ativo: true, dependeDe: ["leads"] },
  ];
  const ordem = ordemParaLigar(["leads"], ciclo, []);
  assert.ok(ordem.length <= 2);
  assert.equal(new Set(ordem).size, ordem.length);
});

console.log("\nFase 4 — acesso: só fundador/cofundador mexe; sem loops de redirecionamento");
function seguirRedirects(path: string, res: ResolucaoEmpresa, habilitados: string[], permissoes: string[] = []) {
  const visitados: string[] = [];
  let atual = path;
  for (let i = 0; i < 6; i++) {
    visitados.push(atual);
    const d = decide(atual, res, habilitados, false, permissoes);
    if (d.tipo === "seguir") return { final: atual, visitados };
    const destino = d.para.split("?")[0]; // o proxy decide pelo caminho, sem a query
    if (visitados.includes(destino)) return { final: null, visitados: [...visitados, destino] };
    atual = destino;
  }
  return { final: null, visitados };
}
await teste("fundador e cofundador abrem /configuracoes, /modulos e /nova-empresa", () => {
  for (const papel of ["dono", "cofundador"] as const)
    for (const p of ["/configuracoes", "/modulos", "/nova-empresa"])
      assert.equal(vaiPara(decide(p, ok(papel), ATUAIS)), "seguir", `${papel} ${p}`);
});
await teste("sócio e funcionário não abrem /configuracoes nem /modulos (onde se troca nicho e nomes)", () => {
  for (const papel of ["socio", "funcionario"] as const)
    for (const p of ["/configuracoes", "/modulos"])
      assert.notEqual(vaiPara(decide(p, ok(papel), ATUAIS, false, ["leads"])), "seguir", `${papel} ${p}`);
});
await teste("nenhuma combinação papel x rota de Fase 4 entra em loop (termina em até 3 saltos)", () => {
  for (const papel of ["dono", "cofundador", "socio", "funcionario", "comercial"] as const)
    for (const hab of [[], ATUAIS, TODOS])
      for (const p of ["/configuracoes", "/modulos", "/nova-empresa", "/dashboard", "/clientes", "/agenda", "/leads", "/renegados"]) {
        const r = seguirRedirects(p, ok(papel), hab, ["leads", "clientes"]);
        assert.ok(r.final !== null && r.visitados.length <= 3, `${papel} ${p} [${hab.length}]: ${r.visitados.join(" -> ")}`);
      }
});

// ===========================================================================
// Fase 5 — RH por pessoa, extra de salários e aprovações entre fundadores
// ===========================================================================

console.log("\nFase 5 — RH por pessoa: leitura / edição / sem acesso / desligado");
const RH_ROTAS = ["/rh", "/rh/funcionarios", "/rh/folha", "/rh/ponto", "/rh/recrutamento", "/rh/avaliacoes"];
await teste("fundador e cofundador abrem o RH quando ligado; desligado volta à 1ª rota ligada", () => {
  for (const papel of ["dono", "cofundador"] as const)
    for (const p of RH_ROTAS) {
      assert.equal(vaiPara(decide(p, ok(papel), TODOS)), "seguir", `${papel} ${p}`);
      assert.equal(vaiPara(decide(p, ok(papel), ATUAIS)), "/leads", `${papel} RH desligado ${p}`);
    }
});
await teste("sócio/funcionário: com permissão em rh abre; sem permissão ou com RH desligado é negado", () => {
  for (const papel of ["socio", "funcionario"] as const)
    for (const p of RH_ROTAS) {
      assert.equal(vaiPara(decide(p, ok(papel), TODOS, false, ["rh"])), "seguir", `${papel} ${p}`);
      assert.equal(vaiPara(decide(p, ok(papel), TODOS, false, ["leads"])), "/leads", `${papel} sem permissão ${p}`);
      assert.equal(vaiPara(decide(p, ok(papel), ATUAIS, false, ["rh", "leads"])), "/leads", `${papel} RH desligado ${p}`);
    }
});
await teste("guard: leitura lê e não escreve; edição faz os dois; sem permissão e RH desligado negam", () => {
  for (const papel of ["socio", "funcionario"]) {
    const leitura = [perm("rh", "leitura")];
    assert.equal(guard("rh", papel, "leitura", { permissoes: leitura })?.nivel, "leitura", `${papel} lê`);
    assert.equal(guard("rh", papel, "edicao", { permissoes: leitura }), null, `${papel} não escreve com leitura`);
    const edicao = [perm("rh", "edicao")];
    assert.equal(guard("rh", papel, "leitura", { permissoes: edicao })?.nivel, "edicao");
    assert.equal(guard("rh", papel, "edicao", { permissoes: edicao })?.nivel, "edicao");
    assert.equal(guard("rh", papel, "leitura", { permissoes: [] }), null, `${papel} sem permissão`);
    assert.equal(guard("rh", papel, "leitura", { permissoes: edicao, habilitados: ATUAIS }), null, `${papel} RH desligado`);
  }
  for (const papel of ["dono", "cofundador"])
    assert.equal(guard("rh", papel, "edicao", { habilitados: ATUAIS }), null, `${papel} RH desligado`);
});
await teste("menu: o RH só aparece para quem tem acesso E o módulo está ligado", () => {
  const grupos = (hab: string[]) => menuDoDono(hab).map((g) => g.titulo);
  assert.ok(grupos(TODOS).includes("RH"), "dono com RH ligado");
  assert.ok(!grupos(ATUAIS).includes("RH"), "dono com RH desligado");
  // Sócio: o layout monta habilitados ∩ permissões ∩ permite_membros.
  const visiveis = (hab: string[], permitidos: string[]) => modulosVisiveis(hab, permitidos, CATALOGO);
  assert.ok(grupos(visiveis(TODOS, ["rh"])).includes("RH"), "sócio com permissão");
  assert.ok(!grupos(visiveis(TODOS, ["leads"])).includes("RH"), "sócio sem permissão");
  assert.ok(!grupos(visiveis(ATUAIS, ["rh"])).includes("RH"), "RH desligado");
});
await teste("RH aparece na matriz de permissões e nos setores, com o extra 'Ver salários e folha'", () => {
  assert.ok(modulosOferecidos(TODOS, CATALOGO).includes("rh"));
  assert.ok(!modulosOferecidos(ATUAIS, CATALOGO).includes("rh"), "desligado não é oferecido");
  assert.deepEqual(extrasDoCatalogo([{ chave: "salarios", nome: "Ver salários e folha" }]), [
    { chave: "salarios", rotulo: "Ver salários e folha" },
  ]);
  // O servidor aceita o extra na matriz (sanearPermissoes preserva extras curtos).
  const p = sanearPermissoes([{ modulo: "rh", nivel: "edicao", extras: ["salarios"] }]);
  assert.deepEqual(p, [{ modulo: "rh", nivel: "edicao", extras: ["salarios"] }]);
});

console.log("\nFase 5 — RH: extra 'salarios' esconde e bloqueia valores");
await teste("podeVerSalarios: fundador/cofundador sempre; sócio/funcionário só com o extra", () => {
  assert.equal(podeVerSalarios({ ehDono: true, extras: [] }), true);
  assert.equal(podeVerSalarios({ ehDono: false, extras: [] }), false);
  assert.equal(podeVerSalarios({ ehDono: false, extras: ["outro"] }), false);
  assert.equal(podeVerSalarios({ ehDono: false, extras: [EXTRA_SALARIOS] }), true);
  const r = guard("rh", "socio", "edicao", { permissoes: [perm("rh", "edicao", ["salarios"])] });
  assert.ok(r && podeVerSalarios(r));
  const sem = guard("rh", "socio", "edicao", { permissoes: [perm("rh", "edicao")] });
  assert.ok(sem && !podeVerSalarios(sem));
});
await teste("sem o extra, enviar salário/valor/salário previsto é recusado; vazio passa; com o extra passa", () => {
  const sem = { ehDono: false, extras: [] as string[] };
  for (const v of [1500, "1500.50", 0])
    assert.equal(erroValorSemPermissao(sem, v), SEM_PERMISSAO_SALARIOS, String(v));
  for (const v of [undefined, null, ""]) assert.equal(erroValorSemPermissao(sem, v), null, String(v));
  assert.equal(erroValorSemPermissao({ ehDono: false, extras: ["salarios"] }, 1500), null);
  assert.equal(erroValorSemPermissao({ ehDono: true, extras: [] }, 1500), null);
});
await teste("as actions de RH com valores consultam o extra e não tocam o valor gravado sem ele", () => {
  const ler = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const casos: [arquivo: string, campo: string][] = [
    ["app/(dashboard)/rh/funcionarios/actions.ts", "salario"],
    ["app/(dashboard)/rh/beneficios/actions.ts", "valor"],
    ["app/(dashboard)/rh/recrutamento/actions.ts", "salario_previsto"],
  ];
  for (const [arq, campo] of casos) {
    const t = ler(arq);
    assert.ok(t.includes("erroValorSemPermissao(acesso"), `${arq}: sem checagem do extra`);
    assert.ok(
      t.includes(`...(podeVerSalarios(acesso) ? { ${campo}:`),
      `${arq}: o update grava ${campo} mesmo sem o extra`
    );
    // Criar e editar: duas checagens (a de vagas/funcionários/benefícios tem create + update).
    assert.ok(t.split("erroValorSemPermissao(acesso").length - 1 >= 2, `${arq}: falta checar em create ou update`);
  }
});
await teste("RH somente leitura: o layout lê o nível e todo board com ação esconde os botões sem edição", () => {
  const layout = readFileSync("app/(dashboard)/rh/layout.tsx", "utf8");
  assert.ok(layout.includes('getAcessoModulo("rh")') && layout.includes('acesso?.nivel === "edicao"'));
  for (const b of ["avaliacoes", "beneficios", "departamentos", "ferias", "folha-pagamento", "funcionarios", "vagas", "ponto"])
    assert.ok(readFileSync(`components/rh/${b}-board.tsx`, "utf8").includes("usePodeEditarRh()"), b);
  assert.ok(readFileSync("components/rh/candidatos-kanban.tsx", "utf8").includes("usePodeEditarRh()"));
});
await teste("as páginas do RH com valores zeram o dado no servidor quando falta o extra", () => {
  const ler = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  for (const arq of [
    "app/(dashboard)/rh/funcionarios/page.tsx",
    "app/(dashboard)/rh/beneficios/page.tsx",
    "app/(dashboard)/rh/recrutamento/page.tsx",
    "app/(dashboard)/rh/recrutamento/[vagaId]/page.tsx",
    "app/(dashboard)/rh/page.tsx",
    "app/(dashboard)/rh/folha/page.tsx",
  ])
    assert.ok(ler(arq).includes("podeVerSalarios(acesso)"), arq);
});

console.log("\nFase 5 — folha: exige edição no RH E no Financeiro (ligado), sem gerar parcialmente");
const rhEdicao = { ehDono: false, extras: ["salarios"] };
const financeiroOk = { nivel: "edicao" };
await teste("motivoNegarFolha: cada falta tem mensagem própria; só passa com os dois", () => {
  const base = { rh: rhEdicao, financeiroLigado: true, financeiroEdicao: financeiroOk, tocaContasPagar: true };
  assert.equal(motivoNegarFolha(base), null, "tudo certo");
  assert.equal(motivoNegarFolha({ ...base, rh: null }), "Você não tem permissão para fazer isso.");
  assert.equal(motivoNegarFolha({ ...base, rh: { ehDono: false, extras: [] } }), SEM_PERMISSAO_SALARIOS);
  assert.equal(motivoNegarFolha({ ...base, financeiroLigado: false, financeiroEdicao: null }), AVISO_ATIVE_FINANCEIRO);
  assert.equal(motivoNegarFolha({ ...base, financeiroEdicao: null }), AVISO_SEM_FINANCEIRO);
  assert.equal(motivoNegarFolha({ ...base, rh: { ehDono: true, extras: [] } }), null, "fundador");
  // Folha sem conta a pagar vinculada não precisa do Financeiro.
  assert.equal(motivoNegarFolha({ ...base, financeiroEdicao: null, financeiroLigado: false, tocaContasPagar: false }), null);
});
await teste("quem tem edição no RH mas leitura no Financeiro (ou nada) não gera folha", () => {
  const financeiroLeitura = guard("financeiro", "socio", "edicao", { permissoes: [perm("financeiro", "leitura", ["valores"])] });
  assert.equal(financeiroLeitura, null);
  assert.equal(motivoNegarFolha({ rh: rhEdicao, financeiroLigado: true, financeiroEdicao: financeiroLeitura, tocaContasPagar: true }), AVISO_SEM_FINANCEIRO);
  const financeiroEdit = guard("financeiro", "socio", "edicao", { permissoes: [perm("financeiro", "edicao", ["valores"])] });
  assert.ok(financeiroEdit);
  assert.equal(motivoNegarFolha({ rh: rhEdicao, financeiroLigado: true, financeiroEdicao: financeiroEdit, tocaContasPagar: true }), null);
  // Financeiro desligado na empresa: o guard nega até ao dono.
  assert.equal(guard("financeiro", "dono", "edicao", { habilitados: ATUAIS }), null);
});
await teste("gerarFolhaMes checa tudo ANTES de gerar (nunca grava parcialmente)", () => {
  const t = readFileSync("app/(dashboard)/rh/folha/actions.ts", "utf8").replace(/\r\n/g, "\n");
  const gerar = t.slice(t.indexOf("export async function gerarFolhaMes"), t.indexOf("function parseForm"));
  assert.ok(gerar.includes("acessoFolha(true)"), "usa a guarda da folha");
  assert.ok(gerar.indexOf("acessoFolha(true)") < gerar.indexOf("gerarFolhaDoMes("), "a guarda vem antes de gravar");
  assert.ok(t.includes("getAcessoFinanceiroEdicao") && t.includes('getAcessoEdicao("rh")'));
});
await teste("gerarFolhaDoMes sem nada a gerar não grava: lista de funcionários vazia", async () => {
  const chamadas: string[] = [];
  const cliente = {
    from(tabela: string) {
      chamadas.push(tabela);
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "insert"]) q[m] = () => q;
      q.then = (res: (v: { data: unknown[] }) => void) => res({ data: [] });
      return q;
    },
  };
  const { gerarFolhaDoMes } = await import("@/lib/rh/folha-sync");
  const r = await gerarFolhaDoMes(cliente as never, { workspaceId: WS_A, donoId: "dono" }, "2026-10-01", 5);
  assert.equal(r.criados, 0);
});

console.log("\nFase 5 — aprovações: regra, estados da interface e textos");
const AGORA = new Date("2026-10-28T12:00:00Z");
const hora = (h: number) => new Date(AGORA.getTime() + h * 3600_000).toISOString();
const dia = (d: number) => hora(d * 24);
const linha = (o: Record<string, unknown>) => ({
  id: "id-" + Math.random().toString(36).slice(2),
  tipo: "definir_modulo",
  resumo: "Ligar o módulo Marketing",
  status: "pendente",
  proposto_por: "u-ana",
  proposto_por_nome: "Ana",
  created_at: hora(-2),
  expira_em: hora(70),
  decidido_em: null,
  erro: null,
  resultado: null,
  votos: [],
  faltam: [],
  eu_posso_votar: true,
  ...o,
});
await teste("precisaAprovacao: 1 fundador executa na hora; 2 ou mais ficam pendentes", () => {
  assert.equal(precisaAprovacao(0), false);
  assert.equal(precisaAprovacao(1), false);
  assert.equal(precisaAprovacao(2), true);
  assert.equal(precisaAprovacao(5), true);
  assert.equal(fraseDaRegra(1), null);
  assert.ok(fraseDaRegra(2)?.includes("todos os fundadores"));
});
await teste("exigeAprovacao decide ANTES de chamar: 1 fundador = não; 2+ = sim; falha = sim (nunca otimista)", async () => {
  const { exigeAprovacao, listarFundadores } = await import("@/lib/aprovacoes-shared");
  const quem = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ user_id: "u" + i, nome: "F" + i, email: "f" + i + "@x.com", papel: i === 0 ? "dono" : "cofundador" }));
  const cliente = (resp: () => Promise<{ data: unknown; error: unknown }>) => ({
    rpc: async (nome: string, args: Record<string, unknown>) => {
      assert.equal(nome, "fundadores_da_empresa");
      assert.deepEqual(args, { p_workspace_id: WS_A });
      return resp();
    },
  });
  assert.equal(await exigeAprovacao(cliente(async () => ({ data: quem(1), error: null })) as never, WS_A), false);
  assert.equal(await exigeAprovacao(cliente(async () => ({ data: quem(2), error: null })) as never, WS_A), true);
  assert.equal(await exigeAprovacao(cliente(async () => ({ data: quem(3), error: null })) as never, WS_A), true);
  assert.equal(await exigeAprovacao(cliente(async () => ({ data: null, error: { message: "x" } })) as never, WS_A), true);
  assert.equal(await exigeAprovacao(cliente(async () => { throw new Error("rede"); }) as never, WS_A), true);
  assert.equal(await listarFundadores(cliente(async () => ({ data: null, error: { message: "x" } })) as never, WS_A), null);
});
await teste("toda função com porta de aprovação é chamada por uma action que consulta os fundadores antes", () => {
  const ler = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const arquivos = [
    "app/(dashboard)/socios/actions.ts", "lib/actions/empresa.ts", "lib/actions/modulos.ts",
    "lib/actions/nichos.ts", "lib/actions/vendedor-codigo.ts",
  ];
  const gated = [
    "renomear_empresa", "definir_modulo", "aplicar_nicho", "salvar_rotulos", "convidar_membro",
    "cancelar_convite_empresa", "atualizar_permissoes_membro", "remover_membro", "criar_perfil_acesso",
    "atualizar_perfil_acesso", "regenerar_codigo_perfil_acesso", "regenerar_codigo_vendedor",
    "responder_solicitacao_acesso", "responder_solicitacao_vendedor",
  ];
  const textos = arquivos.map((a) => [a, ler(a)] as const);
  // Retornam NULL quando enviadas para aprovação: a action precisa tratar o NULL.
  const retornamNull = ["convidar_membro", "criar_perfil_acesso", "regenerar_codigo_perfil_acesso", "regenerar_codigo_vendedor"];
  for (const rpc of gated) {
    const donos = textos.filter(([, t]) => t.includes(`.rpc("${rpc}"`));
    assert.ok(donos.length >= 1, `${rpc}: nenhuma action chama`);
    for (const [arq, t] of donos) {
      // criarEmpresa reaplica o nicho numa empresa recém-criada: só há um fundador, não há o que aprovar.
      if (arq === "lib/actions/empresa.ts" && rpc === "aplicar_nicho") continue;
      const trecho = t.slice(t.indexOf(`.rpc("${rpc}"`) - 900, t.indexOf(`.rpc("${rpc}"`) + 900);
      if (retornamNull.includes(rpc)) {
        assert.ok(/ENVIADO|pendente: true/.test(trecho), `${arq} ${rpc}: não trata o retorno NULL`);
      } else {
        assert.ok(/exigeAprovacao\(/.test(trecho), `${arq} ${rpc}: não consulta os fundadores antes`);
      }
    }
  }
});
await teste("o badge conta só pendências em que EU posso votar e que não venceram", () => {
  const lista = lerAprovacoes([
    linha({}),                                          // conta
    linha({ eu_posso_votar: false }),                   // já votei / sou o proponente
    linha({ expira_em: hora(-1) }),                     // venceu
    linha({ status: "aprovada", decidido_em: hora(-5) }),
    linha({ status: "recusada", decidido_em: hora(-5) }),
    { status: "lixo", id: "x" },                        // status desconhecido: descartado
    null,
  ]);
  assert.equal(lista.length, 5);
  assert.equal(contarMinhasPendencias(lista, AGORA), 1);
  assert.equal(pendentes(lista, AGORA).length, 2, "o vencido sai das pendentes");
  assert.equal(contarMinhasPendencias([], AGORA), 0);
});
await teste("estados: votar, recusar e cancelar mudam o que a tela oferece", () => {
  const [p] = lerAprovacoes([linha({ proposto_por: "u-ana", eu_posso_votar: true })]);
  assert.equal(podeVotar(p, AGORA), true, "pendente e posso votar");
  assert.equal(podeCancelar(p, "u-ana", AGORA), true, "quem propôs cancela");
  assert.equal(podeCancelar(p, "u-bia", AGORA), false, "outro fundador não cancela");
  for (const status of ["aprovada", "recusada", "expirada", "cancelada", "falhou"] as const) {
    const [d] = lerAprovacoes([linha({ status, decidido_em: hora(-1) })]);
    assert.equal(podeVotar(d, AGORA), false, status);
    assert.equal(podeCancelar(d, "u-ana", AGORA), false, status);
    assert.ok(historico([d], AGORA).length === 1, `${status} entra no histórico`);
  }
  const [venc] = lerAprovacoes([linha({ expira_em: hora(-1) })]);
  assert.equal(podeVotar(venc, AGORA), false);
  assert.equal(statusExibido(venc, AGORA), "expirada");
});
await teste("histórico: só os últimos 30 dias, mais recente primeiro, sem pendentes", () => {
  const lista = lerAprovacoes([
    linha({ status: "aprovada", decidido_em: dia(-1), resumo: "ontem" }),
    linha({ status: "recusada", decidido_em: dia(-29), resumo: "29 dias" }),
    linha({ status: "falhou", decidido_em: dia(-31), resumo: "31 dias" }),
    linha({ status: "cancelada", decidido_em: dia(-3), resumo: "3 dias" }),
    linha({ resumo: "aberta" }),
  ]);
  assert.deepEqual(historico(lista, AGORA).map((a) => a.resumo), ["ontem", "3 dias", "29 dias"]);
});
await teste("resultado: convite vira /convite/<token>, código aparece, só em pedido aprovado", () => {
  assert.deepEqual(lerResultado({ token: "abc123" }, "aprovada"), { tipo: "convite", token: "abc123", caminho: "/convite/abc123" });
  assert.deepEqual(lerResultado({ codigo: "K7M2Q9XA" }, "aprovada"), { tipo: "codigo", codigo: "K7M2Q9XA" });
  assert.deepEqual(lerResultado("ZZ99", "aprovada"), { tipo: "codigo", codigo: "ZZ99" });
  assert.equal(lerResultado({ token: "abc" }, "recusada"), null);
  assert.equal(lerResultado({ token: "abc" }, "falhou"), null);
  assert.equal(lerResultado(null, "aprovada"), null);
  assert.equal(lerResultado({}, "aprovada"), null);
  assert.equal(lerResultado({ token: "a/b?x" }, "aprovada")?.tipo, "convite");
  assert.equal((lerResultado({ token: "a/b?x" }, "aprovada") as { caminho: string }).caminho, "/convite/a%2Fb%3Fx");
});
await teste("votos e faltantes: aceita lista de nomes, de objetos e mapa por usuário", () => {
  assert.deepEqual(nomesDeFaltantes(["Bia", "Caio"]), ["Bia", "Caio"]);
  assert.deepEqual(nomesDeFaltantes([{ nome: "Bia", user_id: "u" }, { email: "c@x.com" }]), ["Bia", "c@x.com"]);
  assert.deepEqual(lerVotos([{ nome: "Ana", aprovou: true }, { nome: "Bia", voto: "recusou" }, "Caio"]), [
    { nome: "Ana", aprovou: true },
    { nome: "Bia", aprovou: false },
    { nome: "Caio", aprovou: null },
  ]);
  assert.deepEqual(lerVotos({ "u-1": { nome: "Ana", aprovou: false } }), [{ nome: "Ana", aprovou: false }]);
  assert.deepEqual(lerVotos(null), []);
  assert.deepEqual(nomesDeFaltantes("texto"), []);
});
await teste("mensagem do voto cobre pendente, aprovada, recusada, expirada e falhou", () => {
  assert.equal(mensagemDoVoto("pendente", true).tom, "info");
  assert.match(mensagemDoVoto("pendente", true).texto, /Aguardando/);
  assert.equal(mensagemDoVoto("aprovada", true).tom, "ok");
  assert.equal(mensagemDoVoto("recusada", false).tom, "ok");
  assert.equal(mensagemDoVoto("expirada", true).tom, "erro");
  assert.equal(mensagemDoVoto("falhou", true).tom, "erro");
  assert.match(mensagemDoVoto("falhou", true).texto, /histórico/);
  assert.equal(mensagemDoVoto("qualquer", true).tom, "erro");
});
await teste("erros por trecho: aprovar/cancelar e motivo de pedido que falhou", () => {
  assert.equal(erroDeAprovacao("Pedido expirou"), "Este pedido expirou e não pode mais ser votado.");
  assert.equal(erroDeAprovacao("Você já votou"), "Você já votou neste pedido.");
  assert.equal(erroDeAprovacao("Pedido não encontrado"), "Pedido não encontrado.");
  assert.equal(erroDeAprovacao("not_authenticated"), "Sessão expirada. Faça login novamente.");
  assert.equal(erroDeAprovacao("Sem permissão"), "Sem permissão para esta ação.");
  assert.equal(erroDeAprovacao("boom"), "Não foi possível concluir. Tente novamente.");
  assert.equal(erroDeAprovacao(undefined), "Não foi possível concluir. Tente novamente.");
  assert.match(erroDaFalha("Nicho inválido"), /tipo de negócio/);
  assert.match(erroDaFalha("o módulo depende de clientes"), /depende/);
  assert.match(erroDaFalha("Esta pessoa já faz parte"), /já faz parte/);
  assert.equal(erroDaFalha(null), "A alteração não pôde ser aplicada.");
  assert.equal(erroDaFalha("xyz"), "A alteração não pôde ser aplicada.");
});
await teste("avisos: texto fixo do envio e link para /aprovacoes", () => {
  assert.equal(AVISO_ENVIADO, "Enviado para aprovação dos outros fundadores");
  assert.equal(ROTA_APROVACOES, "/aprovacoes");
  assert.equal(textoDoResultado(true, "Salvo."), AVISO_ENVIADO);
  assert.equal(textoDoResultado(false, "Salvo."), "Salvo.");
});
await teste("refetch sem laço: foco só relê com a aba visível e leitura antiga (>= 5 s)", () => {
  assert.equal(deveReler(10_000, 0, true), true);
  assert.equal(deveReler(10_000, 7_000, true), false, "leitura recente");
  assert.equal(deveReler(10_000, 5_000, true), true, "exatamente no intervalo");
  assert.equal(deveReler(10_000, 0, false), false, "aba oculta");
  // foco + visibilidade no mesmo instante: a 1ª leitura atualiza o relógio e a 2ª é barrada.
  let ultima = 0;
  let leituras = 0;
  for (const t of [20_000, 20_001, 20_002]) {
    if (deveReler(t, ultima, true)) {
      leituras++;
      ultima = t;
    }
  }
  assert.equal(leituras, 1);
  const p = readFileSync("components/aprovacoes/aprovacoes-provider.tsx", "utf8");
  assert.ok(p.includes("filter: `workspace_id=eq.${workspaceId}`"), "realtime filtrado por empresa");
  assert.ok(p.includes("emAndamento.current"), "leituras simultâneas se juntam");
});

console.log("\nFase 5 — /aprovacoes: só fundador e cofundador; locks de cofundador removidos");
await teste("fundador e cofundador abrem /aprovacoes; sócio, funcionário e vendedor não", () => {
  for (const papel of ["dono", "cofundador"] as const)
    assert.equal(vaiPara(decide("/aprovacoes", ok(papel), ATUAIS)), "seguir", papel);
  for (const papel of ["socio", "funcionario"] as const)
    assert.notEqual(vaiPara(decide("/aprovacoes", ok(papel), ATUAIS, false, ["leads"])), "seguir", papel);
  assert.notEqual(vaiPara(decide("/aprovacoes", ok("comercial"), ATUAIS)), "seguir", "vendedor");
  assert.ok(rotaPermitida("/aprovacoes", []), "não depende de módulo ligado");
});
await teste("nenhuma combinação papel x rota de Fase 5 entra em loop", () => {
  for (const papel of ["dono", "cofundador", "socio", "funcionario", "comercial"] as const)
    for (const hab of [[], ATUAIS, TODOS])
      for (const p of ["/aprovacoes", ...RH_ROTAS]) {
        const r = seguirRedirects(p, ok(papel), hab, ["rh", "leads"]);
        assert.ok(r.final !== null && r.visitados.length <= 3, `${papel} ${p} [${hab.length}]: ${r.visitados.join(" -> ")}`);
      }
});
await teste("a interface não trava mais cofundador: sem 'ehFundador' e sem checagem de dono original", () => {
  const ler = (p: string) => readFileSync(p, "utf8");
  for (const arq of ["components/socios/convidar-membro.tsx", "components/socios/equipe-section.tsx", "components/socios/socios-board.tsx", "app/(dashboard)/socios/page.tsx"])
    assert.ok(!ler(arq).includes("ehFundador"), arq);
  const acoes = ler("app/(dashboard)/socios/actions.ts");
  assert.ok(!acoes.includes('empresa.papel !== "dono"'), "a action não exige ser o fundador original");
  assert.ok(!sociosErrorMessage("Só cofundador").includes("Só o fundador pode"));
});
await teste("adicionar recomendados avisa quantos pedidos foram criados (um por módulo)", () => {
  const t = readFileSync("lib/actions/nichos.ts", "utf8");
  assert.ok(t.includes("enviados += 1") && t.includes("concluir(pendente, pendente ? enviados : undefined)"));
  const ui = readFileSync("components/modulos/modulos-board.tsx", "utf8");
  assert.ok(ui.includes("um por módulo"));
});

// ===========================================================================
// Fase 5B — /vendedores escreve por RPC (convidar_membro, remover_membro, cancelar_convite_empresa)
// ===========================================================================

console.log("\nFase 5B — convidarColaborador / removerColaborador / cancelarConvite viram RPCs");
const lerFonte = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const trechoDaFuncao = (texto: string, nome: string) => {
  const ini = texto.indexOf(`export async function ${nome}`);
  assert.ok(ini >= 0, `função ${nome} não encontrada`);
  const prox = texto.indexOf("\nexport async function ", ini + 10);
  return texto.slice(ini, prox < 0 ? undefined : prox);
};
const juridicoActions = lerFonte("app/(dashboard)/juridico/actions.ts");
await teste("convidarColaborador chama convidar_membro com 'comercial', sem permissões, e não insere em convites", () => {
  const f = trechoDaFuncao(juridicoActions, "convidarColaborador");
  assert.ok(f.includes('.rpc("convidar_membro"'));
  assert.ok(f.includes('p_papel: "comercial"') && f.includes("p_permissoes: []"));
  assert.ok(f.includes("p_workspace_id: workspaceId"), "empresa ativa vinda do servidor");
  assert.ok(!/\.insert\(/.test(f), "sem INSERT direto");
  // Convite repetido: mesma mensagem de sempre, antes de chamar a RPC.
  assert.ok(f.indexOf("Já existe um convite pendente para esse e-mail.") < f.indexOf('.rpc("convidar_membro"'));
  // Link e mensagem de sucesso: igual ao de hoje (origem + /convite/<token>).
  assert.ok(f.includes("`${origin}/convite/${token}`"));
  assert.ok(f.includes('"Não foi possível criar o convite."'), "mensagem de falha de sempre");
});
await teste("convidarColaborador trata o retorno NULL (2+ fundadores): pendente, sem link", () => {
  const f = trechoDaFuncao(juridicoActions, "convidarColaborador");
  assert.ok(/typeof token !== "string" \|\| !token\) return \{ ok: true, pendente: true \}/.test(f));
  assert.ok(f.indexOf("pendente: true") < f.indexOf("getOrigin()"), "não monta link quando está pendente");
});
await teste("só 'comercial' passa pela RPC; papéis antigos de colaborador são recusados", () => {
  const f = trechoDaFuncao(juridicoActions, "convidarColaborador");
  assert.ok(f.includes('parsed.data.papel !== "comercial"'));
});
await teste("removerColaborador manda o id da PESSOA (membros.membro_id), buscado dentro da empresa ativa", () => {
  const f = trechoDaFuncao(juridicoActions, "removerColaborador");
  assert.ok(f.includes('.rpc("remover_membro"'));
  assert.ok(f.includes("p_membro_id: pessoaId"));
  assert.ok(/\.select\("membro_id"\)[\s\S]*\.eq\("id", membroId\)[\s\S]*\.eq\("workspace_id", workspaceId\)/.test(f), "lookup da linha só na empresa ativa");
  assert.ok(!/\.update\(|\.delete\(/.test(f), "sem UPDATE/DELETE direto");
  assert.ok(f.includes("exigeAprovacao(") && f.indexOf("exigeAprovacao(") < f.indexOf('.rpc("remover_membro"'), "consulta os fundadores antes");
});
await teste("cancelarConvite chama cancelar_convite_empresa e consulta os fundadores antes", () => {
  const f = trechoDaFuncao(juridicoActions, "cancelarConvite");
  assert.ok(f.includes('.rpc("cancelar_convite_empresa", { p_id: conviteId })'));
  assert.ok(!/\.update\(|\.delete\(|\.insert\(/.test(f));
  assert.ok(f.indexOf("exigeAprovacao(") < f.indexOf('.rpc("cancelar_convite_empresa"'));
});
await teste("remover e cancelar devolvem pendente (2+ fundadores) e a tela não age como se tivesse executado", () => {
  for (const nome of ["removerColaborador", "cancelarConvite"])
    assert.ok(trechoDaFuncao(juridicoActions, nome).includes("{ ok: true, pendente: true }"), nome);
  const secao = lerFonte("components/colaboradores-section.tsx");
  assert.ok(!secao.includes("<form action={removerColaborador") && !secao.includes("<form action={cancelarConvite"));
  assert.ok(secao.includes("toast.aprovacao()") && secao.includes('"error" in r'));
  const dialogo = lerFonte("components/convite-colaborador-dialog.tsx");
  assert.ok(dialogo.includes("enviadoParaAprovacao") && dialogo.includes("AVISO_ENVIADO") && dialogo.includes("ROTA_APROVACOES"));
});
await teste("varredura: nenhuma escrita direta em membros/convites/perfis_tipos_ativos além de lib/perfil.ts", () => {
  const sobras: string[] = [];
  const andar = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const c = `${dir}/${n}`;
      if (n === "node_modules" || n === ".next") return [];
      if (statSync(c).isDirectory()) return andar(c);
      return /\.(ts|tsx|mts)$/.test(n) && !n.endsWith("database.types.ts") ? [c] : [];
    });
  for (const pasta of ["app", "components", "lib", "scripts"])
    for (const arq of andar(pasta)) {
      const linhas = lerFonte(arq).split("\n");
      linhas.forEach((linha, i) => {
        const m = linha.match(/\.from\(\s*["'`](membros|convites|perfis_tipos_ativos)["'`]/);
        if (m && /\.(insert|update|delete|upsert)\(/.test(linhas.slice(i, i + 8).join(" ")))
          sobras.push(`${arq}:${i + 1} ${m[1]}`);
      });
    }
  assert.deepEqual(sobras, ["lib/perfil.ts:72 perfis_tipos_ativos"]);
});
await teste("perfis_tipos_ativos nunca sofre UPDATE/DELETE direto: renomear empresa é a RPC renomear_empresa", () => {
  assert.ok(lerFonte("lib/actions/empresa.ts").includes('.rpc("renomear_empresa"'));
  const perfil = lerFonte("lib/perfil.ts");
  assert.ok(!/perfis_tipos_ativos"\)\s*\.(update|delete|upsert)/.test(perfil));
});

// ===========================================================================
// Conta Pessoal volta ao cadastro: Empreendedor, Funcionário e Pessoal
// ===========================================================================

console.log("\nCadastro — três tipos de conta: Empreendedor, Funcionário e Pessoal");
const NO_PESSOAL = ["/pessoal", "/pessoal/contas", "/pessoal/transacoes", "/pessoal/juridico", "/api/pessoal/x"];
const ROTAS_DE_EMPRESA = [
  "/clientes", "/leads", "/renegados", "/agenda", "/vendedores", "/financeiro", "/rh", "/marketing",
  "/juridico", "/contas-pagar", "/vendedor/leads", "/api/export/leads", "/api/export/clientes",
];
const SEM_EMPRESA: ResolucaoEmpresa = { status: "sem_empresa" };

await teste("o cadastro oferece exatamente três tipos, nesta ordem: empreendedor, funcionário, pessoal", () => {
  assert.deepEqual(SIGNUP_OPCOES.map((o) => o.tipo), ["empresarial", "comercial", "pessoal"]);
  assert.deepEqual(
    SIGNUP_OPCOES.map((o) => o.label),
    ["Sou empreendedor", "Sou funcionário", "Conta Pessoal"]
  );
  for (const o of SIGNUP_OPCOES) assert.ok(o.description.length > 0 && o.icon);
});
await teste("a página de cadastro monta os cartões a partir de SIGNUP_OPCOES e a opção Pessoal grava tipoConta 'pessoal'", () => {
  const pagina = lerFonte("app/signup/page.tsx");
  assert.ok(pagina.includes("SIGNUP_OPCOES.map("));
  assert.ok(pagina.includes('name="tipoConta"'));
  assert.ok(pagina.includes("setAccountType(option.tipo)"));
  // Três cartões: o último ocupa a linha inteira (sem buraco no grid).
  assert.ok(pagina.includes("sm:col-span-2"));
});
await teste("o schema do cadastro aceita 'pessoal' e a metadata do cadastro a reconhece", () => {
  const auth = lerFonte("lib/actions/auth.ts");
  const schema = auth.slice(auth.indexOf("const SignupSchema"), auth.indexOf("export type SignupState"));
  assert.ok(/"pessoal"/.test(schema));
  assert.equal(tipoContaDaMetadata({ user_metadata: { tipo_conta_padrao: "pessoal" } }), "pessoal");
  assert.equal(tipoContaDaMetadata({ user_metadata: { tipo_conta_padrao: "empresarial" } }), "empresarial");
  assert.equal(tipoContaDaMetadata({ user_metadata: { tipo_conta_padrao: "comercial" } }), "comercial");
});
await teste("signup(Pessoal): cria o perfil, ativa o tipo 'pessoal' (garantirTipoAtivo), grava o modo e vai para /pessoal — sem RPC", () => {
  const auth = lerFonte("lib/actions/auth.ts");
  const signup = auth.slice(auth.indexOf("export async function signup"), auth.indexOf("export async function logout"));
  assert.ok(signup.includes("garantirPerfil("));
  // Todo tipo diferente de empresarial vira o primeiro tipo ativo; 'pessoal' cai aqui.
  assert.ok(/if \(tipoConta !== "empresarial"\) \{\s*await garantirTipoAtivo\(supabase, data\.user\.id, tipoConta\);/.test(signup));
  // Pessoal não passa pelo desvio de funcionário nem pelo de empreendedor nem pelo de colaborador.
  assert.equal(accountTypeToHubMode("pessoal"), "pessoal");
  assert.equal(MODE_HOME_ROUTE.pessoal, "/pessoal");
  assert.ok(signup.includes("const mode = accountTypeToHubMode(tipoConta);"));
  assert.ok(signup.includes("redirect(MODE_HOME_ROUTE[mode]);"));
  assert.ok(!signup.includes(".rpc("), "o cadastro não chama RPC");
});
await teste("garantirTipoAtivo('pessoal'): insere o tipo na primeira vez e não duplica na segunda", async () => {
  const inserts: Record<string, unknown>[] = [];
  const falso = (existente: boolean) =>
    ({
      from: (tabela: string) => {
        assert.equal(tabela, "perfis_tipos_ativos");
        const cadeia = {
          select: () => cadeia,
          eq: () => cadeia,
          limit: () => cadeia,
          maybeSingle: async () => ({ data: existente ? { id: "x" } : null, error: null }),
          insert: async (linha: Record<string, unknown>) => {
            inserts.push(linha);
            return { error: null };
          },
        };
        return cadeia;
      },
    }) as never;
  assert.deepEqual(await garantirTipoAtivo(falso(false), "u1", "pessoal"), { ok: true, criado: true });
  assert.deepEqual(inserts, [{ user_id: "u1", tipo: "pessoal" }]);
  assert.deepEqual(await garantirTipoAtivo(falso(true), "u1", "pessoal"), { ok: true, criado: false });
  assert.equal(inserts.length, 1);
});
await teste("Empreendedor e Funcionário seguem como estavam no cadastro", () => {
  const auth = lerFonte("lib/actions/auth.ts");
  const signup = auth.slice(auth.indexOf("export async function signup"), auth.indexOf("export async function logout"));
  assert.ok(signup.includes("redirect(ACESSO_VENDEDOR_CODIGO);"));
  assert.ok(signup.includes("redirect(NOVA_EMPRESA);"));
  assert.equal(ACESSO_VENDEDOR_CODIGO, "/acesso-vendedor");
  assert.equal(NOVA_EMPRESA, "/nova-empresa");
  const empreendedor = SIGNUP_OPCOES.find((o) => o.tipo === "empresarial");
  const funcionario = SIGNUP_OPCOES.find((o) => o.tipo === "comercial");
  assert.equal(empreendedor?.label, "Sou empreendedor");
  assert.equal(funcionario?.label, "Sou funcionário");
});

console.log("\nConta Pessoal — proxy, seletor de modos e guard de /pessoal");
await teste("só Pessoal (sem empresa): abre /pessoal/* e /api/pessoal/*", () => {
  for (const p of NO_PESSOAL) assert.equal(vaiPara(decide(p, SEM_EMPRESA, [])), "seguir", p);
});
await teste("só Pessoal (sem empresa): nenhuma rota de empresa abre — todas voltam ao início", () => {
  for (const p of ROTAS_DE_EMPRESA) assert.equal(vaiPara(decide(p, SEM_EMPRESA, [])), "/dashboard", p);
});
await teste("só Pessoal (sem empresa): pode ir a /nova-empresa (virar Empreendedor) e ao início, que oferece 'Criar minha empresa'", () => {
  assert.equal(vaiPara(decide(NOVA_EMPRESA, SEM_EMPRESA, [])), "seguir");
  assert.equal(vaiPara(decide("/dashboard", SEM_EMPRESA, [])), "seguir");
  assert.ok(lerFonte("app/(dashboard)/dashboard/page.tsx").includes("Criar minha empresa"));
});
await teste("só Pessoal: as telas de gestão (/modulos, /socios, /configuracoes, /aprovacoes) se recusam sem empresa do painel", () => {
  for (const [arq, marca] of [
    ["app/(dashboard)/modulos/page.tsx", "if (!workspaceId) redirect(HOME_DONO);"],
    ["app/(dashboard)/socios/page.tsx", "if (!empresa) redirect(HOME_DONO);"],
    ["app/(dashboard)/configuracoes/page.tsx", "if (!empresa) redirect(HOME_DONO);"],
    ["app/(dashboard)/aprovacoes/page.tsx", "if (!empresa) redirect(HOME_DONO);"],
  ]) assert.ok(lerFonte(arq).includes(marca), arq);
});
await teste("Pessoal que criou empresa: dono abre /pessoal e as rotas da empresa; /nova-empresa segue livre para criar outra", () => {
  for (const p of NO_PESSOAL) assert.equal(vaiPara(decide(p, ok("dono"))), "seguir", p);
  assert.equal(vaiPara(decide("/clientes", ok("dono"))), "seguir");
  assert.equal(vaiPara(decide(NOVA_EMPRESA, ok("dono"))), "seguir");
});
await teste("criar a empresa não apaga nem troca os dados pessoais: sem escrita em tabelas /pessoal e sem mexer em 'pessoal' de perfis_tipos_ativos", () => {
  const empresa = lerFonte("lib/actions/empresa.ts");
  assert.ok(!/from\(\s*["'`]pessoal_/.test(empresa));
  assert.ok(!/perfis_tipos_ativos/.test(empresa.replace(/\/\*[\s\S]*?\*\//g, "")));
  const tipos = lerFonte("lib/actions/tipos-ativos.ts");
  // Quem não tem empresa passa pela tela de criação; quem tem só ativa o modo.
  assert.ok(tipos.includes('tipo === "empresarial" && !(await temEmpresaPropria(supabase, user.id))'));
  assert.ok(tipos.includes("redirect(NOVA_EMPRESA)"));
});
await teste("funcionário sem vínculo e vendedor continuam sem /pessoal (nada mudou para eles)", () => {
  for (const p of NO_PESSOAL) {
    assert.equal(vaiPara(decide(p, SEM_EMPRESA, [], true)), ACESSO_VENDEDOR_CODIGO, p);
    assert.equal(vaiPara(decide(p, ok("comercial"))), VENDEDOR_HOME, p);
  }
});
await teste("seletor de modos: lista Empresa e Pessoal; Pessoal leva a /pessoal e liga o modo 'pessoal'", () => {
  assert.deepEqual([...SWITCHER_ACCOUNT_TYPES], ["empresarial", "pessoal"]);
  assert.equal(ACCOUNT_TYPE_HOME_ROUTE.pessoal, "/pessoal");
  assert.equal(accountTypeHubMode("pessoal"), "pessoal");
  assert.equal(accountTypeHubMode("empresarial"), "business");
  const seletor = lerFonte("components/mode-switcher.tsx");
  // Quem ainda não tem o tipo vê "Criar conta pessoal" (ativarTipoConta), não um atalho direto.
  assert.ok(seletor.includes("ativarTipoConta.bind(null, option.value)"));
});
await teste("guard de /pessoal: exige o tipo 'pessoal' ativo; sem ele (ou com falha de leitura) volta ao início", () => {
  const guard = lerFonte("app/(dashboard)/pessoal/layout.tsx");
  assert.ok(guard.includes('.from("perfis_tipos_ativos")') && guard.includes('.eq("tipo", "pessoal")'));
  assert.ok(guard.includes("if (!user) redirect(\"/login\");"));
  assert.ok(guard.includes("if (error) redirect(HOME_DONO);"));
  // Só regulariza quem se cadastrou como Pessoal; os demais saem.
  assert.ok(guard.includes('=== "pessoal"') && guard.includes("if (!cadastradoComoPessoal) redirect(HOME_DONO);"));
  assert.ok(guard.includes("garantirTipoAtivo(supabase, user.id, \"pessoal\")"));
  // O guard não escreve direto na tabela (a única escrita continua em lib/perfil.ts).
  assert.ok(!/\.(insert|update|delete|upsert)\(/.test(guard));
  // O destino do guard não leva de volta a /pessoal: sem ciclo.
  assert.equal(vaiPara(decide("/dashboard", SEM_EMPRESA, [])), "seguir");
});

// ===========================================================================
// Nicho Impressão 3D (Etapa A) — registro, acesso, regras e contrato das telas
// ===========================================================================

console.log("\nImpressão 3D — registro, rotas e menu");
const P3D = ["p3d_impressoras", "p3d_estoque", "p3d_produtos", "p3d_precificacao", "p3d_orcamentos"];
const ROTA_P3D: Record<string, string> = {
  p3d_impressoras: "/impressao-3d/impressoras",
  p3d_estoque: "/impressao-3d/estoque",
  p3d_produtos: "/impressao-3d/produtos",
  p3d_precificacao: "/impressao-3d/precificacao",
  p3d_orcamentos: "/impressao-3d/orcamentos",
};
await teste("o registro cobre as 5 chaves do catálogo, cada uma com rota, menu e as tabelas p3d_*", () => {
  for (const chave of P3D) {
    const m = MODULOS.find((x) => x.chave === chave);
    assert.ok(m, chave);
    assert.deepEqual(m.rotas, [ROTA_P3D[chave]], chave);
    assert.equal(m.menu.length, 1, chave);
    assert.equal(m.menu[0].grupo, "Impressão 3D", chave);
    assert.equal(m.menu[0].href, ROTA_P3D[chave], chave);
    assert.ok(m.tabelas.every((t) => t.startsWith("p3d_")), chave);
  }
  const tabelas = MODULOS.filter((m) => P3D.includes(m.chave)).flatMap((m) => m.tabelas).sort();
  assert.deepEqual(tabelas, [
    "p3d_config_precificacao", "p3d_impressoras", "p3d_manutencoes", "p3d_materiais",
    "p3d_movimentos_estoque", "p3d_orcamento_itens", "p3d_orcamentos", "p3d_pecas_desgaste",
    "p3d_produto_arquivos", "p3d_produto_variacoes", "p3d_produtos",
  ]);
});
await teste("moduloDaRota reconhece as telas (inclusive detalhes) e não confunde com /orcamentos do Financeiro", () => {
  for (const [chave, rota] of Object.entries(ROTA_P3D)) {
    assert.equal(moduloDaRota(rota), chave, rota);
    assert.equal(moduloDaRota(`${rota}/abc`), chave, `${rota}/abc`);
  }
  assert.equal(moduloDaRota("/orcamentos"), "financeiro");
  assert.equal(moduloDaRota("/impressao-3d"), null, "não há índice do nicho");
  assert.equal(moduloDaRota("/impressao-3d/impressoras-antigo"), null);
});
await teste("módulo p3d DESLIGADO é negado ao dono (volta à 1ª rota ligada); LIGADO libera", () => {
  for (const [chave, rota] of Object.entries(ROTA_P3D)) {
    assert.equal(vaiPara(decide(rota, ok("dono"), ATUAIS)), "/leads", `desligado ${rota}`);
    assert.equal(vaiPara(decide(`${rota}/x`, ok("cofundador"), [...ATUAIS, chave])), "seguir", `ligado ${rota}`);
  }
  // Ligar um módulo não abre os outros.
  assert.equal(vaiPara(decide(ROTA_P3D.p3d_estoque, ok("dono"), [...ATUAIS, "p3d_impressoras"])), "/leads");
});
await teste("menu do dono: grupo 'Impressão 3D' só com os módulos ligados, na ordem do registro", () => {
  const todos = menuDoDono([...ATUAIS, ...P3D]);
  const grupo = todos.find((g) => g.titulo === "Impressão 3D");
  assert.deepEqual(grupo?.itens.map((i) => i.href), P3D.map((c) => ROTA_P3D[c]));
  const so = menuDoDono(["p3d_estoque"]);
  assert.deepEqual(so.map((g) => g.titulo), ["Impressão 3D"]);
  assert.deepEqual(so[0].itens.map((i) => i.href), ["/impressao-3d/estoque"]);
  assert.equal(primeiraRotaHabilitada(["p3d_estoque", "p3d_produtos"]), "/impressao-3d/estoque");
  assert.ok(menuDoDono(ATUAIS).every((g) => g.titulo !== "Impressão 3D"), "empresa atual não ganha o grupo");
});
await teste("sócio/funcionário: módulos p3d = ligados ∩ permissão ∩ permite_membros", () => {
  const catalogo = [...CATALOGO, ...P3D];
  const ligados = [...ATUAIS, ...P3D];
  for (const papel of ["socio", "funcionario"] as const) {
    assert.equal(vaiPara(decide(ROTA_P3D.p3d_estoque, ok(papel), ligados, false, ["p3d_estoque"], catalogo)), "seguir", papel);
    assert.equal(vaiPara(decide(`${ROTA_P3D.p3d_orcamentos}/abc`, ok(papel), ligados, false, ["p3d_orcamentos"], catalogo)), "seguir", papel);
    // permissão em outro módulo não abre este
    assert.equal(vaiPara(decide(ROTA_P3D.p3d_estoque, ok(papel), ligados, false, ["p3d_impressoras"], catalogo)), ROTA_P3D.p3d_impressoras, papel);
    // catálogo sem permite_membros nega mesmo com permissão gravada
    assert.equal(vaiPara(decide(ROTA_P3D.p3d_estoque, ok(papel), ligados, false, ["p3d_estoque"], CATALOGO)), AGUARDANDO_LIBERACAO, papel);
    // módulo desligado nega mesmo com permissão
    assert.equal(vaiPara(decide(ROTA_P3D.p3d_estoque, ok(papel), ATUAIS, false, ["p3d_estoque"], catalogo)), AGUARDANDO_LIBERACAO, papel);
  }
  assert.deepEqual(modulosOferecidos(ligados, catalogo).filter((m) => m.startsWith("p3d_")), P3D);
});
await teste("vendedor (comercial) nunca abre as telas do nicho", () => {
  for (const rota of Object.values(ROTA_P3D))
    assert.equal(vaiPara(decide(rota, ok("comercial"), [...ATUAIS, ...P3D])), VENDEDOR_HOME, rota);
});
await teste("guard: leitura x edição por módulo p3d e extra 'custos' (só de tela)", () => {
  const catalogo = [...CATALOGO, ...P3D];
  const g = (modulo: string, papel: string, nivel: "leitura" | "edicao", permissoes: ReturnType<typeof perm>[] = []) =>
    guard(modulo, papel, nivel, { habilitados: P3D, permiteMembros: catalogo, permissoes });
  for (const m of P3D) {
    assert.ok(g(m, "dono", "edicao")?.ehDono, m);
    assert.equal(g(m, "socio", "leitura"), null, `${m} sem permissão`);
    assert.ok(g(m, "socio", "leitura", [perm(m, "leitura")]), `${m} leitura`);
    assert.equal(g(m, "socio", "edicao", [perm(m, "leitura")]), null, `${m} leitura não edita`);
    assert.ok(g(m, "funcionario", "edicao", [perm(m, "edicao")]), `${m} edição`);
  }
  const comExtra = g("p3d_orcamentos", "socio", "leitura", [perm("p3d_orcamentos", "leitura", ["custos"])]);
  const semExtra = g("p3d_orcamentos", "socio", "leitura", [perm("p3d_orcamentos", "leitura")]);
  assert.equal(podeVerCustos(comExtra), true);
  assert.equal(podeVerCustos(semExtra), false);
  assert.equal(podeVerCustos(g("p3d_estoque", "dono", "leitura")), true, "fundador sempre vê custos");
  assert.equal(podeVerCustos(g("p3d_estoque", "cofundador", "leitura")), true);
  assert.equal(podeVerCustos(null), false);
  // módulo desligado: nem o dono
  assert.equal(guard("p3d_estoque", "dono", "leitura", { habilitados: ATUAIS }), null);
});
await teste("rótulos: cada módulo p3d tem nome padrão igual ao do menu (uma entrada → renomeável)", () => {
  for (const chave of P3D) {
    const m = MODULOS.find((x) => x.chave === chave)!;
    assert.equal(ROTULOS_PADRAO[chave]?.plural, m.menu[0].label, chave);
    assert.equal(criarRotulos().personalizado(chave), false);
  }
  const r = criarRotulos(lerMapaRotulos({ labels: { p3d_estoque: { singular: "Insumo", plural: "Insumos" } } }));
  assert.equal(labelDoItemMenu(r, ROTA_P3D.p3d_estoque, "Estoque"), "Insumos");
  assert.equal(labelDoItemMenu(r, ROTA_P3D.p3d_impressoras, "Impressoras"), "Impressoras");
});
await teste("o snapshot das empresas atuais não tem rota do nicho (nada mudou para elas)", () => {
  assert.ok(Object.keys(dourado.rotaPermitida).every((p) => !p.startsWith("/impressao-3d")));
  for (const rota of Object.values(ROTA_P3D)) assert.equal(rotaPermitida(rota, ATUAIS), false, rota);
});

console.log("\nImpressão 3D — regras de impressoras e estoque");
await teste("depreciação por hora = (aquisição − residual) ÷ vida útil; 0 sem vida útil; nunca negativa", () => {
  assert.equal(depreciacaoPorHora(3000, 500, 5000), 0.5);
  assert.equal(depreciacaoPorHora(3000, 500, 0), 0);
  assert.equal(depreciacaoPorHora(1000, 1500, 100), 0);
});
await teste("desgaste por hora = soma(custo ÷ vida útil), ignorando vida útil inválida", () => {
  assert.equal(desgastePorHora([{ custo: 100, vida_util_horas: 500 }, { custo: 60, vida_util_horas: 300 }]), 0.4);
  assert.equal(desgastePorHora([{ custo: 100, vida_util_horas: 0 }]), 0);
  assert.equal(desgastePorHora([]), 0);
});
await teste("alerta de manutenção: horas_uso − horas_ultima_manutencao >= intervalo", () => {
  const i = (uso: number, ultima: number, intervalo: number | null) => ({
    horas_uso: uso, horas_ultima_manutencao: ultima, intervalo_manutencao_horas: intervalo,
  });
  assert.equal(manutencaoVencida(i(250, 0, 250)), true, "igual ao intervalo vence");
  assert.equal(manutencaoVencida(i(249.9, 0, 250)), false);
  assert.equal(manutencaoVencida(i(300, 100, 250)), false);
  assert.equal(manutencaoVencida(i(400, 100, 250)), true);
  assert.equal(manutencaoVencida(i(9999, 0, null)), false, "sem intervalo não alerta");
  assert.equal(horasParaManutencao(i(300, 100, 250)), 50);
  assert.equal(horasParaManutencao(i(400, 100, 250)), -50);
  assert.equal(horasParaManutencao(i(1, 0, null)), null);
  assert.equal(pecaVencida({ vida_util_horas: 100, horas_ultima_troca: 50 }, 150), true);
  assert.equal(pecaVencida({ vida_util_horas: 100, horas_ultima_troca: 50 }, 149), false);
});
await teste("estoque: abaixo do mínimo só com mínimo > 0; rolos × peso líquido = gramas; custo/g", () => {
  assert.equal(abaixoDoMinimo({ estoque_atual: 500, estoque_minimo: 1000 }), true);
  assert.equal(abaixoDoMinimo({ estoque_atual: 1000, estoque_minimo: 1000 }), true);
  assert.equal(abaixoDoMinimo({ estoque_atual: 1001, estoque_minimo: 1000 }), false);
  assert.equal(abaixoDoMinimo({ estoque_atual: 0, estoque_minimo: 0 }), false);
  assert.equal(gramasDeRolos(3, 1000), 3000);
  assert.equal(custoPorGrama(120, 1000), 0.12);
  assert.equal(custoPorGrama(120, null), 120);
  assert.equal(custoPorGrama(null, 1000), 0);
});

console.log("\nImpressão 3D — números, validação e arquivos");
await teste("parseNumero aceita vírgula, milhar e ponto decimal; vazio = null; lixo = NaN", () => {
  assert.equal(parseNumero("12,5"), 12.5);
  assert.equal(parseNumero("1.234,56"), 1234.56);
  assert.equal(parseNumero("12.5"), 12.5);
  assert.equal(parseNumero("R$ 7,90"), 7.9);
  assert.equal(parseNumero(""), null);
  assert.equal(parseNumero("  "), null);
  assert.equal(parseNumero(undefined), null);
  assert.ok(Number.isNaN(parseNumero("abc") as number));
  assert.ok(Number.isNaN(parseNumero("1,2,3") as number));
});
await teste("formatação pt-BR: moeda BRL e vírgula decimal", () => {
  assert.match(formatMoeda(1234.5).replace(/\s/g, " "), /^R\$ 1\.234,50$/);
  assert.equal(formatNumero(12.5), "12,5");
  assert.equal(formatPercentualFracao(0.2534), "25,3%");
  assert.equal(formatPct(8), "8%");
});
await teste("ImpressoraSchema: residual > aquisição e horas da última manutenção > horas de uso são recusados", () => {
  const base = { nome: "Ender 3", tecnologia: "fdm", status: "disponivel", valor_aquisicao: "1000", valor_residual: "200", vida_util_horas: "5000" };
  assert.ok(ImpressoraSchema.safeParse(base).success);
  assert.ok(!ImpressoraSchema.safeParse({ ...base, valor_residual: "1500" }).success);
  assert.ok(!ImpressoraSchema.safeParse({ ...base, horas_uso: "10", horas_ultima_manutencao: "20" }).success);
  assert.ok(!ImpressoraSchema.safeParse({ ...base, nome: "  " }).success);
  const r = ImpressoraSchema.safeParse({ ...base, valor_aquisicao: "1.000,50", volume_x_mm: "" });
  assert.ok(r.success && r.data.valor_aquisicao === 1000.5 && r.data.volume_x_mm === null);
});
await teste("ConfigSchema: faixas do banco (desperdício/falhas 0–50, margem < 100, fração 0–1)", () => {
  const base = { modo_preco: "margem", base_custo_material: "cadastro" };
  const r = ConfigSchema.safeParse(base);
  assert.ok(r.success);
  assert.equal(r.success && r.data.desperdicio_pct, 8);
  assert.equal(r.success && r.data.falha_pct, 7);
  assert.equal(r.success && r.data.margem_pct, 30);
  assert.ok(!ConfigSchema.safeParse({ ...base, desperdicio_pct: "51" }).success);
  assert.ok(!ConfigSchema.safeParse({ ...base, falha_pct: "-1" }).success);
  assert.ok(!ConfigSchema.safeParse({ ...base, margem_pct: "100" }).success);
  assert.ok(ConfigSchema.safeParse({ ...base, margem_pct: "99,9" }).success);
  assert.ok(!ConfigSchema.safeParse({ ...base, falha_fracao_perdida: "1,5" }).success);
  assert.ok(!ConfigSchema.safeParse({ ...base, modo_preco: "lucro" }).success);
  assert.equal(FAIXA_DESPERDICIO.min, 5);
  assert.equal(FAIXA_DESPERDICIO.max, 15);
  assert.equal(FAIXA_FALHAS.max, 10);
});
await teste("MaterialSchema/MovimentoSchema/OrcamentoSchema: cor #RRGGBB, ajuste com sinal, só campos permitidos", () => {
  const m = { tipo: "filamento", nome: "PLA", unidade: "g" };
  assert.ok(MaterialSchema.safeParse({ ...m, cor_hex: "#FF8800" }).success);
  assert.ok(!MaterialSchema.safeParse({ ...m, cor_hex: "FF8800" }).success);
  assert.ok(!MaterialSchema.safeParse({ ...m, peso_liquido_rolo_g: "0" }).success);
  const mov = { material_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", tipo: "ajuste" };
  assert.ok(MovimentoSchema.safeParse({ ...mov, quantidade: "-120" }).success);
  assert.ok(!MovimentoSchema.safeParse({ ...mov, quantidade: "0" }).success);
  assert.ok(!MovimentoSchema.safeParse({ ...mov, tipo: "saida_producao", quantidade: "1" }).success, "só entrada/ajuste/perda pela tela");
  const o = OrcamentoSchema.safeParse({ titulo: "Peças", status: "aprovado", total: "999", numero: "5" });
  assert.ok(o.success);
  assert.deepEqual(Object.keys(o.success ? o.data : {}).sort(), ["cliente_id", "desconto_valor", "observacoes", "titulo", "validade"]);
});
await teste("arquivos: caminho '<workspace>/<produto>/<uuid>-<nome>' e recusa de outra empresa", () => {
  const prod = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const c = montarCaminho(WS_A, prod, "u-u-i-d", "Suporte Ção.STL");
  assert.equal(c, `${WS_A}/${prod}/u-u-i-d-Suporte_Cao.STL`);
  assert.ok(caminhoValido(c, WS_A, prod));
  assert.ok(!caminhoValido(c, WS_ALHEIA, prod), "outra empresa");
  assert.ok(!caminhoValido(c, WS_A, "outro-produto"));
  assert.ok(!caminhoValido(`${WS_A}/${prod}/../${WS_ALHEIA}/x.stl`, WS_A, prod), "path traversal");
  assert.ok(!caminhoValido(`${WS_A}/${prod}/`, WS_A, prod), "sem nome");
  assert.equal(tipoPorNome("x.STL"), "stl");
  assert.equal(tipoPorNome("x.3mf"), "3mf");
  assert.equal(tipoPorNome("x.gcode"), "gcode");
  assert.equal(tipoPorNome("foto.JPG"), "foto");
  assert.equal(tipoPorNome("x.zip"), "outro");
  assert.equal(LIMITE_BYTES, 100 * 1024 * 1024);
});

console.log("\nImpressão 3D — simulador e cálculo");
const CONFIG_TESTE = { ...CONFIG_PADRAO };
await teste("montarEntrada: só vai o que foi preenchido; vazio = padrão; modo de preço só se diferir", () => {
  const vazio = montarEntrada({ ...ESTADO_VAZIO }, CONFIG_TESTE);
  assert.deepEqual(vazio.erros, []);
  assert.deepEqual(vazio.entrada, { quantidade: 1 });
  const r = montarEntrada(
    {
      ...ESTADO_VAZIO, impressora_id: "i1", material_id: "m1", quantidade: "10",
      campos: { peso_peca_g: "250,5", peso_suporte_g: "20", horas_impressao: "12", mao_obra_horas: "1", margem_pct: "40", tarifa_kwh: "0,95" },
      outros: [{ nome: "Ímã", valor: "3,5" }, { nome: "", valor: "" }],
    },
    CONFIG_TESTE
  );
  assert.deepEqual(r.erros, []);
  assert.deepEqual(r.entrada, {
    impressora_id: "i1", material_id: "m1", quantidade: 10, peso_peca_g: 250.5, peso_suporte_g: 20,
    horas_impressao: 12, mao_obra_horas: 1, outros_custos: [{ nome: "Ímã", valor: 3.5 }], tarifa_kwh: 0.95, margem_pct: 40,
  });
  const markup = montarEntrada({ ...ESTADO_VAZIO, modo_preco: "markup", campos: { markup_pct: "80", margem_pct: "10" } }, CONFIG_TESTE);
  assert.equal(markup.entrada.modo_preco, "markup");
  assert.equal(markup.entrada.markup_pct, 80);
  assert.ok(!("margem_pct" in markup.entrada), "margem digitada é ignorada no modo markup");
});
await teste("montarEntrada: peso total do fatiador x por componente; purga é subconjunto do total", () => {
  const total = montarEntrada(
    { ...ESTADO_VAZIO, pesoModo: "total", campos: { peso_total_g: "500", peso_purga_g: "30", peso_peca_g: "999" } },
    CONFIG_TESTE
  );
  assert.equal(total.entrada.peso_total_g, 500);
  assert.equal(total.entrada.peso_purga_g, 30);
  assert.ok(!("peso_peca_g" in total.entrada), "componentes não vão junto com o total");
  const det = montarEntrada({ ...ESTADO_VAZIO, campos: { peso_total_g: "500", peso_peca_g: "100", peso_brim_g: "5" } }, CONFIG_TESTE);
  assert.ok(!("peso_total_g" in det.entrada));
  assert.equal(det.entrada.peso_brim_g, 5);
});
await teste("montarEntrada: valida quantidade, números e margem < 100", () => {
  assert.ok(montarEntrada({ ...ESTADO_VAZIO, quantidade: "0" }, CONFIG_TESTE).erros.length > 0);
  assert.ok(montarEntrada({ ...ESTADO_VAZIO, quantidade: "1,5" }, CONFIG_TESTE).erros.length > 0);
  assert.ok(montarEntrada({ ...ESTADO_VAZIO, campos: { peso_peca_g: "abc" } }, CONFIG_TESTE).erros.length > 0);
  assert.ok(montarEntrada({ ...ESTADO_VAZIO, campos: { peso_peca_g: "-5" } }, CONFIG_TESTE).erros.length > 0);
  assert.ok(montarEntrada({ ...ESTADO_VAZIO, campos: { margem_pct: "100" } }, CONFIG_TESTE).erros.length > 0);
  assert.ok(montarEntrada({ ...ESTADO_VAZIO, outros: [{ nome: "x", valor: "0" }] }, CONFIG_TESTE).erros.length > 0);
});
await teste("recalcular com valores atuais: mantém só o que é do item e descarta os parâmetros do snapshot", () => {
  const snapshot = {
    impressora_id: "i1", material_id: "m1", quantidade: 5, peso_peca_g: 100, horas_impressao: 3, preco_manual: 99,
    outros_custos: [{ nome: "x", valor: 2 }], preco_por_g: 0.2, tarifa_kwh: 0.9, potencia_media_kw: 0.12,
    margem_pct: 30, modo_preco: "margem", desperdicio_pct: 8, valor_aquisicao: 3000,
  };
  assert.deepEqual(entradaParaRecalculo(snapshot), {
    impressora_id: "i1", material_id: "m1", quantidade: 5, peso_peca_g: 100, horas_impressao: 3, preco_manual: 99,
    outros_custos: [{ nome: "x", valor: 2 }],
  });
  assert.deepEqual(entradaParaRecalculo({}), {});
});
await teste("editar item: carrega o que é do item e o modo/percentual só quando diferem da configuração", () => {
  const e = estadoParaEdicao(
    { quantidade: 4, peso_total_g: 300, horas_impressao: 5, tarifa_kwh: 0.9, modo_preco: "markup", markup_pct: 80 },
    CONFIG_TESTE
  );
  assert.equal(e.quantidade, "4");
  assert.equal(e.pesoModo, "total");
  assert.equal(e.modo_preco, "markup");
  assert.equal(e.campos.markup_pct, "80");
  assert.ok(!("tarifa_kwh" in e.campos), "parâmetro de custo não é carregado");
  const igual = estadoParaEdicao({ quantidade: 1, modo_preco: "margem", margem_pct: 30 }, CONFIG_TESTE);
  assert.ok(!("margem_pct" in igual.campos), "igual à configuração = padrão");
});
await teste("lerCalculo: lê o contrato, tolera lixo e normaliza margem/markup (fração ou %)", () => {
  const bruto = {
    custos: { material: 10, energia: 2, depreciacao: 1, manutencao: 0.5, falhas: 1, mao_obra: 5, acabamento: 0, montagem: 0, embalagem: 1, outros: 0.5, rateio_despesas_fixas: 0 },
    custo_total: 21, impostos_valor: 3, taxas_valor: 2, preco_recomendado: 40, preco_final: 40, lucro: 14,
    margem_real: 0.35, markup_real: 0.6667,
    por_unidade: { custo: 2.1, preco: 4, lucro: 1.4 },
    detalhes: { material: { peso_total_g: 100, desperdicio_g: 8, peso_consumo_g: 108, preco_por_g: 0.1 }, energia: { kwh: 1.2, potencia_kw: 0.1, tarifa_kwh: 0.9 }, depreciacao: { por_hora: 0.6 }, falha: { tentativas_esperadas: 1.07, custo_de_uma_tentativa: 9 } },
    avisos: ["Sem material"], tipo_valores: "estimado", versao_formula: 1,
  };
  const c = lerCalculo(bruto)!;
  assert.equal(c.custo_total, 21);
  assert.equal(c.custos.energia, 2);
  assert.equal(c.detalhes.depreciacao_por_hora, 0.6);
  assert.deepEqual(c.avisos, ["Sem material"]);
  assert.ok(Math.abs(c.margem_real - 0.35) < 1e-9);
  // percentual (35) vira fração
  const pct = lerCalculo({ ...bruto, margem_real: 35, markup_real: 66.67 })!;
  assert.ok(Math.abs(pct.margem_real - 0.35) < 1e-9);
  assert.ok(Math.abs(pct.markup_real - 0.6667) < 1e-9);
  assert.equal(lerCalculo(null), null);
  assert.equal(lerCalculo("x"), null);
  const torto = lerCalculo({ custo_total: "abc", custos: { material: null }, avisos: [1, "ok"] })!;
  assert.equal(torto.custo_total, 0);
  assert.deepEqual(torto.avisos, ["ok"]);
  assert.equal(normalizarFracao(0.3, 30, 100), 0.3);
  assert.equal(normalizarFracao(30, 30, 100), 0.3);
  assert.equal(normalizarFracao(40, 0, 0), 0.4);
});
await teste("sem o extra 'custos', o cálculo sai só com preços (servidor remove custo/lucro/margem)", () => {
  const oculto = ocultarCustosDoCalculo({
    custos: { material: 10 }, custo_total: 21, lucro: 14, margem_real: 0.35, markup_real: 0.6,
    preco_final: 40, preco_recomendado: 38, por_unidade: { custo: 2, preco: 4, lucro: 1 }, detalhes: { x: 1 },
    avisos: ["a"], impostos_valor: 3, taxas_valor: 2,
  });
  assert.deepEqual(Object.keys(oculto).sort(), ["avisos", "por_unidade", "preco_final", "preco_recomendado", "tipo_valores", "versao_formula"]);
  assert.deepEqual(oculto.por_unidade, { preco: 4 });
  const lido = lerCalculo(oculto)!;
  assert.equal(lido.preco_final, 40);
  assert.equal(lido.custo_total, 0);
});

console.log("\nImpressão 3D — contrato do banco no código (RPCs, campos protegidos, empresa ativa)");
const ARQ_P3D = [
  "app/(dashboard)/impressao-3d/impressoras/actions.ts",
  "app/(dashboard)/impressao-3d/estoque/actions.ts",
  "app/(dashboard)/impressao-3d/produtos/actions.ts",
  "app/(dashboard)/impressao-3d/precificacao/actions.ts",
  "app/(dashboard)/impressao-3d/orcamentos/actions.ts",
];
await teste("toda action de escrita do nicho passa por getAcessoEdicao do módulo certo", () => {
  const modulo: Record<string, string> = {
    impressoras: "p3d_impressoras", estoque: "p3d_estoque", produtos: "p3d_produtos",
    precificacao: "p3d_precificacao", orcamentos: "p3d_orcamentos",
  };
  for (const arq of ARQ_P3D) {
    const texto = lerFonte(arq);
    const chave = arq.split("/")[3];
    assert.ok(texto.includes(`const MODULO = "${modulo[chave]}"`) || texto.includes(`getAcessoEdicao("${modulo[chave]}")`), arq);
    for (const parte of texto.split(/\nexport async function /).slice(1)) {
      const nome = parte.slice(0, parte.indexOf("(")).trim();
      assert.ok(parte.includes("getAcessoEdicao("), `${arq} ${nome} sem guarda de edição`);
      if (/\.(insert|update|upsert|delete)\(/.test(parte)) assert.ok(parte.includes("workspace_id"), `${arq} ${nome} sem workspace_id`);
    }
  }
});
await teste("leitura: simulação e download passam por getAcessoModulo (nunca só pelo cookie)", () => {
  const sim = lerFonte("app/(dashboard)/impressao-3d/precificacao/simulacao.ts");
  assert.ok(sim.includes('getAcessoModulo("p3d_orcamentos", "edicao")') && sim.includes('getAcessoModulo("p3d_precificacao")'));
  assert.ok(sim.includes("p3d_simular_preco") && sim.includes("p_ws: acesso.workspaceId"));
  const dl = lerFonte("app/(dashboard)/impressao-3d/produtos/arquivos-leitura.ts");
  assert.ok(dl.includes('getAcessoModulo("p3d_produtos")') && dl.includes('.eq("workspace_id", acesso.workspaceId)'));
  assert.ok(dl.includes("assinarArquivo"), "download por signed URL");
});
await teste("páginas do nicho leem pelo guard e filtram por workspace_id da empresa ativa", () => {
  const paginas: [string, string][] = [
    ["app/(dashboard)/impressao-3d/impressoras/page.tsx", "p3d_impressoras"],
    ["app/(dashboard)/impressao-3d/estoque/page.tsx", "p3d_estoque"],
    ["app/(dashboard)/impressao-3d/produtos/page.tsx", "p3d_produtos"],
    ["app/(dashboard)/impressao-3d/produtos/[id]/page.tsx", "p3d_produtos"],
    ["app/(dashboard)/impressao-3d/precificacao/page.tsx", "p3d_precificacao"],
    ["app/(dashboard)/impressao-3d/orcamentos/page.tsx", "p3d_orcamentos"],
    ["app/(dashboard)/impressao-3d/orcamentos/[id]/page.tsx", "p3d_orcamentos"],
  ];
  for (const [arq, modulo] of paginas) {
    const t = lerFonte(arq);
    assert.ok(t.includes(`getAcessoModulo("${modulo}")`), arq);
    assert.ok(t.includes("workspace_id"), arq);
    assert.ok(!/getDonoIdAtivo|getWorkspaceIdAtivo/.test(t), `${arq} usa o código antigo de dono`);
  }
});
await teste("campos protegidos NUNCA vão em insert/update direto (materiais e orçamentos)", () => {
  const PROTEGIDOS_MATERIAL = ["estoque_atual", "custo_medio", "ultimo_custo", "custo_cadastro"];
  const PROTEGIDOS_ORCAMENTO = ["status", "numero", "subtotal", "total", "custo_total", "lucro_total", "enviado_em", "aprovado_em"];
  const est = lerFonte("app/(dashboard)/impressao-3d/estoque/actions.ts");
  const orc = lerFonte("app/(dashboard)/impressao-3d/orcamentos/actions.ts");
  const cheiro = (texto: string, tabela: string) => {
    const trechos: string[] = [];
    const re = new RegExp(`\\.from\\("${tabela}"\\)\\s*\\.(insert|update|upsert)\\(`, "g");
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      let i = m.index + m[0].length, nivel = 1;
      const ini = i;
      while (i < texto.length && nivel > 0) { if (texto[i] === "(") nivel++; else if (texto[i] === ")") nivel--; i++; }
      trechos.push(texto.slice(ini, i - 1));
    }
    return trechos;
  };
  const trechosMat = cheiro(est, "p3d_materiais");
  assert.ok(trechosMat.length >= 2);
  for (const t of trechosMat) for (const c of PROTEGIDOS_MATERIAL) assert.ok(!new RegExp(`\\b${c}\\b`).test(t), `materiais.${c}`);
  const trechosOrc = cheiro(orc, "p3d_orcamentos");
  assert.ok(trechosOrc.length >= 2);
  for (const t of trechosOrc) for (const c of PROTEGIDOS_ORCAMENTO) assert.ok(!new RegExp(`\\b${c}\\b`).test(t), `orcamentos.${c}`);
  // os schemas que alimentam esses payloads não têm campo protegido
  const val = lerFonte("lib/impressao-3d/validacao.ts");
  const mat = val.slice(val.indexOf("export const MaterialSchema"), val.indexOf("export const ProdutoSchema"));
  for (const c of PROTEGIDOS_MATERIAL) assert.ok(!new RegExp(`\\b${c}:`).test(mat), `MaterialSchema.${c}`);
  const orcS = val.slice(val.indexOf("export const OrcamentoSchema"), val.indexOf("/** Faixas de referência"));
  for (const c of PROTEGIDOS_ORCAMENTO) assert.ok(!new RegExp(`\\b${c}:`).test(orcS), `OrcamentoSchema.${c}`);
});
await teste("estoque, status e itens só por RPC; erros da RPC são mostrados como vieram", () => {
  const est = lerFonte("app/(dashboard)/impressao-3d/estoque/actions.ts");
  assert.ok(est.includes('.rpc("p3d_movimentar_estoque"'));
  assert.ok(est.includes("p_ws: acesso.workspaceId") && est.includes("p_permitir_negativo") === false, "não permite saldo negativo");
  const orc = lerFonte("app/(dashboard)/impressao-3d/orcamentos/actions.ts");
  for (const rpc of ["p3d_salvar_item_orcamento", "p3d_remover_item_orcamento", "p3d_mudar_status_orcamento"])
    assert.ok(orc.includes(`.rpc("${rpc}"`), rpc);
  assert.ok(!/\.from\("p3d_orcamento_itens"\)\s*\.(insert|update|delete|upsert)/.test(orc), "itens são somente leitura");
  assert.ok(/mensagemRpc\(error/.test(orc) && /mensagemRpc\(error/.test(est));
  assert.equal(mensagemRpc({ message: "Saldo insuficiente de PLA." }, "padrão"), "Saldo insuficiente de PLA.");
  assert.equal(mensagemRpc({ message: " " }, "padrão"), "padrão");
  assert.equal(mensagemRpc(null, "padrão"), "padrão");
  assert.match(mensagemEscrita({ code: "23505" }, "x"), /Já existe/);
  assert.match(mensagemEscrita({ code: "23503" }, "x"), /Arquive/);
});
await teste("orçamento: update/delete só em rascunho; recalcular não manda parâmetros do snapshot", () => {
  const orc = lerFonte("app/(dashboard)/impressao-3d/orcamentos/actions.ts");
  assert.equal((orc.match(/\.eq\("status", "rascunho"\)/g) ?? []).length, 2, "update e delete filtram por rascunho");
  assert.ok(orc.includes("entradaParaRecalculo("));
  const tela = lerFonte("components/impressao-3d/orcamento-detalhe.tsx");
  assert.ok(tela.includes("Recalcular com valores atuais"));
  assert.ok(tela.includes("rascunho") && tela.includes("editavel"), "edição só em rascunho");
});
await teste("arquivos: upload no caminho <workspace>/<produto>/..., registro confere a empresa e exclusão remove objeto e linha", () => {
  const acoes = lerFonte("app/(dashboard)/impressao-3d/produtos/actions.ts");
  assert.ok(acoes.includes("caminhoValido(entrada.storagePath, acesso.workspaceId, entrada.produtoId)"));
  const excluir = acoes.slice(acoes.indexOf("export async function excluirArquivoProduto"));
  assert.ok(excluir.indexOf("removerObjetos") > 0 && excluir.indexOf("removerObjetos") < excluir.indexOf('.from("p3d_produto_arquivos")\n    .delete()'));
  const tela = lerFonte("components/impressao-3d/produto-detalhe.tsx");
  assert.ok(tela.includes("montarCaminho(workspaceId, produtoId, crypto.randomUUID(), arquivo.name)"));
  assert.ok(tela.includes("storage.remove([caminho])"), "desfaz o upload se o registro falhar");
  const st = lerFonte("lib/impressao-3d/storage.ts");
  assert.ok(st.includes("createSignedUrl"));
  assert.equal(BUCKET_P3D, "p3d-arquivos");
});
await teste("integração da impressora guarda só tipo e endereço (nunca token ou senha)", () => {
  const tela = lerFonte("components/impressao-3d/impressoras-board.tsx");
  assert.ok(tela.includes("Não guarde token nem senha"));
  const val = lerFonte("lib/impressao-3d/validacao.ts");
  assert.ok(!/token|senha|password|api_key/i.test(val));
  assert.ok(!/token|senha|password|api_key/i.test(lerFonte("app/(dashboard)/impressao-3d/impressoras/actions.ts")));
});
await teste("Visão Geral: resumo do nicho só consulta módulos ligados e só leva contagens", () => {
  const r = lerFonte("lib/impressao-3d/resumo.ts");
  for (const chave of P3D) assert.ok(r.includes(`com("${chave}")`), chave);
  assert.ok(!/preco_|custo|lucro|valor_/.test(r.replace(/\/\*[\s\S]*?\*\//g, "")), "sem valores monetários");
  const home = lerFonte("components/dashboard-home/dashboard-home-board.tsx");
  for (const chave of P3D) assert.ok(home.includes(`com("${chave}")`), chave);
});

console.log(`\n${total} testes`);
if (process.exitCode) console.log("HÁ FALHAS");
