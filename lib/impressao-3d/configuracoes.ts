/**
 * Atalhos do hub "Configurações do nicho" (Impressão 3D). Só aponta para telas que já existem:
 * Precificação, Alertas e Integrações aparecem quando o módulo está ligado na empresa; Módulos e
 * Equipe são do painel e sempre aparecem. Nada novo no banco.
 */
import type { IconeNome } from "@/lib/modulos/registry";

export interface AtalhoConfiguracao {
  titulo: string;
  descricao: string;
  href: string;
  icone: IconeNome;
}

export function atalhosConfiguracaoNicho(habilitados: readonly string[]): AtalhoConfiguracao[] {
  const atalhos: AtalhoConfiguracao[] = [];
  if (habilitados.includes("p3d_precificacao")) {
    atalhos.push({
      titulo: "Parâmetros de precificação",
      descricao: "Tarifa de energia, mão de obra, desperdício, falhas, margem, impostos e taxas.",
      href: "/impressao-3d/precificacao",
      icone: "calculator",
    });
  }
  if (habilitados.includes("p3d_automacoes")) {
    atalhos.push({
      titulo: "Alertas",
      descricao: "Quando avisar sobre estoque, prazos, manutenção, pagamentos, orçamentos, compras e falhas.",
      href: "/impressao-3d/notificacoes/alertas",
      icone: "bell",
    });
  }
  if (habilitados.includes("p3d_integracoes")) {
    atalhos.push({
      titulo: "Integrações",
      descricao: "WhatsApp, monitoramento de impressoras, pagamento, Correios, Melhor Envio e IA (somente estrutura).",
      href: "/impressao-3d/integracoes",
      icone: "plug",
    });
  }
  atalhos.push(
    {
      titulo: "Módulos da empresa",
      descricao: "Ligar e desligar os módulos que a empresa usa.",
      href: "/modulos",
      icone: "blocks",
    },
    {
      titulo: "Equipe e permissões",
      descricao: "Sócios e funcionários, o que cada um vê e edita (inclusive o extra de custos).",
      href: "/socios",
      icone: "users",
    }
  );
  return atalhos;
}
