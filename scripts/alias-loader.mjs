import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = new URL(`../${specifier.slice(2)}`, import.meta.url);
    for (const sufixo of [".ts", ".tsx", "/index.ts"]) {
      const candidato = new URL(base.href + sufixo);
      if (existsSync(fileURLToPath(candidato))) return nextResolve(candidato.href, context);
    }
  }
  return nextResolve(specifier, context);
}
