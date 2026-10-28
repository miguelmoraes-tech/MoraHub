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
const ESTRITAS = [
  "campanhas", "calendario_conteudo",
];
const MODULOS_NOVOS: Record<string, string[]> = {
  marketing: ["campanhas", "calendario_conteudo"],
};

// Legado do contador (papel sem interface): fora do escopo da empresa ativa.
const IGNORAR = [/^app[\\/]colaborador[\\/]/];

const raiz = process.cwd();
function arquivos(dir: string): string[] {
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
    if (IGNORAR.some((r) => r.test(rel))) continue;
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

console.log(`\nInserts/upserts sem workspace_id (insumo para NOT NULL): ${insertsSemWorkspace.length}`);
for (const s of insertsSemWorkspace) console.log("  ! " + s);
if (insertsSemWorkspace.length) process.exitCode = 1;

// --- Escrita por papel (Fase 3) -------------------------------------------
// Toda action exportada dos módulos que sócio/funcionário podem editar precisa
// passar por uma guarda de edição (fundador/cofundador OU tem_permissao). A
// barreira real é o RLS; isto pega uma action nova esquecida sem guarda.
const GUARDAS = ["getAcessoEdicao", "getAcessoSoDono", "podeEditarProposta", "getEmpresaPainel"];
const ACTIONS_COM_GUARDA = [
  "app/(dashboard)/leads/actions.ts",
  "app/(dashboard)/renegados/actions.ts",
  "app/(dashboard)/clientes/actions.ts",
  "lib/actions/propostas.ts",
  "app/(dashboard)/socios/actions.ts",
  "app/(dashboard)/marketing/calendario/actions.ts",
  "app/(dashboard)/marketing/campanhas/actions.ts",
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
};
const proibidos = [/getDonoIdAtivo/, /getWorkspaceIdAtivo/, /get_colaboradores_do_dono_by_id/];
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
