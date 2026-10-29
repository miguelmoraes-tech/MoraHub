/**
 * Configuração do sino de alertas do cabeçalho a partir dos módulos que a pessoa pode abrir
 * (registro ∩ módulos ligados ∩ permissão). Sem hooks e sem banco; testada em testar-acesso.mts.
 */
import type { PermissaoModulo } from "@/lib/modulos/permissoes";

export interface ConfigSinoBase {
  podeListar: boolean;
  podeMarcar: boolean;
  acessiveis: string[];
}

/**
 * null = sem sino (nem Dashboard nem Automações disponíveis). `modulosVisiveis` já vem filtrado por
 * permissão para sócio/funcionário; a edição de Automações vem da permissão própria (fundador e
 * cofundador sempre editam). A barreira real continua no servidor e no banco.
 */
export function configDoSino(
  modulosVisiveis: readonly string[],
  painelCompleto: boolean,
  permissoesProprias: readonly PermissaoModulo[]
): ConfigSinoBase | null {
  const temAutomacoes = modulosVisiveis.includes("p3d_automacoes");
  const temDashboard = modulosVisiveis.includes("p3d_dashboard");
  if (!temAutomacoes && !temDashboard) return null;
  return {
    podeListar: temAutomacoes,
    podeMarcar:
      temAutomacoes &&
      (painelCompleto || permissoesProprias.some((p) => p.modulo === "p3d_automacoes" && p.nivel === "edicao")),
    acessiveis: modulosVisiveis.filter((m) => m.startsWith("p3d_")),
  };
}
