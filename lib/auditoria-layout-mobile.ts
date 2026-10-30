/**
 * Padrões de layout que estouram a largura do celular. Sem imports: serve ao script de auditoria (node puro)
 * e aos testes. Tabelas largas com `min-w-[N px]` são permitidas quando o arquivo as envolve num contêiner
 * com rolagem própria (`overflow-x-auto`); o resto não.
 */
export interface AchadoLayout {
  regra: string;
  trecho: string;
}

const LIMITE_PX = 360;

function semComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Cada string de className (entre aspas ou crases) com o seu texto. */
function classes(texto: string): string[] {
  return [...texto.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
}

export function achadosLayoutMobile(texto: string): AchadoLayout[] {
  const t = semComentarios(texto);
  const achados: AchadoLayout[] = [];
  const temRolagemPropria = /overflow-x-auto|overflow-x-scroll/.test(t);

  for (const c of classes(t)) {
    // w-screen e 100vw incluem a barra de rolagem e estouram a página (h-screen/max-w calc(100vw-…) não entram).
    if (/(^|\s)(min-|max-)?w-screen(\s|$)/.test(c)) achados.push({ regra: "w-screen em contêiner", trecho: c });
    if (/(?<!max-w-\[calc\()100vw(?!\s*-)/.test(c) && !/calc\(100vw\s*-/.test(c)) achados.push({ regra: "100vw em contêiner", trecho: c });
    for (const m of c.matchAll(/(?<![\w-])((?:min-)?w)-\[(\d+)px\]/g)) {
      if (Number(m[2]) <= LIMITE_PX) continue;
      const tabela = m[1] === "min-w";
      const protegido = /(^|\s)max-w-/.test(c) || (tabela && temRolagemPropria);
      if (!protegido) achados.push({ regra: `${m[1]}-[${m[2]}px] sem max-w-full`, trecho: c });
    }
  }
  // 100vw em estilo inline ou fora de className.
  if (/style=\{\{[^}]*(width|minWidth)\s*:\s*["']?100vw/.test(t)) achados.push({ regra: "100vw em style", trecho: "style" });
  return achados;
}
