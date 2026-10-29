/**
 * Integrações do nicho Impressão 3D (Etapa C-1): SÓ ESTRUTURA. Nada aqui conecta, testa nem
 * simula conexão com serviço externo; a tela guarda configuração NÃO secreta e mostra o estado que
 * o banco informa (status, segredo_configurado, ultima_verificacao, ultimo_erro: somente leitura).
 *
 * Segredos (tokens, chaves de API, senhas) nunca passam por aqui: dependem de credenciais externas
 * e de configuração no servidor/cofre. O banco rejeita `config` com chave que contenha
 * token/secret/segredo/senha/password/apikey/authorization (CHAVE_PROIBIDA espelha essa regra).
 */

export const TIPOS_INTEGRACAO = [
  "whatsapp",
  "monitoramento_impressoras",
  "pagamento",
  "correios",
  "melhor_envio",
  "ia",
] as const;
export type TipoIntegracao = (typeof TIPOS_INTEGRACAO)[number];

export function tipoIntegracaoValido(v: unknown): v is TipoIntegracao {
  return typeof v === "string" && (TIPOS_INTEGRACAO as readonly string[]).includes(v);
}

export type StatusIntegracao = "nao_configurada" | "configurada" | "erro";
export const STATUS_INTEGRACAO_ROTULO: Record<StatusIntegracao, string> = {
  nao_configurada: "Não configurada",
  configurada: "Configurada",
  erro: "Com erro",
};

/** Texto fixo enquanto o status é nao_configurada. */
export const MENSAGEM_NAO_CONECTADA =
  "Depende de credenciais externas e de configuração no servidor; ainda não conectada";

/** Mesma regra do banco para as chaves de `config` (qualquer parte do nome, sem diferenciar caixa). */
export const CHAVE_PROIBIDA = /token|secret|segredo|senha|password|apikey|authorization/i;

export interface OpcaoCampo {
  valor: string;
  rotulo: string;
}

export interface CampoConfig {
  chave: string;
  rotulo: string;
  ajuda: string;
  tipo: "texto" | "url" | "cep" | "opcoes";
  opcoes?: readonly OpcaoCampo[];
  max?: number;
}

export interface InfoIntegracao {
  nome: string;
  descricao: string;
  habilita: readonly string[];
  /** O que a integração exigirá quando for implementada (também em docs/nicho-impressao-3d.md). */
  exigira: string;
  campos: readonly CampoConfig[];
}

export const INTEGRACAO_INFO: Record<TipoIntegracao, InfoIntegracao> = {
  whatsapp: {
    nome: "WhatsApp",
    descricao: "Envio de mensagens aos clientes e à equipe pelo WhatsApp Business.",
    habilita: [
      "Avisar o cliente do orçamento, do andamento do pedido e do envio",
      "Lembrar pagamentos pendentes",
      "Entregar os alertas da empresa fora do app",
    ],
    exigira: "WhatsApp Cloud API: número verificado e token de acesso guardado no cofre do servidor.",
    campos: [
      { chave: "id_numero", rotulo: "ID do número (Cloud API)", ajuda: "Identificador do número no painel da Meta. Não é o token.", tipo: "texto", max: 40 },
      { chave: "numero_exibicao", rotulo: "Número de exibição", ajuda: "Como o número aparece para o cliente, ex.: +55 11 99999-0000.", tipo: "texto", max: 30 },
      { chave: "nome_conta", rotulo: "Nome da conta", ajuda: "Nome da conta comercial, só para identificação.", tipo: "texto", max: 80 },
    ],
  },
  monitoramento_impressoras: {
    nome: "Monitoramento de impressoras",
    descricao: "Acompanhamento do estado das impressoras (progresso, temperatura, fila) por software de controle.",
    habilita: [
      "Ver o estado e o progresso das impressoras sem sair do app",
      "Iniciar e concluir trabalhos com horas e consumo medidos",
      "Detectar falhas durante a impressão",
    ],
    exigira: "URL/endpoint por impressora (OctoPrint, Moonraker/Klipper ou Bambu) e a chave de acesso de cada uma, no servidor.",
    campos: [
      {
        chave: "software",
        rotulo: "Software de controle",
        ajuda: "O que roda nas impressoras.",
        tipo: "opcoes",
        opcoes: [
          { valor: "octoprint", rotulo: "OctoPrint" },
          { valor: "moonraker", rotulo: "Moonraker / Klipper" },
          { valor: "bambu", rotulo: "Bambu Lab" },
          { valor: "outro", rotulo: "Outro" },
        ],
      },
      { chave: "url_base", rotulo: "URL base", ajuda: "Endereço http(s) sem usuário, senha ou parâmetros. Cada impressora poderá ter o seu endereço depois.", tipo: "url", max: 200 },
    ],
  },
  pagamento: {
    nome: "Pagamento",
    descricao: "Cobrança online dos pedidos (Pix, cartão, boleto) por um provedor de pagamentos.",
    habilita: [
      "Gerar link ou cobrança Pix/cartão no pedido",
      "Baixar o pagamento automaticamente quando confirmado",
    ],
    exigira: "Conta no provedor escolhido, chave de API e segredo do webhook no cofre do servidor.",
    campos: [
      {
        chave: "provedor",
        rotulo: "Provedor",
        ajuda: "Provedor que será usado.",
        tipo: "opcoes",
        opcoes: [
          { valor: "mercado_pago", rotulo: "Mercado Pago" },
          { valor: "asaas", rotulo: "Asaas" },
          { valor: "pagarme", rotulo: "Pagar.me" },
          { valor: "stripe", rotulo: "Stripe" },
          { valor: "outro", rotulo: "Outro" },
        ],
      },
      { chave: "nome_conta", rotulo: "Nome da conta", ajuda: "Só para identificação.", tipo: "texto", max: 80 },
    ],
  },
  correios: {
    nome: "Correios",
    descricao: "Cotação de frete, etiqueta e rastreio automático pelos Correios.",
    habilita: [
      "Cotar frete no pedido",
      "Gerar etiqueta de postagem",
      "Atualizar o rastreio sozinho na Expedição",
    ],
    exigira: "Contrato com os Correios e as credenciais do contrato, guardadas no servidor.",
    campos: [
      { chave: "contrato", rotulo: "Contrato", ajuda: "Número do contrato, só para identificação. A senha/token não vai aqui.", tipo: "texto", max: 40 },
      { chave: "cep_origem", rotulo: "CEP de origem", ajuda: "CEP de onde as encomendas saem.", tipo: "cep" },
      { chave: "nome_conta", rotulo: "Nome da conta", ajuda: "Só para identificação.", tipo: "texto", max: 80 },
    ],
  },
  melhor_envio: {
    nome: "Melhor Envio",
    descricao: "Cotação e compra de frete em várias transportadoras pelo Melhor Envio.",
    habilita: [
      "Comparar fretes de várias transportadoras",
      "Comprar etiqueta e acompanhar o rastreio",
    ],
    exigira: "Conta no Melhor Envio e token de acesso (OAuth) guardado no cofre do servidor.",
    campos: [
      { chave: "nome_conta", rotulo: "Nome da conta", ajuda: "Só para identificação.", tipo: "texto", max: 80 },
      { chave: "cep_origem", rotulo: "CEP de origem", ajuda: "CEP de onde as encomendas saem.", tipo: "cep" },
      {
        chave: "ambiente",
        rotulo: "Ambiente",
        ajuda: "Teste (sandbox) ou produção.",
        tipo: "opcoes",
        opcoes: [
          { valor: "sandbox", rotulo: "Sandbox (teste)" },
          { valor: "producao", rotulo: "Produção" },
        ],
      },
    ],
  },
  ia: {
    nome: "Inteligência artificial",
    descricao: "Assistente para descrições de produtos, respostas a clientes e análise de falhas.",
    habilita: [
      "Sugerir descrição e título de produtos",
      "Rascunhar respostas a clientes",
      "Apontar causas prováveis de falhas de impressão",
    ],
    exigira: "Chave de API do provedor de IA guardada no cofre do servidor.",
    campos: [
      {
        chave: "provedor",
        rotulo: "Provedor",
        ajuda: "Provedor que será usado.",
        tipo: "opcoes",
        opcoes: [
          { valor: "anthropic", rotulo: "Anthropic" },
          { valor: "openai", rotulo: "OpenAI" },
          { valor: "google", rotulo: "Google" },
          { valor: "outro", rotulo: "Outro" },
        ],
      },
      { chave: "modelo", rotulo: "Modelo", ajuda: "Nome do modelo, só para identificação.", tipo: "texto", max: 80 },
    ],
  },
};

// --- Linha do banco -----------------------------------------------------------------------------

export interface Integracao {
  id: string;
  tipo: TipoIntegracao;
  ativo: boolean;
  /** Só chega para fundador/cofundador (o servidor não seleciona para quem só lê). */
  config: Record<string, string>;
  /** Somente leitura: o banco ignora qualquer escrita nestes quatro. */
  status: StatusIntegracao;
  segredo_configurado: boolean;
  ultima_verificacao: string | null;
  ultimo_erro: string | null;
}

/** Colunas do estado (sem config): é o que sai para quem só tem leitura. */
export const COLUNAS_INTEGRACAO_ESTADO = "id, tipo, ativo, status, segredo_configurado, ultima_verificacao, ultimo_erro";
/** Só o fundador/cofundador seleciona a config. */
export const COLUNAS_INTEGRACAO = `${COLUNAS_INTEGRACAO_ESTADO}, config`;

export function statusValido(v: unknown): StatusIntegracao {
  return v === "configurada" || v === "erro" ? v : "nao_configurada";
}

/** Config do banco (jsonb) → só os valores texto das chaves que o tipo conhece. */
export function lerConfigIntegracao(tipo: TipoIntegracao, bruto: unknown): Record<string, string> {
  const saida: Record<string, string> = {};
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return saida;
  const r = bruto as Record<string, unknown>;
  for (const c of INTEGRACAO_INFO[tipo].campos) {
    const v = r[c.chave];
    if (typeof v === "string" && v !== "") saida[c.chave] = v;
  }
  return saida;
}

export function lerIntegracoes(bruto: unknown): Integracao[] {
  if (!Array.isArray(bruto)) return [];
  const saida: Integracao[] = [];
  for (const item of bruto) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || !tipoIntegracaoValido(r.tipo)) continue;
    saida.push({
      id: r.id,
      tipo: r.tipo,
      ativo: r.ativo === true,
      config: lerConfigIntegracao(r.tipo, r.config),
      status: statusValido(r.status),
      segredo_configurado: r.segredo_configurado === true,
      ultima_verificacao: typeof r.ultima_verificacao === "string" ? r.ultima_verificacao : null,
      ultimo_erro: typeof r.ultimo_erro === "string" && r.ultimo_erro !== "" ? r.ultimo_erro : null,
    });
  }
  return saida;
}

// --- Validação da config não secreta ------------------------------------------------------------

/** Valor que parece token/chave (prefixos conhecidos ou sequência longa sem espaço com letras e números). */
export function pareceSegredo(valor: string): boolean {
  if (/^(sk-|pk_|rk_|eyJ|xox[bp]-|AIza|ghp_|Bearer\s|Basic\s)/i.test(valor)) return true;
  return valor.length >= 32 && !/\s/.test(valor) && /[a-z]/i.test(valor) && /\d/.test(valor);
}

export type ResultadoConfig = { ok: true; config: Record<string, string> } | { ok: false; erro: string };

/**
 * Valida os campos permitidos do tipo. Campo desconhecido é ignorado (só as chaves do tipo passam);
 * vazio = campo removido. Nunca devolve chave que o banco rejeitaria.
 */
export function validarConfigIntegracao(tipo: TipoIntegracao, valores: Record<string, unknown>): ResultadoConfig {
  const config: Record<string, string> = {};
  for (const c of INTEGRACAO_INFO[tipo].campos) {
    const bruto = valores[c.chave];
    const v = typeof bruto === "string" ? bruto.trim() : "";
    if (v === "") continue;
    if (/[\u0000-\u001f\u007f]/.test(v)) return { ok: false, erro: `${c.rotulo}: caracteres inválidos.` };
    if (c.tipo === "opcoes") {
      if (!c.opcoes?.some((o) => o.valor === v)) return { ok: false, erro: `${c.rotulo}: opção inválida.` };
      config[c.chave] = v;
      continue;
    }
    if (c.tipo === "cep") {
      if (!/^\d{5}-?\d{3}$/.test(v)) return { ok: false, erro: `${c.rotulo}: use 8 dígitos, ex.: 01310-100.` };
      config[c.chave] = v.replace("-", "");
      continue;
    }
    if (v.length > (c.max ?? 120)) return { ok: false, erro: `${c.rotulo}: use no máximo ${c.max ?? 120} caracteres.` };
    if (c.tipo === "url") {
      let u: URL;
      try {
        u = new URL(v);
      } catch {
        return { ok: false, erro: `${c.rotulo}: endereço inválido. Use http:// ou https://.` };
      }
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { ok: false, erro: `${c.rotulo}: use um endereço http:// ou https://.` };
      }
      if (u.username || u.password || u.search || u.hash) {
        return { ok: false, erro: `${c.rotulo}: não inclua usuário, senha nem parâmetros no endereço (credenciais não são guardadas aqui).` };
      }
      config[c.chave] = v;
      continue;
    }
    if (pareceSegredo(v)) {
      return { ok: false, erro: `${c.rotulo}: o valor parece um token ou chave. Segredos não são guardados aqui.` };
    }
    config[c.chave] = v;
  }
  return { ok: true, config };
}

/**
 * Config a gravar: o que já existe no banco é preservado (outras chaves não secretas que o servidor
 * tenha posto), as chaves do tipo são trocadas pelas novas e as que ficaram vazias são removidas.
 */
export function mesclarConfig(
  atual: unknown,
  tipo: TipoIntegracao,
  novas: Record<string, string>
): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  if (atual && typeof atual === "object" && !Array.isArray(atual)) {
    for (const [k, v] of Object.entries(atual as Record<string, unknown>)) {
      if (!CHAVE_PROIBIDA.test(k)) base[k] = v;
    }
  }
  for (const c of INTEGRACAO_INFO[tipo].campos) delete base[c.chave];
  return { ...base, ...novas };
}
