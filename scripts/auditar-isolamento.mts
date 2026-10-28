/**
 * Auditoria estática do isolamento por empresa: toda leitura e todo insert das
 * tabelas que isolam por workspace_id na RLS precisa mencionar workspace_id.
 *
 *   node scripts/auditar-isolamento.mts
 *
 * É heurística (olha o trecho logo após `.from("tabela")`), serve para achar
 * esquecimentos; update/delete por id ficam a cargo da RLS e só são listados.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ISOLADAS = [
  "leads", "renegados", "clientes", "followups_lead", "propostas", "reunioes",
  "lead_views", "solicitacoes_vendedor", "workspace_codigos", "perfis_acesso", "permissoes_membro",
  "acessos", "assinaturas", "backups", "comprovantes", "contratos",
  "infraestrutura", "manutencoes", "projetos", "servicos", "campanhas",
];
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
let verificados = 0;

for (const base of ["app", "lib", "components"]) {
  for (const arq of arquivos(join(raiz, base))) {
    const rel = relative(raiz, arq);
    if (IGNORAR.some((r) => r.test(rel))) continue;
    const texto = readFileSync(arq, "utf8").replace(/\r\n/g, "\n");
    const re = /\.from\("([a-z_]+)"\)/g;
    for (let m = re.exec(texto); m; m = re.exec(texto)) {
      if (!ISOLADAS.includes(m[1])) continue;
      const linha = texto.slice(0, m.index).split("\n").length;
      // Trecho do comando: até o próximo `.from(` ou 900 caracteres.
      const resto = texto.slice(m.index + m[0].length);
      const fim = resto.search(/\.from\("/);
      const trecho = resto.slice(0, fim === -1 ? 900 : Math.min(fim, 900));
      const alvo = `${rel}:${linha} ${m[1]}`;

      if (/^\s*\.(update|delete)\(/.test(trecho)) {
        porId.push(alvo);
        continue;
      }
      verificados++;
      if (!trecho.includes("workspace_id")) sem.push(alvo);
    }
  }
}

console.log(`Comandos verificados (select/insert): ${verificados}`);
console.log(`Sem workspace_id no trecho: ${sem.length}`);
for (const s of sem) console.log("  ! " + s);
console.log(`update/delete por id (barreira = RLS): ${porId.length}`);
if (sem.length) process.exitCode = 1;

// --- Escrita por papel (Fase 3) -------------------------------------------
// Toda action exportada dos módulos que sócio/funcionário podem editar precisa
// passar por uma guarda de edição (fundador/cofundador OU tem_permissao). A
// barreira real é o RLS; isto pega uma action nova esquecida sem guarda.
const GUARDAS = ["getAcessoEdicao", "podeEditarProposta", "getEmpresaPainel"];
const ACTIONS_COM_GUARDA = [
  "app/(dashboard)/leads/actions.ts",
  "app/(dashboard)/renegados/actions.ts",
  "app/(dashboard)/clientes/actions.ts",
  "lib/actions/propostas.ts",
  "app/(dashboard)/socios/actions.ts",
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
