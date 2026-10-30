/**
 * Auditoria estática do isolamento por empresa: toda leitura e todo insert das
 * tabelas que isolam por workspace_id na RLS precisa mencionar workspace_id.
 *
 *   node scripts/auditar-isolamento.mts
 *
 * É heurística (olha o trecho logo após `.from("tabela")`), serve para achar
 * esquecimentos. Nas tabelas dos módulos novos (ESTRITAS) update/delete também
 * precisam filtrar por workspace_id; nas antigas ficam a cargo da RLS e só são
 * listados. Termina com a lista de inserts que ainda não gravam workspace_id
 * (para travar a coluna como NOT NULL depois).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ISOLADAS = [
  "leads", "renegados", "clientes", "followups_lead", "propostas", "reunioes",
  "lead_views", "solicitacoes_vendedor", "workspace_codigos", "perfis_acesso", "permissoes_membro",
  "acessos", "assinaturas", "backups", "comprovantes", "contratos",
  "infraestrutura", "manutencoes", "projetos", "servicos", "campanhas",
];

// Módulos novos (Fase 3.5): update/delete também precisam de workspace_id.
// Cada módulo entra aqui quando é concluído.
const MODULOS_NOVOS: Record<string, string[]> = {
  marketing: ["campanhas", "calendario_conteudo"],
  financeiro: [
    "contas_pagar", "contas_receber", "orcamentos", "gastos", "lancamentos_extrato",
    "assinaturas", "comprovantes",
  ],
  rh: [
    "departamentos", "funcionarios", "ferias", "beneficios", "folha_pagamento", "vagas",
    "candidatos", "avaliacoes_desempenho", "controle_ponto",
  ],
  juridico: [
    "juridico", "documentos", "processos", "compliance_juridico", "propriedade_intelectual",
    "modelos_contrato",
  ],
  // Nicho Impressão 3D (Etapa A): todas as tabelas p3d_* isolam por workspace_id.
  impressao_3d: [
    "p3d_config_precificacao", "p3d_impressoras", "p3d_pecas_desgaste", "p3d_manutencoes",
    "p3d_materiais", "p3d_movimentos_estoque", "p3d_produtos", "p3d_produto_variacoes",
    "p3d_produto_arquivos", "p3d_orcamentos", "p3d_orcamento_itens",
    // Etapa B: fornecedores e compras, pedidos, producao, qualidade e expedicao.
    "p3d_fornecedores", "p3d_compras", "p3d_compra_itens", "p3d_pedidos", "p3d_pedido_itens",
    "p3d_pedido_pagamentos", "p3d_pedido_historico", "p3d_producao", "p3d_inspecoes", "p3d_falhas",
    "p3d_envios",
    // Etapa C-1: alertas, notificacoes e integracoes.
    "p3d_config_alertas", "p3d_notificacoes", "p3d_integracoes",
    // Etapa E (parte 2): estoque de peças e filamentos do trabalho.
    "p3d_pecas_estoque", "p3d_movimentos_pecas", "p3d_producao_materiais",
  ],
  // Etapa D: preferências de navegação (padrão da empresa e pessoal).
  navegacao: ["menu_preferencias"],
  // Cofundador por código: a tabela de códigos só é lida, sempre por workspace_id.
  equipe: ["workspace_codigos_cofundador"],
};
const ESTRITAS = Object.values(MODULOS_NOVOS).flat();

// Legado do contador (papel sem interface): fora do escopo da empresa ativa.
const IGNORAR = [/^app[\\/]colaborador[\\/]/];
// Conta Pessoal (/pessoal/*) não pode mudar nesta fase: /pessoal/juridico só conta modelos_contrato.
IGNORAR.push(/^app[\\/]\(dashboard\)[\\/]pessoal[\\/]/);
// Fora do escopo da Fase 3.5: código antigo de colaborador (desligado) e a central de
// suporte/tickets. São listados à parte, sem falhar a auditoria.
const FORA_DO_ESCOPO = [
  /^lib[\\/]colaborador\.ts$/,
  /^lib[\\/]actions[\\/]colaborador-juridico\.ts$/,
  /^lib[\\/]actions[\\/]solicitacoes-documento\.ts$/,
  /^app[\\/]\(dashboard\)[\\/]suporte[\\/]/,
  /^lib[\\/]tickets\.ts$/,
];
const foraDoEscopo: string[] = [];
const legadoGravacao: string[] = [];

const raiz = process.cwd();
function arquivos(dir: string): string[] {
  if (statSync(dir).isFile()) return [dir];
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) && !nome.endsWith("database.types.ts") ? [caminho] : [];
  });
}

const sem: string[] = [];
const porId: string[] = [];
const semEscrita: string[] = [];
const insertsSemWorkspace: string[] = [];
let verificados = 0;

const TABELAS = [...new Set([...ISOLADAS, ...ESTRITAS, ...Object.values(MODULOS_NOVOS).flat()])];

for (const base of ["app", "lib", "components"]) {
  for (const arq of arquivos(join(raiz, base))) {
    const rel = relative(raiz, arq);
    const ignorado = IGNORAR.some((r) => r.test(rel));
    const texto = readFileSync(arq, "utf8").replace(/\r\n/g, "\n");
    const re = /\.from\("([a-z0-9_]+)"\)/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      if (!TABELAS.includes(m[1])) continue;
      const linha = texto.slice(0, m.index).split("\n").length;
      // Trecho do comando: até o próximo `.from(` ou 900 caracteres.
      const resto = texto.slice(m.index + m[0].length);
      const fim = resto.search(/\.from\("/);
      const trecho = resto.slice(0, fim === -1 ? 900 : Math.min(fim, 900));
      const alvo = `${rel}:${linha} ${m[1]}`;
      const temWs = trecho.includes("workspace_id");
      if (ignorado || FORA_DO_ESCOPO.some((r) => r.test(rel))) {
        // Legado desligado: não falha a auditoria, mas entra na lista de pendências.
        const verbo = /^\s*\.(insert|upsert|update|delete)\(/.exec(trecho)?.[1];
        if (!temWs && verbo) legadoGravacao.push(`${alvo} (${verbo})`);
        else if (!temWs && !ignorado) foraDoEscopo.push(alvo);
        continue;
      }

      if (/^\s*\.(insert|upsert)\(/.test(trecho) && !temWs) insertsSemWorkspace.push(alvo);

      if (/^\s*\.(update|delete)\(/.test(trecho)) {
        if (ESTRITAS.includes(m[1])) {
          verificados++;
          if (!temWs) semEscrita.push(alvo);
        } else {
          porId.push(alvo);
        }
        continue;
      }
      verificados++;
      if (!temWs) sem.push(alvo);
    }
  }
}

console.log(`Comandos verificados (select/insert + update/delete das tabelas estritas): ${verificados}`);
console.log(`Sem workspace_id no trecho: ${sem.length}`);
for (const s of sem) console.log("  ! " + s);
console.log(`update/delete sem workspace_id em tabela estrita: ${semEscrita.length}`);
for (const s of semEscrita) console.log("  ! " + s);
console.log(`update/delete por id em tabela antiga (barreira = RLS): ${porId.length}`);
if (sem.length || semEscrita.length) process.exitCode = 1;

console.log(`\nFora do escopo (legado de colaborador e suporte), sem workspace_id: ${foraDoEscopo.length}`);
for (const s of foraDoEscopo) console.log("  - " + s);

console.log(
  `\nLegado desligado que ainda grava sem workspace_id (colaborador, suporte): ${legadoGravacao.length}`
);
for (const s of legadoGravacao) console.log("  - " + s);

console.log(`\nInserts/upserts sem workspace_id (insumo para NOT NULL): ${insertsSemWorkspace.length}`);
for (const s of insertsSemWorkspace) console.log("  ! " + s);
if (insertsSemWorkspace.length) process.exitCode = 1;

// --- Escrita por papel (Fase 3) -------------------------------------------
// Toda action exportada dos módulos que sócio/funcionário podem editar precisa
// passar por uma guarda de edição (fundador/cofundador OU tem_permissao). A
// barreira real é o RLS; isto pega uma action nova esquecida sem guarda.
const GUARDAS = ["getAcessoEdicao", "getAcessoJuridicoEdicaoComClientes", "getWorkspaceIdAtivo", "getAcessoFinanceiroEdicao", "getAcessoSoDono", "podeEditarProposta", "getEmpresaPainel", "acessoFolha"];
const ACTIONS_COM_GUARDA = [
  "app/(dashboard)/leads/actions.ts",
  "app/(dashboard)/renegados/actions.ts",
  "app/(dashboard)/clientes/actions.ts",
  "lib/actions/propostas.ts",
  "app/(dashboard)/socios/actions.ts",
  "app/(dashboard)/marketing/calendario/actions.ts",
  "app/(dashboard)/marketing/campanhas/actions.ts",
  "app/(dashboard)/contas-pagar/actions.ts",
  "app/(dashboard)/contas-receber/actions.ts",
  "app/(dashboard)/orcamentos/actions.ts",
  "app/(dashboard)/gastos/actions.ts",
  "app/(dashboard)/assinantes/actions.ts",
  "lib/actions/conciliacao.ts",
  "app/(dashboard)/rh/avaliacoes/actions.ts",
  "app/(dashboard)/rh/beneficios/actions.ts",
  "app/(dashboard)/rh/departamentos/actions.ts",
  "app/(dashboard)/rh/ferias/actions.ts",
  "app/(dashboard)/rh/folha/actions.ts",
  "app/(dashboard)/rh/funcionarios/actions.ts",
  "app/(dashboard)/rh/ponto/actions.ts",
  "app/(dashboard)/rh/recrutamento/actions.ts",
  "app/(dashboard)/juridico/actions.ts",
  "app/(dashboard)/juridico/processos/actions.ts",
  "app/(dashboard)/juridico/compliance/actions.ts",
  "app/(dashboard)/juridico/propriedade-intelectual/actions.ts",
  "app/(dashboard)/juridico/modelos-contrato/actions.ts",
  "app/(dashboard)/documentos/actions.ts",
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
  "app/(dashboard)/impressao-3d/notificacoes/actions.ts",
  "app/(dashboard)/impressao-3d/integracoes/actions.ts",
];
const semGuarda: string[] = [];
let actionsVerificadas = 0;

for (const rel of ACTIONS_COM_GUARDA) {
  const texto = readFileSync(join(raiz, rel), "utf8").replace(/\r\n/g, "\n");
  const partes = texto.split(/\nexport async function /).slice(1);
  for (const parte of partes) {
    const nome = parte.slice(0, parte.indexOf("(")).trim();
    actionsVerificadas++;
    if (!GUARDAS.some((g) => parte.includes(g))) semGuarda.push(`${rel} ${nome}`);
  }
}

console.log(`\nActions de escrita verificadas: ${actionsVerificadas}`);
console.log(`Sem guarda de edição: ${semGuarda.length}`);
for (const s of semGuarda) console.log("  ! " + s);
if (semGuarda.length) process.exitCode = 1;

// --- Código antigo de dono (user_id) nos módulos concluídos ----------------
// Os módulos novos não podem voltar a usar getDonoIdAtivo/getWorkspaceIdAtivo
// (a empresa vem do guard, validada no servidor) nem filtrar só por user_id.
const PASTAS_CONCLUIDAS: Record<string, string[]> = {
  marketing: ["app/(dashboard)/marketing", "lib/marketing", "components/marketing"],
  financeiro: [
    "app/(dashboard)/contas-pagar", "app/(dashboard)/contas-receber", "app/(dashboard)/orcamentos",
    "app/(dashboard)/fluxo-caixa", "app/(dashboard)/rentabilidade", "app/(dashboard)/conciliacao",
    "app/(dashboard)/dre", "app/(dashboard)/gastos", "app/(dashboard)/assinantes",
    "app/(dashboard)/dashboard/financeiro", "app/api/export/dre", "lib/financeiro",
    "components/financeiro", "lib/actions/conciliacao.ts",
  ],
  rh: ["app/(dashboard)/rh", "lib/rh", "components/rh"],
  // juridico/actions.ts fica de fora: convidar/removerColaborador são usados por /vendedores.
  juridico: [
    "app/(dashboard)/juridico/page.tsx", "app/(dashboard)/juridico/processos",
    "app/(dashboard)/juridico/compliance", "app/(dashboard)/juridico/propriedade-intelectual",
    "app/(dashboard)/juridico/modelos-contrato", "app/(dashboard)/documentos",
    "components/juridico", "lib/juridico-acesso.ts", "lib/juridico-shared.ts",
  ],
  impressao_3d: ["app/(dashboard)/impressao-3d", "lib/impressao-3d", "components/impressao-3d"],
};
const proibidos = [
  /getDonoIdAtivo/, /getWorkspaceIdAtivo/, /get_colaboradores_do_dono_by_id/,
  /ColaboradoresSection/, /getConversasComoDono/, /from\("convites"\)/,
];
const legado: string[] = [];
for (const [modulo, pastas] of Object.entries(PASTAS_CONCLUIDAS)) {
  for (const pasta of pastas) {
    for (const arq of arquivos(join(raiz, pasta))) {
      const rel = relative(raiz, arq);
      const texto = readFileSync(arq, "utf8");
      for (const re of proibidos) if (re.test(texto)) legado.push(`${modulo}: ${rel} usa ${re.source}`);
    }
  }
}
console.log(`\nCódigo antigo de dono em módulos concluídos: ${legado.length}`);
for (const s of legado) console.log("  ! " + s);
if (legado.length) process.exitCode = 1;

// --- RH por pessoa -----------------------------------------------------------
// Toda página de RH passa por getAcessoModulo("rh") (leitura) e toda action por
// getAcessoEdicao("rh") (edição); ninguém volta a getAcessoSoDono. A folha também
// exige edição no Financeiro (acessoFolha) e os campos de valor passam pelo extra
// "salarios" (lib/rh/salarios.ts).
const rhSemGuard: string[] = [];
for (const arq of arquivos(join(raiz, "app/(dashboard)/rh"))) {
  if (!/(page|actions)\.tsx?$/.test(arq)) continue;
  const rel = relative(raiz, arq);
  const texto = readFileSync(arq, "utf8");
  const ehAction = /actions.tsx?$/.test(arq);
  const esperado = ehAction ? 'getAcessoEdicao("rh")' : 'getAcessoModulo("rh")';
  if (!texto.includes(esperado)) rhSemGuard.push(`${rel} sem ${esperado}`);
  if (texto.includes("getAcessoSoDono")) rhSemGuard.push(`${rel} ainda usa getAcessoSoDono`);
}
console.log(`\nRH sem guard por pessoa: ${rhSemGuard.length}`);
for (const s of rhSemGuard) console.log("  ! " + s);
if (rhSemGuard.length) process.exitCode = 1;

// --- Escritas diretas em membros / convites / perfis_tipos_ativos ------------
// Equipe e convites escrevem só por RPC (convidar_membro, remover_membro,
// cancelar_convite_empresa, ...), que carregam a porta de aprovação entre
// fundadores. Qualquer insert/update/delete/upsert direto nessas tabelas é
// listado; só as exceções conhecidas (sem RPC equivalente) passam.
// A tela de Equipe e cofundadores escreve só por RPC (convidar_membro, gerar_codigo_cofundador,
// responder_solicitacao_acesso...): solicitacoes_vendedor e workspace_codigos_cofundador também são somente leitura.
const TABELAS_DE_EQUIPE = ["membros", "convites", "perfis_tipos_ativos", "solicitacoes_vendedor", "workspace_codigos_cofundador"];
const ESCRITAS_PERMITIDAS = new Set([
  // Registra o tipo de conta (pessoal, empreendedor...) no cadastro e no seletor de modos;
  // não existe RPC para isso (a empresa nasce por criar_empresa).
  "lib/perfil.ts",
]);
const escritasDiretas: string[] = [];
for (const pasta of ["app", "components", "lib", "proxy.ts"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    const linhas = readFileSync(arq, "utf8").split(/\r?\n/);
    linhas.forEach((linha, i) => {
      const m = linha.match(/\.from\(\s*["'`](membros|convites|perfis_tipos_ativos|solicitacoes_vendedor|workspace_codigos_cofundador)["'`]/);
      if (!m || !TABELAS_DE_EQUIPE.includes(m[1])) return;
      const trecho = linhas.slice(i, i + 8).join(" ");
      const escrita = trecho.match(/\.(insert|update|delete|upsert)\(/);
      if (escrita) escritasDiretas.push(`${rel}:${i + 1} ${m[1]} (${escrita[1]})`);
    });
  }
}
const naoPermitidas = escritasDiretas.filter((s) => !ESCRITAS_PERMITIDAS.has(s.split(":")[0]));
console.log(`\nEscritas diretas em membros/convites/perfis_tipos_ativos/solicitacoes_vendedor/workspace_codigos_cofundador: ${escritasDiretas.length}`);
for (const s of escritasDiretas) console.log(`  ${ESCRITAS_PERMITIDAS.has(s.split(":")[0]) ? "-" : "!"} ${s}`);
console.log(`Fora das exceções conhecidas: ${naoPermitidas.length}`);
if (naoPermitidas.length) process.exitCode = 1;

// --- Nicho Impressão 3D: guard por módulo --------------------------------------
// Toda página do nicho lê por getAcessoModulo("p3d_x") do módulo dono da rota e toda
// action de escrita por getAcessoEdicao("p3d_x"); ninguém usa getAcessoSoDono.
// (simulacao.ts e arquivos-leitura.ts são leituras: getAcessoModulo.)
const MODULO_DA_PASTA: Record<string, string> = {
  impressoras: "p3d_impressoras",
  estoque: "p3d_estoque",
  produtos: "p3d_produtos",
  precificacao: "p3d_precificacao",
  orcamentos: "p3d_orcamentos",
  fornecedores: "p3d_fornecedores",
  pedidos: "p3d_pedidos",
  producao: "p3d_producao",
  qualidade: "p3d_qualidade",
  expedicao: "p3d_expedicao",
  dashboard: "p3d_dashboard",
  relatorios: "p3d_relatorios",
  notificacoes: "p3d_automacoes",
  integracoes: "p3d_integracoes",
};
const p3dSemGuard: string[] = [];
let p3dArquivos = 0;
for (const arq of arquivos(join(raiz, "app/(dashboard)/impressao-3d"))) {
  const rel = relative(raiz, arq).replace(/\\/g, "/");
  if (!/(page|actions|simulacao|arquivos-leitura|sino)\.tsx?$/.test(arq)) continue;
  const pasta = rel.split("/")[3];
  const modulo = MODULO_DA_PASTA[pasta];
  p3dArquivos++;
  if (!modulo) {
    p3dSemGuard.push(`${rel} fora de uma pasta de módulo conhecida`);
    continue;
  }
  const texto = readFileSync(arq, "utf8");
  const ehAction = /actions\.tsx?$/.test(arq);
  const esperado = ehAction ? `getAcessoEdicao` : `getAcessoModulo`;
  if (!texto.includes(esperado)) p3dSemGuard.push(`${rel} sem ${esperado}`);
  if (!texto.includes(`"${modulo}"`)) p3dSemGuard.push(`${rel} não confere o módulo ${modulo}`);
  if (texto.includes("getAcessoSoDono")) p3dSemGuard.push(`${rel} usa getAcessoSoDono`);
}
console.log(`\nImpressão 3D: páginas/actions verificadas: ${p3dArquivos}`);
console.log(`Impressão 3D sem guard por módulo: ${p3dSemGuard.length}`);
for (const s of p3dSemGuard) console.log("  ! " + s);
if (p3dSemGuard.length) process.exitCode = 1;

// --- Nicho Impressão 3D: campos que só o banco escreve -------------------------
// O banco barra, mas o código nunca deve tentar: saldo e custos do material e
// numeração/status/totais do orçamento só mudam pelas RPCs; itens do orçamento e
// movimentos de estoque são somente leitura (escrita só por RPC).
const PROTEGIDOS: Record<string, string[]> = {
  p3d_materiais: ["estoque_atual", "custo_medio", "ultimo_custo", "custo_cadastro"],
  p3d_orcamentos: ["status", "numero", "subtotal", "total", "custo_total", "lucro_total", "enviado_em", "aprovado_em"],
  // Etapa B: status, numeracao, totais e datas de processo so mudam pelas RPCs.
  p3d_compras: ["status", "numero", "subtotal", "total", "recebida_em", "conta_pagar_id"],
  p3d_compra_itens: ["preco_unitario"],
  p3d_pedidos: [
    "status", "status_pagamento", "numero", "origem", "orcamento_id", "subtotal", "total",
    "custo_total", "lucro_total", "pago_valor", "cancelado_em", "cancelado_motivo",
  ],
  p3d_pedido_itens: ["preco_total", "custo_total", "lucro", "pecas_baixadas_em"],
  // Quantidade e custo médio das peças só mudam por p3d_movimentar_pecas (e Produção/Pedidos); o peso real, por p3d_concluir_producao_multi.
  p3d_pecas_estoque: ["quantidade", "custo_medio"],
  p3d_producao_materiais: ["peso_real_g"],
  p3d_producao: [
    "status", "numero", "horas_reais", "peso_real_g", "qualidade", "iniciado_em", "concluido_em",
    "consumo_registrado_em", "reimpressao_de",
  ],
  p3d_envios: ["status", "postado_em", "entregue_em", "recebedor"],
  // Etapa C-1: estado da integracao e do servidor (o banco ignora, o app nunca envia).
  p3d_integracoes: ["status", "segredo_configurado", "ultima_verificacao", "ultimo_erro"],
  p3d_config_alertas: ["updated_by"],
};
const SOMENTE_LEITURA = [
  "p3d_orcamento_itens", "p3d_movimentos_estoque", "p3d_movimentos_pecas",
  // Etapa B: somente leitura (escrita so por RPC).
  "p3d_pedido_pagamentos", "p3d_pedido_historico", "p3d_inspecoes", "p3d_falhas",
  // Etapa C-1: notificacoes sao geradas pelo banco (p3d_atualizar_alertas); so lida_em muda, por RPC.
  "p3d_notificacoes",
];
const escritasProtegidas: string[] = [];
let escritasP3d = 0;

/** Texto entre os parênteses do .insert/.update/.upsert que abre em `inicio`. */
function argumentos(texto: string, inicio: number): string {
  let nivel = 1;
  let i = inicio;
  while (i < texto.length && nivel > 0) {
    if (texto[i] === "(") nivel++;
    else if (texto[i] === ")") nivel--;
    i++;
  }
  return texto.slice(inicio, i - 1);
}

for (const pasta of ["app", "components", "lib"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    const texto = readFileSync(arq, "utf8").replace(/\r\n/g, "\n");
    const re = /\.from\(\s*["'`](p3d_[a-z_]+)["'`]\s*\)\s*\.(insert|update|upsert|delete)\(/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      escritasP3d++;
      const tabela = m[1];
      const linha = texto.slice(0, m.index).split("\n").length;
      if (SOMENTE_LEITURA.includes(tabela)) {
        escritasProtegidas.push(`${rel}:${linha} ${tabela} (${m[2]}): tabela somente leitura, use a RPC`);
        continue;
      }
      const payload = argumentos(texto, m.index + m[0].length);
      for (const campo of PROTEGIDOS[tabela] ?? []) {
        if (new RegExp(`\\b${campo}\\b`).test(payload)) {
          escritasProtegidas.push(`${rel}:${linha} ${tabela} (${m[2]}) envia ${campo}`);
        }
      }
    }
  }
}

// Os schemas que alimentam esses payloads (spread de parsed.data) também não podem ter o campo.
const schemas =
  readFileSync(join(raiz, "lib/impressao-3d/validacao.ts"), "utf8") + "\n" +
  readFileSync(join(raiz, "lib/impressao-3d/validacao-operacao.ts"), "utf8") + "\n" +
  readFileSync(join(raiz, "lib/impressao-3d/validacao-nicho.ts"), "utf8");
const SCHEMA_DA_TABELA: Record<string, string[]> = {
  p3d_materiais: ["MaterialSchema"],
  p3d_orcamentos: ["OrcamentoSchema"],
  p3d_compras: ["CompraSchema"],
  p3d_compra_itens: ["CompraItemSchema"],
  p3d_pedidos: ["PedidoSchema", "PedidoLimitadoSchema"],
  p3d_pedido_itens: ["PedidoItemSchema"],
  p3d_pecas_estoque: ["PecaEstoqueSchema"],
  p3d_producao: ["TrabalhoSchema", "TrabalhoLimitadoSchema"],
  p3d_envios: ["EnvioSchema"],
  p3d_integracoes: ["IntegracaoSchema"],
  p3d_config_alertas: ["ConfigAlertasSchema"],
};
for (const [tabela, campos] of Object.entries(PROTEGIDOS)) {
  for (const nomeSchema of SCHEMA_DA_TABELA[tabela] ?? []) {
    const ini = schemas.indexOf(`export const ${nomeSchema}`);
    if (ini === -1) {
      escritasProtegidas.push(`schema ${nomeSchema} (tabela ${tabela}) nao encontrado`);
      continue;
    }
    const fim = schemas.indexOf("\nexport const", ini + 10);
    const corpo = schemas.slice(ini, fim === -1 ? undefined : fim);
    for (const campo of campos) {
      if (new RegExp(`\\b${campo}:`).test(corpo)) {
        escritasProtegidas.push(`validacao ${nomeSchema} aceita ${campo} (protegido em ${tabela})`);
      }
    }
  }
}
console.log(`\nImpressão 3D: escritas diretas em p3d_* verificadas: ${escritasP3d}`);
console.log(`Escritas em campo protegido / tabela somente leitura: ${escritasProtegidas.length}`);
for (const s of escritasProtegidas) console.log("  ! " + s);
if (escritasProtegidas.length) process.exitCode = 1;

// --- Nicho Impressão 3D: bucket privado, caminho por empresa -------------------
// Todo acesso ao storage do nicho usa o bucket p3d-arquivos (nunca o de clientes) e o
// caminho nasce de montarCaminho (<workspace_id>/<produto_id>/<uuid>-<nome>).
const storageFora: string[] = [];
for (const pasta of ["app/(dashboard)/impressao-3d", "components/impressao-3d", "lib/impressao-3d"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    const texto = readFileSync(arq, "utf8");
    for (const m of texto.matchAll(/\.storage\s*\.from\(\s*([^)]*)\)/g)) {
      if (m[1].trim() !== "BUCKET_P3D") storageFora.push(`${rel} usa storage.from(${m[1].trim()})`);
    }
    if (/\.storage\b/.test(texto) && /arquivos-clientes|arquivos-pessoais/.test(texto)) {
      storageFora.push(`${rel} mistura o bucket do nicho com outro`);
    }
  }
}
console.log(`\nImpressão 3D: acessos ao storage fora do bucket p3d-arquivos: ${storageFora.length}`);
for (const s of storageFora) console.log("  ! " + s);
if (storageFora.length) process.exitCode = 1;

// --- Nicho Impressão 3D: RPC chamada sem guarda --------------------------------
// Toda chamada .rpc("p3d_...") precisa estar dentro de uma função que passa por
// getAcessoEdicao/getAcessoModulo (o banco confere de novo; isto pega a chamada esquecida), nunca
// de um componente client, e as RPCs internas (de apoio às outras RPCs) não podem ser chamadas pelo app.
const RPC_INTERNAS = [
  "p3d_estoque_aplicar", "p3d_pedido_set_status", "p3d_recalc_compra", "p3d_recalc_orcamento",
  "p3d_recalc_pedido", "p3d_calcular_preco", "p3d_num",
];
const rpcSemGuarda: string[] = [];
let rpcsVerificadas = 0;
for (const pasta of ["app", "components", "lib"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    const texto = readFileSync(arq, "utf8").replace(/\r\n/g, "\n");
    const re = /\.rpc\(\s*["'`](p3d_[a-z_]+)["'`]/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      rpcsVerificadas++;
      const linha = texto.slice(0, m.index).split("\n").length;
      const alvo = `${rel}:${linha} ${m[1]}`;
      if (RPC_INTERNAS.includes(m[1])) {
        rpcSemGuarda.push(`${alvo}: RPC interna, o app não deve chamar`);
        continue;
      }
      if (rel.startsWith("components/")) {
        rpcSemGuarda.push(`${alvo}: RPC chamada de componente (use uma server action com guarda)`);
        continue;
      }
      // Função que contém a chamada: do último "function " antes dela até a próxima declaração.
      const inicio = texto.lastIndexOf("function ", m.index);
      const proximo = texto.indexOf("\nexport ", m.index);
      const corpo = texto.slice(inicio === -1 ? 0 : inicio, proximo === -1 ? undefined : proximo);
      if (!/getAcesso(Edicao|Modulo)\(/.test(corpo)) rpcSemGuarda.push(`${alvo}: sem getAcessoEdicao/getAcessoModulo na função`);
    }
  }
}
console.log(`\nImpressão 3D: chamadas .rpc("p3d_...") verificadas: ${rpcsVerificadas}`);
console.log(`RPC sem guarda, interna ou em componente: ${rpcSemGuarda.length}`);
for (const s of rpcSemGuarda) console.log("  ! " + s);
if (rpcSemGuarda.length) process.exitCode = 1;

// --- Nicho Impressão 3D: extra "custos" de Qualidade ----------------------------
// custo_material e custo_maquina_estimado das falhas só podem ser selecionados atrás de
// podeVerCustos/verCustos (o servidor não envia sem o extra). A constante base não pode ter custo,
// e quem usa COLUNAS_FALHA_CUSTOS precisa conferir verCustos no mesmo arquivo.
const custoFalhaSemExtra: string[] = [];
const tiposOp = readFileSync(join(raiz, "lib/impressao-3d/tipos-operacao.ts"), "utf8");
const baseFalha = /export const COLUNAS_FALHA =\s*"([^"]*)"/.exec(tiposOp)?.[1] ?? "";
if (!baseFalha) custoFalhaSemExtra.push("lib/impressao-3d/tipos-operacao.ts: COLUNAS_FALHA não encontrada");
if (/custo_material|custo_maquina_estimado/.test(baseFalha)) {
  custoFalhaSemExtra.push("COLUNAS_FALHA (base) inclui coluna de custo");
}
for (const pasta of ["app", "components", "lib"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    if (rel === "lib/impressao-3d/tipos-operacao.ts") continue;
    const texto = readFileSync(arq, "utf8").replace(/\r\n/g, "\n");
    const re = /\.from\(\s*["'`]p3d_falhas["'`]\s*\)\s*\.select\(/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      const linha = texto.slice(0, m.index).split("\n").length;
      const args = argumentos(texto, m.index + m[0].length);
      if (/custo_material|custo_maquina_estimado/.test(args)) {
        custoFalhaSemExtra.push(`${rel}:${linha} p3d_falhas seleciona coluna de custo direto (use COLUNAS_FALHA_CUSTOS atrás de verCustos)`);
      }
      if (/COLUNAS_FALHA_CUSTOS/.test(args) && !/verCustos\s*\?/.test(args)) {
        custoFalhaSemExtra.push(`${rel}:${linha} COLUNAS_FALHA_CUSTOS sem condicionar a verCustos`);
      }
    }
    if (/COLUNAS_FALHA_CUSTOS/.test(texto) && !/podeVerCustos\(/.test(texto)) {
      custoFalhaSemExtra.push(`${rel} usa COLUNAS_FALHA_CUSTOS sem podeVerCustos`);
    }
  }
}
console.log(`\nImpressão 3D: custo de falha fora do extra "custos" de Qualidade: ${custoFalhaSemExtra.length}`);
for (const s of custoFalhaSemExtra) console.log("  ! " + s);
if (custoFalhaSemExtra.length) process.exitCode = 1;

// --- Nicho Impressão 3D: data dos alertas em America/Sao_Paulo --------------------
const dataEmUtc: string[] = [];
for (const pasta of ["app/(dashboard)/impressao-3d", "components/impressao-3d", "lib/impressao-3d"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    if (/todayISO|toISOString\(\)\.(slice\(0,\s*10\)|split\(["']T["']\)\[0\])/.test(readFileSync(arq, "utf8"))) dataEmUtc.push(`${rel} calcula "hoje" em UTC (use hojeSaoPaulo)`);
  }
}
console.log(`\nImpressão 3D: "hoje" calculado em UTC: ${dataEmUtc.length}`);
for (const s of dataEmUtc) console.log("  ! " + s);
if (dataEmUtc.length) process.exitCode = 1;

// --- Nicho Impressão 3D (Etapa C-1): custo, lucro e margem só com o extra "custos" -----------------
// Dashboard e Relatórios leem por RPC; o banco já devolve custo/lucro nulos sem o extra, e o app
// ainda recusa mostrar. Regras: (1) nenhum select direto de coluna de custo/lucro/margem nessas
// telas sem podeVerCustos no arquivo; (2) as páginas passam verCustos aos leitores (lerPainel /
// lerRelatorio*); (3) a seção "resultado" do Dashboard só existe atrás de `verCustos && resultado`;
// (4) toda linha de tabela/CSV de lucro, margem ou custo dos Relatórios fica atrás de verCustos.
const custoSemExtra: string[] = [];
const ARQ_C1_PAGINAS = [
  "app/(dashboard)/impressao-3d/dashboard/page.tsx",
  "app/(dashboard)/impressao-3d/relatorios/page.tsx",
];
const ARQ_C1_PASTAS = ["app/(dashboard)/impressao-3d/dashboard", "app/(dashboard)/impressao-3d/relatorios"];
for (const pasta of ARQ_C1_PASTAS) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    const texto = readFileSync(arq, "utf8").replace(/\r\n/g, "\n");
    const re = /\.from\(\s*["'`]p3d_[a-z_]+["'`]\s*\)\s*\.select\(/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      const linha = texto.slice(0, m.index).split("\n").length;
      if (/custo|lucro|margem|markup/.test(argumentos(texto, m.index + m[0].length)) && !/podeVerCustos\(/.test(texto)) {
        custoSemExtra.push(`${rel}:${linha} select de custo/lucro/margem sem podeVerCustos`);
      }
    }
  }
}
for (const rel of ARQ_C1_PAGINAS) {
  const texto = readFileSync(join(raiz, rel), "utf8");
  if (!/podeVerCustos\(acesso\)/.test(texto)) custoSemExtra.push(`${rel} não confere o extra com podeVerCustos(acesso)`);
  for (const m of texto.matchAll(/\b(lerPainel|lerRelatorio[A-Za-z]+)\(([^)]*)\)/g)) {
    if (!/verCustos/.test(m[2])) custoSemExtra.push(`${rel}: ${m[1]}(...) sem passar verCustos`);
  }
  if (!/\b(lerPainel|lerRelatorio[A-Za-z]+)\(/.test(texto)) custoSemExtra.push(`${rel} não lê o retorno por lerPainel/lerRelatorio*`);
}
{
  const rel = "components/impressao-3d/dashboard-board.tsx";
  const texto = readFileSync(join(raiz, rel), "utf8").replace(/\r\n/g, "\n");
  const guarda = texto.indexOf("verCustos && resultado");
  if (guarda === -1) custoSemExtra.push(`${rel} sem a guarda 'verCustos && resultado'`);
  for (const m of texto.matchAll(/\bresultado\./g)) {
    if (guarda === -1 || (m.index ?? 0) < guarda) custoSemExtra.push(`${rel}: 'resultado.' usado fora da guarda verCustos`);
  }
}
{
  const rel = "components/impressao-3d/relatorios-board.tsx";
  const linhasTela = readFileSync(join(raiz, rel), "utf8").replace(/\r\n/g, "\n").split("\n");
  linhasTela.forEach((linha, i) => {
    if (!/lucro_estimado|margem_estimada|custo_falhas_estimado/.test(linha)) return;
    if (/^\s*(\/\/|\*)/.test(linha)) return;
    if (!linhasTela.slice(Math.max(0, i - 4), i + 1).some((l) => /verCustos/.test(l))) {
      custoSemExtra.push(`${rel}:${i + 1} coluna de custo/lucro/margem fora de verCustos`);
    }
  });
}
{
  // O leitor nunca repassa custo/lucro/margem sem o extra, mesmo que o banco mande.
  const painel = readFileSync(join(raiz, "lib/impressao-3d/painel.ts"), "utf8");
  for (const campo of ["lucro_estimado", "margem_estimada", "custo_falhas_estimado"]) {
    const usos = [...painel.matchAll(new RegExp(`${campo}: [^\n]*`, "g"))].map((m) => m[0]).filter((l) => /numOuNull\(l\./.test(l));
    for (const u of usos) if (!/verCustos \?/.test(u)) custoSemExtra.push(`lib/impressao-3d/painel.ts: ${campo} lido sem verCustos`);
  }
}
console.log(`\nImpressão 3D (C-1): custo/lucro/margem fora do extra "custos": ${custoSemExtra.length}`);
for (const s of custoSemExtra) console.log("  ! " + s);
if (custoSemExtra.length) process.exitCode = 1;

// --- Nicho Impressão 3D (Etapa C-1): integrações sem conexão simulada ---------------------------------
// A etapa só tem estrutura: nenhuma tela do nicho tem botão "Testar conexão"/"Conectar", nenhum
// onClick na tela de integrações (só o submit do formulário de dados não secretos), nenhuma escrita
// de status e a coluna `config` só é selecionada atrás de `podeEditar` (fundador/cofundador).
const integracaoSimulada: string[] = [];
const BOTAO_CONEXAO = />\s*(Testar( a)? conex[aã]o|Verificar conex[aã]o|Conectar( agora| conta)?|Autorizar|Reconectar|Sincronizar agora)\s*</i;
for (const pasta of ["app/(dashboard)/impressao-3d", "components/impressao-3d"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    const texto = readFileSync(arq, "utf8");
    if (BOTAO_CONEXAO.test(texto)) integracaoSimulada.push(`${rel} tem botão de conexão/teste`);
    if (/Conex[aã]o (estabelecida|ok|bem[- ]sucedida)|Conectado com sucesso/i.test(texto)) {
      integracaoSimulada.push(`${rel} afirma uma conexão que não existe`);
    }
  }
}
{
  const tela = readFileSync(join(raiz, "components/impressao-3d/integracoes-board.tsx"), "utf8");
  if (/onClick/.test(tela)) integracaoSimulada.push("components/impressao-3d/integracoes-board.tsx tem onClick (só formulário de dados)");
  if (!tela.includes("MENSAGEM_NAO_CONECTADA")) integracaoSimulada.push("integracoes-board.tsx sem a mensagem fixa de não conectada");
  const pagina = readFileSync(join(raiz, "app/(dashboard)/impressao-3d/integracoes/page.tsx"), "utf8");
  if (!/podeEditar \? COLUNAS_INTEGRACAO : COLUNAS_INTEGRACAO_ESTADO/.test(pagina)) {
    integracaoSimulada.push("integracoes/page.tsx seleciona config sem restringir a quem edita");
  }
  const acoes = readFileSync(join(raiz, "app/(dashboard)/impressao-3d/integracoes/actions.ts"), "utf8");
  if (!/acesso\?\.ehDono/.test(acoes)) integracaoSimulada.push("integracoes/actions.ts não restringe a escrita a fundador/cofundador");
  if (/\.rpc\(/.test(acoes)) integracaoSimulada.push("integracoes/actions.ts chama RPC (não há verificação de conexão nesta etapa)");
}
console.log(`\nImpressão 3D (C-1): integração com conexão simulada ou sem restrição: ${integracaoSimulada.length}`);
for (const s of integracaoSimulada) console.log("  ! " + s);
if (integracaoSimulada.length) process.exitCode = 1;

// --- Etapa D: preferências de navegação (menu_preferencias) ------------------------------------
// Só aparência. Escrita apenas em configuracoes/navegacao/actions.ts, nunca por upsert (o banco usa
// índices parciais), só com os campos do contrato, sempre pela empresa ativa; o delete (Restaurar
// padrão) filtra o user_id da própria pessoa. A navegação nunca escreve em módulos ou permissões, e o
// proxy não lê preferência (esconder item não bloqueia rota).
const navegacaoForaDoContrato: string[] = [];
const ARQ_NAVEGACAO = "app/(dashboard)/configuracoes/navegacao/actions.ts";
const CAMPOS_PREFERENCIA = ["itens", "abas_ocultas", "workspace_id", "user_id", "updated_at"];
for (const pasta of ["app", "components", "lib"]) {
  for (const arq of arquivos(join(raiz, pasta))) {
    const rel = relative(raiz, arq).replace(/\\/g, "/");
    const texto = readFileSync(arq, "utf8").replace(/\r\n/g, "\n");
    const re = /\.from\(\s*["'`]menu_preferencias["'`]\s*\)\s*\.(insert|update|upsert|delete)\(/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      const linha = texto.slice(0, m.index).split("\n").length;
      const alvo = `${rel}:${linha} menu_preferencias (${m[1]})`;
      if (rel !== ARQ_NAVEGACAO) navegacaoForaDoContrato.push(`${alvo}: escrita fora de ${ARQ_NAVEGACAO}`);
      if (m[1] === "upsert") navegacaoForaDoContrato.push(`${alvo}: upsert não é permitido (índices parciais)`);
      const payload = argumentos(texto, m.index + m[0].length);
      for (const campo of payload.matchAll(/\b([a-z_]+)\s*:/g)) {
        if (!CAMPOS_PREFERENCIA.includes(campo[1])) navegacaoForaDoContrato.push(`${alvo}: campo fora do contrato (${campo[1]})`);
      }
      const resto = texto.slice(m.index, m.index + 400);
      if (m[1] === "delete" && !/\.eq\("user_id", ctx\.userId\)/.test(resto)) {
        navegacaoForaDoContrato.push(`${alvo}: delete sem filtrar o user_id da própria pessoa`);
      }
    }
  }
}
{
  const acoes = readFileSync(join(raiz, ARQ_NAVEGACAO), "utf8");
  for (const proibido of [/workspace_modulos/, /permissoes_membro/, /definir_modulo/, /\.rpc\(/]) {
    if (proibido.test(acoes)) navegacaoForaDoContrato.push(`${ARQ_NAVEGACAO} usa ${proibido.source} (navegação é só aparência)`);
  }
  for (const rel of ["lib/acesso.ts", "lib/supabase/proxy.ts"]) {
    if (/menu_preferencias|getPreferenciasNavegacao/.test(readFileSync(join(raiz, rel), "utf8"))) {
      navegacaoForaDoContrato.push(`${rel} lê preferência: esconder item não pode bloquear rota`);
    }
  }
  const puro = readFileSync(join(raiz, "lib/modulos/preferencias.ts"), "utf8");
  if (/supabase|from\(/.test(puro)) navegacaoForaDoContrato.push("lib/modulos/preferencias.ts deve ser puro (sem banco)");
}
console.log(`\nEtapa D: escritas em menu_preferencias fora do contrato: ${navegacaoForaDoContrato.length}`);
for (const s of navegacaoForaDoContrato) console.log("  ! " + s);
if (navegacaoForaDoContrato.length) process.exitCode = 1;

// --- Etapa E: a Calculadora de preço NUNCA calcula preço no cliente -----------------------------
// A tela só monta a entrada (lib/impressao-3d/calculadora-rapida.ts) e mostra o retorno de
// p3d_simular_preco. Falha se encontrar custo × multiplicador, custo ÷ (1 − margem), preço atribuído
// por multiplicação etc. nos arquivos da calculadora, ou se a tela deixar de chamar a RPC.
{
  // Caminho em variável: o node exige a extensão .ts; o tsc não aceita no import literal.
  const caminhoAuditoria = "../lib/impressao-3d/auditoria-preco.ts";
  const { ARQUIVOS_CALCULADORA_RAPIDA, precoCalculadoNoCliente } = (await import(
    caminhoAuditoria
  )) as typeof import("../lib/impressao-3d/auditoria-preco");
  const precoNoCliente: string[] = [];
  for (const rel of ARQUIVOS_CALCULADORA_RAPIDA) {
    const texto = readFileSync(join(raiz, rel), "utf8").replace(/\r\n/g, "\n");
    for (const nome of precoCalculadoNoCliente(texto)) precoNoCliente.push(`${rel}: ${nome}`);
  }
  const tela = readFileSync(join(raiz, "components/impressao-3d/calculadora-rapida.tsx"), "utf8");
  if (!tela.includes("simularPreco(")) precoNoCliente.push("calculadora-rapida.tsx não chama simularPreco (RPC p3d_simular_preco)");
  const simulacao = readFileSync(join(raiz, "app/(dashboard)/impressao-3d/precificacao/simulacao.ts"), "utf8");
  if (!simulacao.includes('rpc("p3d_simular_preco"')) precoNoCliente.push("simulacao.ts não usa a RPC p3d_simular_preco");
  console.log(`\nEtapa E: preço calculado no cliente (Calculadora de preço): ${precoNoCliente.length}`);
  for (const s of precoNoCliente) console.log("  ! " + s);
  if (precoNoCliente.length) process.exitCode = 1;
}

// --- Etapa E (parte 2): conclusão de trabalho com materiais, saldo e preço no cliente ----------------
{
  const problemas: string[] = [];
  const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8").replace(/\r\n/g, "\n");

  // 1. p3d_concluir_producao (conclusão simples) nunca em trabalho com materiais: a action confere
  //    p3d_producao_materiais ANTES da RPC simples, e só ela chama a RPC simples.
  const acoesProd = ler("app/(dashboard)/impressao-3d/producao/actions.ts");
  const iSimples = acoesProd.indexOf('rpc("p3d_concluir_producao"');
  const iLinhas = acoesProd.indexOf('.from("p3d_producao_materiais")');
  if (iSimples === -1) problemas.push("producao/actions.ts não chama p3d_concluir_producao (trabalhos antigos)");
  else if (iLinhas === -1 || iLinhas > iSimples) problemas.push("producao/actions.ts chama p3d_concluir_producao sem conferir p3d_producao_materiais antes");
  if (!/Este trabalho tem vários filamentos/.test(acoesProd)) problemas.push("producao/actions.ts não recusa a conclusão simples de trabalho com materiais");
  if (!acoesProd.includes('rpc("p3d_concluir_producao_multi"')) problemas.push("producao/actions.ts não usa p3d_concluir_producao_multi");
  for (const pasta of ["app", "components", "lib"]) {
    for (const arq of arquivos(join(raiz, pasta))) {
      const rel = relative(raiz, arq).replace(/\\/g, "/");
      if (rel === "app/(dashboard)/impressao-3d/producao/actions.ts") continue;
      if (/\.rpc\(\s*["'`]p3d_concluir_producao["'`]/.test(readFileSync(arq, "utf8"))) {
        problemas.push(`${rel} chama p3d_concluir_producao fora da action que confere os materiais`);
      }
    }
  }
  const quadro = ler("components/impressao-3d/producao-board.tsx");
  if (!/linhas\.length > 0\) \{\s*return <FormConcluirMulti/.test(quadro)) problemas.push("producao-board.tsx não roteia trabalho com materiais para FormConcluirMulti");

  // 2. Preço e saldo nunca recalculados no cliente.
  const caminhoModulo = "../lib/impressao-3d/auditoria-preco.ts";
  const { ARQUIVOS_CALCULADORA_RAPIDA: arqPreco, precoCalculadoNoCliente: achaPreco, ARQUIVOS_SEM_SALDO_NO_CLIENTE: arqSaldo, saldoCalculadoNoCliente: achaSaldo } =
    (await import(caminhoModulo)) as typeof import("../lib/impressao-3d/auditoria-preco");
  for (const rel of arqPreco) for (const n of achaPreco(ler(rel))) problemas.push(`${rel}: preço no cliente (${n})`);
  for (const rel of arqSaldo) for (const n of achaSaldo(ler(rel))) problemas.push(`${rel}: saldo no cliente (${n})`);

  console.log(`\nEtapa E (parte 2): conclusão multi, preço e saldo no cliente: ${problemas.length}`);
  for (const s of problemas) console.log("  ! " + s);
  if (problemas.length) process.exitCode = 1;
}

// --- Celular: nada de w-screen/100vw em contêiner de página nem largura fixa > 360 px sem max-w ----------------
// A rolagem horizontal "solta" no celular vem de larguras que passam da tela. Tabelas largas só podem ter
// min-w-[N px] dentro de um contêiner com rolagem própria (overflow-x-auto no mesmo arquivo).
{
  const caminhoLayout = "../lib/auditoria-layout-mobile.ts";
  const { achadosLayoutMobile } = (await import(caminhoLayout)) as typeof import("../lib/auditoria-layout-mobile");
  const layoutRuim: string[] = [];
  for (const pasta of ["app", "components"]) {
    for (const arq of arquivos(join(raiz, pasta))) {
      const rel = relative(raiz, arq).replace(/\\/g, "/");
      if (!/\.tsx$/.test(rel) || /^app\/colaborador\//.test(rel) || /^components\/colaborador\//.test(rel)) continue;
      for (const a of achadosLayoutMobile(readFileSync(arq, "utf8"))) layoutRuim.push(`${rel}: ${a.regra} (${a.trecho.slice(0, 80)})`);
    }
  }
  console.log(`\nCelular: larguras que estouram a tela (w-screen/100vw/largura fixa > 360 px): ${layoutRuim.length}`);
  for (const s of layoutRuim) console.log("  ! " + s);
  if (layoutRuim.length) process.exitCode = 1;
}

// --- Quem comprou: entrada de material só por p3d_registrar_entrada_material; comprador do movimento só por p3d_corrigir_comprador ---
{
  const caminhoComprador = "../lib/impressao-3d/auditoria-comprador.ts";
  const { achadosComprador } = (await import(caminhoComprador)) as typeof import("../lib/impressao-3d/auditoria-comprador");
  const ruins: string[] = [];
  for (const pasta of ["app", "components", "lib"]) {
    for (const arq of arquivos(join(raiz, pasta))) {
      const rel = relative(raiz, arq).replace(/\\/g, "/");
      if (!/\.(ts|tsx)$/.test(rel) || rel === "lib/impressao-3d/auditoria-comprador.ts" || rel.endsWith("database.types.ts")) continue;
      for (const a of achadosComprador(readFileSync(arq, "utf8"))) ruins.push(`${rel}: ${a.regra} (${a.trecho})`);
    }
  }
  console.log(`\nQuem comprou: entrada por p3d_movimentar_estoque / escrita direta em movimentos: ${ruins.length}`);
  for (const s of ruins) console.log("  ! " + s);
  if (ruins.length) process.exitCode = 1;
}

// --- Estoque de material: estoque_atual/custo_medio/ultimo_custo nunca são escritos direto por tela ou action ---
{
  const caminhoEstoque = "../lib/impressao-3d/auditoria-estoque.ts";
  const { achadosEstoqueDireto } = (await import(caminhoEstoque)) as typeof import("../lib/impressao-3d/auditoria-estoque");
  const ruinsEstoque: string[] = [];
  for (const pasta of ["app", "components", "lib"]) {
    for (const arq of arquivos(join(raiz, pasta))) {
      const rel = relative(raiz, arq).replace(/\\/g, "/");
      if (!/\.(ts|tsx)$/.test(rel) || rel === "lib/impressao-3d/auditoria-estoque.ts" || rel.endsWith("database.types.ts")) continue;
      for (const a of achadosEstoqueDireto(readFileSync(arq, "utf8"))) ruinsEstoque.push(`${rel}: ${a.regra} (${a.trecho})`);
    }
  }
  console.log(`\nEstoque: escrita direta em estoque_atual/custo_medio/ultimo_custo: ${ruinsEstoque.length}`);
  for (const s of ruinsEstoque) console.log("  ! " + s);
  if (ruinsEstoque.length) process.exitCode = 1;
}
