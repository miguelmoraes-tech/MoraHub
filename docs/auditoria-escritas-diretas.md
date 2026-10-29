# Auditoria: escritas diretas em `membros`, `convites` e `perfis_tipos_ativos`

Fase 5 (levantamento) e Fase 5B (migração do /vendedores). Método: busca em todo
`app/`, `components/`, `lib/`, `proxy.ts` e `scripts/` por
`.from("membros" | "convites" | "perfis_tipos_ativos")` seguido (nas 8 linhas
seguintes) de `insert/update/delete/upsert`, mais a lista de RPCs chamadas. A
varredura roda sozinha em `scripts/auditar-isolamento.mts` (falha se aparecer
escrita fora da exceção abaixo) e em `scripts/testar-acesso.mts`.

## Situação atual

| Onde | Escrita | Fluxo | Situação |
| ---- | ------- | ----- | -------- |
| `lib/perfil.ts` → `garantirTipoAtivo` (linha 72) | `INSERT perfis_tipos_ativos` (`user_id`, `tipo`, `nome?`) | Cadastro (`lib/actions/auth.ts`, tipos que não são "empresarial") e seletor de modos (`lib/actions/tipos-ativos.ts` → `ativarTipoConta`). **Ativo** | **Sobra.** Não existe RPC (a empresa nasce por `criar_empresa(p_nome, p_nicho)`; os demais tipos precisariam de algo como `garantir_tipo_ativo(p_tipo)`). Não altera a empresa nem a equipe, então não passa pela aprovação entre fundadores |
| `scripts/vendedor-rls-test.sql` | `INSERT INTO membros` (fixtures) | Script SQL manual de teste do RLS, rodado no SQL Editor, não faz parte do app | Não é código do app; relatado por completude |

Mais nada: não há `UPDATE`, `DELETE` nem `UPSERT` direto nas três tabelas, em
client, server actions, route handlers (`app/api/*` só exporta dados) nem scripts.

**`perfis_tipos_ativos` nunca sofre UPDATE/DELETE.** Renomear empresa é a RPC
`renomear_empresa` (`lib/actions/empresa.ts`); a criação é `criar_empresa`. A
única escrita é o INSERT acima.

## Migrado na Fase 5B (`app/(dashboard)/juridico/actions.ts`, usadas só por /vendedores)

| Função | Antes | Agora |
| ------ | ----- | ----- |
| `convidarColaborador` | `INSERT convites` | `convidar_membro(p_workspace_id, p_email, 'comercial', [])` |
| `removerColaborador` | `UPDATE membros SET status='removido'` por id da linha | `remover_membro(p_workspace_id, p_membro_id)`; o id da **pessoa** (`membros.membro_id`) é buscado na linha, só dentro da empresa ativa |
| `cancelarConvite` | `DELETE convites` (só pendente) | `cancelar_convite_empresa(p_id)` |

Com 2+ fundadores (`fundadores_da_empresa`) os três ficam **pendentes**: a tela
mostra "Enviado para aprovação dos outros fundadores" com link para
`/aprovacoes`, não monta link de convite (a RPC devolve `NULL`) e não altera a
lista. Com 1 fundador tudo segue como antes. O pedido do convite aprovado traz o
link `/convite/<token>` em Aprovações.

### Diferenças de comportamento (do código; o corpo das RPCs não foi inspecionado)

Não rodei SQL e a consulta ao corpo das funções não foi autorizada nesta sessão,
então a comparação de colunas abaixo vem só do lado do app. **Conferir no banco:**

- O INSERT antigo gravava `dono_id` (quem convidou, `auth.uid()`), `email_convidado`,
  `papel`, `workspace_id`; `id`, `token`, `status`, `expira_em` e `created_at` vinham
  de DEFAULT. A RPC recebe `p_workspace_id`, `p_email`, `p_papel`, `p_permissoes` e
  devolve o token. Pontos a validar: (1) `dono_id` — o app usava o usuário logado
  (cofundador incluído); a RPC pode gravar o dono da empresa; (2) a coluna de
  permissões (`database.types.ts` está desatualizado e não a lista) deve ficar
  vazia/`[]` para `comercial`; (3) `expira_em` (a tela de sócios diz "vale por 7
  dias") e `token` devem ter o mesmo formato do DEFAULT antigo, para o fluxo de
  aceite do vendedor (`get_convite_by_token`, `aceitar_convite_workspace`) não mudar.
- Convite repetido: o app continua checando antes e mostrando a mensagem de sempre
  ("Já existe um convite pendente para esse e-mail."); a checagem agora filtra por
  empresa e e-mail, **sem** `dono_id` (assim vale também quando o convite foi de
  outro fundador).
- Remover e cancelar antes falhavam em silêncio; agora um erro da RPC aparece em
  aviso (sem texto conhecido, "Não foi possível concluir a ação. Tente novamente.").
- Os papéis antigos de colaborador (contador, advogado, ...) não passam mais por
  `convidarColaborador` (desligados; ela só envia `comercial`): recebem "Este tipo
  de colaborador não está disponível."
- O vendedor (o convidado) não vê nenhuma mudança: o link, a aceitação e a área
  `/vendedor/*` são os mesmos.

## Escritas indiretas (já por RPC)

`aceitar_convite_workspace`, `recusar_convite`, `convidar_membro`,
`cancelar_convite_empresa`, `remover_membro`, `atualizar_permissoes_membro`,
`criar_empresa`, `responder_solicitacao_acesso`, `responder_solicitacao_vendedor`.
