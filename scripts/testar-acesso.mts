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
import { MODULO_ROTULO, PAPEL_CONVIDAVEL_ROTULO, sanearPermissoes, sociosErrorMessage } from "@/lib/socios-shared";
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
import {
  ACOES_COMPRA, ACOES_ENVIO, ACOES_PEDIDO, agruparIndicadores, agruparPorDefeito, avisosConclusao, compraEditavel,
  cotacoesAbertas, historicoRecebido, lerConclusao, lerFalha, lerInicio, lerPagamento, lerRecebimento,
  ordenarFila, pedidoAceitaEnvio, pedidoEditavel, podeExcluirCompra, podeExcluirEnvio, podeExcluirPedido,
  podeGerarProducao, prazoVencido, precoUnitarioBase, produtividadePorImpressora, quantidadeBaseDeRolos,
  resumirDesperdicio, saldoPedido, taxaFalhaReal, totalDaCompra, totalDoPedido, trabalhoEstruturalEditavel,
  urgentesNaFila, validarOpcoesRecebimento,
} from "@/lib/impressao-3d/regras-operacao";
import {
  COLUNAS_FALHA, COLUNAS_FALHA_CUSTOS, COLUNAS_PEDIDO, COLUNAS_PEDIDO_ITEM, TIPOS_DEFEITO, type Prioridade,
} from "@/lib/impressao-3d/tipos-operacao";
import {
  CompraItemSchema, CompraSchema, ConclusaoSchema, EnvioSchema, FalhaSchema, FornecedorSchema, InspecaoSchema,
  PagamentoSchema, PedidoItemSchema, PedidoLimitadoSchema, PedidoSchema, RecebimentoSchema, TrabalhoSchema,
} from "@/lib/impressao-3d/validacao-operacao";
import { RESUMO_P3D_VAZIO } from "@/lib/impressao-3d/resumo";
import { hojeSaoPaulo } from "@/lib/impressao-3d/datas";
import {
  PERIODO_MAXIMO_DIAS, agrupamentoValido, atalhosPeriodo, csvCelula, gerarCsv,
  lerPainel, lerRelatorioProdutividade, lerRelatorioProdutos, lerRelatorioVendas, nomeArquivoCsv, periodoPadrao,
  resolverPeriodo, rotuloPeriodo, somaOuNull, validarPeriodo, type LinhaVendas,
} from "@/lib/impressao-3d/painel";
import {
  INTERVALO_ATUALIZACAO_MS, COLUNAS_CONFIG_ALERTAS, agruparPorSeveridade, destinoDaReferencia, deveAtualizar, estaAberta,
  lerConfigAlertas, lerNotificacoes, moduloDaReferencia, rotuloDoTipo, severidadeValida,
} from "@/lib/impressao-3d/alertas";
import {
  CHAVE_PROIBIDA, COLUNAS_INTEGRACAO, COLUNAS_INTEGRACAO_ESTADO, INTEGRACAO_INFO, MENSAGEM_NAO_CONECTADA, TIPOS_INTEGRACAO,
  lerIntegracoes, mesclarConfig, pareceSegredo, statusValido, validarConfigIntegracao, type TipoIntegracao,
} from "@/lib/impressao-3d/integracoes";
import { ConfigAlertasSchema, IntegracaoSchema } from "@/lib/impressao-3d/validacao-nicho";
import { primeiroErro } from "@/lib/impressao-3d/validacao";
import { configDoSino } from "@/lib/impressao-3d/sino";
import { atalhosConfiguracaoNicho } from "@/lib/impressao-3d/configuracoes";
import { adicionarDias, dataIsoValida, diasEntre, formatDataIso, primeiroDiaDoMes, ultimoDiaDoMes } from "@/lib/impressao-3d/datas";
import {
  CHAVE_VALIDA, ITENS_FIXOS, abaInicial, abasDe, abasVisiveis, aplicarPreferenciaMenu, chaveDoHref, gruposDoMenu, itemFixo,
  ITENS_EMPRESA, lerPreferencia, ordenarComPreferencia, prepararPreferencia, resolverPreferencia,
} from "@/lib/modulos/preferencias";
import { CHAVE_VISAO_GERAL } from "@/lib/modulos/registry";
import { ROTA_NAVEGACAO, precisaDeModulos } from "@/lib/acesso";
import { PASSOS, montarPassos, precificacaoAjustada, todosConcluidos } from "@/lib/impressao-3d/primeiros-passos";
import { COLUNAS_ORCAMENTO_CLIENTE, COLUNAS_PEDIDO_CLIENTE, resumirCompras } from "@/lib/impressao-3d/cliente-compras";
import { MODULOS_OPCIONAIS, modulosOpcionaisFaltando } from "@/lib/impressao-3d/primeiros-passos";
import {
  EXTRAS_RAPIDOS, ZEROS_MODO_RAPIDO, custoHoraImpressora, estadoInicialRapido, explicarMargem, explicarMultiplicador,
  kwParaWatts, markupPctParaMultiplicador, montarEntradaRapida, multiplicadorInicial, multiplicadorParaMarkupPct,
  resumoWhatsapp, valoresIniciaisExtras, wattsParaKw, type EstadoRapido,
} from "@/lib/impressao-3d/calculadora-rapida";
import { entradaDeRolosComprados, saldoEmRolos } from "@/lib/impressao-3d/cadastro-simples";
import {
  cadastroDeValorKg, custoPorKgDeG, entradaDeCompraKg, entradaDeCompraUnidade, faltaDeEstoque, formatarSaldoPeso,
  lerLinhasTrabalho, linhasDeEntrada, linhasParaTrabalho, montarConsumos, montarMateriais, novaLinhaFilamento,
  paraGramas, pesoTotalLinhas, precoPorGDeValorKg,
} from "@/lib/impressao-3d/filamentos";
import {
  chaveEstoquePeca, itensBaixados, itensBaixaveis, lerBaixaPecas, lerDevolucaoPecas, origemMovimentoPeca,
  pecaAbaixoDoMinimo, textoBaixa, textoPecasEntraram, validarMovimentoPeca,
} from "@/lib/impressao-3d/pecas";
import { avisosConclusaoMulti, lerConclusaoMulti } from "@/lib/impressao-3d/regras-operacao";
import { ARQUIVOS_SEM_SALDO_NO_CLIENTE, saldoCalculadoNoCliente } from "@/lib/impressao-3d/auditoria-preco";
import {
  VALIDADES_CODIGO_COFUNDADOR, VALIDADE_PADRAO_HORAS, codigoAtivo, ehPedidoCofundador, lerCodigoGerado, montarPessoas,
  pessoaRemovivel, rotuloDoPedidoAcesso, textoConfirmarCofundador, validadeValida,
} from "@/lib/socios-shared";
import { erroDaRpc, gestorErrorMessage, solicitarAcessoErrorMessage, limparCodigoAcesso, CODIGO_ACESSO_MAX } from "@/lib/vendedor-shared";
import { rotuloDoTipo as rotuloTipoAprovacao } from "@/lib/aprovacoes-shared";
import { ACESSO_VENDEDOR_AGUARDANDO } from "@/lib/vendedor-access";
import { GRUPO_EMPRESA } from "@/lib/modulos/preferencias";
import { CHAVE_ROLAGEM_SIDEBAR, gravarRolagem, lerRolagem } from "@/lib/sidebar-rolagem";
import { ARQUIVOS_CALCULADORA_RAPIDA, precoCalculadoNoCliente } from "@/lib/impressao-3d/auditoria-preco";
import { FRASE_MODULO } from "@/lib/impressao-3d/frases-modulos";


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
const P3D = [
  "p3d_impressoras", "p3d_estoque", "p3d_produtos", "p3d_precificacao", "p3d_orcamentos",
  "p3d_fornecedores", "p3d_pedidos", "p3d_producao", "p3d_qualidade", "p3d_expedicao",
];
const ROTA_P3D: Record<string, string> = {
  p3d_impressoras: "/impressao-3d/impressoras",
  p3d_estoque: "/impressao-3d/estoque",
  p3d_produtos: "/impressao-3d/produtos",
  p3d_precificacao: "/impressao-3d/precificacao",
  p3d_orcamentos: "/impressao-3d/orcamentos",
  p3d_fornecedores: "/impressao-3d/fornecedores",
  p3d_pedidos: "/impressao-3d/pedidos",
  p3d_producao: "/impressao-3d/producao",
  p3d_qualidade: "/impressao-3d/qualidade",
  p3d_expedicao: "/impressao-3d/expedicao",
};
await teste("o registro cobre as 10 chaves (5 da Etapa A + 5 da Etapa B), cada uma com rota, menu e as tabelas p3d_*", () => {
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
    "p3d_compra_itens", "p3d_compras", "p3d_envios", "p3d_falhas", "p3d_fornecedores", "p3d_inspecoes",
    "p3d_pedido_historico", "p3d_pedido_itens", "p3d_pedido_pagamentos", "p3d_pedidos", "p3d_producao",
  ].sort());
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
  const pedidoComExtra = g("p3d_pedidos", "socio", "leitura", [perm("p3d_pedidos", "leitura", ["custos"])]);
  const pedidoSemExtra = g("p3d_pedidos", "socio", "leitura", [perm("p3d_pedidos", "leitura")]);
  assert.equal(podeVerCustos(pedidoComExtra), true);
  assert.equal(podeVerCustos(pedidoSemExtra), false, "Pedidos sem o extra custos não vê custo, lucro nem margem");
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
  "app/(dashboard)/impressao-3d/fornecedores/actions.ts",
  "app/(dashboard)/impressao-3d/pedidos/actions.ts",
  "app/(dashboard)/impressao-3d/producao/actions.ts",
  "app/(dashboard)/impressao-3d/qualidade/actions.ts",
  "app/(dashboard)/impressao-3d/expedicao/actions.ts",
];
await teste("toda action de escrita do nicho passa por getAcessoEdicao do módulo certo", () => {
  const modulo: Record<string, string> = {
    impressoras: "p3d_impressoras", estoque: "p3d_estoque", produtos: "p3d_produtos",
    precificacao: "p3d_precificacao", orcamentos: "p3d_orcamentos", fornecedores: "p3d_fornecedores",
    pedidos: "p3d_pedidos", producao: "p3d_producao", qualidade: "p3d_qualidade", expedicao: "p3d_expedicao",
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

// ===========================================================================
// Nicho Impressão 3D (Etapa B) — fornecedores e compras, pedidos, produção, qualidade, expedição
// ===========================================================================

console.log("\nImpressão 3D (Etapa B) — status, fila e regras puras");
await teste("pedido: transições espelham a RPC (novo→confirmado|cancelado; … ; enviado→entregue; finais sem ação)", () => {
  const alvos = (s: keyof typeof ACOES_PEDIDO) => ACOES_PEDIDO[s].map((a) => a.alvo);
  assert.deepEqual(alvos("novo"), ["confirmado", "cancelado"]);
  assert.deepEqual(alvos("confirmado"), ["em_producao", "pronto", "cancelado"]);
  assert.deepEqual(alvos("em_producao"), ["pronto", "cancelado"]);
  assert.deepEqual(alvos("pronto"), ["enviado", "entregue", "em_producao", "cancelado"]);
  assert.deepEqual(alvos("enviado"), ["entregue"]);
  assert.deepEqual([alvos("entregue"), alvos("cancelado")], [[], []]);
  for (const s of Object.keys(ACOES_PEDIDO) as (keyof typeof ACOES_PEDIDO)[])
    for (const a of ACOES_PEDIDO[s]) assert.equal(!!a.pedeMotivo, a.alvo === "cancelado", `${s}→${a.alvo}`);
});
await teste("compra e envio: transições espelham as RPCs; recebida/cancelada/entregue/devolvido são finais", () => {
  const c = (s: keyof typeof ACOES_COMPRA) => ACOES_COMPRA[s].map((a) => a.alvo);
  assert.deepEqual(c("cotacao"), ["aprovada", "cancelada"]);
  assert.deepEqual(c("aprovada"), ["cotacao", "cancelada"]);
  assert.deepEqual([c("recebida"), c("cancelada")], [[], []]);
  const e = (s: keyof typeof ACOES_ENVIO) => ACOES_ENVIO[s].map((a) => a.alvo);
  assert.deepEqual(e("preparando"), ["postado"]);
  assert.deepEqual(e("postado"), ["em_transito", "entregue", "problema", "devolvido"]);
  assert.deepEqual(e("em_transito"), ["entregue", "problema", "devolvido"]);
  assert.deepEqual(e("problema"), ["em_transito", "entregue", "devolvido"]);
  assert.deepEqual([e("entregue"), e("devolvido")], [[], []]);
});
await teste("exclusão e edição: só o que o banco permite (pedido novo sem pagamento e sem orçamento; compra em cotação; envio em preparação)", () => {
  assert.equal(podeExcluirPedido({ status: "novo", pago_valor: 0, orcamento_id: null, origem: "manual" }), true);
  assert.equal(podeExcluirPedido({ status: "novo", pago_valor: 10, orcamento_id: null, origem: "manual" }), false);
  assert.equal(podeExcluirPedido({ status: "novo", pago_valor: 0, orcamento_id: "x", origem: "orcamento" }), false);
  assert.equal(podeExcluirPedido({ status: "confirmado", pago_valor: 0, orcamento_id: null, origem: "manual" }), false);
  assert.equal(podeExcluirCompra("cotacao"), true);
  assert.equal(podeExcluirCompra("aprovada"), false);
  assert.equal(compraEditavel("aprovada"), true);
  assert.equal(compraEditavel("recebida"), false);
  assert.equal(podeExcluirEnvio("preparando"), true);
  assert.equal(podeExcluirEnvio("postado"), false);
  assert.equal(pedidoEditavel("confirmado"), true);
  assert.equal(pedidoEditavel("em_producao"), false);
  assert.equal(podeGerarProducao("confirmado"), true);
  assert.equal(podeGerarProducao("novo"), false);
  assert.equal(pedidoAceitaEnvio("pronto"), true);
  assert.equal(pedidoAceitaEnvio("em_producao"), false);
  assert.equal(trabalhoEstruturalEditavel("fila"), true);
  assert.equal(trabalhoEstruturalEditavel("imprimindo"), false);
});
await teste("fila: prioridade (urgente>alta>normal>baixa), depois prazo (nulos por último), depois número", () => {
  const t = (numero: number, prioridade: Prioridade, prazo: string | null) => ({ numero, prioridade, prazo });
  const fila = ordenarFila([
    t(1, "normal", null), t(2, "baixa", "2026-01-01"), t(3, "urgente", null), t(4, "normal", "2026-03-01"),
    t(5, "alta", "2026-05-01"), t(6, "normal", "2026-03-01"), t(7, "urgente", "2026-02-01"), t(8, "normal", "2026-02-01"),
  ]);
  assert.deepEqual(fila.map((x) => x.numero), [7, 3, 5, 8, 4, 6, 1, 2]);
  assert.equal(urgentesNaFila([{ status: "fila", prioridade: "urgente" }, { status: "imprimindo", prioridade: "urgente" }, { status: "fila", prioridade: "alta" }]), 1);
  const entrada = [t(2, "normal", null), t(1, "normal", null)];
  ordenarFila(entrada);
  assert.deepEqual(entrada.map((x) => x.numero), [2, 1], "não altera a lista original");
});
await teste("pedido: prazo vencido só em pedido aberto (novo→pronto); saldo nunca negativo; total = subtotal − desconto + frete", () => {
  assert.equal(prazoVencido({ status: "confirmado", prazo_entrega: "2026-01-01" }, "2026-01-02"), true);
  assert.equal(prazoVencido({ status: "confirmado", prazo_entrega: "2026-01-02" }, "2026-01-02"), false, "o próprio dia não vence");
  assert.equal(prazoVencido({ status: "entregue", prazo_entrega: "2026-01-01" }, "2026-02-01"), false);
  assert.equal(prazoVencido({ status: "cancelado", prazo_entrega: "2026-01-01" }, "2026-02-01"), false);
  assert.equal(prazoVencido({ status: "novo", prazo_entrega: null }, "2026-02-01"), false);
  assert.equal(saldoPedido(100, 40), 60);
  assert.equal(saldoPedido(100, 120), 0);
  assert.equal(totalDoPedido(100, 10, 15.5), 105.5);
});
await teste("compras: rolos × peso líquido = unidade base; preço unitário sem frete; cotações abertas do menor ao maior", () => {
  assert.equal(quantidadeBaseDeRolos(3, 1000), 3000);
  assert.equal(quantidadeBaseDeRolos(3, null), null);
  assert.equal(quantidadeBaseDeRolos(0, 1000), null);
  assert.equal(precoUnitarioBase(120, 1000), 0.12);
  assert.equal(precoUnitarioBase(120, 0), null);
  assert.equal(totalDaCompra(300, 20, 10), 310);
  assert.equal(validarOpcoesRecebimento(true, null), "Informe o vencimento para gerar a conta a pagar.");
  assert.equal(validarOpcoesRecebimento(false, null), null);
  const l = (compra_id: string, material_id: string, compra_status: string, preco_unitario: number, data: string) => ({
    material_id, fornecedor_id: "f", compra_id, compra_numero: 1, compra_status, data, quantidade: 1000, preco_unitario, preco_total: preco_unitario * 1000,
  });
  const linhas = [l("a", "m1", "cotacao", 0.15, "2026-01-01"), l("b", "m1", "cotacao", 0.1, "2026-01-02"), l("c", "m1", "recebida", 0.2, "2026-01-03"), l("d", "m2", "cotacao", 0.01, "2026-01-01"), l("e", "m1", "recebida", 0.18, "2026-02-01")];
  assert.deepEqual(cotacoesAbertas(linhas, "m1").map((x) => x.compra_id), ["b", "a"]);
  assert.deepEqual(historicoRecebido(linhas, "m1").map((x) => x.compra_id), ["e", "c"], "mais recente primeiro");
});

console.log("\nImpressão 3D (Etapa B) — qualidade: taxa real, desperdício e produtividade");
await teste("taxa real = trabalhos com falha ÷ (concluídos + falhos); sem base = null (nunca zero inventado)", () => {
  assert.equal(taxaFalhaReal({ concluidos: 0, falhos: 0, trabalhosComFalha: 0 }), null);
  assert.equal(taxaFalhaReal({ concluidos: 8, falhos: 2, trabalhosComFalha: 1 }), 0.1);
  assert.equal(taxaFalhaReal({ concluidos: 0, falhos: 1, trabalhosComFalha: 5 }), 1, "limitada a 100%");
});
await teste("desperdício: falha com baixou_estoque=false NÃO soma ao adicional (já está no consumo do concluído)", () => {
  const f = (baixou_estoque: boolean, peso: number, custo: number) => ({
    baixou_estoque, peso_perdido_g: peso, custo_material: custo, horas_perdidas: 1, custo_maquina_estimado: 2,
  });
  const r = resumirDesperdicio([f(true, 100, 10), f(false, 50, 5), f(true, 20, 2)]);
  assert.equal(r.adicionalG, 120);
  assert.equal(r.adicionalCusto, 12);
  assert.equal(r.jaContidoG, 50);
  assert.equal(r.jaContidoCusto, 5);
  assert.equal(r.horasPerdidas, 3);
  assert.equal(r.custoMaquina, 6);
  assert.equal(resumirDesperdicio([]).adicionalCusto, 0);
  const tela = lerFonte("components/impressao-3d/qualidade-board.tsx");
  assert.ok(tela.includes("não soma") && tela.includes("duas vezes"), "a tela explica a regra");
});
await teste("indicadores por impressora/material/produto: concluídos, falhos, falhas e taxa vêm dos dados", () => {
  const trabalhos = [
    { id: "1", status: "concluida" as const, impressora_id: "A", material_id: "m", produto_id: "p" },
    { id: "2", status: "concluida" as const, impressora_id: "A", material_id: "m", produto_id: "p" },
    { id: "3", status: "falhou" as const, impressora_id: "A", material_id: "m", produto_id: null },
    { id: "4", status: "concluida" as const, impressora_id: "B", material_id: "m", produto_id: "p" },
    { id: "5", status: "fila" as const, impressora_id: "B", material_id: "m", produto_id: "p" },
  ];
  const falhas = [
    { producao_id: "3", tipo_defeito: "warping", impressora_id: "A", material_id: "m", produto_id: null, peso_perdido_g: 30, horas_perdidas: 1 },
    { producao_id: "1", tipo_defeito: "stringing", impressora_id: "A", material_id: "m", produto_id: "p", peso_perdido_g: 5, horas_perdidas: 0.5 },
    { producao_id: "1", tipo_defeito: "cor", impressora_id: null, material_id: "m", produto_id: "p", peso_perdido_g: 5, horas_perdidas: 0 },
  ];
  const porImp = agruparIndicadores(trabalhos, falhas, "impressora_id");
  const a = porImp.find((g) => g.chave === "A")!;
  assert.deepEqual([a.concluidos, a.falhos, a.falhas, a.trabalhosComFalha], [2, 1, 3, 2]);
  assert.equal(taxaFalhaReal(a), 2 / 3);
  const b = porImp.find((g) => g.chave === "B")!;
  assert.deepEqual([b.concluidos, b.falhos, b.falhas], [1, 0, 0], "trabalho na fila não entra");
  assert.equal(taxaFalhaReal(b), 0);
  const porDef = agruparPorDefeito(falhas);
  assert.equal(porDef.length, 3);
  assert.equal(porDef[0].falhas, 1);
});
await teste("produtividade por impressora vem de trabalhos concluídos/falhos e horas medidas; sem horas = sem taxa", () => {
  const m = produtividadePorImpressora([
    { status: "concluida", impressora_id: "A", horas_reais: 2, peso_real_g: 100 },
    { status: "concluida", impressora_id: "A", horas_reais: 2, peso_real_g: 50 },
    { status: "falhou", impressora_id: "A", horas_reais: null, peso_real_g: null },
    { status: "fila", impressora_id: "A", horas_reais: 99, peso_real_g: 99 },
    { status: "concluida", impressora_id: "B", horas_reais: null, peso_real_g: null },
    { status: "concluida", impressora_id: null, horas_reais: 1, peso_real_g: 1 },
  ]);
  const a = m.get("A")!;
  assert.deepEqual([a.concluidos, a.falhos, a.horasReais, a.pesoRealG, a.trabalhosPorHora], [2, 1, 4, 150, 0.5]);
  assert.equal(m.get("B")!.trabalhosPorHora, null);
  assert.equal(m.size, 2);
});
await teste("retornos das RPCs são lidos com defesa (jsonb não confiável) e geram os avisos certos", () => {
  const c = lerConclusao({ saldo: -5, estoque_negativo: true, abaixo_do_minimo: true, manutencao_devida: true });
  const avisos = avisosConclusao(c, (n) => String(n));
  assert.ok(avisos.some((a) => /NEGATIVO/.test(a)) && avisos.some((a) => /manutenção/.test(a)));
  assert.ok(!avisos.some((a) => /Saldo do material/.test(a)), "saldo negativo não é anunciado como saldo normal");
  assert.deepEqual(avisosConclusao(lerConclusao({ saldo: 900 }), (n) => `${n} g`), ["Saldo do material após a baixa: 900 g."]);
  assert.deepEqual(lerConclusao(null), { saldo: null, estoque_negativo: false, abaixo_do_minimo: false, manutencao_devida: false });
  assert.deepEqual(lerInicio({ impressora: "Ender", aviso: " Estoque baixo " }), { impressora: "Ender", aviso: "Estoque baixo" });
  assert.deepEqual(lerInicio("lixo"), { impressora: null, aviso: null });
  const f = lerFalha({ falha_id: "x", reimpressao_id: "y", baixou_estoque: false, custo_material: "3", estoque_negativo: false });
  assert.deepEqual([f.baixou_estoque, f.custo_material, f.reimpressao_id], [false, 3, "y"]);
  assert.equal(lerPagamento({ status_pagamento: "parcial", saldo: "10", pago_valor: 5 }).status_pagamento, "parcial");
  assert.equal(lerPagamento({}).status_pagamento, "pendente");
  assert.equal(lerRecebimento({ itens_recebidos: 2, total: 99.5, conta_pagar_id: null }).total, 99.5);
});

console.log("\nImpressão 3D (Etapa B) — validação dos formulários");
await teste("pedido: exige cliente cadastrado OU avulso; prioridade válida; valores não negativos", () => {
  const base = { prioridade: "normal", cliente_avulso: "Maria", desconto_valor: "", frete_valor: "12,50" };
  const r = PedidoSchema.safeParse(base);
  assert.ok(r.success);
  if (r.success) assert.deepEqual([r.data.frete_valor, r.data.desconto_valor, r.data.cliente_id], [12.5, 0, null]);
  assert.ok(!PedidoSchema.safeParse({ ...base, cliente_avulso: "" }).success, "sem cliente nenhum");
  assert.ok(PedidoSchema.safeParse({ ...base, cliente_avulso: "", cliente_id: "11111111-1111-4111-8111-111111111111" }).success);
  assert.ok(!PedidoSchema.safeParse({ ...base, prioridade: "critica" }).success);
  assert.ok(!PedidoSchema.safeParse({ ...base, desconto_valor: "-1" }).success);
  assert.ok(PedidoLimitadoSchema.safeParse({ prioridade: "alta", prazo_entrega: "2026-12-01" }).success);
});
await teste("schemas nunca deixam passar campo protegido (status, total, horas_reais...), mesmo se o formulário forjar", () => {
  const forjado = {
    status: "pago", total: "1", numero: "9", pago_valor: "1", subtotal: "1", custo_total: "1", lucro_total: "1",
    horas_reais: "1", peso_real_g: "1", qualidade: "aprovada", postado_em: "2026-01-01", recebedor: "x",
    recebida_em: "2026-01-01", conta_pagar_id: "x",
  };
  const u = "11111111-1111-4111-8111-111111111111";
  const saidas: Record<string, unknown>[] = [
    PedidoSchema.parse({ ...forjado, prioridade: "normal", cliente_avulso: "A" }),
    CompraSchema.parse({ ...forjado, fornecedor_id: u }),
    TrabalhoSchema.parse({ ...forjado, descricao: "Peça", quantidade: "1", prioridade: "normal" }),
    EnvioSchema.parse({ ...forjado, pedido_id: u, volumes: "1" }),
    PedidoItemSchema.parse({ ...forjado, descricao: "x", quantidade: "1", preco_unitario: "1", preco_total: "99", lucro: "99" }),
    CompraItemSchema.parse({ ...forjado, material_id: u, quantidade: "1", preco_total: "1", preco_unitario: "99" }),
  ];
  for (const saida of saidas) for (const campo of Object.keys(forjado)) assert.ok(!(campo in saida), campo);
  assert.ok(!("preco_total" in saidas[4]) && !("lucro" in saidas[4]), "preço total e lucro do item são calculados pelo banco");
  assert.ok(!("preco_unitario" in saidas[5]), "preço unitário da compra é gerado pelo banco");
});
await teste("item de compra: quantidade > 0 (unidade base) e valor pago ≥ 0; recebimento exige vencimento se gerar conta", () => {
  const u = "11111111-1111-4111-8111-111111111111";
  assert.ok(CompraItemSchema.safeParse({ material_id: u, quantidade: "3000", preco_total: "360,00" }).success);
  assert.ok(!CompraItemSchema.safeParse({ material_id: u, quantidade: "0", preco_total: "10" }).success);
  assert.ok(!CompraItemSchema.safeParse({ material_id: u, quantidade: "10", preco_total: "-1" }).success);
  assert.ok(!CompraItemSchema.safeParse({ material_id: "", quantidade: "10", preco_total: "1" }).success);
  assert.ok(RecebimentoSchema.safeParse({}).success);
  assert.ok(!RecebimentoSchema.safeParse({ gerar_conta_pagar: "on" }).success, "sem vencimento");
  assert.ok(RecebimentoSchema.safeParse({ gerar_conta_pagar: "on", vencimento: "2026-12-10" }).success);
});
await teste("item de pedido: quantidade inteira > 0, preço ≥ 0, custo opcional; produção: quantidade e prioridade", () => {
  const ok = { descricao: "Suporte", quantidade: "2", preco_unitario: "19,90", custo_unitario: "" };
  const r = PedidoItemSchema.safeParse(ok);
  assert.ok(r.success);
  if (r.success) assert.deepEqual([r.data.preco_unitario, r.data.custo_unitario], [19.9, null]);
  assert.ok(!PedidoItemSchema.safeParse({ ...ok, quantidade: "1,5" }).success);
  assert.ok(!PedidoItemSchema.safeParse({ ...ok, quantidade: "0" }).success);
  assert.ok(!PedidoItemSchema.safeParse({ ...ok, descricao: " " }).success);
  assert.ok(TrabalhoSchema.safeParse({ descricao: "Lote", quantidade: "10", prioridade: "urgente" }).success);
  assert.ok(!TrabalhoSchema.safeParse({ descricao: "Lote", quantidade: "0", prioridade: "normal" }).success);
  assert.ok(!TrabalhoSchema.safeParse({ descricao: "Lote", quantidade: "1", prioridade: "x" }).success);
});
await teste("conclusão e falha: pesos/horas ≥ 0 obrigatórios; tipo de defeito do contrato; quantidade afetada inteira > 0", () => {
  assert.ok(ConclusaoSchema.safeParse({ peso_real_g: "152,3", horas_reais: "4,5" }).success);
  assert.ok(!ConclusaoSchema.safeParse({ peso_real_g: "", horas_reais: "4" }).success);
  assert.ok(!ConclusaoSchema.safeParse({ peso_real_g: "10", horas_reais: "-1" }).success);
  assert.equal(TIPOS_DEFEITO.length, 14);
  const base = { tipo_defeito: "warping", peso_perdido_g: "20", horas_perdidas: "1", quantidade_afetada: "" };
  const r = FalhaSchema.safeParse(base);
  assert.ok(r.success);
  if (r.success) assert.deepEqual([r.data.quantidade_afetada, r.data.reimprimir], [null, false]);
  assert.ok(!FalhaSchema.safeParse({ ...base, tipo_defeito: "outro_tipo" }).success);
  assert.ok(!FalhaSchema.safeParse({ ...base, quantidade_afetada: "1,5" }).success);
  assert.ok(!FalhaSchema.safeParse({ ...base, quantidade_afetada: "0" }).success);
  assert.ok(FalhaSchema.safeParse({ ...base, quantidade_afetada: "2", reimprimir: "on" }).success);
});
await teste("inspeção: reprovado exige ≥ 1 defeito; aprovado não; defeitos só do contrato", () => {
  assert.ok(InspecaoSchema.safeParse({ resultado: "aprovado", defeitos: [], acao: "manter" }).success);
  assert.ok(!InspecaoSchema.safeParse({ resultado: "reprovado", defeitos: [], acao: "manter" }).success);
  assert.ok(InspecaoSchema.safeParse({ resultado: "reprovado", defeitos: ["warping"], acao: "reimprimir" }).success);
  assert.ok(!InspecaoSchema.safeParse({ resultado: "reprovado", defeitos: ["inventado"], acao: "manter" }).success);
  assert.ok(InspecaoSchema.safeParse({ resultado: "retrabalho", defeitos: [], acao: "manter" }).success);
});
await teste("pagamento: valor > 0, forma e tipo do contrato; envio: link só http(s), volumes ≥ 1", () => {
  assert.ok(PagamentoSchema.safeParse({ tipo: "pagamento", valor: "50,00", forma: "pix" }).success);
  assert.ok(PagamentoSchema.safeParse({ tipo: "estorno", valor: "10", forma: "outro" }).success);
  assert.ok(!PagamentoSchema.safeParse({ tipo: "pagamento", valor: "0", forma: "pix" }).success);
  assert.ok(!PagamentoSchema.safeParse({ tipo: "pagamento", valor: "5", forma: "cheque" }).success);
  const u = "11111111-1111-4111-8111-111111111111";
  assert.ok(EnvioSchema.safeParse({ pedido_id: u, volumes: "1", url_rastreio: "https://rastreio.exemplo/abc" }).success);
  assert.ok(!EnvioSchema.safeParse({ pedido_id: u, volumes: "1", url_rastreio: "javascript:alert(1)" }).success);
  assert.ok(!EnvioSchema.safeParse({ pedido_id: u, volumes: "0" }).success);
  assert.ok(!EnvioSchema.safeParse({ pedido_id: "", volumes: "1" }).success);
  assert.ok(FornecedorSchema.safeParse({ nome: "Filamentos SA", email: "contato@f.com", site: "https://f.com" }).success);
  assert.ok(!FornecedorSchema.safeParse({ nome: "X", email: "sem-arroba" }).success);
  assert.ok(!FornecedorSchema.safeParse({ nome: "X", site: "ftp://x" }).success);
  assert.ok(MaterialSchema.safeParse({ tipo: "filamento", nome: "PLA", unidade: "g", fornecedor_id: u }).success, "material aceita fornecedor");
  assert.ok(!MaterialSchema.safeParse({ tipo: "filamento", nome: "PLA", unidade: "g", fornecedor_id: "abc" }).success);
});
await teste("erros do banco: raise exception (P0001) chega como veio; RPC chega como veio", () => {
  assert.equal(mensagemEscrita({ code: "P0001", message: "Compra recebida não pode ser alterada." }, "padrão"), "Compra recebida não pode ser alterada.");
  assert.equal(mensagemEscrita({ code: "P0001", message: " " }, "padrão"), "padrão");
  assert.equal(mensagemRpc({ message: "Impressora ocupada." }, "padrão"), "Impressora ocupada.");
});

console.log("\nImpressão 3D (Etapa B) — registro, menu e contrato do banco no código");
const P3D_B = ["p3d_fornecedores", "p3d_pedidos", "p3d_producao", "p3d_qualidade", "p3d_expedicao"];
await teste("5 módulos novos registrados com rota, menu no grupo 'Impressão 3D' e nenhuma rota fora de /impressao-3d", () => {
  const esperado: Record<string, string> = {
    p3d_fornecedores: "/impressao-3d/fornecedores", p3d_pedidos: "/impressao-3d/pedidos", p3d_producao: "/impressao-3d/producao",
    p3d_qualidade: "/impressao-3d/qualidade", p3d_expedicao: "/impressao-3d/expedicao",
  };
  for (const chave of P3D_B) {
    const m = MODULOS.find((x) => x.chave === chave)!;
    assert.deepEqual(m.rotas, [esperado[chave]], chave);
    assert.equal(m.menu[0].grupo, "Impressão 3D", chave);
    assert.equal(moduloDaRota(`${esperado[chave]}/qualquer/subrota`), chave);
  }
  assert.equal(moduloDaRota("/impressao-3d/fornecedores/compras/abc"), "p3d_fornecedores");
  assert.equal(moduloDaRota("/impressao-3d/pedidos/abc"), "p3d_pedidos");
  assert.deepEqual(MODULOS.find((m) => m.chave === "p3d_pedidos")!.tabelas, ["p3d_pedidos", "p3d_pedido_itens", "p3d_pedido_pagamentos", "p3d_pedido_historico"]);
});
await teste("matriz de sócios e rótulos têm as 5 chaves novas", () => {
  for (const chave of P3D_B) {
    assert.ok(MODULO_ROTULO[chave], `socios ${chave}`);
    assert.ok(ROTULOS_PADRAO[chave], `rotulos ${chave}`);
  }
  assert.equal(ROTULOS_PADRAO.p3d_pedidos.plural, "Pedidos e vendas");
});
await teste("extra 'custos' de Pedidos: sem ele o servidor não seleciona custo, lucro nem margem (lista, detalhe e snapshot)", () => {
  const lista = lerFonte("app/(dashboard)/impressao-3d/pedidos/page.tsx");
  assert.ok(lista.includes("verCustos ? `${COLUNAS_PEDIDO}, custo_total, lucro_total` : COLUNAS_PEDIDO"));
  const det = lerFonte("app/(dashboard)/impressao-3d/pedidos/[id]/page.tsx");
  assert.ok(det.includes("verCustos ? `${COLUNAS_PEDIDO}, custo_total, lucro_total` : COLUNAS_PEDIDO"));
  assert.ok(det.includes("verCustos ? `${COLUNAS_PEDIDO_ITEM}, custo_unitario, custo_total, lucro` : COLUNAS_PEDIDO_ITEM"));
  assert.ok(det.includes("ocultarCustosDoCalculo(") && det.includes("entradaParaRecalculo("), "snapshot sem custos");
  for (const coluna of ["custo_total", "lucro_total", "custo_unitario", "lucro,", "lucro "]) {
    assert.ok(!COLUNAS_PEDIDO.includes(coluna) && !COLUNAS_PEDIDO_ITEM.includes(coluna), `coluna base não pode ter ${coluna}`);
  }
  const acoes = lerFonte("app/(dashboard)/impressao-3d/pedidos/actions.ts");
  assert.ok(acoes.includes("SEM_PERMISSAO_CUSTOS") && acoes.includes("custo_unitario !== null && !verCustos"), "custo unitário só com o extra");
  const tela = lerFonte("components/impressao-3d/pedido-detalhe.tsx");
  assert.ok(tela.includes("verCustos &&"), "a tela esconde custo/lucro/margem sem o extra");
});
await teste("toda action da Etapa B passa por getAcessoEdicao do módulo certo e filtra por workspace_id", () => {
  const arquivos: [string, string][] = [
    ["app/(dashboard)/impressao-3d/fornecedores/actions.ts", "p3d_fornecedores"],
    ["app/(dashboard)/impressao-3d/pedidos/actions.ts", "p3d_pedidos"],
    ["app/(dashboard)/impressao-3d/producao/actions.ts", "p3d_producao"],
    ["app/(dashboard)/impressao-3d/qualidade/actions.ts", "p3d_qualidade"],
    ["app/(dashboard)/impressao-3d/expedicao/actions.ts", "p3d_expedicao"],
  ];
  for (const [arq, modulo] of arquivos) {
    const texto = lerFonte(arq);
    assert.ok(texto.includes(`const MODULO = "${modulo}"`), arq);
    assert.ok(!/getDonoIdAtivo|getWorkspaceIdAtivo|getAcessoSoDono/.test(texto), `${arq} usa código antigo de dono`);
    for (const parte of texto.split(/\nexport async function /).slice(1)) {
      const nome = parte.slice(0, parte.indexOf("(")).trim();
      assert.ok(parte.includes("getAcessoEdicao("), `${arq} ${nome} sem guarda de edição`);
      if (/\.(insert|update|upsert|delete)\(/.test(parte)) assert.ok(parte.includes("workspace_id"), `${arq} ${nome} sem workspace_id`);
      assert.ok(!/p_ws:\s*["'`]|workspace_id:\s*["'`]/.test(parte), `${arq} ${nome} fixa empresa em texto`);
    }
  }
});
await teste("páginas da Etapa B leem pelo guard e filtram por workspace_id da empresa ativa", () => {
  const paginas: [string, string][] = [
    ["app/(dashboard)/impressao-3d/fornecedores/page.tsx", "p3d_fornecedores"],
    ["app/(dashboard)/impressao-3d/fornecedores/compras/[id]/page.tsx", "p3d_fornecedores"],
    ["app/(dashboard)/impressao-3d/pedidos/page.tsx", "p3d_pedidos"],
    ["app/(dashboard)/impressao-3d/pedidos/[id]/page.tsx", "p3d_pedidos"],
    ["app/(dashboard)/impressao-3d/producao/page.tsx", "p3d_producao"],
    ["app/(dashboard)/impressao-3d/qualidade/page.tsx", "p3d_qualidade"],
    ["app/(dashboard)/impressao-3d/expedicao/page.tsx", "p3d_expedicao"],
  ];
  for (const [arq, modulo] of paginas) {
    const t = lerFonte(arq);
    assert.ok(t.includes(`getAcessoModulo("${modulo}")`), arq);
    assert.ok(t.includes("workspace_id") || t.includes("acesso.workspaceId"), arq);
    assert.ok(!/getDonoIdAtivo|getWorkspaceIdAtivo/.test(t), `${arq} usa o código antigo de dono`);
  }
  const opcoes = lerFonte("lib/impressao-3d/opcoes.ts");
  for (const chave of ["p3d_fornecedores", "p3d_produtos", "p3d_pedidos"]) assert.ok(opcoes.includes(`getAcessoModulo("${chave}")`), chave);
});
await teste("tabelas somente leitura e campos protegidos: nenhum insert/update direto na Etapa B", () => {
  const todos = ["fornecedores", "pedidos", "producao", "qualidade", "expedicao"].map((p) => lerFonte(`app/(dashboard)/impressao-3d/${p}/actions.ts`)).join("\n");
  for (const tabela of ["p3d_pedido_pagamentos", "p3d_pedido_historico", "p3d_inspecoes", "p3d_falhas"])
    assert.ok(!new RegExp(`\\.from\\("${tabela}"\\)\\s*\\.(insert|update|upsert|delete)`).test(todos), `${tabela} é somente leitura`);
  const direto = (tabela: string) => {
    const trechos: string[] = [];
    const re = new RegExp(`\\.from\\("${tabela}"\\)\\s*\\.(insert|update|upsert)\\(`, "g");
    for (let m = re.exec(todos); m; m = re.exec(todos)) {
      let i = m.index + m[0].length, nivel = 1;
      const ini = i;
      while (i < todos.length && nivel > 0) { if (todos[i] === "(") nivel++; else if (todos[i] === ")") nivel--; i++; }
      trechos.push(todos.slice(ini, i - 1));
    }
    return trechos;
  };
  const PROTEGIDOS: Record<string, string[]> = {
    p3d_compras: ["status", "numero", "subtotal", "total", "recebida_em", "conta_pagar_id"],
    p3d_pedidos: ["status", "status_pagamento", "numero", "origem", "orcamento_id", "subtotal", "total", "custo_total", "lucro_total", "pago_valor", "cancelado_em", "cancelado_motivo"],
    p3d_producao: ["status", "numero", "horas_reais", "peso_real_g", "qualidade", "iniciado_em", "concluido_em", "consumo_registrado_em", "reimpressao_de"],
    p3d_envios: ["status", "postado_em", "entregue_em", "recebedor"],
    p3d_pedido_itens: ["preco_total", "custo_total", "lucro"],
    p3d_compra_itens: ["preco_unitario"],
  };
  for (const [tabela, campos] of Object.entries(PROTEGIDOS)) {
    const trechos = direto(tabela);
    assert.ok(trechos.length >= 1, `${tabela} tem escrita direta no código`);
    for (const t of trechos) for (const c of campos) assert.ok(!new RegExp(`\\b${c}\\b`).test(t), `${tabela}.${c}`);
  }
});
await teste("tudo que muda status/saldo/estoque vai por RPC com o nome do contrato", () => {
  const f = lerFonte("app/(dashboard)/impressao-3d/fornecedores/actions.ts");
  for (const rpc of ["p3d_mudar_status_compra", "p3d_receber_compra"]) assert.ok(f.includes(`.rpc("${rpc}"`), rpc);
  const p = lerFonte("app/(dashboard)/impressao-3d/pedidos/actions.ts");
  for (const rpc of ["p3d_mudar_status_pedido", "p3d_registrar_pagamento", "p3d_gerar_producao_do_pedido"]) assert.ok(p.includes(`.rpc("${rpc}"`), rpc);
  const o = lerFonte("app/(dashboard)/impressao-3d/orcamentos/actions.ts");
  assert.ok(o.includes('.rpc("p3d_criar_pedido_de_orcamento"'));
  const pr = lerFonte("app/(dashboard)/impressao-3d/producao/actions.ts");
  for (const rpc of ["p3d_iniciar_producao", "p3d_concluir_producao", "p3d_cancelar_producao", "p3d_registrar_falha"]) assert.ok(pr.includes(`.rpc("${rpc}"`), rpc);
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/qualidade/actions.ts").includes('.rpc("p3d_registrar_inspecao"'));
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/expedicao/actions.ts").includes('.rpc("p3d_mudar_status_envio"'));
  for (const texto of [f, p, o, pr]) assert.ok(/mensagemRpc\(error/.test(texto), "erro da RPC mostrado como veio");
  // O app nunca chama as RPCs internas de apoio.
  const tudo = [f, p, o, pr].join("\n");
  for (const interna of ["p3d_estoque_aplicar", "p3d_pedido_set_status", "p3d_recalc_pedido", "p3d_recalc_compra"])
    assert.ok(!tudo.includes(interna), interna);
});
await teste("permissões cruzadas: receber compra (Estoque + Financeiro), converter orçamento (Pedidos), gerar produção (Produção), falha (Produção OU Qualidade), lançar no Financeiro", () => {
  const f = lerFonte("app/(dashboard)/impressao-3d/fornecedores/actions.ts");
  const receber = f.slice(f.indexOf("export async function receberCompra"));
  assert.ok(receber.includes('getAcessoEdicao("p3d_estoque")') && receber.includes('getAcessoEdicao("financeiro")'));
  assert.ok(receber.indexOf("RecebimentoSchema") < receber.indexOf("p3d_receber_compra"), "valida vencimento antes da RPC");
  const o = lerFonte("app/(dashboard)/impressao-3d/orcamentos/actions.ts");
  assert.ok(o.slice(o.indexOf("export async function converterOrcamentoEmPedido")).includes('getAcessoEdicao("p3d_pedidos")'));
  const p = lerFonte("app/(dashboard)/impressao-3d/pedidos/actions.ts");
  assert.ok(p.slice(p.indexOf("export async function gerarProducaoDoPedido")).includes('getAcessoEdicao("p3d_producao")'));
  const pagamento = p.slice(p.indexOf("export async function registrarPagamento"), p.indexOf("export type ResultadoGerarProducao"));
  assert.ok(pagamento.includes('getAcessoEdicao("financeiro")') && pagamento.includes('tipo === "pagamento"'), "estorno nunca vai ao Financeiro");
  assert.ok(pagamento.includes("não é enviado ao Financeiro"), "avisa o usuário sobre o estorno");
  const pr = lerFonte("app/(dashboard)/impressao-3d/producao/actions.ts");
  assert.ok(pr.includes('(await getAcessoEdicao(MODULO)) ?? (await getAcessoEdicao("p3d_qualidade"))'));
  const pagina = lerFonte("app/(dashboard)/impressao-3d/pedidos/[id]/page.tsx");
  assert.ok(pagina.includes('getAcessoEdicao("financeiro")'), "a tela só oferece 'lançar no Financeiro' a quem pode");
});
await teste("orçamento aprovado tem 'Converter em pedido' (só com edição em Pedidos E Orçamentos) e leva ao pedido criado", () => {
  const tela = lerFonte("components/impressao-3d/orcamento-detalhe.tsx");
  assert.ok(tela.includes("Converter em pedido") && tela.includes('orcamento.status === "aprovado"') && tela.includes("podeConverter"));
  assert.ok(tela.includes("/impressao-3d/pedidos/${r.pedidoId}"), "navega até o pedido criado");
  assert.ok(!tela.includes("virá na Etapa B"), "texto antigo removido");
  const pagina = lerFonte("app/(dashboard)/impressao-3d/orcamentos/[id]/page.tsx");
  assert.ok(pagina.includes('podeEditar && !!(await getAcessoEdicao("p3d_pedidos"))'));
});
await teste("material: cadastro tem seletor de fornecedor e mantém o vínculo quando a pessoa não vê Fornecedores", () => {
  const tela = lerFonte("components/impressao-3d/estoque-board.tsx");
  assert.ok(tela.includes('name="fornecedor_id"'));
  assert.ok(tela.includes('type="hidden" name="fornecedor_id"'), "sem acesso, o vínculo atual é preservado");
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/estoque/page.tsx").includes("fornecedor_id"));
  const val = lerFonte("lib/impressao-3d/validacao.ts");
  assert.ok(val.slice(val.indexOf("export const MaterialSchema")).includes("fornecedor_id: uuidOpc()"));
});
await teste("compra: a tela pede quantidade na unidade base e ajuda a converter rolos; receber mostra o rateio de frete/desconto", () => {
  const tela = lerFonte("components/impressao-3d/compra-detalhe.tsx");
  assert.ok(tela.includes("unidade base") && tela.includes("quantidadeBaseDeRolos"));
  assert.ok(tela.includes("rateados entre os itens por valor"));
  const board = lerFonte("components/impressao-3d/fornecedores-board.tsx");
  assert.ok(board.includes("não inclui frete"), "a aba Preços diz que o preço unitário não inclui frete");
  assert.ok(board.includes("p3d_historico_precos") === false, "a tela recebe as linhas prontas do servidor");
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/fornecedores/page.tsx").includes('.from("p3d_historico_precos")'));
});
await teste("expedição: rastreio manual, sem integração com transportadoras/Correios simulada", () => {
  const tela = lerFonte("components/impressao-3d/expedicao-board.tsx");
  assert.ok(tela.includes("manual") && tela.includes("credenciais externas"));
  const codigo = ["components/impressao-3d/expedicao-board.tsx", "app/(dashboard)/impressao-3d/expedicao/actions.ts", "app/(dashboard)/impressao-3d/expedicao/page.tsx"].map(lerFonte).join("\n");
  assert.ok(!/fetch\(|correios\.com|api\.melhorenvio|jadlog\.com/i.test(codigo), "nenhuma chamada externa");
  assert.ok(tela.includes('rel="noopener noreferrer"'));
});
await teste("produção: iniciar mostra o aviso da RPC, concluir mostra os avisos, falha explica a regra de estoque", () => {
  const acoes = lerFonte("app/(dashboard)/impressao-3d/producao/actions.ts");
  assert.ok(acoes.includes("lerInicio(") && acoes.includes("avisosConclusao(") && acoes.includes("lerFalha("));
  assert.ok(acoes.includes("Estoque NÃO foi baixado de novo"));
  const tela = lerFonte("components/impressao-3d/producao-board.tsx");
  assert.ok(tela.includes("ordenarFila(") && tela.includes("setAvisos(r.avisos)"));
  assert.ok(tela.includes("NÃO é baixado de novo") && tela.includes("falha parcial"));
  assert.ok(tela.includes("Impressora disponível"), "só impressoras disponíveis para iniciar");
  const imp = lerFonte("app/(dashboard)/impressao-3d/impressoras/page.tsx");
  assert.ok(imp.includes('.eq("status", "imprimindo")') && imp.includes('getAcessoModulo("p3d_producao")'), "trabalho atual só para quem vê Produção");
});
await teste("Visão Geral: alertas da Etapa B (prazo vencido, urgentes na fila, compras aprovadas, manutenção) só com módulo ligado e só contagens", () => {
  const r = lerFonte("lib/impressao-3d/resumo.ts");
  for (const chave of P3D_B) assert.ok(r.includes(`com("${chave}")`), chave);
  for (const campo of ["prazoVencido", "urgentesNaFila", "comprasAprovadas", "manutencaoVencida"]) assert.ok(r.includes(campo), campo);
  assert.ok(!/preco_|custo|lucro|valor_/.test(r.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "sem valores monetários");
  const home = lerFonte("components/dashboard-home/dashboard-home-board.tsx");
  for (const chave of P3D_B) assert.ok(home.includes(`com("${chave}")`), chave);
  assert.equal(RESUMO_P3D_VAZIO.pedidos.prazoVencido, 0);
  assert.equal(RESUMO_P3D_VAZIO.qualidade, null);
});
await teste("o snapshot das empresas atuais continua sem nenhuma rota do nicho (Mora Lab e vendedores intactos)", () => {
  for (const chave of P3D_B) {
    const m = MODULOS.find((x) => x.chave === chave)!;
    for (const rota of m.rotas) assert.equal(rotaPermitida(rota, ATUAIS), false, rota);
  }
  assert.ok(Object.keys(dourado.rotaPermitida).every((p) => !p.startsWith("/impressao-3d")));
  assert.ok(menuDoDono(ATUAIS).every((g) => g.titulo !== "Impressão 3D"));
});

console.log("\nImpressão 3D (Etapa B, ajuste) — extra custos de Qualidade, leitura de Produção e data em São Paulo");
await teste("hoje é a data de America/Sao_Paulo, não a de UTC (21h–24h de Brasília ainda são o dia anterior em UTC)", () => {
  assert.equal(hojeSaoPaulo(new Date("2026-03-10T02:30:00Z")), "2026-03-09", "23h30 de Brasília");
  assert.equal(hojeSaoPaulo(new Date("2026-03-10T03:00:00Z")), "2026-03-10", "meia-noite de Brasília");
  assert.equal(hojeSaoPaulo(new Date("2026-03-10T14:00:00Z")), "2026-03-10");
  assert.equal(hojeSaoPaulo(new Date("2026-12-31T23:59:00Z")), "2026-12-31");
  assert.equal(hojeSaoPaulo(new Date("2027-01-01T02:59:00Z")), "2026-12-31", "virada do ano");
  assert.match(hojeSaoPaulo(), /^\d{4}-\d{2}-\d{2}$/);
  // O alerta usa a data de São Paulo: às 23h30 de 09/03 o prazo de 09/03 ainda não venceu.
  assert.equal(prazoVencido({ status: "confirmado", prazo_entrega: "2026-03-09" }, hojeSaoPaulo(new Date("2026-03-10T02:30:00Z"))), false);
  assert.equal(prazoVencido({ status: "confirmado", prazo_entrega: "2026-03-09" }, hojeSaoPaulo(new Date("2026-03-10T03:00:00Z"))), true);
});
await teste("nenhum alerta de prazo do nicho usa a data em UTC (todayISO)", () => {
  for (const arq of [
    "lib/impressao-3d/resumo.ts",
    "app/(dashboard)/impressao-3d/pedidos/page.tsx",
    "app/(dashboard)/impressao-3d/pedidos/[id]/page.tsx",
    "app/(dashboard)/impressao-3d/producao/page.tsx",
  ]) {
    const t = lerFonte(arq);
    assert.ok(!t.includes("todayISO"), `${arq} ainda usa todayISO`);
    assert.ok(t.includes("hojeSaoPaulo"), arq);
  }
});
await teste("extra 'custos' de Qualidade: o servidor só seleciona custo_material/custo_maquina_estimado das falhas com o extra", () => {
  assert.ok(!COLUNAS_FALHA.includes("custo_material") && !COLUNAS_FALHA.includes("custo_maquina_estimado"), "coluna base sem custo");
  assert.ok(COLUNAS_FALHA_CUSTOS.includes("custo_material") && COLUNAS_FALHA_CUSTOS.includes("custo_maquina_estimado"));
  const pagina = lerFonte("app/(dashboard)/impressao-3d/qualidade/page.tsx");
  assert.ok(pagina.includes("podeVerCustos(acesso)") && pagina.includes("verCustos ? COLUNAS_FALHA_CUSTOS : COLUNAS_FALHA"));
  assert.ok(!/select\("[^"]*custo_/.test(pagina), "nenhum select literal com custo");
  const tela = lerFonte("components/impressao-3d/qualidade-board.tsx");
  // Todo valor em R$ da tela está atrás de verCustos.
  const semGuarda = tela.split("\n").filter((l) => /formatMoeda\(/.test(l) && !/verCustos/.test(l));
  assert.deepEqual(semGuarda, [], "formatMoeda fora de verCustos na tela de Qualidade");
  assert.ok(tela.includes("verCustos &&") && tela.includes("Ver custos das falhas"));
  // Quem tem o extra, e o fundador, veem; sem o extra, não.
  const comExtra = guard("p3d_qualidade", "socio", "leitura", { habilitados: P3D, permiteMembros: [...CATALOGO, ...P3D], permissoes: [perm("p3d_qualidade", "leitura", ["custos"])] });
  const semExtra = guard("p3d_qualidade", "socio", "leitura", { habilitados: P3D, permiteMembros: [...CATALOGO, ...P3D], permissoes: [perm("p3d_qualidade", "leitura")] });
  assert.equal(podeVerCustos(comExtra), true);
  assert.equal(podeVerCustos(semExtra), false);
  assert.equal(podeVerCustos(guard("p3d_qualidade", "dono", "leitura", { habilitados: P3D })), true);
});
await teste("o custo da falha também não vaza pela mensagem de Produção sem o extra de Qualidade", () => {
  const acoes = lerFonte("app/(dashboard)/impressao-3d/producao/actions.ts");
  assert.ok(acoes.includes('podeVerCustos(await getAcessoModulo("p3d_qualidade"))'));
  const mensagens = acoes.slice(acoes.indexOf("const verCustos"));
  for (const linha of mensagens.split("\n").filter((l) => /custo_material|custo_maquina_estimado/.test(l)))
    assert.ok(/verCustos/.test(linha), `custo fora de verCustos: ${linha.trim().slice(0, 60)}`);
});
await teste("resumo de desperdício sem as colunas de custo não quebra (soma 0) e continua separando o que já está no consumo", () => {
  const r = resumirDesperdicio([
    { baixou_estoque: true, peso_perdido_g: 10, horas_perdidas: 1 },
    { baixou_estoque: false, peso_perdido_g: 5, horas_perdidas: 0.5 },
  ]);
  assert.deepEqual([r.adicionalG, r.jaContidoG, r.horasPerdidas, r.adicionalCusto, r.custoMaquina], [10, 5, 1.5, 0, 0]);
});
await teste("matriz de sócios: o extra 'Ver custos das falhas' vem do catálogo (modulos.permissoes_extras), sem lista fixa no código", () => {
  assert.deepEqual(
    extrasDoCatalogo([{ nome: "Ver custos das falhas", chave: "custos" }]),
    [{ chave: "custos", rotulo: "Ver custos das falhas" }]
  );
  const socios = lerFonte("lib/socios-shared.ts");
  assert.ok(!socios.includes("Ver custos das falhas"), "o rótulo vem do banco");
  assert.ok(MODULO_ROTULO.p3d_qualidade);
});
await teste("Qualidade lê os trabalhos sem exigir acesso ao módulo Produção (policy própria); não há mais aviso de 'precisa de Produção'", () => {
  const pagina = lerFonte("app/(dashboard)/impressao-3d/qualidade/page.tsx");
  assert.ok(pagina.includes('.from("p3d_producao")') && !pagina.includes('getAcessoModulo("p3d_producao")'), "sem portão de Produção");
  assert.ok(!pagina.includes("acessoProducao"));
  const tela = lerFonte("components/impressao-3d/qualidade-board.tsx");
  assert.ok(!/exige acesso ao módulo Produção|leitura em Produção|Sem acesso a Produção/.test(tela), "aviso removido");
  assert.ok(!tela.includes("trabalhos === null") && !tela.includes("Trabalho[] | null"), "trabalhos nunca é null");
  assert.ok(pagina.includes('["concluida", "falhou"]'));
  // Escrita continua só por RPC: a tela de Qualidade não grava em p3d_producao.
  const acoes = lerFonte("app/(dashboard)/impressao-3d/qualidade/actions.ts");
  assert.ok(!/\.from\("p3d_producao"\)/.test(acoes) && acoes.includes('.rpc("p3d_registrar_inspecao"'));
});

// ===========================================================================
// Nicho Impressão 3D (Etapa C-1) — Dashboard, Relatórios, Notificações, Integrações e Configurações
// ===========================================================================

function listarFontes(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = `${dir}/${nome}`;
    if (statSync(caminho).isDirectory()) return listarFontes(caminho);
    return /\.(ts|tsx)$/.test(nome) && !nome.endsWith("database.types.ts") ? [caminho] : [];
  });
}

console.log("\nImpressão 3D (Etapa C-1) — registro, rotas, menu e rótulos");
const P3D_C = ["p3d_dashboard", "p3d_relatorios", "p3d_automacoes", "p3d_integracoes"];
const ROTA_C: Record<string, string> = {
  p3d_dashboard: "/impressao-3d/dashboard",
  p3d_relatorios: "/impressao-3d/relatorios",
  p3d_automacoes: "/impressao-3d/notificacoes",
  p3d_integracoes: "/impressao-3d/integracoes",
};
await teste("o registro tem as 4 chaves novas, cada uma com rota, menu no grupo 'Impressão 3D' e rótulo", () => {
  for (const chave of P3D_C) {
    const m = MODULOS.find((x) => x.chave === chave);
    assert.ok(m, chave);
    assert.deepEqual(m.rotas, [ROTA_C[chave]], chave);
    assert.equal(m.menu.length, 1, chave);
    assert.equal(m.menu[0].grupo, "Impressão 3D", chave);
    assert.equal(m.menu[0].href, ROTA_C[chave], chave);
    assert.ok(m.tabelas.every((t) => t.startsWith("p3d_")), chave);
    assert.ok(ROTULOS_PADRAO[chave], `rótulo de ${chave}`);
    assert.ok(MODULO_ROTULO[chave], `rótulo de sócios de ${chave}`);
  }
  assert.deepEqual(MODULOS.find((m) => m.chave === "p3d_automacoes")!.tabelas.sort(), ["p3d_config_alertas", "p3d_notificacoes"]);
  assert.deepEqual(MODULOS.find((m) => m.chave === "p3d_integracoes")!.tabelas, ["p3d_integracoes"]);
  // Dashboard e Relatórios leem por RPC: sem tabela própria no registro.
  assert.deepEqual(MODULOS.find((m) => m.chave === "p3d_dashboard")!.tabelas, []);
  assert.deepEqual(MODULOS.find((m) => m.chave === "p3d_relatorios")!.tabelas, []);
  const icones = lerFonte("components/modulos/icones.ts");
  for (const chave of P3D_C) {
    const nome = MODULOS.find((m) => m.chave === chave)!.icone;
    assert.ok(icones.includes(nome.includes("-") ? `"${nome}":` : `${nome}:`), `ícone ${nome} sem mapeamento`);
  }
});
await teste("moduloDaRota reconhece as rotas novas (inclusive /notificacoes/alertas) e módulo desligado é negado", () => {
  for (const [chave, rota] of Object.entries(ROTA_C)) {
    assert.equal(moduloDaRota(rota), chave, rota);
    assert.equal(moduloDaRota(`${rota}/x`), chave, `${rota}/x`);
    assert.equal(vaiPara(decide(rota, ok("dono"), ATUAIS)), "/leads", `desligado ${rota}`);
    assert.equal(vaiPara(decide(rota, ok("cofundador"), [...ATUAIS, chave])), "seguir", `ligado ${rota}`);
  }
  assert.equal(moduloDaRota("/impressao-3d/notificacoes/alertas"), "p3d_automacoes");
  assert.equal(vaiPara(decide("/impressao-3d/notificacoes/alertas", ok("dono"), [...ATUAIS, "p3d_dashboard"])), "/leads", "Dashboard não abre Alertas");
  assert.equal(moduloDaRota("/impressao-3d/dashboard-antigo"), null);
});
await teste("menu do dono: os 4 itens entram no grupo 'Impressão 3D' só quando o módulo está ligado", () => {
  const grupo = menuDoDono([...ATUAIS, ...P3D, ...P3D_C]).find((g) => g.titulo === "Impressão 3D");
  assert.deepEqual(grupo?.itens.map((i) => i.href), [...P3D, ...P3D_C].map((c) => ROTA_P3D[c] ?? ROTA_C[c]));
  assert.deepEqual(menuDoDono(["p3d_integracoes"])[0].itens.map((i) => i.href), ["/impressao-3d/integracoes"]);
  assert.ok(menuDoDono(ATUAIS).every((g) => g.titulo !== "Impressão 3D"));
});
await teste("sócio/funcionário: módulos novos = ligados ∩ permissão ∩ permite_membros; vendedor nunca abre", () => {
  const catalogo = [...CATALOGO, ...P3D, ...P3D_C];
  const ligados = [...ATUAIS, ...P3D_C];
  for (const papel of ["socio", "funcionario"] as const) {
    for (const [chave, rota] of Object.entries(ROTA_C)) {
      assert.equal(vaiPara(decide(rota, ok(papel), ligados, false, [chave], catalogo)), "seguir", `${papel} ${chave}`);
      assert.equal(vaiPara(decide(rota, ok(papel), ligados, false, [], catalogo)), AGUARDANDO_LIBERACAO, `${papel} sem permissão ${chave}`);
      assert.equal(vaiPara(decide(rota, ok(papel), ligados, false, [chave], CATALOGO)), AGUARDANDO_LIBERACAO, `${papel} catálogo ${chave}`);
    }
  }
  for (const rota of Object.values(ROTA_C)) assert.equal(vaiPara(decide(rota, ok("comercial"), ligados)), VENDEDOR_HOME, rota);
  assert.deepEqual(modulosOferecidos(ligados, catalogo).filter((m) => P3D_C.includes(m)), P3D_C);
});
await teste("extra 'custos' de Dashboard e Relatórios vem do catálogo (sem rótulo fixo no código); fundador sempre tem", () => {
  assert.deepEqual(extrasDoCatalogo([{ nome: "Ver custos e lucro", chave: "custos" }]), [{ chave: "custos", rotulo: "Ver custos e lucro" }]);
  const socios = lerFonte("lib/socios-shared.ts");
  assert.ok(!socios.includes("Ver custos e lucro"));
  for (const m of ["p3d_dashboard", "p3d_relatorios"]) {
    const habilitados = [...P3D_C];
    const catalogo = [...CATALOGO, ...P3D_C];
    const com = guard(m, "socio", "leitura", { habilitados, permiteMembros: catalogo, permissoes: [perm(m, "leitura", ["custos"])] });
    const sem = guard(m, "socio", "leitura", { habilitados, permiteMembros: catalogo, permissoes: [perm(m, "leitura")] });
    assert.equal(podeVerCustos(com), true, m);
    assert.equal(podeVerCustos(sem), false, m);
    assert.equal(podeVerCustos(guard(m, "dono", "leitura", { habilitados })), true, m);
    assert.equal(podeVerCustos(guard(m, "cofundador", "leitura", { habilitados })), true, m);
  }
});
await teste("Mora Lab e vendedores intactos: nenhuma rota nova no snapshot das empresas atuais", () => {
  for (const chave of P3D_C) {
    const m = MODULOS.find((x) => x.chave === chave)!;
    for (const rota of m.rotas) assert.equal(rotaPermitida(rota, ATUAIS), false, rota);
  }
  assert.ok(Object.keys(dourado.rotaPermitida).every((p) => !p.startsWith("/impressao-3d")));
  assert.deepEqual(JSON.parse(JSON.stringify(menuDoDono(ATUAIS))), dourado.menu);
  assert.equal(primeiraRotaHabilitada(ATUAIS), dourado.primeiraRota);
  assert.equal(configDoSino(ATUAIS, true, []), null, "empresa atual não ganha o sino");
});

console.log("\nImpressão 3D (C-1) — período, painel e relatórios");
await teste("período padrão = mês corrente em São Paulo (1º dia até hoje), inclusive na virada de UTC", () => {
  assert.deepEqual(periodoPadrao("2026-10-29"), { de: "2026-10-01", ate: "2026-10-29" });
  // 23h30 de 31/10 em Brasília já é 01/11 em UTC: o período continua em outubro.
  const hoje = hojeSaoPaulo(new Date("2026-11-01T02:30:00Z"));
  assert.equal(hoje, "2026-10-31");
  assert.deepEqual(periodoPadrao(hoje), { de: "2026-10-01", ate: "2026-10-31" });
  assert.deepEqual(resolverPeriodo(null, null, "2026-10-29"), { periodo: { de: "2026-10-01", ate: "2026-10-29" }, padrao: true, erro: null });
  assert.deepEqual(resolverPeriodo("", undefined, "2026-10-29").periodo, { de: "2026-10-01", ate: "2026-10-29" });
});
await teste("período: valida datas reais, ordem e o máximo de 366 dias; inválido volta ao padrão com a mensagem", () => {
  assert.equal(validarPeriodo("2026-01-01", "2026-12-31"), null);
  assert.equal(validarPeriodo("2026-01-01", "2027-01-01"), null, "366 dias corridos (inclusive)");
  assert.equal(validarPeriodo("2026-01-01", "2027-01-02"), `O período pode ter no máximo ${PERIODO_MAXIMO_DIAS} dias.`);
  assert.equal(validarPeriodo("2024-01-01", "2024-12-31"), null, "2024 é bissexto: 366 dias");
  assert.ok(validarPeriodo("2024-01-01", "2025-01-01"));
  assert.ok(validarPeriodo("2026-02-30", "2026-03-01"), "30/02 não existe");
  assert.ok(validarPeriodo("2026-03-10", "2026-03-09"));
  assert.ok(validarPeriodo("2026-03-10", null));
  assert.ok(validarPeriodo("abc", "2026-03-09"));
  assert.ok(validarPeriodo("2026-3-1", "2026-03-09"));
  const r = resolverPeriodo("2026-03-10", "2026-03-09", "2026-10-29");
  assert.equal(r.padrao, true);
  assert.ok(r.erro);
  assert.deepEqual(r.periodo, { de: "2026-10-01", ate: "2026-10-29" });
  const so1 = resolverPeriodo("2026-03-10", null, "2026-10-29");
  assert.ok(so1.erro && so1.padrao);
  const ok2 = resolverPeriodo("2026-03-01", "2026-03-31", "2026-10-29");
  assert.deepEqual(ok2, { periodo: { de: "2026-03-01", ate: "2026-03-31" }, padrao: false, erro: null });
});
await teste("atalhos de período: datas reais, de ≤ ate, no máximo 366 dias, a partir de hoje em São Paulo", () => {
  for (const hoje of ["2026-10-29", "2026-01-01", "2024-03-31", "2026-12-31"]) {
    const atalhos = atalhosPeriodo(hoje);
    assert.deepEqual(atalhos.map((a) => a.id), ["mes", "mes-anterior", "30d", "90d", "ano"]);
    for (const a of atalhos) assert.equal(validarPeriodo(a.de, a.ate), null, `${hoje} ${a.id}`);
  }
  const a = Object.fromEntries(atalhosPeriodo("2026-03-15").map((x) => [x.id, x]));
  assert.deepEqual([a["mes"].de, a["mes"].ate], ["2026-03-01", "2026-03-15"]);
  assert.deepEqual([a["mes-anterior"].de, a["mes-anterior"].ate], ["2026-02-01", "2026-02-28"]);
  assert.deepEqual([a["30d"].de, a["30d"].ate], ["2026-02-14", "2026-03-15"]);
  assert.deepEqual([a["ano"].de, a["ano"].ate], ["2026-01-01", "2026-03-15"]);
  assert.deepEqual(atalhosPeriodo("2026-01-10").find((x) => x.id === "mes-anterior"), { id: "mes-anterior", rotulo: "Mês anterior", de: "2025-12-01", ate: "2025-12-31" });
});
await teste("aritmética de datas: dias, mês bissexto e formatação sem passar por UTC", () => {
  assert.equal(adicionarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(adicionarDias("2024-03-01", -1), "2024-02-29");
  assert.equal(adicionarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(diasEntre("2026-01-01", "2026-01-31"), 30);
  assert.equal(ultimoDiaDoMes("2024-02-10"), "2024-02-29");
  assert.equal(primeiroDiaDoMes("2026-10-29"), "2026-10-01");
  assert.equal(formatDataIso("2026-03-09"), "09/03/2026");
  assert.equal(dataIsoValida("2026-02-29"), false);
  assert.equal(dataIsoValida("2024-02-29"), true);
});

const PAINEL_BRUTO = {
  periodo: { de: "2026-10-01", ate: "2026-10-29", hoje: "2026-10-29" },
  vendas: {
    faturamento: 1520.5, pedidos: 8, ticket_medio: 190.06, recebido_no_periodo: 900, a_receber_total: 2100.25,
    pedidos_por_status: { novo: 2, confirmado: 0, em_producao: 3, entregue: 3 }, pedidos_abertos: 5, pedidos_atrasados: 1,
  },
  resultado: {
    lucro_estimado: 600, custo_estimado: 920.5, margem_estimada: 0.3946, custo_material_real: 300,
    custo_maquina_falhas_estimado: 40, observacao: "Lucro estimado a partir dos custos cadastrados.",
  },
  producao: { na_fila: 4, imprimindo: 2, concluidas_no_periodo: 10, falhas_no_periodo: 1, trabalhos_com_falha: 1, horas_reais: 42.5, taxa_falha_real: 0.0909 },
  alertas: {
    por_severidade: { info: 1, aviso: 2, critico: 0 },
    estoque_baixo: [{ id: "m1", nome: "PLA preto", saldo: 100, minimo: 500, unidade: "g" }],
    manutencao_devida: 1,
  },
  tipo_valores: { lucro: "estimado" },
};
await teste("lerPainel: lê as quatro seções do retorno e descarta contagem zero de status", () => {
  const p = lerPainel(PAINEL_BRUTO, true)!;
  assert.deepEqual(p.periodo, { de: "2026-10-01", ate: "2026-10-29", hoje: "2026-10-29" });
  assert.equal(p.vendas!.faturamento, 1520.5);
  assert.equal(p.vendas!.pedidos_atrasados, 1);
  assert.deepEqual(p.vendas!.pedidos_por_status, [
    { status: "novo", quantidade: 2 }, { status: "em_producao", quantidade: 3 }, { status: "entregue", quantidade: 3 },
  ]);
  assert.equal(p.resultado!.lucro_estimado, 600);
  assert.equal(p.resultado!.margem_estimada, 0.3946);
  assert.equal(p.producao!.taxa_falha_real, 0.0909);
  assert.equal(p.alertas!.estoque_baixo[0].nome, "PLA preto");
  assert.equal(p.alertas!.por_severidade.aviso, 2);
});
await teste("lerPainel sem o extra 'custos': resultado some mesmo que o banco o mande (nada de custo, lucro ou margem)", () => {
  const p = lerPainel(PAINEL_BRUTO, false)!;
  assert.equal(p.resultado, null);
  assert.ok(!JSON.stringify(p).match(/lucro|margem|custo/), "nenhum campo de custo no objeto lido");
  assert.equal(p.vendas!.faturamento, 1520.5, "vendas continuam");
  // O banco já devolve resultado nulo sem o extra: também não quebra.
  assert.equal(lerPainel({ ...PAINEL_BRUTO, resultado: null }, true)!.resultado, null);
});
await teste("lerPainel é defensivo: lixo, seções ausentes, números como texto e taxa nula (nunca vira zero inventado)", () => {
  assert.equal(lerPainel(null, true), null);
  assert.equal(lerPainel("x", true), null);
  assert.equal(lerPainel([], true), null);
  const vazio = lerPainel({}, true)!;
  assert.deepEqual([vazio.vendas, vazio.resultado, vazio.producao, vazio.alertas, vazio.periodo], [null, null, null, null, null]);
  const txt = lerPainel({ vendas: { faturamento: "10.5", pedidos: "abc" }, producao: { taxa_falha_real: null, horas_reais: "2" } }, true)!;
  assert.equal(txt.vendas!.faturamento, 10.5);
  assert.equal(txt.vendas!.pedidos, 0);
  assert.equal(txt.producao!.taxa_falha_real, null);
  assert.equal(txt.producao!.horas_reais, 2);
  assert.equal(lerPainel({ resultado: { margem_estimada: null } }, true)!.resultado!.margem_estimada, null);
  assert.equal(lerPainel({ alertas: { estoque_baixo: [{ nome: "sem id" }, null, 3] } }, true)!.alertas!.estoque_baixo.length, 0);
});
await teste("relatórios: leitores normalizam o retorno e cortam lucro/margem/custo sem o extra", () => {
  const vendas = [{ periodo: "2026-10-05", pedidos: 2, faturamento: "300.5", lucro_estimado: 120 }, { periodo: "lixo", pedidos: 1 }, null];
  assert.deepEqual(lerRelatorioVendas(vendas, true), [{ periodo: "2026-10-05", pedidos: 2, faturamento: 300.5, lucro_estimado: 120 }]);
  assert.deepEqual(lerRelatorioVendas(vendas, false), [{ periodo: "2026-10-05", pedidos: 2, faturamento: 300.5, lucro_estimado: null }]);
  const prod = [{ produto_id: "p1", nome: "Suporte", quantidade: 3, faturamento: 90, lucro_estimado: 40, margem_estimada: 0.44 }];
  assert.equal(lerRelatorioProdutos(prod, true)[0].margem_estimada, 0.44);
  const semExtra = lerRelatorioProdutos(prod, false)[0];
  assert.deepEqual([semExtra.lucro_estimado, semExtra.margem_estimada, semExtra.faturamento], [null, null, 90]);
  const prd = [{ impressora_id: "i1", nome: "P1S", status: "disponivel", horas_uso_total: 100, trabalhos_concluidos: 4, trabalhos_falhos: 1, horas_reais: 20, peso_g: 500, trabalhos_com_falha: 1, taxa_falha_real: 0.2, custo_falhas_estimado: 12 }];
  assert.equal(lerRelatorioProdutividade(prd, true)[0].custo_falhas_estimado, 12);
  assert.equal(lerRelatorioProdutividade(prd, false)[0].custo_falhas_estimado, null);
  assert.equal(lerRelatorioProdutividade([{ ...prd[0], taxa_falha_real: null }], true)[0].taxa_falha_real, null, "sem medição = null, não 0");
  for (const f of [lerRelatorioVendas, lerRelatorioProdutos, lerRelatorioProdutividade]) {
    assert.deepEqual(f(null, true), []);
    assert.deepEqual(f({}, true), []);
    assert.deepEqual(f("x", false), []);
  }
});
await teste("relatórios: agrupamento válido, rótulos do período e soma que não inventa zero", () => {
  assert.equal(agrupamentoValido("semana"), "semana");
  assert.equal(agrupamentoValido("ano"), "dia");
  assert.equal(agrupamentoValido(undefined), "dia");
  assert.equal(rotuloPeriodo("2026-10-05", "dia"), "05/10/2026");
  assert.equal(rotuloPeriodo("2026-10-05", "semana"), "Semana de 05/10/2026");
  assert.equal(rotuloPeriodo("2026-10-01", "mes"), "10/2026");
  assert.equal(somaOuNull([null, null]), null);
  assert.equal(somaOuNull([]), null);
  assert.equal(somaOuNull([1.5, null, 2]), 3.5);
});
await teste("CSV: BOM, separador ';', decimal com vírgula, aspas e CRLF; texto que vira fórmula é neutralizado", () => {
  assert.equal(csvCelula(1234.5), "1234,5");
  assert.equal(csvCelula(-3), "-3", "número negativo não é prefixado");
  assert.equal(csvCelula(0.1 + 0.2), "0,3");
  assert.equal(csvCelula(null), "");
  assert.equal(csvCelula(Number.NaN), "");
  assert.equal(csvCelula("Suporte; grande"), '"Suporte; grande"');
  assert.equal(csvCelula('Ele disse "oi"'), '"Ele disse ""oi"""');
  assert.equal(csvCelula("=1+1"), "'=1+1");
  assert.equal(csvCelula("@SOMA(A1)"), "'@SOMA(A1)");
  assert.equal(csvCelula("-cmd"), "'-cmd");
  assert.equal(csvCelula("+55 11"), "'+55 11");
  const csv = gerarCsv<LinhaVendas>(
    [
      { titulo: "Dia", valor: (l) => rotuloPeriodo(l.periodo, "dia") },
      { titulo: "Faturamento (R$)", valor: (l) => l.faturamento },
    ],
    [{ periodo: "2026-10-05", pedidos: 2, faturamento: 300.5, lucro_estimado: null }]
  );
  assert.ok(csv.startsWith("﻿Dia;Faturamento (R$)\r\n"));
  assert.ok(csv.endsWith("05/10/2026;300,5\r\n"));
  assert.equal(nomeArquivoCsv("vendas", { de: "2026-10-01", ate: "2026-10-29" }), "relatorio-vendas-2026-10-01_a_2026-10-29.csv");
});
await teste("o CSV é montado no cliente a partir do retorno e a tela de relatórios só mostra custo atrás de verCustos", () => {
  const tela = lerFonte("components/impressao-3d/relatorios-board.tsx");
  assert.ok(tela.includes("gerarCsv(") && tela.includes("new Blob(") && tela.includes("URL.createObjectURL"));
  assert.ok(!/fetch\(|\/api\//.test(tela), "sem ida ao servidor para exportar");
  for (const t of ["Lucro estimado", "Margem estimada", "Custo das falhas"]) {
    const linhasComTitulo = tela.split("\n").filter((l) => l.includes(t) && /<th|titulo:/.test(l));
    for (const l of linhasComTitulo) assert.ok(/verCustos/.test(l) || /\(l: Linha/.test(l), `coluna sem guarda: ${l.trim().slice(0, 70)}`);
  }
  assert.ok(tela.includes("antes do desconto do pedido"), "aviso do faturamento por item");
  assert.ok(tela.includes("Exportar CSV"));
  const dash = lerFonte("components/impressao-3d/dashboard-board.tsx");
  assert.ok(dash.includes("verCustos && resultado"));
  assert.ok(dash.includes('natureza="estimado"') && dash.includes('natureza="real"'), "rótulos Estimado e Real");
  // Sem gráfico com número inventado: o único gráfico é a BarList alimentada pelo retorno.
  assert.ok(dash.includes("vendas.pedidos_por_status.map"));
});
await teste("Dashboard e Relatórios leem só por RPC (p3d_painel / p3d_relatorio_*), com a empresa do guard e período válido", () => {
  const dash = lerFonte("app/(dashboard)/impressao-3d/dashboard/page.tsx");
  assert.ok(dash.includes('getAcessoModulo("p3d_dashboard")') && dash.includes('.rpc("p3d_painel"'));
  assert.ok(dash.includes("p_ws: acesso.workspaceId") && dash.includes("resolverPeriodo("));
  assert.ok(dash.includes("lerPainel(data, verCustos)") && dash.includes("podeVerCustos(acesso)"));
  const rel = lerFonte("app/(dashboard)/impressao-3d/relatorios/page.tsx");
  assert.ok(rel.includes('getAcessoModulo("p3d_relatorios")'));
  for (const r of ["p3d_relatorio_vendas", "p3d_relatorio_produtos", "p3d_relatorio_produtividade"]) assert.ok(rel.includes(`.rpc("${r}"`), r);
  assert.ok(rel.includes("p_ws: ws") && rel.includes("p_de: periodo.de") && rel.includes("p_ate: periodo.ate"));
  assert.ok(rel.includes("p_agrupar: agrupar") && rel.includes("p_limite: limite"));
  for (const arq of ["dashboard/page.tsx", "relatorios/page.tsx"]) {
    const t = lerFonte(`app/(dashboard)/impressao-3d/${arq}`);
    assert.ok(t.includes("mensagemRpc("), `${arq}: texto exato do erro da RPC`);
    assert.ok(!/\.from\("/.test(t), `${arq}: sem leitura direta de tabela`);
  }
});

console.log("\nImpressão 3D (C-1) — notificações e automações");
await teste("severidade desconhecida vira informação; leitura de notificações é defensiva", () => {
  assert.equal(severidadeValida("critico"), "critico");
  assert.equal(severidadeValida("xyz"), "info");
  assert.equal(severidadeValida(null), "info");
  const l = lerNotificacoes([
    { id: "n1", tipo: "estoque_baixo", severidade: "aviso", titulo: "PLA preto", mensagem: "", referencia_tipo: "material", referencia_id: "m1", lida_em: null, resolvida_em: null, created_at: "2026-10-29T10:00:00Z" },
    { id: "n2", titulo: "sem data" },
    null,
    { id: 5, titulo: "id inválido", created_at: "x" },
  ]);
  assert.equal(l.length, 1);
  assert.equal(l[0].mensagem, null);
  assert.deepEqual(lerNotificacoes("x"), []);
});
const NOTIFS = lerNotificacoes([
  { id: "a", tipo: "x", severidade: "info", titulo: "i1", created_at: "2026-10-01T10:00:00Z" },
  { id: "b", tipo: "x", severidade: "critico", titulo: "c1", created_at: "2026-10-02T10:00:00Z" },
  { id: "c", tipo: "y", severidade: "aviso", titulo: "a1", created_at: "2026-10-03T10:00:00Z" },
  { id: "d", tipo: "y", severidade: "critico", titulo: "c2", created_at: "2026-10-04T10:00:00Z" },
  { id: "e", tipo: "y", severidade: "aviso", titulo: "a0", created_at: "2026-10-01T10:00:00Z", resolvida_em: "2026-10-05T00:00:00Z" },
]);
await teste("sino: agrupa por severidade (crítico, aviso, informação), mais novas primeiro; grupo vazio some; aberta = sem resolvida_em", () => {
  const grupos = agruparPorSeveridade(NOTIFS.filter(estaAberta));
  assert.deepEqual(grupos.map((g) => g.severidade), ["critico", "aviso", "info"]);
  assert.deepEqual(grupos[0].itens.map((n) => n.id), ["d", "b"]);
  assert.deepEqual(agruparPorSeveridade(NOTIFS.filter(estaAberta).filter((n) => n.severidade !== "info")).map((g) => g.severidade), ["critico", "aviso"]);
  assert.deepEqual(agruparPorSeveridade([]), []);
  assert.equal(NOTIFS.filter(estaAberta).length, 4);
  assert.equal(rotuloDoTipo("estoque_baixo"), "Estoque baixo");
  assert.equal(rotuloDoTipo(""), "Outros");
});
await teste("link do item de referência: só com acesso ao módulo, id validado como UUID; sem acesso, só o título", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const todos = ["p3d_estoque", "p3d_pedidos", "p3d_impressoras", "p3d_orcamentos", "p3d_fornecedores", "p3d_qualidade"];
  assert.equal(destinoDaReferencia("pedido", id, todos), `/impressao-3d/pedidos/${id}`);
  assert.equal(destinoDaReferencia("orcamento", id, todos), `/impressao-3d/orcamentos/${id}`);
  assert.equal(destinoDaReferencia("compra", id, todos), `/impressao-3d/fornecedores/compras/${id}`);
  assert.equal(destinoDaReferencia("material", id, todos), "/impressao-3d/estoque");
  assert.equal(destinoDaReferencia("impressora", id, todos), "/impressao-3d/impressoras");
  assert.equal(destinoDaReferencia("falha", id, todos), "/impressao-3d/qualidade");
  assert.equal(destinoDaReferencia("pedido", id, ["p3d_estoque"]), null, "sem acesso a Pedidos");
  assert.equal(destinoDaReferencia("pedido", id, []), null);
  assert.equal(destinoDaReferencia("desconhecido", id, todos), null);
  assert.equal(destinoDaReferencia(null, id, todos), null);
  assert.equal(destinoDaReferencia("pedido", "../../admin", todos), "/impressao-3d/pedidos", "id fora do padrão não vira caminho");
  assert.equal(destinoDaReferencia("pedido", null, todos), "/impressao-3d/pedidos");
  assert.equal(moduloDaReferencia("compra"), "p3d_fornecedores");
  assert.equal(moduloDaReferencia("x"), null);
});
await teste("atualização dos alertas: no máximo 1 por minuto no cliente", () => {
  assert.equal(deveAtualizar(null, 1_000), true, "primeira vez");
  assert.equal(deveAtualizar(1_000, 30_000), false, "29 s depois");
  assert.equal(deveAtualizar(1_000, 60_999), false, "59,9 s depois");
  assert.equal(deveAtualizar(1_000, 61_000), true, "60 s depois");
  assert.equal(deveAtualizar(100_000, 50_000), true, "relógio voltou");
  assert.equal(INTERVALO_ATUALIZACAO_MS, 60_000);
});
await teste("sino: só aparece com Dashboard ou Automações liberados; lista só com Automações; marcar só com edição", () => {
  assert.equal(configDoSino([...ATUAIS], true, []), null);
  assert.equal(configDoSino(["p3d_estoque"], true, []), null, "Estoque sozinho não dá sino");
  const dono = configDoSino([...ATUAIS, ...P3D_C, "p3d_estoque"], true, [])!;
  assert.deepEqual([dono.podeListar, dono.podeMarcar], [true, true]);
  assert.ok(dono.acessiveis.includes("p3d_estoque") && !dono.acessiveis.includes("leads"));
  const soDash = configDoSino(["p3d_dashboard"], false, [perm("p3d_dashboard", "leitura")])!;
  assert.deepEqual([soDash.podeListar, soDash.podeMarcar], [false, false], "só Dashboard: conta, não lista");
  const leitura = configDoSino(["p3d_automacoes"], false, [perm("p3d_automacoes", "leitura")])!;
  assert.deepEqual([leitura.podeListar, leitura.podeMarcar], [true, false]);
  const edicao = configDoSino(["p3d_automacoes"], false, [perm("p3d_automacoes", "edicao")])!;
  assert.deepEqual([edicao.podeListar, edicao.podeMarcar], [true, true]);
});
await teste("atualizarAlertas: Automações OU Dashboard; só Automações lista; o banco decide; sem RPC fora do servidor", () => {
  const sino = lerFonte("app/(dashboard)/impressao-3d/notificacoes/sino.ts");
  assert.ok(sino.includes('getAcessoModulo("p3d_automacoes")') && sino.includes('getAcessoModulo("p3d_dashboard")'));
  assert.ok(sino.includes("automacoes ?? dashboard"), "qualquer um dos dois");
  assert.ok(sino.includes('.rpc("p3d_atualizar_alertas", { p_ws: acesso.workspaceId })'));
  assert.ok(sino.includes("if (!automacoes) return { ok: true, total, itens: null }"), "quem só tem Dashboard não lista");
  assert.ok(sino.includes('.from("p3d_notificacoes")') && sino.includes('.eq("workspace_id", automacoes.workspaceId)') && sino.includes('.is("resolvida_em", null)'));
  assert.ok(!/\.(insert|update|upsert|delete)\(/.test(sino), "notificações são somente leitura");
  assert.ok(sino.includes("mensagemRpc("), "texto exato do erro da RPC");
  const cliente = lerFonte("components/impressao-3d/alertas-cliente.ts");
  assert.ok(cliente.includes("deveAtualizar("), "limite de frequência no cliente");
  assert.ok(!/\.rpc\(/.test(cliente) && !/\.rpc\(/.test(lerFonte("components/impressao-3d/sino-alertas.tsx")), "componentes não chamam RPC");
  for (const t of ["dashboard-board.tsx", "notificacoes-board.tsx"]) assert.ok(lerFonte(`components/impressao-3d/${t}`).includes("<AtualizadorAlertas"), t);
});
await teste("marcar notificação: RPC p3d_marcar_notificacao com edição em Automações; nenhuma escrita direta em p3d_notificacoes no app", () => {
  const acoes = lerFonte("app/(dashboard)/impressao-3d/notificacoes/actions.ts");
  const marcar = acoes.slice(acoes.indexOf("export async function marcarNotificacao"), acoes.indexOf("export async function salvarConfigAlertas"));
  assert.ok(marcar.includes('getAcessoEdicao(MODULO)') && marcar.includes('.rpc("p3d_marcar_notificacao", { p_id: id, p_lida: lida })'));
  assert.ok(marcar.includes("UUID.test(id)"));
  assert.ok(!/from\("p3d_notificacoes"\)/.test(acoes));
  for (const pasta of ["app", "components", "lib"]) {
    for (const arq of listarFontes(pasta)) {
      const t = lerFonte(arq);
      assert.ok(!/\.from\(\s*["'`]p3d_notificacoes["'`]\s*\)\s*\.(insert|update|upsert|delete)\(/.test(t), `${arq} escreve em p3d_notificacoes`);
    }
  }
});
await teste("o app não envia e-mail, WhatsApp nem push nesta etapa (só notificação dentro do app)", () => {
  for (const arq of [
    ...listarFontes("app/(dashboard)/impressao-3d/notificacoes"), ...listarFontes("lib/impressao-3d"), "components/impressao-3d/sino-alertas.tsx",
    "components/impressao-3d/notificacoes-board.tsx",
  ]) {
    const t = lerFonte(arq).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/nodemailer|resend|sendgrid|twilio|graph\.facebook|web-push|Notification\.requestPermission|navigator\.serviceWorker|\bfetch\(/i.test(t), arq);
  }
  assert.ok(lerFonte("components/impressao-3d/notificacoes-board.tsx").includes("não envia e-mail"));
});
await teste("configuração dos alertas: lê as 8 colunas e só aceita os limites do contrato", () => {
  const linha = { estoque_baixo: true, prazo_pedido_dias: 3, manutencao: true, pagamento_pendente_dias: 7, orcamento_validade: false, compra_pendente_dias: 5, falhas_recorrentes_limite: 3, falhas_recorrentes_dias: 30 };
  assert.deepEqual(lerConfigAlertas(linha), linha);
  assert.equal(lerConfigAlertas({ ...linha, prazo_pedido_dias: "3" }), null, "campo ilegível = sem configuração, não padrão inventado");
  assert.equal(lerConfigAlertas(null), null);
  assert.deepEqual(COLUNAS_CONFIG_ALERTAS.split(", ").sort(), Object.keys(linha).sort());
  const base = { estoque_baixo: "on", prazo_pedido_dias: "3", manutencao: "on", pagamento_pendente_dias: "7", compra_pendente_dias: "5", falhas_recorrentes_limite: "3", falhas_recorrentes_dias: "30" };
  const ok1 = ConfigAlertasSchema.safeParse(base);
  assert.equal(ok1.success, true);
  if (ok1.success) assert.deepEqual(ok1.data, { ...linha, orcamento_validade: false }, "desmarcado = false");
  const limites: [string, string, boolean][] = [
    ["prazo_pedido_dias", "0", true], ["prazo_pedido_dias", "30", true], ["prazo_pedido_dias", "31", false], ["prazo_pedido_dias", "-1", false],
    ["pagamento_pendente_dias", "90", true], ["pagamento_pendente_dias", "91", false],
    ["compra_pendente_dias", "60", true], ["compra_pendente_dias", "61", false],
    ["falhas_recorrentes_limite", "1", true], ["falhas_recorrentes_limite", "0", false], ["falhas_recorrentes_limite", "50", true], ["falhas_recorrentes_limite", "51", false],
    ["falhas_recorrentes_dias", "1", true], ["falhas_recorrentes_dias", "0", false], ["falhas_recorrentes_dias", "90", true], ["falhas_recorrentes_dias", "91", false],
    ["prazo_pedido_dias", "2,5", false], ["prazo_pedido_dias", "abc", false], ["prazo_pedido_dias", "", false],
  ];
  for (const [campo, valor, esperado] of limites) {
    assert.equal(ConfigAlertasSchema.safeParse({ ...base, [campo]: valor }).success, esperado, `${campo}=${valor}`);
  }
  const fora = ConfigAlertasSchema.safeParse({ ...base, prazo_pedido_dias: "99" });
  assert.equal(fora.success, false);
  if (!fora.success) assert.ok(primeiroErro(fora.error).includes("0 a 30"));
});
await teste("salvarConfigAlertas: campos forjados não passam, update só da empresa ativa e com edição em Automações", () => {
  const forjado = ConfigAlertasSchema.safeParse({
    estoque_baixo: "on", prazo_pedido_dias: "3", manutencao: "on", pagamento_pendente_dias: "7", compra_pendente_dias: "5",
    falhas_recorrentes_limite: "3", falhas_recorrentes_dias: "30", workspace_id: WS_ALHEIA, updated_by: "x", id: "y",
  });
  assert.equal(forjado.success, true);
  if (forjado.success) assert.deepEqual(Object.keys(forjado.data).sort(), Object.keys(COLUNAS_CONFIG_ALERTAS.split(", ").reduce((o, k) => ({ ...o, [k]: 1 }), {})).sort());
  const acoes = lerFonte("app/(dashboard)/impressao-3d/notificacoes/actions.ts");
  const salvar = acoes.slice(acoes.indexOf("export async function salvarConfigAlertas"));
  assert.ok(salvar.includes("getAcessoEdicao(MODULO)") && salvar.includes('.from("p3d_config_alertas")') && salvar.includes(".update(") && salvar.includes('.eq("workspace_id", acesso.workspaceId)'));
  assert.ok(salvar.includes("...parsed.data") && !salvar.includes("workspace_id:") && !salvar.includes("updated_by"), "nada além dos 8 campos");
  assert.ok(salvar.includes("mensagemEscrita("));
  const pagina = lerFonte("app/(dashboard)/impressao-3d/notificacoes/alertas/page.tsx");
  assert.ok(pagina.includes('getAcessoModulo("p3d_automacoes")') && pagina.includes('.rpc("p3d_atualizar_alertas"'), "cria a linha pela RPC quando falta");
  assert.ok(pagina.indexOf("ler()") < pagina.indexOf('.rpc("p3d_atualizar_alertas"'), "lê antes de chamar a RPC");
});

console.log("\nImpressão 3D (C-1) — integrações (somente estrutura)");
await teste("seis tipos, cada um com descrição, o que habilita, o que exigirá e só campos não secretos", () => {
  assert.deepEqual([...TIPOS_INTEGRACAO], ["whatsapp", "monitoramento_impressoras", "pagamento", "correios", "melhor_envio", "ia"]);
  for (const t of TIPOS_INTEGRACAO) {
    const i = INTEGRACAO_INFO[t];
    assert.ok(i.nome && i.descricao && i.exigira && i.habilita.length > 0 && i.campos.length > 0, t);
    for (const c of i.campos) {
      assert.ok(!CHAVE_PROIBIDA.test(c.chave), `${t}.${c.chave} seria rejeitada pelo banco`);
      assert.ok(!/token|senha|password|secret|segredo|chave de api|api key/i.test(c.rotulo), `${t}.${c.chave}: rótulo pede segredo`);
    }
  }
  assert.equal(MENSAGEM_NAO_CONECTADA, "Depende de credenciais externas e de configuração no servidor; ainda não conectada");
  for (const k of ["token", "access_token", "secret", "segredo_x", "senha", "Password", "api_key_x", "apikey", "Authorization", "x-authorization"]) {
    if (k === "api_key_x") continue;
    assert.ok(CHAVE_PROIBIDA.test(k), k);
  }
  assert.ok(!CHAVE_PROIBIDA.test("id_numero") && !CHAVE_PROIBIDA.test("url_base"));
});
await teste("config: aceita só os campos do tipo, valida URL/CEP/opções e recusa o que parece segredo", () => {
  const ok1 = validarConfigIntegracao("monitoramento_impressoras", { software: "octoprint", url_base: "http://192.168.0.10:5000", lixo: "x", token: "abc" });
  assert.deepEqual(ok1, { ok: true, config: { software: "octoprint", url_base: "http://192.168.0.10:5000" } });
  assert.deepEqual(validarConfigIntegracao("ia", { provedor: "anthropic", modelo: "" }), { ok: true, config: { provedor: "anthropic" } }, "vazio = removido");
  assert.deepEqual(validarConfigIntegracao("melhor_envio", { cep_origem: "01310-100", ambiente: "sandbox" }), { ok: true, config: { cep_origem: "01310100", ambiente: "sandbox" } });
  const ruins: [TipoIntegracao, Record<string, string>][] = [
    ["monitoramento_impressoras", { url_base: "ftp://x" }],
    ["monitoramento_impressoras", { url_base: "http://user:senha@host" }],
    ["monitoramento_impressoras", { url_base: "https://host/?apikey=abc" }],
    ["monitoramento_impressoras", { url_base: "https://host/#frag" }],
    ["monitoramento_impressoras", { url_base: "não é url" }],
    ["monitoramento_impressoras", { software: "klipperzao" }],
    ["correios", { cep_origem: "123" }],
    ["whatsapp", { id_numero: "x".repeat(41) }],
    ["whatsapp", { nome_conta: "a\u0000b" }],
    ["whatsapp", { nome_conta: "EAAGm0PX4ZCpsBAKZCZBqexemplodetokenlongodemaisparaserconta123" }],
    ["ia", { modelo: "sk-ant-api03-abcdef" }],
    ["ia", { modelo: "Bearer abc" }],
  ];
  for (const [tipo, valores] of ruins) assert.equal(validarConfigIntegracao(tipo, valores).ok, false, `${tipo} ${JSON.stringify(valores)}`);
  assert.equal(pareceSegredo("PLA Preto"), false);
  assert.equal(pareceSegredo("123456789012345"), false, "ID numérico de número do WhatsApp");
  assert.equal(pareceSegredo("a".repeat(40)), false, "sem dígitos não é tratado como chave");
  assert.equal(pareceSegredo("abc123".repeat(8)), true);
});
await teste("mesclarConfig preserva o que o servidor pôs, troca só as chaves do tipo e nunca devolve chave proibida", () => {
  const atual = { software: "moonraker", url_base: "http://x", extra_servidor: 7, aninhado: { a: 1 }, api_token: "NAO", senha_x: "NAO" };
  const nova = mesclarConfig(atual, "monitoramento_impressoras", { software: "octoprint" });
  assert.deepEqual(nova, { software: "octoprint", extra_servidor: 7, aninhado: { a: 1 } }, "url_base vazia saiu; token/senha descartados");
  assert.deepEqual(mesclarConfig(null, "ia", { provedor: "openai" }), { provedor: "openai" });
  assert.deepEqual(mesclarConfig([], "ia", {}), {});
  assert.ok(Object.keys(mesclarConfig(atual, "ia", {})).every((k) => !CHAVE_PROIBIDA.test(k)));
});
await teste("leitura das integrações: status desconhecido vira 'não configurada'; só chaves conhecidas na config", () => {
  assert.equal(statusValido("configurada"), "configurada");
  assert.equal(statusValido("erro"), "erro");
  assert.equal(statusValido("conectada"), "nao_configurada");
  const l = lerIntegracoes([
    { id: "1", tipo: "ia", ativo: true, config: { provedor: "openai", token: "x", numero: 3 }, status: "configurada", segredo_configurado: true, ultima_verificacao: "2026-10-29T10:00:00Z", ultimo_erro: "" },
    { id: "2", tipo: "inexistente" },
    null,
  ]);
  assert.equal(l.length, 1);
  assert.deepEqual(l[0].config, { provedor: "openai" });
  assert.equal(l[0].ultimo_erro, null);
  assert.equal(l[0].status, "configurada");
  assert.ok(!COLUNAS_INTEGRACAO_ESTADO.split(", ").includes("config") && COLUNAS_INTEGRACAO.split(", ").includes("config"));
});
await teste("integrações: esquema só aceita tipo e 'ativo'; status/segredo/verificação/erro nunca vão ao banco", () => {
  assert.equal(IntegracaoSchema.safeParse({ tipo: "ia", ativo: "on" }).success, true);
  assert.equal(IntegracaoSchema.safeParse({ tipo: "telepatia", ativo: "on" }).success, false);
  const forjado = IntegracaoSchema.safeParse({ tipo: "ia", ativo: "on", status: "configurada", segredo_configurado: "true", ultimo_erro: "x", workspace_id: WS_ALHEIA });
  assert.equal(forjado.success, true);
  if (forjado.success) assert.deepEqual(Object.keys(forjado.data).sort(), ["ativo", "tipo"]);
  const acoes = lerFonte("app/(dashboard)/impressao-3d/integracoes/actions.ts");
  const upsert = acoes.slice(acoes.indexOf(".upsert("), acoes.indexOf("onConflict"));
  assert.ok(upsert.includes("workspace_id: acesso.workspaceId") && upsert.includes("tipo, ativo, config"));
  for (const campo of ["status", "segredo_configurado", "ultima_verificacao", "ultimo_erro"]) assert.ok(!new RegExp(`\\b${campo}\\b`).test(upsert), campo);
  assert.ok(acoes.includes("acesso?.ehDono") && acoes.includes("getAcessoEdicao(MODULO)"), "só fundador/cofundador altera");
  assert.ok(acoes.includes('onConflict: "workspace_id,tipo"'));
  assert.ok(!/\.rpc\(|fetch\(/.test(acoes), "não conecta nem testa nada");
});
await teste("tela de integrações: mensagem fixa enquanto não configurada, estado do servidor só leitura, sem 'Testar'/'Conectar'", () => {
  const tela = lerFonte("components/impressao-3d/integracoes-board.tsx");
  assert.ok(tela.includes('status === "nao_configurada"') && tela.includes("MENSAGEM_NAO_CONECTADA"));
  assert.ok(!/onClick/.test(tela), "nenhum manipulador de clique: só o submit do formulário de dados");
  assert.ok(!/>\s*(Testar|Conectar|Verificar conex|Autorizar)/i.test(tela));
  for (const campo of ["segredo_configurado", "ultima_verificacao", "ultimo_erro"]) {
    assert.ok(tela.includes(campo), campo);
    assert.ok(!new RegExp(`name="${campo}"`).test(tela), `${campo} não é campo editável`);
  }
  assert.ok(!/name="status"/.test(tela));
  assert.ok(tela.includes("Não digite tokens, senhas nem chaves de API"));
  assert.ok(tela.includes("Só o fundador ou cofundador altera"));
  const pagina = lerFonte("app/(dashboard)/impressao-3d/integracoes/page.tsx");
  assert.ok(pagina.includes("podeEditar ? COLUNAS_INTEGRACAO : COLUNAS_INTEGRACAO_ESTADO") && pagina.includes("acesso.ehDono"));
  assert.ok(pagina.includes('.eq("workspace_id", acesso.workspaceId)'));
});

console.log("\nImpressão 3D (C-1) — Configurações do nicho, Visão Geral e dados reais");
await teste("hub de configurações: atalhos para Precificação, Alertas, Integrações (se ligados), Módulos e Equipe; só o painel", () => {
  const todos = atalhosConfiguracaoNicho([...P3D, ...P3D_C]).map((a) => a.href);
  assert.deepEqual(todos, ["/impressao-3d/precificacao", "/impressao-3d/notificacoes/alertas", "/impressao-3d/integracoes", "/modulos", "/socios"]);
  assert.deepEqual(atalhosConfiguracaoNicho([]).map((a) => a.href), ["/modulos", "/socios"], "módulo desligado não vira atalho");
  assert.deepEqual(atalhosConfiguracaoNicho(["p3d_automacoes"]).map((a) => a.href), ["/impressao-3d/notificacoes/alertas", "/modulos", "/socios"]);
  const hub = lerFonte("app/(dashboard)/configuracoes/nicho/page.tsx");
  assert.ok(hub.includes("getEmpresaPainel()") && hub.includes("getModulosHabilitados(empresa.workspaceId)"));
  assert.ok(!/\.from\(|\.rpc\(|\.(insert|update|upsert|delete)\(/.test(hub), "o hub não grava nada");
  assert.ok(lerFonte("app/(dashboard)/configuracoes/page.tsx").includes('href="/configuracoes/nicho"'));
  // /configuracoes é rota só do painel: a equipe não chega ao hub.
  assert.notEqual(vaiPara(decide("/configuracoes/nicho", ok("socio"), [...ATUAIS, ...P3D_C], false, P3D_C, [...CATALOGO, ...P3D_C])), "seguir");
  assert.equal(vaiPara(decide("/configuracoes/nicho", ok("dono"), ATUAIS)), "seguir");
});
await teste("Visão Geral do dono: cards dos 4 módulos novos só com o módulo ligado; resumo só consulta se ligado", () => {
  const home = lerFonte("components/dashboard-home/dashboard-home-board.tsx");
  for (const chave of P3D_C) assert.ok(home.includes(`com("${chave}")`), chave);
  const resumo = lerFonte("lib/impressao-3d/resumo.ts");
  assert.ok(resumo.includes('com("p3d_automacoes")') && resumo.includes('.from("p3d_notificacoes")'));
  assert.equal(RESUMO_P3D_VAZIO.alertas, null);
  assert.ok(!/preco_|custo|lucro|valor_/.test(resumo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "resumo sem valores monetários");
});
await teste("o sino é ligado no cabeçalho e no layout, só para quem tem Dashboard ou Automações (Mora Lab não muda)", () => {
  const layout = lerFonte("app/(dashboard)/layout.tsx");
  assert.ok(layout.includes("configDoSino(modulosHabilitados, !!painel, permissoesProprias)") && layout.includes("sinoAlertas={sinoAlertas}"));
  const sidebar = lerFonte("components/sidebar.tsx");
  assert.ok(sidebar.includes("sinoAlertas && empresaAtivaId") && sidebar.includes("<SinoAlertas"));
  assert.ok(sidebar.includes("<SolicitacoesBell />"), "o sino de solicitações continua");
  assert.ok(lerFonte("components/impressao-3d/sino-alertas.tsx").includes("Ver histórico de notificações"));
});
await teste("sem dados fictícios: nenhum valor de exemplo nas telas novas e 'hoje' sempre em São Paulo", () => {
  const arquivos = [
    "components/impressao-3d/dashboard-board.tsx", "components/impressao-3d/relatorios-board.tsx", "components/impressao-3d/notificacoes-board.tsx",
    "components/impressao-3d/integracoes-board.tsx", "components/impressao-3d/alertas-config-board.tsx", "components/impressao-3d/sino-alertas.tsx",
    "lib/impressao-3d/painel.ts", "lib/impressao-3d/alertas.ts", "lib/impressao-3d/integracoes.ts", "lib/impressao-3d/datas.ts",
    "app/(dashboard)/impressao-3d/dashboard/page.tsx", "app/(dashboard)/impressao-3d/relatorios/page.tsx",
  ];
  for (const arq of arquivos) {
    const t = lerFonte(arq).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/Math\.random|faker|lorem|mock|exemplo de dados/i.test(t), `${arq} tem dado inventado`);
    assert.ok(!/todayISO|toISOString\(\)\.(slice\(0,\s*10\)|split\(["']T["']\)\[0\])/.test(t), `${arq} calcula 'hoje' em UTC`);
  }
  assert.ok(lerFonte("lib/impressao-3d/painel.ts").includes("hojeSaoPaulo"));
  // Números e moeda em pt-BR/BRL.
  assert.equal(formatMoeda(1520.5).replace(/\s/g, " "), "R$ 1.520,50");
  assert.equal(formatPercentualFracao(0.3946), "39,5%");
});
await teste("escritas protegidas da Etapa C-1: o schema de formulário não aceita status/segredo nem campos de notificação", () => {
  const sch = lerFonte("lib/impressao-3d/validacao-nicho.ts");
  for (const campo of ["status", "segredo_configurado", "ultima_verificacao", "ultimo_erro", "lida_em", "resolvida_em", "workspace_id"]) {
    assert.ok(!new RegExp(`\\b${campo}:`).test(sch), `validacao-nicho aceita ${campo}`);
  }
});
await teste("documentação: docs/nicho-impressao-3d.md descreve a Etapa C-1, as integrações e o que não foi implementado", () => {
  const doc = lerFonte("docs/nicho-impressao-3d.md");
  for (const trecho of [
    "Etapa C-1", "p3d_dashboard", "p3d_relatorios", "p3d_automacoes", "p3d_integracoes", "p3d_painel", "p3d_atualizar_alertas",
    "WhatsApp Cloud API", "OctoPrint", "Moonraker", "Bambu", "Melhor Envio", "Correios", "ainda não conectada", "Estimado", "Real",
  ]) {
    assert.ok(doc.includes(trecho), `doc sem "${trecho}"`);
  }
});

// ===========================================================================
// Etapa D — navegação e abas personalizáveis, Módulos, Clientes, Financeiro e Primeiros passos
// ===========================================================================

console.log("\nEtapa D — menu personalizável (menu_preferencias)");
const GRUPOS_ATUAIS = gruposDoMenu(ATUAIS, true, false);
await teste("sem preferência o menu é IDÊNTICO ao do snapshot (Mora Lab e vendedores intactos)", () => {
  const modulos = GRUPOS_ATUAIS.filter((g) => g.titulo !== "Dashboards" && g.titulo !== "Empresa");
  const comoRegistro = modulos.map((g) => ({ titulo: g.titulo, itens: g.itens }));
  assert.deepEqual(
    JSON.parse(JSON.stringify(aplicarPreferenciaMenu(comoRegistro, null))),
    JSON.parse(JSON.stringify(menuDoDono(ATUAIS).map((g) => ({ titulo: g.titulo, itens: g.itens.map((i) => ({ label: i.label, href: i.href, icone: i.icone, ...(i.badge ? { badge: i.badge } : {}) })) }))))
  );
  assert.deepEqual(JSON.parse(JSON.stringify(menuDoDono(ATUAIS))), dourado.menu);
  assert.equal(aplicarPreferenciaMenu(GRUPOS_ATUAIS, null), GRUPOS_ATUAIS, "sem preferência = os mesmos grupos");
  assert.equal(aplicarPreferenciaMenu(GRUPOS_ATUAIS, { itens: [], abasOcultas: {} }), GRUPOS_ATUAIS, "preferência vazia = os mesmos grupos");
  // Ordem dos blocos fixa: Dashboards, módulos (registro), Empresa.
  assert.deepEqual(GRUPOS_ATUAIS.map((g) => g.titulo), ["Dashboards", ...menuDoDono(ATUAIS).map((g) => g.titulo), "Empresa"]);
  assert.deepEqual(gruposDoMenu(ATUAIS, false, true).map((g) => g.titulo), menuDoDono(ATUAIS).map((g) => g.titulo), "equipe: sem Visão Geral e sem Empresa");
});
await teste("Visão Geral, Módulos, Equipe e cofundadores e Configurações nunca somem, mesmo que a preferência diga oculto", () => {
  const pref = {
    itens: ["dashboard", "modulos", "configuracoes", "socios", "leads"].map((chave, ordem) => ({ chave, visivel: false, ordem })),
    abasOcultas: {},
  };
  const hrefs = aplicarPreferenciaMenu(GRUPOS_ATUAIS, pref).flatMap((g) => g.itens.map((i) => i.href));
  for (const h of ["/dashboard", "/modulos", "/socios", "/configuracoes"]) assert.ok(hrefs.includes(h), h);
  assert.ok(!hrefs.includes("/leads"), "os demais podem ser ocultados");
  for (const f of ITENS_FIXOS) assert.equal(itemFixo(f), true);
  const prep = prepararPreferencia(pref, { itensVisiveis: ["dashboard", "modulos", "configuracoes", "socios", "leads"], chavesComAbas: [] }, null);
  assert.ok(prep.ok);
  if (prep.ok) for (const f of ITENS_FIXOS) assert.equal(prep.pref.itens.find((i) => i.chave === f)?.visivel, true, `${f} gravado visível`);
});
await teste("ordem pela preferência dentro do grupo; item novo entra no fim, visível; grupo vazio some", () => {
  const grupos = [{ titulo: "Gestão", itens: [{ href: "/leads" }, { href: "/renegados" }, { href: "/clientes" }, { href: "/agenda" }] }];
  const pref = { itens: [{ chave: "clientes", visivel: true, ordem: 0 }, { chave: "leads", visivel: true, ordem: 1 }, { chave: "renegados", visivel: false, ordem: 2 }], abasOcultas: {} };
  assert.deepEqual(aplicarPreferenciaMenu(grupos, pref)[0].itens.map((i) => i.href), ["/clientes", "/leads", "/agenda"], "agenda (sem preferência) no fim");
  const tudoOculto = { itens: grupos[0].itens.map((i, ordem) => ({ chave: chaveDoHref(i.href), visivel: false, ordem })), abasOcultas: {} };
  assert.deepEqual(aplicarPreferenciaMenu(grupos, tudoOculto), [], "grupo sem item visível some");
  // A tela de personalização vê todos, inclusive os ocultos.
  const ord = ordenarComPreferencia(grupos, pref)[0].itens;
  assert.deepEqual(ord.map((x) => [x.chave, x.visivel]), [["clientes", true], ["leads", true], ["renegados", false], ["agenda", true]]);
});
await teste("módulo desligado some do menu, mas a preferência dele fica guardada e volta ao religar", () => {
  const pref = { itens: [{ chave: "impressao-3d/estoque", visivel: true, ordem: 0 }, { chave: "leads", visivel: false, ordem: 1 }], abasOcultas: { p3d_estoque: ["historico"] } };
  const semEstoque = aplicarPreferenciaMenu(gruposDoMenu(ATUAIS, true, false), pref).flatMap((g) => g.itens.map((i) => i.href));
  assert.ok(!semEstoque.includes("/impressao-3d/estoque"));
  // Salvar com o módulo desligado preserva o que estava guardado para ele.
  const prep = prepararPreferencia(
    { itens: [{ chave: "leads", visivel: true, ordem: 0 }], abasOcultas: {} },
    { itensVisiveis: ["leads", "dashboard"], chavesComAbas: [] },
    pref
  );
  assert.ok(prep.ok);
  if (prep.ok) {
    assert.deepEqual(prep.pref.itens.find((i) => i.chave === "impressao-3d/estoque"), { chave: "impressao-3d/estoque", visivel: true, ordem: 0 });
    assert.deepEqual(prep.pref.abasOcultas, { p3d_estoque: ["historico"] });
    assert.equal(prep.pref.itens.find((i) => i.chave === "leads")?.visivel, true);
  }
  const religado = aplicarPreferenciaMenu(gruposDoMenu([...ATUAIS, "p3d_estoque"], true, false), pref).flatMap((g) => g.itens.map((i) => i.href));
  assert.ok(religado.includes("/impressao-3d/estoque") && !religado.includes("/leads"));
});
await teste("só entram itens que a pessoa já vê; chaves fora do formato são descartadas", () => {
  const prep = prepararPreferencia(
    { itens: [{ chave: "leads", visivel: false, ordem: 0 }, { chave: "rh", visivel: false, ordem: 1 }, { chave: "../x", visivel: true, ordem: 2 }, { chave: "LEADS", visivel: true, ordem: 3 }, { chave: "leads", visivel: true, ordem: 9 }] },
    { itensVisiveis: ["leads"], chavesComAbas: [] },
    null
  );
  assert.ok(prep.ok);
  if (prep.ok) assert.deepEqual(prep.pref.itens, [{ chave: "leads", visivel: false, ordem: 0 }]);
  assert.equal(lerPreferencia(null), null);
  assert.deepEqual(lerPreferencia({ itens: "x", abas_ocultas: [] }), { itens: [], abasOcultas: {} });
  assert.deepEqual(lerPreferencia({ itens: [{ chave: "a", visivel: "sim", ordem: 1 }, { chave: "b", visivel: true, ordem: Number.NaN }] })!.itens, []);
});
await teste("hierarquia: pessoal → padrão da empresa → ordem do registro", () => {
  const pessoal = { itens: [{ chave: "leads", visivel: false, ordem: 0 }], abasOcultas: {} };
  const padrao = { itens: [{ chave: "clientes", visivel: false, ordem: 0 }], abasOcultas: {} };
  assert.equal(resolverPreferencia(pessoal, padrao), pessoal);
  assert.equal(resolverPreferencia(null, padrao), padrao);
  assert.equal(resolverPreferencia(null, null), null);
});
await teste("esconder item NÃO bloqueia a rota: a decisão do proxy não lê preferência", () => {
  const acesso = lerFonte("lib/acesso.ts");
  assert.ok(!/preferencia|menu_preferencias/i.test(acesso));
  assert.ok(!/menu_preferencias|preferencia/i.test(lerFonte("lib/supabase/proxy.ts")));
  assert.equal(vaiPara(decide("/leads", ok("dono"), ATUAIS)), "seguir");
  assert.ok(lerFonte("components/empresa/navegacao-board.tsx").includes("não bloqueia a página"));
});
await teste("/configuracoes/navegacao: dono e cofundador sim; equipe só com módulo liberado; vendedor nunca; /configuracoes segue só do painel", () => {
  assert.equal(vaiPara(decide(ROTA_NAVEGACAO, ok("dono"), ATUAIS)), "seguir");
  assert.equal(vaiPara(decide(ROTA_NAVEGACAO, ok("cofundador"), ATUAIS)), "seguir");
  for (const papel of ["socio", "funcionario"] as const) {
    assert.equal(vaiPara(decide(ROTA_NAVEGACAO, ok(papel), ATUAIS, false, ["leads"])), "seguir", papel);
    assert.equal(vaiPara(decide(ROTA_NAVEGACAO, ok(papel), ATUAIS, false, [])), AGUARDANDO_LIBERACAO, `${papel} sem módulo`);
    assert.notEqual(vaiPara(decide("/configuracoes", ok(papel), ATUAIS, false, ["leads"])), "seguir", `${papel} /configuracoes`);
    assert.notEqual(vaiPara(decide("/configuracoes/nicho", ok(papel), ATUAIS, false, ["leads"])), "seguir", `${papel} hub do nicho`);
  }
  assert.equal(vaiPara(decide(ROTA_NAVEGACAO, ok("comercial"), ATUAIS)), VENDEDOR_HOME);
  assert.equal(precisaDeModulos(ROTA_NAVEGACAO), true, "o proxy lê os módulos para decidir a equipe");
  assert.equal(precisaDeModulos("/configuracoes"), false);
});
await teste("gravação segue o contrato: lê, update pelo id ou insert, relê em corrida (23505); nunca upsert; restaurar apaga só a linha pessoal", () => {
  const a = lerFonte("app/(dashboard)/configuracoes/navegacao/actions.ts");
  assert.ok(!/\.upsert\(/.test(a), "sem upsert");
  assert.ok(a.includes('.from("menu_preferencias").select("id, itens, abas_ocultas").eq("workspace_id", ws)'));
  assert.ok(a.includes('q.eq("user_id", userId)') && a.includes('q.is("user_id", null)'));
  assert.ok(a.includes('.eq("id", id)') && a.includes('.eq("workspace_id", ws)'));
  assert.ok(a.includes('ins.error?.code !== "23505"') && a.includes("await lerLinha(supabase, ws, userId)"), "corrida: relê e faz update");
  assert.ok(a.includes('escopo === "empresa" && !ctx.painel'), "padrão só fundador/cofundador");
  const restaurar = a.slice(a.indexOf("export async function restaurarNavegacao"));
  assert.ok(restaurar.includes(".delete()") && restaurar.includes('.eq("user_id", ctx.userId)') && !restaurar.includes('is("user_id", null)'));
  assert.ok(a.includes("prepararPreferencia("), "valida e preserva o guardado");
  assert.ok(a.includes("error.message"), "erro do banco como veio");
  for (const proibido of ["workspace_modulos", "permissoes_membro", "definir_modulo", ".rpc("]) assert.ok(!a.includes(proibido), `navegação não toca ${proibido}`);
});
await teste("o layout aplica a preferência no servidor (sem piscar) e a barra lateral usa a mesma função da pré-visualização", () => {
  const layout = lerFonte("app/(dashboard)/layout.tsx");
  assert.ok(layout.includes("getPreferenciasNavegacao()") && layout.includes("preferencia={preferencias.efetiva}"));
  const sidebar = lerFonte("components/sidebar.tsx");
  assert.ok(sidebar.includes("aplicarPreferenciaMenu(") && sidebar.includes("gruposDoMenu(modulosHabilitados, painelCompleto, restrito)"));
  assert.ok(sidebar.includes('href="/configuracoes/navegacao"'), "atalho no bloco do perfil");
  assert.ok(lerFonte("components/empresa/navegacao-board.tsx").includes("aplicarPreferenciaMenu("));
  assert.ok(lerFonte("app/(dashboard)/configuracoes/page.tsx").includes('href="/configuracoes/navegacao"'));
  const srv = lerFonte("lib/modulos/preferencias-servidor.ts");
  assert.ok(srv.includes('.eq("workspace_id", ativa.workspaceId)') && srv.includes("user_id.is.null,user_id.eq."));
});

console.log("\nEtapa D — abas opcionais");
const COM_ABAS = MODULOS.filter((m) => m.abas && m.abas.length > 0).map((m) => m.chave);
await teste("o registro tem abas com chave estável nas telas do nicho; chaves únicas e no formato do banco", () => {
  assert.deepEqual(COM_ABAS.sort(), [
    "p3d_automacoes", "p3d_dashboard", "p3d_estoque", "p3d_fornecedores", "p3d_impressoras", "p3d_precificacao",
    "p3d_producao", "p3d_qualidade", "p3d_relatorios",
  ].sort());
  assert.deepEqual(abasDe("p3d_fornecedores").map((a) => a.chave), ["compras", "fornecedores", "precos"]);
  assert.deepEqual(abasDe("p3d_relatorios").map((a) => a.chave), ["vendas", "produtos", "produtividade"]);
  assert.deepEqual(abasDe("p3d_impressoras").map((a) => a.chave), ["dados", "pecas", "manutencoes"]);
  assert.deepEqual(abasDe(CHAVE_VISAO_GERAL).map((a) => a.chave), ["primeiros_passos", "resumo"]);
  for (const chave of [...COM_ABAS, CHAVE_VISAO_GERAL]) {
    const ks = abasDe(chave).map((a) => a.chave);
    assert.equal(new Set(ks).size, ks.length, chave);
    for (const k of ks) assert.ok(CHAVE_VALIDA.test(k), `${chave}.${k}`);
  }
  assert.deepEqual(abasDe("leads"), [], "módulos antigos sem abas: nada muda");
});
await teste("mínimo de 1 aba visível; aba padrão oculta abre a primeira visível", () => {
  assert.deepEqual(abasVisiveis("p3d_fornecedores", null), ["compras", "fornecedores", "precos"]);
  assert.deepEqual(abasVisiveis("p3d_fornecedores", { itens: [], abasOcultas: { p3d_fornecedores: ["compras"] } }), ["fornecedores", "precos"]);
  assert.deepEqual(abasVisiveis("p3d_fornecedores", { itens: [], abasOcultas: { p3d_fornecedores: ["compras", "fornecedores", "precos"] } }), ["compras"], "tudo oculto (forjado) = volta a padrão");
  assert.equal(abaInicial(["fornecedores", "precos"], "compras"), "fornecedores");
  assert.equal(abaInicial(["compras", "precos"], "compras"), "compras");
  const ctx = { itensVisiveis: [], chavesComAbas: ["p3d_fornecedores", CHAVE_VISAO_GERAL] };
  const tudo = prepararPreferencia({ abasOcultas: { p3d_fornecedores: ["compras", "fornecedores", "precos"] } }, ctx, null);
  assert.equal(tudo.ok, false);
  if (!tudo.ok) assert.ok(tudo.erro.includes("pelo menos uma aba"));
  assert.equal(prepararPreferencia({ abasOcultas: { visao_geral: ["primeiros_passos", "resumo"] } }, ctx, null).ok, false);
  const ok1 = prepararPreferencia({ abasOcultas: { p3d_fornecedores: ["precos", "xyz"], p3d_estoque: ["historico"], visao_geral: ["primeiros_passos"] } }, ctx, null);
  assert.ok(ok1.ok);
  if (ok1.ok) assert.deepEqual(ok1.pref.abasOcultas, { p3d_fornecedores: ["precos"], visao_geral: ["primeiros_passos"] }, "aba desconhecida e tela não visível descartadas");
});
await teste("as páginas leem as abas no servidor e os boards só mostram as visíveis, abrindo na primeira visível", () => {
  const telas: [string, string, string][] = [
    ["estoque", "p3d_estoque", "estoque-board.tsx"], ["fornecedores", "p3d_fornecedores", "fornecedores-board.tsx"],
    ["impressoras", "p3d_impressoras", "impressoras-board.tsx"], ["precificacao", "p3d_precificacao", "precificacao-board.tsx"],
    ["producao", "p3d_producao", "producao-board.tsx"], ["qualidade", "p3d_qualidade", "qualidade-board.tsx"],
    ["notificacoes", "p3d_automacoes", "notificacoes-board.tsx"], ["dashboard", "p3d_dashboard", "dashboard-board.tsx"],
    ["relatorios", "p3d_relatorios", "relatorios-board.tsx"],
  ];
  for (const [pasta, modulo, board] of telas) {
    const pagina = lerFonte(`app/(dashboard)/impressao-3d/${pasta}/page.tsx`);
    assert.ok(pagina.includes(`getAbasVisiveis("${modulo}")`) && pagina.includes("abas={abas}"), pasta);
    const b = lerFonte(`components/impressao-3d/${board}`);
    assert.ok(/abas\.includes\(/.test(b), `${board} filtra pelas abas visíveis`);
  }
  for (const board of ["estoque-board.tsx", "fornecedores-board.tsx", "impressoras-board.tsx", "precificacao-board.tsx", "producao-board.tsx", "qualidade-board.tsx", "notificacoes-board.tsx"]) {
    assert.ok(lerFonte(`components/impressao-3d/${board}`).includes("abaInicial(abas,"), board);
  }
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/relatorios/page.tsx").includes("abaInicial("), "relatório: aba oculta pela URL abre a primeira visível");
  assert.ok(lerFonte("components/impressao-3d/dashboard-board.tsx").includes('abas.includes("resultado") && verCustos && resultado'), "seção oculta + extra custos");
});

console.log("\nEtapa D — Visão Geral, Módulos, Clientes e Financeiro");
await teste("Primeiros passos: só por dado real, só de módulos ligados, link para a tela certa, some quando tudo pronto", () => {
  const todosFalsos = { precificacao: false, impressora: false, material: false, entrada_estoque: false, produto: false, orcamento: false, pedido: false };
  const todosLigados = PASSOS.map((p) => p.modulo);
  const passos = montarPassos({ ...todosFalsos, impressora: true }, todosLigados);
  assert.deepEqual(passos.filter((p) => p.concluido).map((p) => p.chave), ["impressora"]);
  assert.equal(passos.find((p) => p.chave === "pedido")!.destino, "/impressao-3d/pedidos");
  assert.equal(passos.find((p) => p.chave === "precificacao")!.destino, "/impressao-3d/precificacao");
  // Módulo desligado: o passo nem aparece (não cobra Orçamentos/Pedidos de quem não os usa).
  const semPedidos = montarPassos({ ...todosFalsos, pedido: true }, todosLigados.filter((m) => m !== "p3d_pedidos"));
  assert.equal(semPedidos.find((p) => p.chave === "pedido"), undefined, "módulo desligado não gera passo");
  assert.equal(semPedidos.length, PASSOS.length - 1);
  const enxuta = montarPassos(todosFalsos, ["p3d_estoque", "p3d_impressoras", "p3d_precificacao"]);
  assert.deepEqual(enxuta.map((p) => p.chave), ["material", "entrada_estoque", "impressora", "precificacao"], "empresa enxuta: só os passos dos 3 módulos, filamento primeiro");
  assert.ok(enxuta.every((p) => p.destino !== "/modulos"));
  assert.equal(todosConcluidos(montarPassos(todosFalsos, [])), true, "sem módulos do nicho não há o que cobrar");
  const tudo = Object.fromEntries(Object.keys(todosFalsos).map((k) => [k, true])) as typeof todosFalsos;
  assert.equal(todosConcluidos(montarPassos(tudo, todosLigados)), true);
  assert.equal(precificacaoAjustada({ tarifa_kwh: 0.9 }), true);
  assert.equal(precificacaoAjustada({ tarifa_kwh: 0 }), false);
  assert.equal(precificacaoAjustada(null), false);
  const fonte = lerFonte("lib/impressao-3d/primeiros-passos.ts");
  assert.ok(fonte.includes('.gt("preco_compra", 0)') && fonte.includes('.eq("tipo", "entrada")'));
  assert.ok(!/\.(insert|update|upsert|delete)\(/.test(fonte), "nada marcado à mão");
  assert.equal((fonte.match(/\.eq\("workspace_id", ws\)/g) ?? []).length, 7, "toda leitura pela empresa ativa");
  const ov = lerFonte("lib/dashboard-home/get-overview.ts");
  assert.ok(ov.includes('config.nichoChave === "impressao_3d" && secoes.includes("primeiros_passos")') && ov.includes("todosConcluidos(passos) ? null"));
  const home = lerFonte("components/dashboard-home/dashboard-home-board.tsx");
  assert.ok(home.includes('secoes.includes("resumo")') && home.includes("<PrimeirosPassos"));
});
await teste("Módulos: o card avisa que remover preserva os dados; desligar é só o flag (definir_modulo), sem exclusão", () => {
  const board = lerFonte("components/modulos/modulos-board.tsx");
  assert.ok(board.includes("Remover não apaga nada: os dados ficam guardados e voltam ao adicionar o módulo de novo."));
  const acao = lerFonte("lib/actions/modulos.ts");
  assert.ok(acao.includes('.rpc("definir_modulo"') && !/\.delete\(/.test(acao));
});
await teste("Clientes: seção 'Pedidos e orçamentos' só com os módulos; total e última compra ignoram cancelados; sem custo", () => {
  const r = resumirCompras([
    { status: "entregue", total: 100, data_pedido: "2026-09-01" },
    { status: "cancelado", total: 999, data_pedido: "2026-10-20" },
    { status: "novo", total: 50.5, data_pedido: "2026-10-05" },
  ]);
  assert.deepEqual(r, { totalComprado: 150.5, ultimaCompra: "2026-10-05" });
  assert.deepEqual(resumirCompras([]), { totalComprado: 0, ultimaCompra: null });
  assert.ok(!/custo|lucro|margem/.test(COLUNAS_PEDIDO_CLIENTE + COLUNAS_ORCAMENTO_CLIENTE));
  const fonte = lerFonte("lib/impressao-3d/cliente.ts");
  assert.ok(fonte.includes("COLUNAS_PEDIDO_CLIENTE") && fonte.includes('getAcessoModulo("p3d_pedidos")') && fonte.includes('getAcessoModulo("p3d_orcamentos")'));
  assert.ok(fonte.includes("if (!acessoPedidos && !acessoOrcamentos) return null;"), "sem os módulos a página fica como hoje");
  assert.ok(fonte.includes("if (erroLeitura)") && lerFonte("components/impressao-3d/cliente-pedidos.tsx").includes("{dados.erro &&"), "erro de leitura aparece como veio (não vira 'nenhum pedido')");
  assert.equal((fonte.match(/\.eq\("workspace_id", acesso(Pedidos|Orcamentos)\.workspaceId\)/g) ?? []).length, 2);
  const pagina = lerFonte("app/(dashboard)/clientes/[id]/page.tsx");
  assert.ok(pagina.includes("{comprasP3d && <ClientePedidosOrcamentos"));
  const tela = lerFonte("components/impressao-3d/cliente-pedidos.tsx");
  assert.ok(tela.includes("/impressao-3d/pedidos/${p.id}") && tela.includes("/impressao-3d/orcamentos/${o.id}"));
  assert.ok(!/custo|lucro/i.test(tela.replace(/\/\*[\s\S]*?\*\//g, "")), "nenhum custo/lucro na tela (fora dos comentários)");
});
await teste("Financeiro por padrão: pré-marcado só quando aparece (ligado + edição); o servidor confere de novo", () => {
  const ped = lerFonte("components/impressao-3d/pedido-detalhe.tsx");
  assert.ok(/podeLancarFinanceiro \? \([\s\S]{0,300}name="lancar_financeiro" defaultChecked/.test(ped));
  const comp = lerFonte("components/impressao-3d/compra-detalhe.tsx");
  assert.ok(comp.includes("useState(podeGerarContaPagar)") && comp.includes('{gerar && <Entrada rotulo="Vencimento *" name="vencimento" type="date" required'));
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/pedidos/actions.ts").includes('getAcessoEdicao("financeiro")'));
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/fornecedores/actions.ts").includes('getAcessoEdicao("financeiro")'));
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/fornecedores/compras/[id]/page.tsx").includes('getAcessoEdicao("financeiro")'));
});
await teste("documentação da Etapa D", () => {
  const doc = lerFonte("docs/nicho-impressao-3d.md");
  for (const t of ["Etapa D", "menu_preferencias", "Personalizar navegação", "abas_ocultas", "visao_geral", "Primeiros passos", "Restaurar padrão"]) {
    assert.ok(doc.includes(t), `doc sem "${t}"`);
  }
});

console.log("\nEtapa E — Calculadora rápida, cadastros simples, equipe e começo enxuto");
const CFG = { ...CONFIG_PADRAO, tarifa_kwh: 0.9, valor_hora_mao_obra: 30, desperdicio_pct: 8, falha_pct: 7, impostos_pct: 6, taxa_pagamento_pct: 2, comissao_pct: 3, taxa_fixa_pagamento: 1 };
function rapido(parcial: Partial<EstadoRapido> = {}): EstadoRapido {
  return {
    ...estadoInicialRapido(CFG),
    filamentos: [novaLinhaFilamento({ origem: "estoque", material_id: "mat-1", peso_g: "25" })],
    horas: "1", minutos: "30", quantidade: "1", impressora_id: "imp-1",
    ...parcial,
  };
}
await teste("multiplicador ↔ markup_pct: ×5 = 400 (e de volta); padrão ×5", () => {
  assert.equal(multiplicadorParaMarkupPct(5), 400);
  assert.equal(multiplicadorParaMarkupPct(1), 0);
  assert.equal(multiplicadorParaMarkupPct(2.5), 150);
  assert.equal(markupPctParaMultiplicador(400), 5);
  assert.equal(markupPctParaMultiplicador(150), 2.5);
  assert.equal(multiplicadorInicial(null), 5);
  assert.equal(multiplicadorInicial({ modo_preco: "margem", markup_pct: 50 }), 5, "config em margem: ×5");
  assert.equal(multiplicadorInicial({ modo_preco: "markup", markup_pct: 400 }), 5);
  assert.equal(multiplicadorInicial({ modo_preco: "markup", markup_pct: 200 }), 3, "config markup própria vale");
  const r = montarEntradaRapida(rapido());
  assert.deepEqual(r.erros, []);
  assert.equal(r.entrada.modo_preco, "markup");
  assert.equal(r.entrada.markup_pct, 400);
  assert.ok(!("margem_pct" in r.entrada));
  assert.match(explicarMultiplicador(5) ?? "", /×5 = lucro de 4× o custo \(margem de 80%\)/);
  assert.equal(explicarMultiplicador(0.5), null);
});
await teste("x peças multiplica peso (de cada filamento) e tempo; tempo em horas + minutos; quantidade vai junto", () => {
  const r = montarEntradaRapida(rapido({ quantidade: "4" }));
  assert.deepEqual(r.entrada.materiais, [{ material_id: "mat-1", peso_g: 100 }]);
  assert.equal(r.entrada.horas_impressao, 6);
  assert.equal(r.entrada.quantidade, 4);
  assert.equal(montarEntradaRapida(rapido({ horas: "", minutos: "20", quantidade: "3" })).entrada.horas_impressao, 1, "20 min × 3 = 1 h sem erro de ponto flutuante");
  const virgula = montarEntradaRapida(rapido({ quantidade: "2", filamentos: [novaLinhaFilamento({ material_id: "mat-1", peso_g: "12,5" })] }));
  assert.deepEqual(virgula.entrada.materiais, [{ material_id: "mat-1", peso_g: 25 }], "vírgula pt-BR");
  assert.ok(montarEntradaRapida(rapido({ quantidade: "0" })).erros.length > 0);
  assert.ok(montarEntradaRapida(rapido({ quantidade: "1,5" })).erros.length > 0);
});
await teste("modo rápido força 0 em tudo que não é material + depreciação + energia", () => {
  const { entrada } = montarEntradaRapida(rapido());
  for (const k of ZEROS_MODO_RAPIDO) assert.strictEqual(entrada[k], 0, `${k} explícito 0`);
  assert.equal(ZEROS_MODO_RAPIDO.length, 15);
  for (const k of ["desperdicio_pct", "falha_pct", "manutencao_hora", "manutencao_ciclo", "mao_obra_horas", "acabamento_horas", "montagem_horas", "embalagem_custo", "despesas_fixas_pct", "impostos_pct", "taxa_pagamento_pct", "comissao_pct", "taxa_fixa_pagamento", "preco_minimo", "arredondar_para"]) {
    assert.ok((ZEROS_MODO_RAPIDO as readonly string[]).includes(k), k);
  }
  // Com a lista de filamentos, nada de material_id/preço do material/peso no topo.
  for (const k of ["material_id", "preco_por_g", "preco_rolo", "peso_rolo_g", "peso_peca_g"]) assert.ok(!(k in entrada), `${k} fora do topo`);
  assert.deepEqual(entrada.materiais, [{ material_id: "mat-1", peso_g: 25 }]);
  assert.equal(entrada.impressora_id, "imp-1");
  assert.equal(entrada.tarifa_kwh, 0.9);
  assert.ok(!("preco_manual" in entrada) && !("outros_custos" in entrada));
});
await teste("\"Incluir também\" troca os zeros pelos valores da configuração; o resto continua 0", () => {
  const valores = valoresIniciaisExtras(CFG, { manutencao_hora: 0.5, manutencao_ciclo: 2 });
  assert.equal(valores.desperdicio_pct, "8");
  assert.equal(valores.falha_pct, "7");
  assert.equal(valores.impostos_pct, "6");
  assert.equal(valores.manutencao_hora, "0.5");
  assert.equal(valores.valor_hora_mao_obra, "30");
  const base = rapido({ valores });
  const desp = montarEntradaRapida({ ...base, extras: { ...base.extras, desperdicio: true } }).entrada;
  assert.equal(desp.desperdicio_pct, 8);
  assert.equal(desp.falha_pct, 0);
  assert.equal(desp.impostos_pct, 0);
  const imp = montarEntradaRapida({ ...base, extras: { ...base.extras, impostos: true } }).entrada;
  assert.deepEqual([imp.impostos_pct, imp.taxa_pagamento_pct, imp.comissao_pct, imp.taxa_fixa_pagamento], [6, 2, 3, 1]);
  assert.equal(imp.desperdicio_pct, 0);
  const mo = montarEntradaRapida({ ...base, valores: { ...valores, mao_obra_horas: "0,5", acabamento_horas: "0,25" }, extras: { ...base.extras, mao_obra: true } }).entrada;
  assert.deepEqual([mo.valor_hora_mao_obra, mo.mao_obra_horas, mo.acabamento_horas, mo.montagem_horas], [30, 0.5, 0.25, 0]);
  const man = montarEntradaRapida({ ...base, extras: { ...base.extras, manutencao: true, embalagem: true, falhas: true } }).entrada;
  assert.deepEqual([man.manutencao_hora, man.manutencao_ciclo, man.embalagem_custo, man.falha_pct], [0.5, 2, 0, 7]);
  assert.equal(montarEntradaRapida({ ...base, valores: { ...valores, desperdicio_pct: "abc" }, extras: { ...base.extras, desperdicio: true } }).erros.length, 1, "valor ilegível vira erro");
  assert.equal(EXTRAS_RAPIDOS.length, 6);
  assert.equal(valoresIniciaisExtras(CFG, null).manutencao_hora, "", "sem impressora, manutenção vazia");
});
await teste("margem alternativa: modo_preco margem + margem_pct, sem markup", () => {
  const r = montarEntradaRapida(rapido({ modo: "margem", margem_pct: "40" }));
  assert.deepEqual(r.erros, []);
  assert.equal(r.entrada.modo_preco, "margem");
  assert.equal(r.entrada.margem_pct, 40);
  assert.ok(!("markup_pct" in r.entrada));
  assert.ok(montarEntradaRapida(rapido({ modo: "margem", margem_pct: "100" })).erros.length > 0);
  assert.ok(montarEntradaRapida(rapido({ modo: "margem", margem_pct: "" })).erros.length > 0);
  assert.ok(montarEntradaRapida(rapido({ multiplicador: "0,5" })).erros.length > 0, "multiplicador abaixo de 1");
  assert.match(explicarMargem(40) ?? "", /Margem de 40%/);
  assert.equal(explicarMargem(100), null);
});
await teste("W → kW: 120 W = 0,12 kW (e de volta); custo/hora ao vivo da impressora", () => {
  assert.equal(wattsParaKw(120), 0.12);
  assert.equal(wattsParaKw(0), 0);
  assert.equal(wattsParaKw(1500), 1.5);
  assert.equal(kwParaWatts(0.12), 120);
  assert.equal(kwParaWatts(0.35), 350);
  const c = custoHoraImpressora({ aquisicao: 2500, residual: 500, vidaUtilHoras: 5000, watts: 120, tarifaKwh: 1 });
  assert.equal(c.depreciacao, 0.4);
  assert.equal(c.energia, 0.12);
  assert.equal(c.total, 0.52);
  assert.equal(custoHoraImpressora({ aquisicao: 100, residual: 0, vidaUtilHoras: 0, watts: 100, tarifaKwh: 1 }).depreciacao, 0, "sem vida útil: 0");
});
await teste("sem impressora: energia e depreciação 0 explícitos com aviso; sem tempo e sem filamento avisam", () => {
  const sem = montarEntradaRapida(rapido({ impressora_id: "" }));
  assert.ok(!("impressora_id" in sem.entrada));
  assert.deepEqual([sem.entrada.potencia_media_kw, sem.entrada.valor_aquisicao, sem.entrada.valor_residual], [0, 0, 0]);
  assert.ok(sem.avisos.some((a) => /energia e depreciação/.test(a)));
  assert.ok(montarEntradaRapida(rapido({ impressora_id: "" }), { semImpressoras: true }).avisos.some((a) => /Nenhuma impressora cadastrada/.test(a)));
  const com = montarEntradaRapida(rapido());
  assert.ok(!("potencia_media_kw" in com.entrada) && !("valor_aquisicao" in com.entrada), "com impressora a RPC resolve");
  const soPeso = montarEntradaRapida(rapido({ horas: "", minutos: "" }));
  assert.equal(soPeso.entrada.horas_impressao, 0);
  assert.equal(soPeso.pronta, true, "só o peso já calcula");
  assert.ok(soPeso.avisos.some((a) => /tempo/.test(a)));
  const semFilamento = rapido({ filamentos: [novaLinhaFilamento()], horas: "", minutos: "" });
  assert.equal(montarEntradaRapida(semFilamento).pronta, false);
  assert.equal(montarEntradaRapida({ ...semFilamento, horas: "2" }).pronta, true, "só o tempo também");
  assert.equal(montarEntradaRapida({ ...semFilamento, horas: "2" }).entrada.peso_peca_g, 0);
  assert.ok(!("materiais" in montarEntradaRapida({ ...semFilamento, horas: "2" }).entrada));
});
await teste("filamentos marcados: vários, do estoque ou informados na hora (valor do kg ÷ 1000), peso por peça × quantidade", () => {
  const dois = montarEntradaRapida(rapido({
    quantidade: "3",
    filamentos: [
      novaLinhaFilamento({ material_id: "mat-1", peso_g: "20" }),
      novaLinhaFilamento({ origem: "manual", nome: "PLA branco", cor: "Branco", valor_kg: "89,90", peso_g: "5" }),
    ],
  }));
  assert.deepEqual(dois.erros, []);
  assert.deepEqual(dois.entrada.materiais, [
    { material_id: "mat-1", peso_g: 60 },
    { nome: "PLA branco", cor: "Branco", peso_g: 15, preco_por_g: 0.0899 },
  ]);
  assert.equal(precoPorGDeValorKg(89.9), 0.0899);
  assert.equal(precoPorGDeValorKg(120), 0.12);
  // Linha manual sem valor do kg é erro; sem peso é ignorada; sem escolher o filamento avisa.
  assert.ok(montarMateriais([novaLinhaFilamento({ origem: "manual", nome: "x", valor_kg: "", peso_g: "10" })]).erros.length > 0);
  assert.deepEqual(montarMateriais([novaLinhaFilamento({ material_id: "mat-1", peso_g: "" })]).materiais, []);
  assert.ok(montarMateriais([novaLinhaFilamento({ peso_g: "10" })]).avisos.length > 0);
  assert.equal(montarMateriais([novaLinhaFilamento({ origem: "manual", valor_kg: "100", peso_g: "10" })]).materiais[0] && (montarMateriais([novaLinhaFilamento({ origem: "manual", valor_kg: "100", peso_g: "10" })]).materiais[0] as { nome: string }).nome, "Filamento 1");
  assert.ok(montarEntradaRapida(rapido({ filamentos: [novaLinhaFilamento({ material_id: "mat-1", peso_g: "-1" })] })).erros.length > 0);
});
await teste("\"faltam X g\": comparação informativa com o saldo; soma linhas do mesmo filamento", () => {
  const mats = montarMateriais([
    novaLinhaFilamento({ material_id: "a", peso_g: "60" }),
    novaLinhaFilamento({ material_id: "a", peso_g: "40" }),
    novaLinhaFilamento({ material_id: "b", peso_g: "10" }),
    novaLinhaFilamento({ origem: "manual", valor_kg: "100", peso_g: "500" }),
  ], 2).materiais;
  assert.deepEqual(faltaDeEstoque(mats, { a: 150, b: 100 }), [{ material_id: "a", precisa: 200, tem: 150, falta: 50 }]);
  assert.deepEqual(faltaDeEstoque(mats, { a: 200, b: 20 }), [], "saldo igual ao necessário não falta; manual não entra");
  assert.deepEqual(faltaDeEstoque(mats, {}), [], "sem saldo conhecido não afirma nada");
  assert.deepEqual(linhasDeEntrada(mats).map((l) => [l.origem, l.peso_g]), [["estoque", "120"], ["estoque", "80"], ["estoque", "20"], ["manual", "1000"]], "volta para a tela ao editar o item");
  assert.equal(linhasDeEntrada(mats)[3].valor_kg, "100");
});
await teste("resumo para WhatsApp: peça, quantidade, preço por peça e total; nunca custo ou lucro", () => {
  const t = resumoWhatsapp({ nomePeca: "Suporte de headset", quantidade: 4, precoUnidade: "R$ 12,50", precoTotal: "R$ 50,00" });
  assert.equal(t, "*Suporte de headset*\nQuantidade: 4 peças\nPreço por peça: R$ 12,50\nTotal: R$ 50,00");
  assert.match(resumoWhatsapp({ nomePeca: "", quantidade: 1, precoUnidade: "R$ 1,00", precoTotal: "R$ 1,00" }), /Quantidade: 1 peça\n/);
  assert.ok(!/custo|lucro|margem/i.test(t));
});
await teste("a tela NUNCA recalcula preço: só monta a entrada e mostra o retorno de p3d_simular_preco", () => {
  for (const arq of ARQUIVOS_CALCULADORA_RAPIDA) assert.deepEqual(precoCalculadoNoCliente(lerFonte(arq)), [], `${arq} calcula preço no cliente`);
  // O detector pega mesmo as formas óbvias (a auditoria falha com elas).
  assert.ok(precoCalculadoNoCliente("const preco = custo * multiplicador;").length > 0);
  assert.ok(precoCalculadoNoCliente("const sugerido = custo_total * (1 + markup_pct / 100);").length > 0);
  assert.ok(precoCalculadoNoCliente("const p = custoPeca / (1 - margem);").length > 0);
  assert.ok(precoCalculadoNoCliente("const x = calculo.preco_final * 1.1;").length > 0);
  assert.deepEqual(precoCalculadoNoCliente("// custo * multiplicador\nconst a = 1;"), [], "comentário não conta");
  const tela = lerFonte("components/impressao-3d/calculadora-rapida.tsx");
  assert.ok(tela.includes("simularPreco(") && tela.includes('"precificacao"') && tela.includes("setTimeout") && tela.includes("ATRASO_MS = 400"), "debounce de 400 ms chamando a RPC");
  assert.ok(tela.includes("exibido.calculo.por_unidade.preco") && tela.includes("exibido.calculo.preco_final"), "preço vem do retorno");
  assert.ok(tela.includes("Estimado") && tela.includes("Copiar resumo") && tela.includes("Criar orçamento com este cálculo"));
  assert.ok(tela.includes("usarEmOrcamento.podeUsar"), "orçamento só com módulo ligado e edição");
  assert.ok(tela.includes("salvarTarifaPadrao(") && tela.includes("Salvar como padrão"));
});
await teste("Calculadora de preço: item de menu, rótulo e modo avançado (nada removido)", () => {
  const item = MODULOS.find((m) => m.chave === "p3d_precificacao")!;
  assert.equal(item.menu[0].label, "Calculadora de preço");
  assert.deepEqual(item.abas?.map((a) => a.chave), ["calculadora", "simulador", "config"]);
  const board = lerFonte("components/impressao-3d/precificacao-board.tsx");
  assert.ok(board.includes("Modo avançado") && board.includes("<CalculadoraRapida") && board.includes("<Simulador") && board.includes("<ConfigForm"), "simulador completo e configurações continuam");
  const acao = lerFonte("app/(dashboard)/impressao-3d/precificacao/actions.ts");
  assert.ok(/salvarTarifaPadrao[\s\S]*getAcessoEdicao\("p3d_precificacao"\)[\s\S]*\.eq\("workspace_id", acesso\.workspaceId\)/.test(acao), "tarifa: guarda de edição + empresa ativa");
  assert.ok(acao.includes("tarifa_kwh: tarifa"), "grava só a tarifa");
  const op = lerFonte("lib/impressao-3d/opcoes.ts");
  assert.ok(op.includes("getOpcoesMateriaisComCusto") && op.includes("ver && custo > 0 ? custo : null"), "custo/g só com o extra custos");
});
await teste("cadastro de filamento: valor do kg → preco_compra + rolo de 1000 g; quanto comprei (kg ou g) dá a entrada", () => {
  assert.deepEqual(cadastroDeValorKg(89.9), { preco_compra: 89.9, peso_liquido_rolo_g: 1000 });
  assert.equal(custoPorKgDeG(0.0899), 89.9);
  assert.equal(paraGramas(2.5, "kg"), 2500);
  assert.equal(paraGramas(750, "g"), 750);
  assert.deepEqual(entradaDeCompraKg({ quantidade: 3, unidade: "kg", valorKg: 79.9 }), { quantidade: 3000, custoTotal: 239.7 });
  assert.deepEqual(entradaDeCompraKg({ quantidade: 500, unidade: "g", valorKg: 80 }), { quantidade: 500, custoTotal: 40 });
  assert.deepEqual(entradaDeCompraKg({ quantidade: 2, unidade: "kg", valorKg: null }), { quantidade: 2000, custoTotal: null });
  assert.equal(entradaDeCompraKg({ quantidade: 0, unidade: "kg", valorKg: 80 }), null, "zero = só cadastra");
  assert.deepEqual(entradaDeCompraUnidade({ quantidade: 4, precoUnitario: 12.5 }), { quantidade: 4, custoTotal: 50 });
  assert.deepEqual(formatarSaldoPeso(2500), { valor: 2.5, unidade: "kg" });
  assert.deepEqual(formatarSaldoPeso(480), { valor: 480, unidade: "g" });
  // Os cadastros antigos por rolo continuam funcionando.
  assert.deepEqual(entradaDeRolosComprados({ rolos: 3, pesoRoloG: 1000, precoPago: 79.9 }), { gramas: 3000, custoTotal: 239.7 });
  assert.equal(saldoEmRolos(2500, "g", 1000), 2.5);
  const acao = lerFonte("app/(dashboard)/impressao-3d/estoque/actions.ts");
  const criar = acao.slice(acao.indexOf("export async function criarMaterial"), acao.indexOf("export async function atualizarMaterial"));
  assert.ok(criar.includes('formData.get("quanto_comprei")') && criar.includes('"p3d_movimentar_estoque"') && criar.includes("p_custo_total: entrada.custoTotal"));
  assert.ok(criar.includes("peso_liquido_rolo_g: PESO_KG_G") && criar.includes("verCustos ? preco_compra : null"), "kg: rolo de 1000 g; custo só com o extra");
  assert.ok(!/estoque_atual|custo_medio|ultimo_custo/.test(acao.slice(acao.indexOf("export async function criarMaterial"), acao.indexOf("export async function alternarMaterialAtivo"))), "saldo e custo médio só pela RPC");
  assert.ok(/registrarCompraMaterial[\s\S]*p3d_movimentar_estoque[\s\S]*Nova compra/.test(acao), "nova compra = nova entrada com o valor pago");
  const tela = lerFonte("components/impressao-3d/estoque-board.tsx");
  assert.ok(tela.includes('name="quanto_comprei"') && tela.includes("Valor pago por kg") && tela.includes("Nova compra") && tela.includes("<details"));
  for (const campo of ["marca", "diametro_mm", "estoque_minimo", "fornecedor_id", "localizacao", "unidade"]) {
    assert.ok(tela.indexOf(`name="${campo}"`) > tela.indexOf("Mais opções"), `${campo} em "Mais opções"`);
  }
  assert.ok(tela.includes("Custo por kg") && tela.includes("descreverSaldo("), "lista: saldo em kg/g e custo por kg");
});
await teste("cadastro de impressora: watts na tela, kW no banco; custo/hora ao vivo; resto em Mais opções", () => {
  const tela = lerFonte("components/impressao-3d/impressoras-board.tsx");
  assert.ok(tela.includes('name="potencia_media_kw" value={wattsParaKw(watts)}') && tela.includes("kwParaWatts(item.potencia_media_kw)"));
  assert.ok(tela.includes("custoHoraImpressora(") && tela.includes("Mais opções"));
  for (const campo of ["marca", "modelo", "volume_x_mm", "bico_mm", "valor_residual", "manutencao_hora", "integracao_tipo"]) {
    assert.ok(tela.indexOf(`name="${campo}"`) > tela.indexOf("Mais opções"), `${campo} em "Mais opções"`);
  }
  assert.ok(lerFonte("app/(dashboard)/impressao-3d/impressoras/page.tsx").includes('getAcessoModulo("p3d_precificacao")'), "tarifa só para quem abre a Precificação");
});
await teste("Equipe e cofundadores: item visível e fixo, cartão em Configurações, atalho do nicho, convite com link", () => {
  assert.equal(ITENS_EMPRESA.find((i) => i.href === "/socios")?.label, "Equipe e cofundadores");
  assert.equal(itemFixo("socios"), true);
  const oculto = { itens: [{ chave: "socios", visivel: false, ordem: 0 }], abasOcultas: {} };
  const hrefs = aplicarPreferenciaMenu(gruposDoMenu(["leads"], true, false), oculto).flatMap((g) => g.itens.map((i) => i.href));
  assert.ok(hrefs.includes("/socios"), "preferência não esconde a Equipe do fundador");
  assert.ok(!gruposDoMenu(["leads"], false, true).flatMap((g) => g.itens.map((i) => i.href)).includes("/socios"), "sócio/funcionário não veem");
  assert.equal(decidirAcesso({ path: "/socios", resolucao: { status: "ok", workspaceId: WS_A, papel: "cofundador", corrigirCookie: false }, habilitados: ["p3d_estoque", "p3d_impressoras", "p3d_precificacao"], funcionarioSemVinculo: false }).tipo, "seguir", "cofundador abre a Equipe numa empresa enxuta de Impressão 3D");
  assert.equal(decidirAcesso({ path: "/socios", resolucao: { status: "ok", workspaceId: WS_A, papel: "dono", corrigirCookie: false }, habilitados: ["p3d_estoque", "p3d_impressoras", "p3d_precificacao"], funcionarioSemVinculo: false }).tipo, "seguir");
  assert.ok(lerFonte("app/(dashboard)/configuracoes/page.tsx").includes('href="/socios"') && lerFonte("app/(dashboard)/configuracoes/page.tsx").includes("Equipe e cofundadores"));
  assert.ok(atalhosConfiguracaoNicho([]).some((a) => a.href === "/socios" && a.titulo === "Equipe e cofundadores"));
  const pagina = lerFonte("app/(dashboard)/socios/page.tsx");
  assert.ok(pagina.includes("Equipe e cofundadores") && pagina.includes("mesmo poder do fundador") && pagina.includes("Aprovações"));
  const convite = lerFonte("components/socios/convidar-membro.tsx");
  assert.ok(!convite.includes("Convidar cofundador") && convite.includes("/convite/${r.token}") && convite.includes("Copiar"), "cofundador não se convida por link");
  assert.ok(lerFonte("app/(dashboard)/socios/actions.ts").includes('"convidar_membro"'));
  assert.ok(lerFonte("components/socios/equipe-section.tsx").includes("Convites pendentes") && lerFonte("components/socios/equipe-section.tsx").includes("cancelarConvite") && lerFonte("components/socios/equipe-section.tsx").includes("removerMembro"));
});
await teste("começo enxuto: cartão \"Precisa de mais?\" e frase de 1 linha por módulo na página Módulos", () => {
  assert.deepEqual([...MODULOS_OPCIONAIS], ["p3d_orcamentos", "p3d_pedidos", "p3d_producao", "p3d_fornecedores", "p3d_qualidade", "p3d_expedicao", "p3d_dashboard", "p3d_relatorios"]);
  assert.equal(modulosOpcionaisFaltando(["p3d_estoque", "p3d_impressoras", "p3d_precificacao"]).length, 8, "empresa nova: todos faltam");
  assert.deepEqual(modulosOpcionaisFaltando(["p3d_orcamentos", "p3d_pedidos"]), ["p3d_producao", "p3d_fornecedores", "p3d_qualidade", "p3d_expedicao", "p3d_dashboard", "p3d_relatorios"]);
  assert.deepEqual(modulosOpcionaisFaltando([...MODULOS_OPCIONAIS]), [], "tudo ligado: o cartão some");
  const home = lerFonte("components/dashboard-home/dashboard-home-board.tsx");
  assert.ok(home.includes("Precisa de mais?") && home.includes('href="/modulos"') && home.includes("maisModulos.length > 0"));
  assert.ok(lerFonte("lib/dashboard-home/get-overview.ts").includes('config.nichoChave === "impressao_3d" ? modulosOpcionaisFaltando(habilitados) : []'));
  for (const m of MODULOS.filter((x) => x.chave.startsWith("p3d_"))) {
    const frase = FRASE_MODULO[m.chave];
    assert.ok(frase && !frase.includes("\n") && /ficam guardados ao remover/.test(frase), `${m.chave}: frase de uma linha com a garantia dos dados`);
  }
  const mod = lerFonte("components/modulos/modulos-board.tsx");
  assert.ok(mod.includes("m.frase ?? m.descricao") && lerFonte("app/(dashboard)/modulos/page.tsx").includes("FRASE_MODULO[m.chave]"));
});
await teste("documentação da Etapa E", () => {
  const doc = lerFonte("docs/nicho-impressao-3d.md");
  for (const t of ["Etapa E", "Calculadora de preço", "Modo avançado", "Incluir também", "markup_pct", "Equipe e cofundadores", "enxuta"]) {
    assert.ok(doc.includes(t), `doc sem "${t}"`);
  }
});

console.log("\nEtapa E (parte 2) — filamentos marcados, estoque de peças, produção com vários materiais, pedidos");
await teste("simulador avançado e orçamento aceitam a lista de materiais (e mantêm o material único)", () => {
  const base = { ...ESTADO_VAZIO, material_id: "mat-unico", campos: { peso_peca_g: "50", preco_por_g: "0.1" }, quantidade: "2" };
  const unico = montarEntrada(base, null);
  assert.equal(unico.entrada.material_id, "mat-unico");
  assert.equal(unico.entrada.peso_peca_g, 50);
  assert.ok(!("materiais" in unico.entrada));
  const lista = montarEntrada({ ...base, filamentos: [novaLinhaFilamento({ material_id: "a", peso_g: "30" }), novaLinhaFilamento({ origem: "manual", nome: "Azul", valor_kg: "100", peso_g: "20" })] }, null);
  assert.deepEqual(lista.entrada.materiais, [{ material_id: "a", peso_g: 30 }, { nome: "Azul", peso_g: 20, preco_por_g: 0.1 }]);
  for (const k of ["material_id", "peso_peca_g", "preco_por_g"]) assert.ok(!(k in lista.entrada), `${k} fora do topo com a lista`);
  // Editar um item de orçamento devolve as linhas para a tela, e a lista é "do item" (não some no recalcular).
  const volta = estadoParaEdicao({ quantidade: 2, materiais: lista.entrada.materiais, peso_peca_g: 0 }, null);
  assert.equal(volta.filamentos.length, 2);
  assert.ok(entradaParaRecalculo({ materiais: [{ material_id: "a", peso_g: 1 }], tarifa_kwh: 1 }).materiais, "materiais é do item");
  const tela = lerFonte("components/impressao-3d/simulador.tsx");
  assert.ok(tela.includes("Vários filamentos no mesmo trabalho") && tela.includes("<FilamentosLista"));
});
await teste("resultado por filamento (detalhes.material.itens) e linhas da calculadora vêm da RPC", () => {
  const calc = lerCalculo({
    custos: { material: 3.5 },
    detalhes: { material: { itens: [{ material_id: "a", nome: "PLA", cor: "Preto", peso_g: 100, preco_por_g: 0.08, custo: 8.64 }, { nome: "Azul", peso_g: 10, preco_por_g: 0.1, custo: 1.08 }] } },
    por_unidade: { preco: 5 },
  });
  assert.equal(calc?.detalhes.material.itens.length, 2);
  assert.deepEqual(calc?.detalhes.material.itens[0], { material_id: "a", nome: "PLA", cor: "Preto", peso_g: 100, preco_por_g: 0.08, custo: 8.64 });
  assert.equal(calc?.detalhes.material.itens[1].material_id, null);
  assert.deepEqual(lerCalculo({ custos: {} })?.detalhes.material.itens, []);
  const tela = lerFonte("components/impressao-3d/calculadora-rapida.tsx");
  assert.ok(tela.includes("detalhes.material.itens.map") && tela.includes("<FilamentosLista") && tela.includes("faltaDeEstoque("));
  assert.ok(!tela.includes("estado.material_id") && !tela.includes("peso_rolo_g"), "campo único de material saiu da calculadora rápida");
});
await teste("Estoque com duas abas (Material e Peças), chaves estáveis, mesma permissão do módulo", () => {
  const estoque = MODULOS.find((m) => m.chave === "p3d_estoque")!;
  assert.deepEqual(estoque.abas?.map((a) => a.chave), ["materiais", "pecas", "historico"]);
  assert.equal(estoque.abas?.[0].rotulo, "Material");
  assert.equal(estoque.abas?.[1].rotulo, "Peças");
  assert.equal(abasVisiveis("p3d_estoque", { itens: [], abasOcultas: { p3d_estoque: ["materiais", "historico"] } }).join(), "pecas");
  assert.equal(abasVisiveis("p3d_estoque", { itens: [], abasOcultas: { p3d_estoque: ["materiais", "pecas", "historico"] } }).length, 1, "mínimo de 1 visível");
  const tela = lerFonte("components/impressao-3d/estoque-board.tsx");
  assert.ok(tela.includes('["materiais", "Material"], ["pecas", "Peças"]') && tela.includes("<PecasEstoque"));
  const matriz = lerFonte("lib/socios-shared.ts");
  assert.ok(!matriz.includes("p3d_pecas"), "peças usam o mesmo módulo p3d_estoque (sem módulo novo)");
});
await teste("estoque de peças: movimentos só por RPC; tipos da tela; ajuste exige sinal e motivo; saldo negativo é do banco", () => {
  assert.deepEqual(validarMovimentoPeca("entrada_manual", 5, null), { quantidade: 5 });
  assert.ok("error" in validarMovimentoPeca("entrada_manual", 0, null));
  assert.ok("error" in validarMovimentoPeca("perda", -2, null));
  assert.ok("error" in validarMovimentoPeca("perda", 1.5, null));
  assert.ok("error" in validarMovimentoPeca("ajuste", 3, null), "ajuste sem motivo");
  assert.ok("error" in validarMovimentoPeca("ajuste", 0, "contagem"));
  assert.deepEqual(validarMovimentoPeca("ajuste", -2, "contagem"), { quantidade: -2 });
  assert.equal(pecaAbaixoDoMinimo({ quantidade: 3, estoque_minimo: 3 }), true);
  assert.equal(pecaAbaixoDoMinimo({ quantidade: 0, estoque_minimo: 0 }), false, "mínimo 0 = sem alerta");
  const numeros = { producao: { p1: 7 }, pedido: { o1: 12 } };
  assert.equal(origemMovimentoPeca({ tipo: "producao", referencia_tipo: "producao", referencia_id: "p1" }, numeros), "Produção #7");
  assert.equal(origemMovimentoPeca({ tipo: "venda", referencia_tipo: "pedido", referencia_id: "o1" }, numeros), "Pedido #12");
  assert.equal(origemMovimentoPeca({ tipo: "venda", referencia_tipo: "pedido", referencia_id: "x" }, numeros), "Pedido");
  assert.equal(origemMovimentoPeca({ tipo: "entrada_manual", referencia_tipo: null, referencia_id: null }, numeros), "Manual");
  assert.equal(textoPecasEntraram(1), "1 peça entrou no estoque de peças.");
  assert.equal(textoPecasEntraram(4), "4 peças entraram no estoque de peças.");
  const acao = lerFonte("app/(dashboard)/impressao-3d/estoque/actions.ts");
  const pecas = acao.slice(acao.indexOf("// --- Estoque de peças"));
  assert.ok(pecas.includes('"p3d_movimentar_pecas"') && pecas.includes('getAcessoEdicao(MODULO)') && pecas.includes('getAcessoEdicao("p3d_produtos")'));
  assert.ok(!/\bquantidade:|custo_medio:/.test(pecas.slice(pecas.indexOf("export async function criarPecaEstoque"), pecas.indexOf("export async function atualizarPecaEstoque"))), "insert direto sem quantidade/custo");
  assert.ok(/\.update\(\{ estoque_minimo: parsed\.data\.estoque_minimo, localizacao: parsed\.data\.localizacao \}\)/.test(pecas), "update direto só de mínimo e localização");
  assert.ok(!pecas.includes("producao") || !/p_tipo: "(producao|venda)"/.test(pecas), "produção e venda nunca daqui");
  assert.ok(pecas.includes("custo_unitario !== null && custo_unitario > 0 && !podeVerCustos(acesso)"), "custo por peça só com o extra custos");
  const tela = lerFonte("components/impressao-3d/pecas-estoque.tsx");
  assert.ok(tela.includes("Nova peça no estoque") && tela.includes("Entrada manual") && tela.includes("Perda") && tela.includes("Ajuste") && tela.includes("criarProdutoRapido") && tela.includes("/modulos"), "ações, produto rápido e convite a Produtos");
  assert.ok(tela.includes("origemMovimentoPeca("), "histórico com origem");
  const pagina = lerFonte("app/(dashboard)/impressao-3d/estoque/page.tsx");
  assert.ok(pagina.includes("custo_medio`") && pagina.includes("verCustos ?"), "custo médio das peças só com o extra");
});
await teste("produção com vários materiais: linhas do trabalho, consumo de todos, conclusão multi", () => {
  const id1 = "11111111-1111-4111-8111-111111111111";
  const id2 = "22222222-2222-4222-8222-222222222222";
  const ok = lerLinhasTrabalho(JSON.stringify([{ material_id: id1, peso_estimado_g: 100 }, { material_id: id2, peso_estimado_g: 20.5 }]));
  assert.equal(ok.erro, null);
  assert.equal(pesoTotalLinhas(ok.linhas), 120.5);
  assert.ok(lerLinhasTrabalho(JSON.stringify([{ material_id: id1, peso_estimado_g: 1 }, { material_id: id1, peso_estimado_g: 2 }])).erro, "filamento repetido");
  assert.ok(lerLinhasTrabalho(JSON.stringify([{ material_id: "x", peso_estimado_g: 1 }])).erro, "id inválido");
  assert.ok(lerLinhasTrabalho(JSON.stringify([{ material_id: id1, peso_estimado_g: 0 }])).erro, "peso zero");
  assert.ok(lerLinhasTrabalho("{").erro, "JSON torto");
  assert.deepEqual(lerLinhasTrabalho("").linhas, []);
  assert.deepEqual(linhasParaTrabalho([novaLinhaFilamento({ material_id: id1, peso_g: "10" }), novaLinhaFilamento({ peso_g: "" })]).linhas, [{ material_id: id1, peso_estimado_g: 10 }]);
  assert.ok(linhasParaTrabalho([novaLinhaFilamento({ peso_g: "10" })]).erros.length > 0, "peso sem filamento");
  // Consumo da conclusão: TODOS os materiais, cada um com peso real (zero vale), sem repetir.
  const consumos = montarConsumos([{ material_id: id1, peso_real_g: "98,5" }, { material_id: id2, peso_real_g: "0" }], [id1, id2]);
  assert.deepEqual(consumos, { consumos: [{ material_id: id1, peso_real_g: 98.5 }, { material_id: id2, peso_real_g: 0 }], erros: [] });
  assert.ok(montarConsumos([{ material_id: id1, peso_real_g: "98" }], [id1, id2]).erros.length > 0, "falta um filamento");
  assert.ok(montarConsumos([{ material_id: id1, peso_real_g: "" }], [id1]).erros.length > 0, "peso vazio");
  assert.ok(montarConsumos([{ material_id: id1, peso_real_g: "-1" }], [id1]).erros.length > 0);
  assert.ok(montarConsumos([{ material_id: id1, peso_real_g: "1" }, { material_id: id1, peso_real_g: "2" }], [id1]).erros.length > 0, "repetido");
  // Retorno de p3d_concluir_producao_multi e avisos.
  const r = lerConclusaoMulti({ peso_total_g: 118.5, estoque_negativo: false, abaixo_do_minimo: true, manutencao_devida: true, pecas_estoque: { saldo: 6, custo_medio: 3.2 } });
  assert.equal(r.peso_total_g, 118.5);
  assert.deepEqual(r.pecas_estoque, { saldo: 6, custo_medio: 3.2 });
  const avisos = avisosConclusaoMulti(r, 4, (n) => String(n));
  assert.ok(avisos.some((a) => /abaixo do estoque mínimo/.test(a)) && avisos.some((a) => /manutenção/.test(a)));
  assert.ok(avisos.includes("4 peças entraram no estoque de peças (saldo: 6)."));
  assert.equal(avisosConclusaoMulti(lerConclusaoMulti({ estoque_negativo: true }), 1, String).some((a) => /NEGATIVO/.test(a)), true);
  assert.equal(lerConclusaoMulti(null).pecas_estoque, null);
  // Código: a action confere os materiais, usa a RPC multi e divide a falha só no banco.
  const acao = lerFonte("app/(dashboard)/impressao-3d/producao/actions.ts");
  assert.ok(acao.includes('rpc("p3d_concluir_producao_multi"') && acao.includes("p_consumos: montado.consumos"));
  assert.ok(acao.indexOf('.from("p3d_producao_materiais")') < acao.indexOf('rpc("p3d_concluir_producao"'), "conclusão simples só depois de conferir os materiais");
  assert.ok(acao.includes("Este trabalho tem vários filamentos"), "conclusão simples recusada com materiais");
  assert.ok(acao.includes("material_id: null") && acao.includes("pesoTotalLinhas("), "com a lista, material único nulo");
  assert.ok(!/peso_real_g/.test(acao.slice(acao.indexOf("export async function criarTrabalho"), acao.indexOf("/** Só trabalho na fila */") > 0 ? acao.indexOf("/** Só trabalho na fila */") : acao.indexOf("export async function excluirTrabalho"))), "peso real nunca vai em insert/update direto");
  const quadro = lerFonte("components/impressao-3d/producao-board.tsx");
  assert.ok(quadro.includes("FormConcluirMulti") && quadro.includes("Produzir para o estoque de peças") && quadro.includes("dividido proporcionalmente"));
  assert.ok(quadro.includes("name=\"filamentos\"") && quadro.includes("somenteEstoque"));
  const pagina = lerFonte("app/(dashboard)/impressao-3d/producao/page.tsx");
  assert.ok(pagina.includes('.from("p3d_producao_materiais")') && pagina.includes('.eq("workspace_id", ws)'));
});
await teste("pedidos: Em estoque, baixar e devolver peças (pedido E estoque), chip por item, sem botões sem permissão", () => {
  assert.equal(chaveEstoquePeca("p", null), "p|");
  assert.equal(chaveEstoquePeca("p", "v"), "p|v");
  const itens = [
    { produto_id: "p", pecas_baixadas_em: null },
    { produto_id: "q", pecas_baixadas_em: "2026-01-01" },
    { produto_id: null, pecas_baixadas_em: null },
  ];
  assert.equal(itensBaixaveis(itens), 1);
  assert.equal(itensBaixados(itens), 1);
  assert.deepEqual(lerBaixaPecas({ itens_baixados: 2, itens_sem_produto_ignorados: 1 }), { itens_baixados: 2, itens_sem_produto_ignorados: 1 });
  assert.deepEqual(lerBaixaPecas(null), { itens_baixados: 0, itens_sem_produto_ignorados: 0 });
  assert.deepEqual(lerDevolucaoPecas({ itens_devolvidos: 3 }), { itens_devolvidos: 3 });
  assert.equal(textoBaixa({ itens_baixados: 1, itens_sem_produto_ignorados: 0 }), "1 item baixado do estoque de peças.");
  assert.match(textoBaixa({ itens_baixados: 2, itens_sem_produto_ignorados: 1 }), /2 itens baixados.*1 item sem produto foi ignorado/);
  const acoes = lerFonte("app/(dashboard)/impressao-3d/pedidos/actions.ts");
  assert.ok(/baixarPecasPedido[\s\S]*getAcessoEdicao\(MODULO\)[\s\S]*getAcessoEdicao\("p3d_estoque"\)[\s\S]*p3d_baixar_pecas_pedido/.test(acoes), "baixa: edição em Pedidos E em Estoque");
  assert.ok(/devolverPecasPedido[\s\S]*getAcessoEdicao\("p3d_estoque"\)[\s\S]*p3d_devolver_pecas_pedido/.test(acoes));
  assert.ok(acoes.includes("mensagemRpc(error, \"Não foi possível baixar as peças do estoque.\")"), "erro do banco como veio");
  const tela = lerFonte("components/impressao-3d/pedido-detalhe.tsx");
  assert.ok(tela.includes("Baixar do estoque de peças") && tela.includes("Devolver peças ao estoque") && tela.includes("Baixado do estoque") && tela.includes("Em estoque:"));
  assert.ok(tela.includes("podeBaixarPecas && pedido.status") && tela.includes("!item.pecas_baixadas_em"), "botões só com permissão; item baixado não edita");
  const pagina = lerFonte("app/(dashboard)/impressao-3d/pedidos/[id]/page.tsx");
  assert.ok(pagina.includes('getAcessoEdicao("p3d_estoque")') && pagina.includes("podeBaixarPecas={podeEditar && !!acessoEstoqueEdicao}") && pagina.includes('.from("p3d_pecas_estoque")'));
  assert.ok(lerFonte("lib/impressao-3d/tipos-operacao.ts").includes("pecas_baixadas_em"));
});
await teste("a tela nunca recalcula saldo nem preço (detector da auditoria)", () => {
  for (const arq of ARQUIVOS_SEM_SALDO_NO_CLIENTE) assert.deepEqual(saldoCalculadoNoCliente(lerFonte(arq)), [], `${arq} recalcula saldo`);
  assert.ok(saldoCalculadoNoCliente("const saldoApos = saldo + delta;").length > 0);
  assert.ok(saldoCalculadoNoCliente("peca.quantidade -= 1;").length > 0);
  assert.ok(saldoCalculadoNoCliente("const emEstoque = peca.quantidade - vendidas;").length > 0);
  assert.deepEqual(saldoCalculadoNoCliente("// saldoApos = saldo + delta\nconst a = 1;"), []);
  const audit = lerFonte("scripts/auditar-isolamento.mts");
  for (const t of ["p3d_pecas_estoque", "p3d_movimentos_pecas", "p3d_producao_materiais", "pecas_baixadas_em", "p3d_concluir_producao_multi"]) assert.ok(audit.includes(t), `auditoria cobre ${t}`);
  assert.ok(audit.includes('["quantidade", "custo_medio"]') && audit.includes('["peso_real_g"]'));
});
await teste("Primeiros passos: filamento com valor do kg, entrada de estoque, impressora e produto", () => {
  const passos = montarPassos({ precificacao: false, impressora: false, material: false, entrada_estoque: false, produto: false, orcamento: false, pedido: false }, ["p3d_estoque", "p3d_impressoras", "p3d_precificacao", "p3d_produtos"]);
  assert.deepEqual(passos.map((p) => p.chave), ["material", "entrada_estoque", "impressora", "precificacao", "produto"]);
  assert.match(passos[0].titulo, /filamento.*valor do kg/i);
  assert.ok(lerFonte("lib/impressao-3d/primeiros-passos.ts").includes('.gt("preco_compra", 0)'), "filamento com valor do kg = preco_compra > 0");
});
await teste("documentação da Etapa E (parte 2)", () => {
  const doc = lerFonte("docs/nicho-impressao-3d.md");
  for (const t of ["Filamentos marcados", "p_entrada.materiais", "Estoque de peças", "p3d_movimentar_pecas", "p3d_concluir_producao_multi", "p3d_baixar_pecas_pedido", "Valor pago por kg"]) {
    assert.ok(doc.includes(t), `doc sem "${t}"`);
  }
});

console.log("\nEquipe e cofundadores — item sempre visível para fundador e cofundador");
const MODULOS_MINIMOS = ["p3d_estoque", "p3d_impressoras", "p3d_precificacao", "p3d_produtos"];
const hrefsDe = (grupos: { itens: { href: string }[] }[]) => grupos.flatMap((g) => g.itens.map((i) => i.href));
await teste("o item existe no menu de fundador e cofundador em empresa com módulos mínimos, só do nicho e sem nenhum módulo", () => {
  for (const modulos of [MODULOS_MINIMOS, ["p3d_estoque"], [], ["leads", "renegados", "clientes", "agenda", "vendedores"]]) {
    // Fundador (dono) e cofundador têm o mesmo painel: painelCompleto = true, não restrito.
    const grupos = gruposDoMenu(modulos, true, false);
    assert.ok(hrefsDe(grupos).includes("/socios"), `Equipe em [${modulos.join(",")}]`);
    const empresa = grupos.find((g) => g.titulo === GRUPO_EMPRESA);
    assert.ok(empresa, "bloco Empresa existe");
    assert.deepEqual(empresa.itens.map((i) => i.label), ["Módulos", "Equipe e cofundadores", "Aprovações", "Configurações"]);
    // Visão Geral, Módulos, Equipe e Configurações vêm juntos no bloco fixo.
    assert.ok(hrefsDe(grupos).includes("/dashboard") && hrefsDe(grupos).includes("/modulos") && hrefsDe(grupos).includes("/configuracoes"));
  }
});
await teste("sócio, funcionário e vendedor não veem o item", () => {
  for (const modulos of [MODULOS_MINIMOS, []]) {
    assert.ok(!hrefsDe(gruposDoMenu(modulos, false, true)).includes("/socios"), "restrito (sócio/funcionário)");
    assert.ok(!hrefsDe(gruposDoMenu(modulos, false, false)).includes("/socios"), "sem painel e sem restrição (vendedor)");
  }
  for (const papel of ["socio", "funcionario", "comercial"] as const) {
    const d = decidirAcesso({ path: "/socios", resolucao: { status: "ok", workspaceId: WS_A, papel, corrigirCookie: false }, habilitados: MODULOS_MINIMOS, permissoes: MODULOS_MINIMOS, permiteMembros: MODULOS_MINIMOS, funcionarioSemVinculo: false });
    assert.equal(d.tipo, "redirecionar", `${papel} não abre /socios`);
  }
});
await teste("o item não pode ser ocultado em Personalizar navegação (nem por preferência já gravada)", () => {
  assert.equal(itemFixo("socios"), true);
  assert.ok((ITENS_FIXOS as readonly string[]).includes("socios"));
  const tudoOculto = { itens: ["dashboard", "modulos", "socios", "aprovacoes", "configuracoes"].map((chave, ordem) => ({ chave, visivel: false, ordem })), abasOcultas: {} };
  for (const modulos of [MODULOS_MINIMOS, []]) {
    const hrefs = hrefsDe(aplicarPreferenciaMenu(gruposDoMenu(modulos, true, false), tudoOculto));
    for (const h of ["/dashboard", "/modulos", "/socios", "/configuracoes"]) assert.ok(hrefs.includes(h), `${h} continua`);
    assert.ok(!hrefs.includes("/aprovacoes"), "só os itens fixos são imunes");
  }
  const prep = prepararPreferencia(tudoOculto, { itensVisiveis: ["dashboard", "modulos", "socios", "aprovacoes", "configuracoes"], chavesComAbas: [] }, null);
  assert.ok(prep.ok);
  if (prep.ok) assert.equal(prep.pref.itens.find((i) => i.chave === "socios")?.visivel, true, "gravado visível");
  const nav = lerFonte("components/empresa/navegacao-board.tsx");
  assert.ok(nav.includes("fixo"), "a tela de personalização trata item fixo");
});
await teste("a rota /socios é liberada no proxy para fundador e cofundador, com qualquer conjunto de módulos", () => {
  for (const papel of ["dono", "cofundador"] as const) {
    for (const habilitados of [MODULOS_MINIMOS, ["p3d_estoque"], []]) {
      const d = decidirAcesso({ path: "/socios", resolucao: { status: "ok", workspaceId: WS_A, papel, corrigirCookie: false }, habilitados, funcionarioSemVinculo: false });
      assert.equal(d.tipo, "seguir", `${papel} abre /socios com [${habilitados.join(",")}]`);
    }
  }
  assert.equal(rotaPermitida("/socios", []), true, "rota livre: não depende de módulo");
  assert.equal(precisaDeModulos("/socios"), false, "o proxy nem lê módulos para abri-la");
  // A página confere o painel no servidor (fundador/cofundador) e o layout monta o bloco só com painel.
  const pagina = lerFonte("app/(dashboard)/socios/page.tsx");
  assert.ok(pagina.includes("getEmpresaPainel()") && !pagina.includes("getAcessoModulo"), "página só do painel, sem módulo");
  assert.ok(lerFonte("app/(dashboard)/layout.tsx").includes("painelCompleto={!!painel}"));
});
await teste("barra lateral: só o rodapé é fixo; cabeçalho, busca, seletores e TODOS os grupos (inclusive Empresa) rolam juntos", () => {
  const side = lerFonte("components/sidebar.tsx");
  const iAside = side.indexOf("<aside");
  const iRol = side.indexOf("data-sidebar-scroll");
  const iNav = side.indexOf("<nav aria-label=\"Menu principal\"");
  const iFimNav = side.indexOf("</nav>");
  const iRodape = side.indexOf("{/* Rodapé fixo");
  assert.ok(iAside > 0 && iRol > iAside && iNav > iRol && iFimNav > iNav && iRodape > iFimNav, "ordem: aside > área rolável > nav > rodapé");
  assert.ok(/<aside className="flex h-dvh w-64 shrink-0 flex-col/.test(side), "aside: altura da tela (dvh) em coluna");
  assert.ok(/className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"/.test(side), "área rolável: min-h-0 + flex-1 + overflow-y-auto");
  assert.equal((side.match(/overflow-y-auto/g) ?? []).length, 1, "uma única área rolável");
  const rolavel = side.slice(iRol, iRodape);
  for (const parte of ["data-sidebar-header", "<GlobalSearch", "<EmpresaSwitcher", "<ModeSwitcher", "gruposMenu.map("]) assert.ok(rolavel.includes(parte), `${parte} dentro da área rolável`);
  assert.ok(!side.includes("data-menu-fixo") && !side.includes("gruposRolaveis") && !side.includes("grupoEmpresa"), "o bloco Empresa não é mais fixo: rola com os demais");
  const rodape = side.slice(iRodape);
  assert.ok(/className="shrink-0 border-t border-zinc-900/.test(rodape), "rodapé shrink-0 com borda superior");
  for (const item of ["{userEmail}", "Personalizar navegação", "Entrar numa empresa com código", "Sair"]) assert.ok(rodape.includes(item), `rodapé tem ${item}`);
  for (const fora of ["<GlobalSearch", "gruposMenu.map(", "<EmpresaSwitcher"]) assert.ok(!rodape.includes(fora), `${fora} não está no rodapé`);
  assert.ok(lerFonte("app/(dashboard)/layout.tsx").includes('<div className="flex h-dvh overflow-hidden">'), "layout em dvh");
});
await teste("barra de rolagem fina e discreta no tema escuro (tokens do app), sem layout shift", () => {
  const css = lerFonte("app/globals.css");
  const bloco = css.slice(css.indexOf(".sidebar-scroll {"));
  assert.ok(/scrollbar-width:\s*thin/.test(bloco) && /scrollbar-gutter:\s*stable/.test(bloco));
  assert.ok(/scrollbar-color:\s*var\(--scrollbar-polegar\) var\(--scrollbar-trilho\)/.test(bloco), "polegar translúcido sobre trilho transparente");
  assert.ok(/\.sidebar-scroll:hover\s*\{\s*scrollbar-color:\s*var\(--scrollbar-polegar-hover\)/.test(bloco), "clareia no hover");
  for (const pseudo of ["::-webkit-scrollbar {", "::-webkit-scrollbar-track {", "::-webkit-scrollbar-thumb {", "::-webkit-scrollbar-thumb:hover {"]) assert.ok(bloco.includes(`.sidebar-scroll${pseudo}`), pseudo);
  assert.ok(/--scrollbar-trilho:\s*transparent/.test(css) && /--scrollbar-polegar:\s*rgb\(63 63 70/.test(css), "tokens: trilho transparente, polegar zinc translúcido");
  assert.ok(!/scrollbar[^;]*(#fff|white)/i.test(bloco), "nada de barra branca");
});
await teste("o item ativo fica visível (nearest, sem animar na 1ª carga) e a rolagem não volta ao topo", () => {
  const side = lerFonte("components/sidebar.tsx");
  assert.ok(side.includes('aria-current={isActive ? "page" : undefined}'));
  assert.ok(side.includes('querySelector<HTMLElement>(\'[aria-current="page"]\')') && side.includes('block: "nearest"'));
  assert.ok(side.includes('behavior: primeiraVez.current || reduzir ? "auto" : "smooth"') && side.includes("prefers-reduced-motion"));
  assert.ok(side.includes("lerRolagem(window.sessionStorage)") && side.includes("gravarRolagem(window.sessionStorage"), "posição preservada se a barra remontar");
  // Helpers puros: nunca lançam e ignoram lixo.
  const memoria = new Map<string, string>();
  const storage = { getItem: (k: string) => memoria.get(k) ?? null, setItem: (k: string, v: string) => void memoria.set(k, v) };
  assert.equal(lerRolagem(storage), 0);
  gravarRolagem(storage, 123.6);
  assert.equal(lerRolagem(storage), 124);
  memoria.set(CHAVE_ROLAGEM_SIDEBAR, "lixo");
  assert.equal(lerRolagem(storage), 0);
  memoria.set(CHAVE_ROLAGEM_SIDEBAR, "-5");
  assert.equal(lerRolagem(storage), 0);
  gravarRolagem(storage, NaN);
  gravarRolagem(storage, -1);
  assert.equal(memoria.get(CHAVE_ROLAGEM_SIDEBAR), "-5", "valor inválido não é gravado");
  const bloqueado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.equal(lerRolagem(bloqueado), 0);
  assert.doesNotThrow(() => gravarRolagem(bloqueado, 10));
  assert.equal(lerRolagem(null), 0);
  assert.doesNotThrow(() => gravarRolagem(undefined, 10));
});
await teste("foco por teclado visível dentro da área rolável (ring inset) e sem rolagem horizontal", () => {
  const side = lerFonte("components/sidebar.tsx");
  assert.ok((side.match(/focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-copper-500/g) ?? []).length >= 4, "itens do menu e 3 itens do rodapé");
  assert.ok(side.includes("overflow-x-hidden"));
});
await teste("os dois sinos: funções diferentes, rótulos e tooltips distintos, popovers fixos (não cortados pela área rolável)", () => {
  const alertas = lerFonte("components/impressao-3d/sino-alertas.tsx");
  const pedidos = lerFonte("components/vendedor/solicitacoes-bell.tsx");
  assert.ok(alertas.includes('title="Alertas do nicho:') && alertas.includes('"Alertas do nicho"') && alertas.includes("Alertas da operação"));
  assert.ok(pedidos.includes('title="Aprovações e pedidos de acesso pendentes"') && pedidos.includes("Aprovações e pedidos de acesso pendentes: "));
  assert.notEqual(alertas.match(/aria-label=\{total[^}]*\}/)?.[0], pedidos.match(/aria-label=\{\s*total[\s\S]*?\}/)?.[0]);
  for (const f of [alertas, pedidos]) {
    assert.ok(f.includes("usePopoverFixo(") && /className="fixed z-50/.test(f) && f.includes("style={{ top: pos.top, left: pos.left }}"), "popover fixed");
    assert.ok(!/className="absolute left-3 top-full/.test(f));
  }
  const hook = lerFonte("lib/hooks/use-popover-fixo.ts");
  assert.ok(hook.includes("[data-sidebar-header]") && hook.includes('addEventListener("scroll", calcular, true)'));
});
await teste("tela de equipe: fundadores + membros sem repetir, fundador original não sai, erros das RPCs como vieram", () => {
  const membros = [
    { membroId: "u2", email: "co@x.com", nome: "Co", papel: "cofundador", createdAt: "", permissoes: [] },
    { membroId: "u3", email: "so@x.com", nome: "So", papel: "socio", createdAt: "", permissoes: [] },
  ];
  const fundadores = [
    { user_id: "u1", nome: "Miguel", email: "m@x.com", papel: "dono" },
    { user_id: "u2", nome: "Co", email: "CO@x.com", papel: "cofundador" },
  ];
  const pessoas = montarPessoas(fundadores, membros);
  assert.deepEqual(pessoas.map((p) => [p.email, p.papel]), [["m@x.com", "dono"], ["co@x.com", "cofundador"], ["so@x.com", "socio"]], "sem repetir pelo e-mail, fundador primeiro");
  assert.equal(pessoas[0].semMembro, true);
  assert.equal(pessoaRemovivel(pessoas[0], "u9"), false, "fundador original não é removível");
  assert.equal(pessoaRemovivel(pessoas[1], "u9"), true, "cofundador é removível (a RPC e a aprovação conferem)");
  assert.equal(pessoaRemovivel(pessoas[1], "u2"), false, "ninguém remove a si mesmo");
  assert.equal(pessoaRemovivel(pessoas[2], "u9"), true);
  assert.equal(sociosErrorMessage("Esta ação exige a aprovação dos fundadores da empresa."), "Esta ação exige a aprovação dos fundadores da empresa.", "mensagem do banco como veio");
  assert.equal(sociosErrorMessage("  E-mail já convidado.  "), "E-mail já convidado.");
  assert.match(sociosErrorMessage(""), /Não foi possível concluir/);
  assert.match(sociosErrorMessage("not_authenticated"), /Sessão expirada/);
  const acoes = lerFonte("app/(dashboard)/socios/actions.ts");
  for (const rpc of ["convidar_membro", "cancelar_convite_empresa", "remover_membro", "atualizar_permissoes_membro"]) assert.ok(acoes.includes(`"${rpc}"`), rpc);
  const pagina = lerFonte("app/(dashboard)/socios/page.tsx");
  for (const rpc of ["listar_membros_empresa", "listar_convites_empresa"]) assert.ok(pagina.includes(`"${rpc}"`), rpc);
  assert.ok(pagina.includes("getFundadores(") && pagina.includes("montarPessoas("));
  assert.ok(!/\.from\("(membros|convites)"\)/.test(acoes + pagina + lerFonte("components/socios/equipe-section.tsx") + lerFonte("components/socios/convidar-membro.tsx")), "nada escreve direto em membros/convites");
});
await teste("convite: com 1 fundador mostra o link /convite/<token> (copiar + mensagem); com 2+ explica a aprovação", () => {
  const f = lerFonte("components/socios/convidar-membro.tsx");
  assert.ok(f.includes("/convite/${r.token}") && f.includes("window.location.origin") && f.includes("Copiar"));
  assert.ok(f.includes("Envie este link para a pessoa. Ela precisa criar a conta com este mesmo e-mail e abrir o link. O app não envia e-mail."));
  assert.ok(f.includes("qtdFundadores >= 2") && f.includes("vai para aprovação de todos em Aprovações") && f.includes("Convite enviado para aprovação"));
  const acao = lerFonte("app/(dashboard)/socios/actions.ts");
  assert.ok(acao.includes('typeof data !== "string" || !data) return ENVIADO'), "RPC devolveu NULL = pendente; token = link");
  assert.ok(!f.includes("Convidar cofundador") && f.includes("Convidar sócio ou funcionário por link"));
  const eq = lerFonte("components/socios/equipe-section.tsx");
  assert.ok(eq.includes("Convites pendentes") && eq.includes("cancelarConvite") && eq.includes("expira em") && eq.includes("Pessoas da empresa") && eq.includes("removerMembro") && eq.includes("atualizarPermissoesMembro"));
  assert.ok(lerFonte("components/socios/matriz-permissoes.tsx").includes("nenhum módulo ligado nesta empresa aceita permissão".replace("nenhum", "Nenhum")) || lerFonte("components/socios/matriz-permissoes.tsx").includes("Nenhum módulo ligado nesta empresa"), "matriz vazia não cita Leads/Agenda");
  assert.ok(!lerFonte("components/socios/matriz-permissoes.tsx").includes("renegados"));
});
await teste("a auditoria falha em escrita direta em membros/convites (todas as pastas, só a exceção conhecida)", () => {
  const audit = lerFonte("scripts/auditar-isolamento.mts");
  assert.ok(audit.includes('const TABELAS_DE_EQUIPE = ["membros", "convites", "perfis_tipos_ativos", "solicitacoes_vendedor", "workspace_codigos_cofundador"]'));
  assert.ok(audit.includes('for (const pasta of ["app", "components", "lib", "proxy.ts"])') && audit.includes("if (naoPermitidas.length) process.exitCode = 1;"));
  assert.ok(audit.includes('"lib/perfil.ts"') && !audit.includes('"components/socios'), "a tela de equipe não tem exceção");
});

console.log("\nCofundador por código — gerar, digitar, aprovar");
await teste("validade do código: 1 h, 24 h, 72 h (padrão) e 7 dias; a RPC aceita de 1 a 168", () => {
  assert.deepEqual(VALIDADES_CODIGO_COFUNDADOR.map((v) => v.horas), [1, 24, 72, 168]);
  assert.equal(VALIDADE_PADRAO_HORAS, 72);
  for (const h of [1, 24, 72, 168]) assert.equal(validadeValida(h), true, String(h));
  for (const h of [0, -1, 169, 1.5, NaN, "72", null, undefined]) assert.equal(validadeValida(h), false, String(h));
});
await teste("retorno de gerar_codigo_cofundador ({ codigo, expira_em }) e código ativo lido da tabela", () => {
  assert.deepEqual(lerCodigoGerado({ codigo: "ABCDE-12345", expira_em: "2026-11-02T10:00:00Z" }), { codigo: "ABCDE-12345", expiraEm: "2026-11-02T10:00:00Z" });
  for (const ruim of [null, undefined, "x", [], {}, { codigo: "" , expira_em: "x" }, { codigo: "A" }]) assert.equal(lerCodigoGerado(ruim), null);
  const agora = "2026-11-01T12:00:00Z";
  const linha = (o: Record<string, unknown>) => ({ id: "i", codigo: "C", expira_em: "2026-11-02T00:00:00Z", usado_em: null, cancelado_em: null, ...o }) as Parameters<typeof codigoAtivo>[0][number];
  assert.equal(codigoAtivo([linha({})], agora)?.codigo, "C", "ativo: não usado, não cancelado, dentro da validade");
  assert.equal(codigoAtivo([linha({ usado_em: "2026-11-01T00:00:00Z" })], agora), null, "usado (uso único)");
  assert.equal(codigoAtivo([linha({ cancelado_em: "2026-11-01T00:00:00Z" })], agora), null, "cancelado");
  assert.equal(codigoAtivo([linha({ expira_em: "2026-11-01T11:59:59Z" })], agora), null, "expirado");
  assert.equal(codigoAtivo([], agora), null);
  assert.equal(codigoAtivo([linha({ id: "a", codigo: "VELHO", expira_em: "2026-11-01T13:00:00Z" }), linha({ id: "b", codigo: "NOVO", expira_em: "2026-11-03T00:00:00Z" })], agora)?.codigo, "NOVO", "o de maior validade");
});
await teste("tela: Adicionar cofundador por código (gerar, validade, copiar, cancelar, gerar novo) e instrução", () => {
  const t = lerFonte("components/socios/cofundador-codigo.tsx");
  assert.ok(t.includes("Adicionar cofundador por código") && t.includes("Gerar código") && t.includes("Gerar novo código") && t.includes("Cancelar código") && t.includes("Copiar"));
  assert.ok(t.includes("VALIDADES_CODIGO_COFUNDADOR") && t.includes("VALIDADE_PADRAO_HORAS") && t.includes("gerarCodigoCofundador(horas)") && t.includes("cancelarCodigoCofundador()"));
  assert.ok(t.includes("Passe este código para a pessoa. Ela entra no Hub (cria a conta, se não tiver), abre") && t.includes("Entrar numa empresa com") && t.includes("O código vale uma única vez e expira."));
  assert.ok(t.includes("invalida o código atual"), "gerar novo invalida o anterior");
  const acao = lerFonte("app/(dashboard)/socios/actions.ts");
  const gerar = acao.slice(acao.indexOf("export async function gerarCodigoCofundador"));
  assert.ok(gerar.includes('rpc("gerar_codigo_cofundador"') && gerar.includes("p_ws: empresa.workspaceId") && gerar.includes("p_validade_horas: validadeHoras") && gerar.includes('rpc("cancelar_codigo_cofundador"'));
  assert.ok(gerar.includes("getEmpresaPainel()") && gerar.includes("sociosErrorMessage(error.message)"), "só painel; erro do banco como veio");
  const pagina = lerFonte("app/(dashboard)/socios/page.tsx");
  assert.ok(pagina.includes('.from("workspace_codigos_cofundador")') && pagina.includes('.eq("workspace_id", ws)') && pagina.includes('.is("usado_em", null)') && pagina.includes('.is("cancelado_em", null)') && pagina.includes('.gt("expira_em", agoraIso)'), "código ativo lido da tabela, por empresa");
});
await teste("cofundador NÃO se convida por link/e-mail: formulário e action só aceitam sócio e funcionário", () => {
  const f = lerFonte("components/socios/convidar-membro.tsx");
  assert.ok(f.includes('const papeis: PapelConvidavel[] = ["socio", "funcionario"]'));
  assert.ok(!/value="cofundador"|"cofundador"\]/.test(f), "sem a opção Cofundador");
  assert.ok(f.includes("não há convite por link para cofundador"));
  const acao = lerFonte("app/(dashboard)/socios/actions.ts");
  assert.ok(acao.includes('z.enum(["socio", "funcionario"]') && !acao.includes('z.enum(["socio", "funcionario", "cofundador"]'));
  assert.deepEqual(Object.keys(PAPEL_CONVIDAVEL_ROTULO), ["socio", "funcionario"]);
});
await teste("pedidos de cofundador pendentes: lista com e-mail e data, Aprovar com confirmação, Recusar, aviso de 2+ fundadores", () => {
  assert.equal(textoConfirmarCofundador("ana@x.com"), "Cofundador tem o MESMO poder do fundador: pode alterar a empresa, convidar e remover pessoas. Confirme que o e-mail ana@x.com é a pessoa certa.");
  assert.match(textoConfirmarCofundador(null), /\(sem e-mail\)/);
  const t = lerFonte("components/socios/pedidos-cofundador.tsx");
  assert.ok(t.includes("Pedidos de cofundador pendentes") && t.includes("Aprovar") && t.includes("Recusar") && t.includes("textoConfirmarCofundador(p.email)") && t.includes("Confirmar e aprovar"));
  assert.ok(t.includes("qtdFundadores >= 2") && t.includes("/aprovacoes") && t.includes("responderSolicitacaoAcesso(p.id, aprovar)"));
  const pagina = lerFonte("app/(dashboard)/socios/page.tsx");
  assert.ok(pagina.includes('.from("solicitacoes_vendedor")') && pagina.includes('.eq("papel_solicitado", "cofundador")') && pagina.includes('.eq("status", "pendente")') && pagina.includes('.eq("workspace_id", ws)'));
  const resp = lerFonte("lib/actions/vendedor-codigo.ts");
  assert.ok(resp.includes('rpc("responder_solicitacao_acesso"') && resp.includes("exigeAprovacao(supabase, workspaceId)") && resp.includes("pendente ? { ok: true, pendente: true }"), "2+ fundadores: vira aprovação em /aprovacoes");
});
await teste("sino, Vendedores e Visão Geral: pedido de cofundador aparece como COFUNDADOR e não como vendedor", () => {
  assert.equal(ehPedidoCofundador({ papel_solicitado: "cofundador" }), true);
  assert.equal(ehPedidoCofundador({ papel_solicitado: null }), false);
  assert.equal(rotuloDoPedidoAcesso({ papel_solicitado: "cofundador", perfil_acesso_id: null }, {}), "COFUNDADOR");
  assert.equal(rotuloDoPedidoAcesso({ papel_solicitado: null, perfil_acesso_id: null }, {}), "Vendedor");
  assert.equal(rotuloDoPedidoAcesso({ perfil_acesso_id: "s1" }, { s1: "Financeiro" }), "Financeiro");
  assert.equal(rotuloDoPedidoAcesso({ perfil_acesso_id: "zz" }, {}), "Setor");
  assert.equal(rotuloTipoAprovacao("responder_solicitacao_acesso", "Aprovar pedido de acesso como COFUNDADOR de x@y.com"), "Pedido de acesso (COFUNDADOR)");
  assert.equal(rotuloTipoAprovacao("responder_solicitacao_acesso", "Aprovar pedido de acesso como vendedor"), "Pedido de acesso");
  assert.equal(rotuloTipoAprovacao("convidar_membro"), "Convite");
  const bell = lerFonte("components/vendedor/solicitacoes-bell.tsx");
  assert.ok(bell.includes("rotuloDoPedidoAcesso(s, setores)") && bell.includes("textoConfirmarCofundador(pedido.email)"), "sino rotula e confirma");
  const prov = lerFonte("components/vendedor/solicitacoes-provider.tsx");
  assert.equal((prov.match(/papel_solicitado/g) ?? []).length >= 4, true, "provider carrega o papel pedido (carga, busca e realtime)");
  assert.ok(lerFonte("app/(dashboard)/layout.tsx").includes("perfil_acesso_id, papel_solicitado"));
  assert.ok(lerFonte("app/(dashboard)/vendedores/page.tsx").includes('papel_solicitado.neq.cofundador'), "Vendedores não lista pedido de cofundador");
  assert.ok(lerFonte("lib/dashboard-home/get-overview.ts").includes('papel_solicitado.neq.cofundador'), "contagem de pedidos de vendedor sem cofundador");
  assert.ok(lerFonte("components/aprovacoes/aprovacoes-view.tsx").includes("rotuloDoTipo(a.tipo, a.resumo)"));
});
await teste("erros de solicitar_acesso e responder_solicitacao_acesso aparecem como vieram", () => {
  for (const msg of ["Código já utilizado.", "Código expirado.", "Código cancelado.", "Este é o seu próprio código.", "Você já é cofundador desta empresa.", "Você já tem um pedido pendente para esta empresa."]) {
    assert.equal(solicitarAcessoErrorMessage(msg), msg);
  }
  assert.equal(gestorErrorMessage("  Limite de 4 cofundadores ativos.  "), "Limite de 4 cofundadores ativos.");
  assert.match(solicitarAcessoErrorMessage(""), /Não foi possível enviar o código/);
  assert.equal(erroDaRpc(undefined, "padrão"), "padrão");
  assert.equal(erroDaRpc("x", "padrão"), "x");
  const acao = lerFonte("lib/actions/vendedor-codigo.ts");
  assert.ok(acao.includes('rpc("solicitar_acesso", { p_codigo: codigo })') && acao.includes("solicitarAcessoErrorMessage(error.message)"));
});
await teste("o código digitado: maiúsculas/minúsculas e traços/espaços ignorados; cabe um código maior que 16", () => {
  assert.equal(limparCodigoAcesso(" abcde-12345 "), "ABCDE12345");
  assert.equal(limparCodigoAcesso("ab cd-ef_gh"), "ABCDEFGH");
  assert.ok(CODIGO_ACESSO_MAX >= 24);
  assert.equal(limparCodigoAcesso("A".repeat(24)).length, 24);
});
await teste("\"Entrar numa empresa com código\" é alcançável por QUALQUER usuário logado (todos os papéis, com ou sem empresa)", () => {
  for (const path of [ACESSO_VENDEDOR_CODIGO, ACESSO_VENDEDOR_AGUARDANDO]) {
    for (const papel of ["dono", "cofundador", "socio", "funcionario", "comercial"] as const) {
      const d = decidirAcesso({ path, resolucao: { status: "ok", workspaceId: WS_A, papel, corrigirCookie: false }, habilitados: MODULOS_MINIMOS, permissoes: MODULOS_MINIMOS, permiteMembros: MODULOS_MINIMOS, funcionarioSemVinculo: false });
      assert.equal(d.tipo, "seguir", `${papel} abre ${path}`);
    }
    assert.equal(decidirAcesso({ path, resolucao: { status: "sem_empresa" }, habilitados: [], funcionarioSemVinculo: false }).tipo, "seguir", "conta sem empresa");
    assert.equal(decidirAcesso({ path, resolucao: { status: "sem_empresa" }, habilitados: [], funcionarioSemVinculo: true }).tipo, "seguir", "funcionário sem empresa");
    assert.equal(rotaPermitida(path, []), true);
  }
  const side = lerFonte("components/sidebar.tsx");
  assert.ok(side.includes("Entrar numa empresa com código") && side.includes("href={ACESSO_VENDEDOR_CODIGO}"), "menu lateral");
  assert.ok(!side.slice(side.indexOf("Entrar numa empresa com código") - 400, side.indexOf("Entrar numa empresa com código")).includes("painelCompleto &&"), "não depende de papel");
  assert.ok(lerFonte("components/vendedor/vendedor-sidebar.tsx").includes("Entrar numa empresa com código"), "vendedor também");
  assert.ok(lerFonte("app/(dashboard)/configuracoes/page.tsx").includes('href="/acesso-vendedor"') && lerFonte("app/(dashboard)/configuracoes/page.tsx").includes("Entrar numa empresa com código"), "Configurações");
  const pagina = lerFonte("app/acesso-vendedor/page.tsx");
  assert.ok(pagina.includes("Entrar numa empresa com código") && pagina.includes("cofundador"));
  assert.ok(!pagina.includes("tipo_conta_padrao") && !pagina.includes("comercial"), "a tela não exige conta de funcionário");
  const espera = lerFonte("components/vendedor/aguardando-aprovacao.tsx");
  assert.ok(espera.includes("Pedido enviado") && espera.includes("Aguarde a aprovação do fundador.") && espera.includes("seletor de empresas"));
  const acao = lerFonte("lib/actions/vendedor-codigo.ts");
  assert.ok(acao.includes("gravarEmpresaAtiva(alvo.workspaceId)") && acao.includes("listarEmpresas(supabase)"), "ao aprovar, a empresa entra no seletor e vira a ativa");
});
await teste("a auditoria cobre solicitacoes_vendedor e workspace_codigos_cofundador (só RPC) e a tela de equipe não escreve direto", () => {
  const audit = lerFonte("scripts/auditar-isolamento.mts");
  assert.ok(audit.includes("solicitacoes_vendedor|workspace_codigos_cofundador"));
  assert.ok(audit.includes('equipe: ["workspace_codigos_cofundador"]'), "leituras do código sempre por workspace_id");
  const telas = ["components/socios/cofundador-codigo.tsx", "components/socios/pedidos-cofundador.tsx", "components/socios/equipe-section.tsx", "components/socios/convidar-membro.tsx", "app/(dashboard)/socios/page.tsx", "app/(dashboard)/socios/actions.ts", "lib/actions/vendedor-codigo.ts"];
  for (const arq of telas) assert.ok(!/\.from\("(membros|convites|solicitacoes_vendedor|workspace_codigos_cofundador)"\)\s*\.(insert|update|upsert|delete)\(/.test(lerFonte(arq)), `${arq} escreve direto`);
});
await teste("pessoas da empresa inclui pessoas_da_empresa sem repetir ninguém", () => {
  const pessoas = montarPessoas(
    [{ user_id: "u1", nome: "Miguel", email: "m@x.com", papel: "dono" }],
    [{ membroId: "u3", email: "so@x.com", nome: "So", papel: "socio", createdAt: "", permissoes: [] }],
    [{ pessoa_id: "u1", nome: "Miguel", papel: "dono" }, { pessoa_id: "u3", nome: "So", papel: "socio" }, { pessoa_id: "u9", nome: "Cofundadora", papel: "cofundador" }, { pessoa_id: "v1", nome: "Vendedor", papel: "comercial" }]
  );
  assert.deepEqual(pessoas.map((p) => p.membroId), ["u1", "u9", "u3"], "u9 (só em pessoas_da_empresa) entra; vendedor fica fora; sem repetir");
  assert.equal(pessoas.find((p) => p.membroId === "u9")?.semMembro, true);
  assert.ok(lerFonte("app/(dashboard)/socios/page.tsx").includes('rpc("pessoas_da_empresa"'));
});

console.log(`\n${total} testes`);
if (process.exitCode) console.log("HÁ FALHAS");
