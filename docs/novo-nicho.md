# Como adicionar um NICHO novo (só com SQL)

Um nicho é **dado**, não código. Ele diz duas coisas: **quais módulos** a empresa
recebe ligados e **como se chamam** as telas (rótulos). Não há `if` por nicho no
app: o código só lê as tabelas abaixo. Por isso um nicho novo entra sem deploy.

## Tabelas

| Tabela | Para quê |
| --- | --- |
| `nichos` | O tipo de negócio (nome, descrição, ícone, rótulos padrão em `config`). |
| `nicho_modulos` | Quais módulos o nicho **recomenda** (e a ordem em que aparecem no resumo). |
| `modelos` | Variações do nicho (ver [novo-modelo.md](novo-modelo.md)). |

Leitura liberada a qualquer conta logada (só linhas `ativo`). Escrita: só pelo SQL
Editor / migração — não existe tela para isso.

## Passo a passo

1. **`nichos`** — uma linha:

   | Coluna | Regra |
   | --- | --- |
   | `chave` | Identificador estável, minúsculo, sem espaços (`pet`, `academia`). Nunca mude depois. |
   | `nome` | Título do card ("Pet shop / Veterinária"). |
   | `descricao` | Uma frase para o card. |
   | `icone` | Nome de ícone do lucide em kebab-case (`paw-print`). **Veja o aviso abaixo.** |
   | `ativo` | `true` para aparecer. `false` esconde sem apagar. |
   | `ordem` | Ordem nos cards (10, 20, 30...). |
   | `config` | `{"labels": {...}}` — rótulos padrão do nicho. `{}` = nomes padrão do app. |

2. **`nicho_modulos`** — uma linha por módulo recomendado (`modulo_chave` precisa
   existir em `modulos`; `recomendado = true`). As dependências (`modulos.depende_de`)
   são ligadas automaticamente por `aplicar_nicho`; módulos com `ativo = false` no
   catálogo são ignorados.

3. **Rótulos** — em `nichos.config.labels`, chave = `modulos.chave`:

   ```json
   {"labels": {"clientes": {"singular": "Pet", "plural": "Pets"}}}
   ```

   Singular e plural de **1 a 40 caracteres**. Módulo sem entrada mantém o nome
   padrão do app. Use nomes que funcionem em frases neutras em gênero: as telas
   dizem "Adicionar {singular}", "Lista de {plural}", "Total de {plural}".

## Exemplo

```sql
-- 1) o nicho
insert into nichos (chave, nome, descricao, icone, ativo, ordem, config) values (
  'pet',
  'Pet shop / Veterinária',
  'Banho e tosa, consultas veterinárias e venda de produtos.',
  'paw-print',
  true,
  70,
  '{"labels": {
      "clientes": {"singular": "Tutor",    "plural": "Tutores"},
      "agenda":   {"singular": "Atendimento", "plural": "Atendimentos"}
  }}'::jsonb
);

-- 2) módulos recomendados (ordem = ordem do resumo "Vamos ligar: ...")
insert into nicho_modulos (nicho_chave, modulo_chave, recomendado, ordem) values
  ('pet', 'clientes',   true, 10),
  ('pet', 'agenda',     true, 20),
  ('pet', 'leads',      true, 30),
  ('pet', 'financeiro', true, 40),
  ('pet', 'marketing',  true, 50);
```

Pronto: o nicho aparece em **/nova-empresa**, em **Configurações → Nicho e modelo**
e em **Módulos** ("Recomendado para Pet shop / Veterinária").

## O que `aplicar_nicho` faz com esses dados

- **Liga** os módulos recomendados (e as dependências). **Nunca desliga** nada e
  nunca apaga dados.
- Grava `workspace_config.nicho_chave` / `modelo_id`.
- **Sobrescreve** os rótulos da empresa por `nichos.config.labels` mesclado com
  `modelos.config.labels` (o modelo vence). Rótulos editados à mão são perdidos —
  é isso que "Restaurar padrão do nicho" faz.

## Avisos

- **Ícone:** o app tem um mapa fixo de ícones de nicho em
  `components/nichos/icones.ts`. Ícone que não estiver ali cai no genérico
  (prédio). Para um ícone novo, acrescente uma linha nesse mapa (único ponto de
  código; o nicho em si continua sendo só dado).
- **Desativar** um nicho (`ativo = false`) não afeta empresas que já o usam: a
  configuração delas fica como está.
- Teste com uma empresa de teste antes: `select aplicar_nicho('<ws>', 'pet');`
  logado como dono, ou pela tela de Configurações.
