import type { ResolucaoEmpresa } from "@/lib/empresas";
import {
  HOME_DONO,
  isRotaLivre,
  primeiraRotaHabilitada,
  rotaPermitida,
} from "@/lib/modulos/registry";
import { NOVA_EMPRESA } from "@/lib/empresa";
import {
  ACESSO_VENDEDOR_CODIGO,
  VENDEDOR_HOME,
  isRotaDeAcessoVendedor,
  isRotaDoVendedor,
} from "@/lib/vendedor-access";

/**
 * Para onde o proxy manda cada requisição, decidido pelo PAPEL NA EMPRESA
 * ATIVA (não pelo usuário). Função pura — sem banco, sem cookies — para que a
 * regra possa ser testada de ponta a ponta (scripts/testar-acesso.mts).
 *
 * Invariantes (testadas):
 *  - negar por padrão: erro de consulta ou papel desconhecido nunca vira dono;
 *  - sem loops: o destino de todo redirecionamento é uma rota que a MESMA
 *    resolução deixa passar (ponto fixo em um salto) — /dashboard e
 *    /vendedor/leads nunca se redirecionam mutuamente.
 */

/** Telas de entrada: quem já está logado é mandado para a sua casa. */
export const ROTAS_DE_ENTRADA = ["/login", "/signup"];

/** Tela de "Sem acesso nesta empresa". Nunca passa por resolução (evita ciclo). */
export const SEM_ACESSO = "/sem-acesso";

/** Rotas que o proxy não avalia para quem está logado: aceitar convite e a tela de sem acesso. */
export function isRotaIsenta(path: string): boolean {
  return path.startsWith("/convite/") || path === SEM_ACESSO;
}

export type Decisao = { tipo: "seguir" } | { tipo: "redirecionar"; para: string };

const seguir: Decisao = { tipo: "seguir" };
const para = (destino: string): Decisao => ({ tipo: "redirecionar", para: destino });

export interface EntradaAcesso {
  path: string;
  resolucao: ResolucaoEmpresa;
  /**
   * Módulos ligados na empresa ativa. Só vale para o dono; sem leitura
   * (falha) vem vazio, o que nega as rotas de módulo.
   */
  habilitados: readonly string[];
  /**
   * Funcionário sem nenhum vínculo e sem empresa própria (cadastrou-se como
   * 'comercial' e ainda não entrou numa empresa). Só é consultado quando
   * `resolucao.status === "sem_empresa"`.
   */
  funcionarioSemVinculo: boolean;
}

export function decidirAcesso(entrada: EntradaAcesso): Decisao {
  const { path, resolucao, habilitados, funcionarioSemVinculo } = entrada;
  if (isRotaIsenta(path)) return seguir;

  const naEntrada = ROTAS_DE_ENTRADA.includes(path);

  switch (resolucao.status) {
    case "erro":
      return para(`${SEM_ACESSO}?erro=1`);

    case "legado":
      return para(SEM_ACESSO);

    case "sem_empresa": {
      if (funcionarioSemVinculo) {
        // Só digitar o código, esperar a aprovação ou criar a própria empresa.
        const liberada = isRotaDeAcessoVendedor(path) || path === NOVA_EMPRESA;
        return liberada ? seguir : para(ACESSO_VENDEDOR_CODIGO);
      }
      if (naEntrada || isRotaDoVendedor(path)) return para(HOME_DONO);
      return rotaPermitida(path, []) ? seguir : para(HOME_DONO);
    }

    case "ok": {
      if (resolucao.papel === "comercial") {
        // Vendedor: só /vendedor/*, as telas do código e criar a própria empresa.
        if (naEntrada) return para(VENDEDOR_HOME);
        const liberada =
          isRotaDoVendedor(path) || isRotaDeAcessoVendedor(path) || path === NOVA_EMPRESA;
        return liberada ? seguir : para(VENDEDOR_HOME);
      }

      // Dono (painel por módulos) e sócio (permissões da Fase 3): fora de /vendedor/*.
      if (naEntrada || isRotaDoVendedor(path)) return para(HOME_DONO);
      const liberados = resolucao.papel === "dono" ? habilitados : [];
      if (rotaPermitida(path, liberados)) return seguir;
      return para(primeiraRotaHabilitada(liberados) ?? HOME_DONO);
    }
  }
}

/** True se o caminho depende dos módulos ligados (precisa da leitura de workspace_modulos). */
export function precisaDeModulos(path: string): boolean {
  return !isRotaIsenta(path) && !isRotaLivre(path);
}
