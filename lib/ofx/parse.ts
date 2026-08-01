import type { LancamentoExtratoTipo } from "@/lib/types";

export interface OfxTransacao {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number; // always positive; sinal fica em `tipo`
  tipo: LancamentoExtratoTipo;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

function decodeEntities(value: string) {
  return value.replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m);
}

/** OFX é SGML (elementos-folha não fecham), mas blocos agregados como
 * STMTTRN sempre fecham — então extrair a tag folha até o fim da linha
 * funciona tanto em OFX 1.x (SGML) quanto 2.x (XML). */
function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
  return match ? decodeEntities(match[1].trim()) : null;
}

/** DTPOSTED vem como YYYYMMDD[HHMMSS][[-3:BRT]]. O sufixo de timezone é
 * descartado ao filtrar não-dígitos; como ele vem sempre depois dos 8
 * primeiros dígitos (ano/mês/dia), o "lixo" numérico que ele deixa cai no
 * fim da string e não afeta o slice(0, 8). */
function parseOfxDate(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  if (month < "01" || month > "12" || day < "01" || day > "31") return null;
  return `${year}-${month}-${day}`;
}

export function parseOfx(conteudo: string): OfxTransacao[] {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const transacoes: OfxTransacao[] = [];

  for (const bloco of blocos) {
    const dtPosted = extractTag(bloco, "DTPOSTED");
    const trnAmt = extractTag(bloco, "TRNAMT");
    if (!dtPosted || !trnAmt) continue;

    const data = parseOfxDate(dtPosted);
    const valorBruto = Number.parseFloat(trnAmt.replace(",", "."));
    if (!data || Number.isNaN(valorBruto) || valorBruto === 0) continue;

    const trnType = extractTag(bloco, "TRNTYPE");
    const tipo: LancamentoExtratoTipo =
      valorBruto < 0 ? "debito" : trnType === "DEBIT" ? "debito" : "credito";

    const memo = extractTag(bloco, "MEMO");
    const name = extractTag(bloco, "NAME");
    const descricao = memo || name || "Lançamento sem descrição";

    transacoes.push({ data, descricao, valor: Math.abs(valorBruto), tipo });
  }

  return transacoes;
}
