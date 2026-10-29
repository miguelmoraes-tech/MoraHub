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
    const re = /\.from\("([a-z_]+)"\)/g;
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
const TABELAS_DE_EQUIPE = ["membros", "convites", "perfis_tipos_ativos"];
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
      const m = linha.match(/\.from\(\s*["'`](membros|convites|perfis_tipos_ativos)["'`]/);
      if (!m || !TABELAS_DE_EQUIPE.includes(m[1])) return;
      const trecho = linhas.slice(i, i + 8).join(" ");
      const escrita = trecho.match(/\.(insert|update|delete|upsert)\(/);
      if (escrita) escritasDiretas.push(`${rel}:${i + 1} ${m[1]} (${escrita[1]})`);
    });
  }
}
const naoPermitidas = escritasDiretas.filter((s) => !ESCRITAS_PERMITIDAS.has(s.split(":")[0]));
console.log(`\nEscritas diretas em membros/convites/perfis_tipos_ativos: ${escritasDiretas.length}`);
for (const s of escritasDiretas) console.log(`  ${ESCRITAS_PERMITIDAS.has(s.split(":")[0]) ? "-" : "!"} ${s}`);
console.log(`Fora das exceções conhecidas: ${naoPermitidas.length}`);
if (naoPermitidas.length) process.exitCode = 1;
