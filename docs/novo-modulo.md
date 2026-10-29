# Como adicionar um MÓDULO novo

Um módulo é a única coisa da Fase 4 que **exige código**: ele traz telas e
tabelas. O registro no app e a linha no catálogo precisam andar juntos.

Checklist (nesta ordem):

1. [Tabelas + RLS](#1-tabelas-e-rls)
2. [Linha no catálogo `modulos`](#2-catálogo-no-banco)
3. [Registro em `lib/modulos/registry.ts`](#3-registro-no-app)
4. [Rotas e telas](#4-rotas-e-telas)
5. [Ícone, rótulos e permissões de equipe](#5-ícone-rótulos-e-equipe)
6. [Testes](#6-testes)

## 1. Tabelas e RLS

Toda tabela do módulo isola **por empresa**: coluna `workspace_id uuid not null`
(referência a `perfis_tipos_ativos(id)`) e RLS ligada. Padrão usado em
Marketing (`campanhas`):

```sql
create table public.exemplos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.perfis_tipos_ativos(id) on delete cascade,
  user_id uuid not null,            -- dono da empresa (quem aparece como autor)
  nome text not null,
  created_at timestamptz not null default now()
);
alter table public.exemplos enable row level security;

-- Fundador e cofundador: tudo.
create policy "dono da empresa" on public.exemplos for all
  using (public.eh_dono_workspace(workspace_id))
  with check (public.eh_dono_workspace(workspace_id));

-- Sócio/funcionário (só se o módulo tiver permite_membros = true):
-- tem_permissao confere permissoes_membro (leitura/edicao) E o módulo ligado.
create policy "membro le exemplos" on public.exemplos for select
  using (public.tem_permissao(workspace_id, 'exemplo', 'leitura'));
create policy "membro cria exemplos" on public.exemplos for insert
  with check (public.tem_permissao(workspace_id, 'exemplo', 'edicao'));
create policy "membro altera exemplos" on public.exemplos for update
  using (public.tem_permissao(workspace_id, 'exemplo', 'edicao'))
  with check (public.tem_permissao(workspace_id, 'exemplo', 'edicao'));
create policy "membro exclui exemplos" on public.exemplos for delete
  using (public.tem_permissao(workspace_id, 'exemplo', 'edicao'));
```

Regras: nada de política que dependa só de `user_id` (isso vaza entre empresas);
o RLS é a barreira real — o guard do app só evita tentar e dá mensagem clara.
Rode `scripts/auditar-isolamento.mts` para conferir o isolamento.

## 2. Catálogo no banco

```sql
insert into public.modulos
  (chave, nome, descricao, icone, categoria, ordem, ativo, padrao, depende_de,
   permite_membros, permissoes_extras)
values
  ('exemplo', 'Exemplos', 'O que o módulo faz, em uma frase.', 'Blocks', 'gestao', 100,
   false,            -- ativo: false = "Em breve" até as telas estarem prontas
   false,            -- padrao: já vem ligado em empresa nova?
   '{clientes}',     -- depende_de: módulos que precisam estar ligados antes
   true,             -- permite_membros: sócio/funcionário podem receber permissão?
   '[{"nome": "Ver valores", "chave": "valores"}]'::jsonb);  -- extras de tela
```

- `ativo = false` mostra "Em breve" em **Módulos** e impede ligar. Vire `true`
  só quando **todas** as tabelas isolam por empresa (item 1).
- `permite_membros = true` faz o módulo aparecer na matriz de permissões de
  sócios/setores. Vendedores é `false` de propósito (só fundador/cofundador); o RH é `true`
  e tem o extra `salarios` (esconde salários e valores na tela; ver `lib/rh/salarios.ts`).
- `permissoes_extras` são interruptores de **tela** (esconder um valor); não são
  barreira de segurança.
- `depende_de` é validado por `definir_modulo` e também por `aplicar_nicho`
  (liga as dependências dos recomendados).

## 3. Registro no app

Em `lib/modulos/registry.ts`, uma entrada em `MODULOS`:

```ts
{
  chave: "exemplo",                  // igual a modulos.chave
  rotas: ["/exemplos"],              // prefixos de página e de API
  icone: "blocks",                   // IconeNome (ver item 5)
  tabelas: ["exemplos"],             // documentação/checklist de RLS
  menu: [{ label: "Exemplos", href: "/exemplos", icone: "blocks", grupo: "Gestão" }],
}
```

O registro é a **única** fonte de rotas e menu: o proxy bloqueia a rota enquanto
o módulo estiver desligado, e o menu só mostra módulos ligados. Para um grupo de
menu novo, acrescente o título em `GRUPOS_MENU`.

## 4. Rotas e telas

- Páginas em `app/(dashboard)/exemplos/...`. Nas páginas e actions use o guard
  (`getAcessoModulo("exemplo")` para ler, `getAcessoEdicao("exemplo")` para
  gravar); ele já confere módulo ligado + papel + permissão. Sempre filtre por
  `workspace_id` e grave `workspace_id` + `user_id` (dono) nas linhas novas.
- Módulo só do fundador/cofundador: use `getAcessoSoDono`.
- Rotas de API (`app/api/...`) entram em `rotas` do registro e fazem o mesmo guard.

## 5. Ícone, rótulos e equipe

- **Ícone:** se for um ícone novo, acrescente o nome em `IconeNome`
  (`registry.ts`) e o componente em `components/modulos/icones.ts`.
- **Rótulos (Fase 4):** para o módulo poder ser renomeado por nicho/modelo, ponha
  uma linha em `ROTULOS_PADRAO` (`lib/rotulos-shared.ts`) com o nome de hoje
  (`singular` e `plural`). Nas telas use `useRotulos()` (client) ou
  `await getRotulos()` (servidor):
  `rotulos.plural("exemplo")` para títulos e `rotulos.texto("exemplo", "Novo exemplo", ({ singular }) => \`Adicionar ${singular}\`)`
  para frases — o segundo argumento é o texto **atual**, devolvido intacto quando a
  empresa não tem rótulo. O item de menu é renomeado automaticamente quando o
  módulo tem **um** item no menu; módulos de vários itens mantêm o nome de cada tela.
- **Equipe:** `permite_membros = true` + `lib/socios-shared.ts` (`MODULO_ROTULO`,
  rótulo de reserva) bastam para a matriz de permissões.

## 6. Testes

Em `scripts/testar-acesso.mts`: rota reconhecida/bloqueada com o módulo desligado,
menu do módulo, escrita de leitura-apenas negada. O snapshot
(`scripts/snapshot-empresas-atuais.json`) **não** deve mudar: as empresas atuais
continuam idênticas — só regere se a mudança for intencional (instruções no topo
de `snapshot-empresas-atuais.mts`).

Depois: `npx tsc --noEmit`, `npx eslint`, `npm run build` e
`node --import ./scripts/register-alias.mjs scripts/testar-acesso.mts`.

## Ligando a um nicho

Para o módulo ser recomendado por um nicho, é só dado — veja
[novo-nicho.md](novo-nicho.md) (`insert into nicho_modulos ...`).
