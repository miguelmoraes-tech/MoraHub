import type { ResolucaoEmpresa } from "@/lib/empresas";
import {
  HOME_DONO,
  isRotaLivre,
  primeiraRotaHabilitada,
  rotaPermitida,
} from "@/lib/modulos/registry";
import { NOVA_EMPRESA } from "@/lib/empresa";
import { modulosVisiveis } from "@/lib/modulos/permissoes";
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

/** Sócio/funcionário sem nenhuma permissão: a tela "Aguardando liberação de acesso". */
export const AGUARDANDO_LIBERACAO = "/sem-acesso?aguardando=1";

/** Telas de gestão da empresa: só o painel completo (fundador/cofundador). */
const ROTAS_SO_PAINEL = ["/modulos", "/socios", "/configuracoes"];

function casa(path: string, prefixo: string) {
  return path === prefixo || path.startsWith(`${prefixo}/`);
}

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
   * Módulos com alguma permissão em `permissoes_membro` (leitura própria).
   * Só vale para sócio/funcionário; falha de leitura vem vazio, o que nega.
   */
  permissoes?: readonly string[];
  /**
   * Funcionário sem nenhum vínculo e sem empresa própria (cadastrou-se como
   * 'comercial' e ainda não entrou numa empresa). Só é consultado quando
   * `resolucao.status === "sem_empresa"`.
   */
  funcionarioSemVinculo: boolean;
}

export function decidirAcesso(entrada: EntradaAcesso): Decisao {
  const { path, resolucao, habilitados, funcionarioSemVinculo } = entrada;
  const permissoes = entrada.permissoes ?? [];
  if (isRotaIsenta(path)) return seguir;

  const naEntrada = ROTAS_DE_ENTRADA.includes(path);

  switch (resolucao.status) {
    case "erro":
      return para(`${SEM_ACESSO}?erro=1`);

    case "legado":
      // A tela do código vale para qualquer conta logada; o resto cai em /sem-acesso.
      return isRotaDeAcessoVendedor(path) ? seguir : para(SEM_ACESSO);

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

      if (resolucao.papel === "socio" || resolucao.papel === "funcionario") {
        return decidirRestrito(path, naEntrada, habilitados, permissoes);
      }

      // Fundador e cofundador (painel por módulos): fora de /vendedor/*.
      if (naEntrada || isRotaDoVendedor(path)) return para(HOME_DONO);
      if (rotaPermitida(path, habilitados)) return seguir;
      return para(primeiraRotaHabilitada(habilitados) ?? HOME_DONO);
    }
  }
}

/**
 * Sócio e funcionário: rotas = módulos habilitados da empresa ∩ módulos com
 * permissão. Nunca /vendedor/*, /modulos, /socios, /configuracoes nem o
 * detalhe do cliente. A casa deles é a 1ª rota permitida; sem nenhuma, a tela
 * "Aguardando liberação de acesso" (isenta, sem ciclo).
 */
function decidirRestrito(
  path: string,
  naEntrada: boolean,
  habilitados: readonly string[],
  permissoes: readonly string[]
): Decisao {
  const liberados = modulosVisiveis(habilitados, permissoes);
  const home = primeiraRotaHabilitada(liberados) ?? AGUARDANDO_LIBERACAO;

  if (naEntrada || path === "/" || path === HOME_DONO) return para(home);
  if (isRotaDoVendedor(path) || ROTAS_SO_PAINEL.some((p) => casa(path, p))) return para(home);
  // Só a lista de clientes: o detalhe /clientes/[id] é do painel completo.
  if (path.startsWith("/clientes/")) return para(home);
  return rotaPermitida(path, liberados) ? seguir : para(home);
}

/** True se o caminho depende dos módulos ligados (precisa da leitura de workspace_modulos). */
export function precisaDeModulos(path: string): boolean {
  return !isRotaIsenta(path) && !isRotaLivre(path);
}
