/**
 * Regras puras dos arquivos do catálogo (testáveis; sem servidor/React):
 * tipo pela extensão, nome seguro e a regra do caminho no storage.
 */
import type { TipoArquivo } from "@/lib/impressao-3d/tipos";

export const LIMITE_BYTES = 100 * 1024 * 1024;

const POR_EXTENSAO: Record<string, TipoArquivo> = {
  stl: "stl",
  "3mf": "3mf",
  gcode: "gcode",
  gco: "gcode",
  bgcode: "gcode",
  png: "foto",
  jpg: "foto",
  jpeg: "foto",
  webp: "foto",
  gif: "foto",
};

export function tipoPorNome(nome: string): TipoArquivo {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  return POR_EXTENSAO[ext] ?? "outro";
}

export function nomeSeguro(nome: string): string {
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_");
  return limpo.slice(-120) || "arquivo";
}

/** "<workspace_id>/<produto_id>/<uuid>-<nome>" */
export function montarCaminho(workspaceId: string, produtoId: string, uuid: string, nome: string): string {
  return `${workspaceId}/${produtoId}/${uuid}-${nomeSeguro(nome)}`;
}

/** O storage_path precisa estar sob a pasta da empresa e do produto. */
export function caminhoValido(path: string, workspaceId: string, produtoId: string): boolean {
  if (path.includes("..") || path.includes("//")) return false;
  return path.startsWith(`${workspaceId}/${produtoId}/`) && path.length > `${workspaceId}/${produtoId}/`.length;
}

export const ehImagem = (tipo: TipoArquivo) => tipo === "foto";
