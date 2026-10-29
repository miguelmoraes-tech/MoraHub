# Auditoria: escritas diretas em `membros`, `convites` e `perfis_tipos_ativos`

Levantamento da Fase 5 (só relato; o fluxo do vendedor não foi alterado). Método:
busca por `.from("membros" | "convites" | "perfis_tipos_ativos")` seguida de
`insert/update/delete/upsert` em todo `app/`, `components/`, `lib/` e `proxy.ts`,
mais a lista de RPCs chamadas pelo app. Tudo o mais nessas tabelas é leitura ou
passa por RPC.

| # | Onde | Escrita | Para que serve | RPC que substituiria | Fluxo |
| - | ---- | ------- | -------------- | -------------------- | ----- |
| 1 | `app/(dashboard)/juridico/actions.ts` → `convidarColaborador` | `INSERT convites` (`dono_id`, `email_convidado`, `papel`, `workspace_id`) | Convite de colaborador; hoje só a tela **/vendedores** o usa (`ColaboradoresSection` com `papelFixo="comercial"` → `ConviteColaboradorDialog`) | `convidar_membro(p_workspace_id, p_email, p_papel, p_permissoes)` | **Ativo** (só /vendedores). O código do Jurídico/Contábil que também o usava é legado desligado |
| 2 | mesmo arquivo → `removerColaborador` | `UPDATE membros SET status='removido'` por `id` + `workspace_id` | Remover vendedor em /vendedores | `remover_membro(p_workspace_id, p_membro_id)` | **Ativo** (só /vendedores) |
| 3 | mesmo arquivo → `cancelarConvite` | `DELETE convites` (`id`, `dono_id`, `workspace_id`, `status='pendente'`) | Cancelar convite pendente de vendedor | `cancelar_convite_empresa(p_id)` | **Ativo** (só /vendedores) |
| 4 | `lib/perfil.ts` → `garantirTipoAtivo` | `INSERT perfis_tipos_ativos` (`user_id`, `tipo`, `nome?`) | Registrar o tipo de conta: cadastro (`lib/actions/auth.ts`, tipos que não são "empresarial") e o seletor de modos (`lib/actions/tipos-ativos.ts` → `ativarTipoConta`) | **Não existe RPC.** Para `empresarial` já vale `criar_empresa(p_nome, p_nicho)`; para os demais tipos faltaria uma RPC tipo `garantir_tipo_ativo(p_tipo)` | **Ativo** (cadastro e seletor). Para contador/advogado/financeiro/rh o destino (`/colaborador`) é legado desligado, mas o insert do cadastro ainda roda |

Escritas indiretas (já por RPC, nada a migrar): `aceitar_convite_workspace`,
`recusar_convite`, `convidar_membro`, `cancelar_convite_empresa`, `remover_membro`,
`atualizar_permissoes_membro`, `criar_empresa`, `responder_solicitacao_*`.

## A `convidar_membro` precisaria aceitar `comercial`?

**Sim**, para cobrir o /vendedores. Hoje o app só envia `socio`, `funcionario` e
`cofundador` (enum em `app/(dashboard)/socios/actions.ts`), e o convite de
vendedor sai do item 1 com `papel='comercial'`. Para migrar seria preciso:

1. `convidar_membro` aceitar `p_papel = 'comercial'` (sem matriz de permissões,
   que o vendedor não usa) e devolver o token como o item 1 devolve hoje;
2. `remover_membro` receber o vínculo de vendedor (ele recebe `p_membro_id`, que é o
   **user id**; o item 2 recebe o **id da linha** de `membros`: a tela teria de
   passar o outro identificador);
3. a tela /vendedores tratar o retorno `NULL` (2+ fundadores): avisar "Enviado para
   aprovação" e não mostrar link.

Não consegui confirmar no banco se `convidar_membro` já aceita `comercial`
(a consulta ao corpo da função não foi autorizada nesta sessão): conferir antes de migrar.

## Risco que isto cria com a aprovação entre fundadores

Os itens 1, 2 e 3 são escritas **diretas**: não passam pela porta de aprovação do
banco. Se o RLS deixa o dono gravar em `convites`/`membros`, com 2+ fundadores um
deles ainda convida/remove **vendedor** sem a aprovação dos outros. O app não
trava isso (a regra é "no /vendedores NÃO migre"). Decisão pendente para o banco ou
para uma fase futura: migrar os três para as RPCs acima ou restringir o RLS.

## Migrado nesta fase

Nada. Os únicos fluxos ativos com escrita direta são o /vendedores (itens 1 a 3,
fora do escopo) e o `garantirTipoAtivo` (item 4), que não tem RPC equivalente.
