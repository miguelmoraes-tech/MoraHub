# Como adicionar um MODELO novo (só com SQL)

Um modelo é uma **variação de um nicho** ("Fisioterapia" dentro de "Clínica /
Saúde"). Ele não liga módulos próprios — quem liga é o nicho. O modelo só
**refina os rótulos** (e, no futuro, a `semente`). Também é só dado.

## Tabela `modelos`

| Coluna | Regra |
| --- | --- |
| `id` | Gerado (`gen_random_uuid()`). É o que `workspace_config.modelo_id` guarda. |
| `nicho_chave` | Nicho dono do modelo (precisa existir em `nichos`). |
| `chave` | Identificador estável **dentro do nicho** (`fisioterapia`). É o que se passa em `aplicar_nicho(ws, nicho, modelo)`. |
| `nome` | Texto do chip na tela. |
| `descricao` | Dica (tooltip) opcional. |
| `config` | `{"labels": {...}}` — rótulos que **vencem** os do nicho. `{}` = só os do nicho. |
| `semente` | Reservado para dados iniciais; ainda não é usado pelo app. Deixe `{}`. |
| `ativo` | `true` para aparecer. |
| `ordem` | Ordem dos chips. |

Formato de `labels` (igual ao do nicho): `chave do módulo → {singular, plural}`,
1 a 40 caracteres cada.

## Exemplo

```sql
-- Dentro do nicho 'saude': fisioterapia chama a agenda de "Sessões".
insert into modelos (nicho_chave, chave, nome, descricao, config, ativo, ordem) values (
  'saude',
  'pilates',
  'Estúdio de pilates',
  'Aulas e planos mensais.',
  '{"labels": {
      "agenda":   {"singular": "Aula",  "plural": "Aulas"},
      "clientes": {"singular": "Aluno", "plural": "Alunos"}
  }}'::jsonb,
  true,
  70
);
```

## Como os rótulos se combinam

`aplicar_nicho` grava `nichos.config.labels || modelos.config.labels`: o que o
modelo define substitui o do nicho, o resto vem do nicho. Módulos sem rótulo em
nenhum dos dois ficam com o nome padrão do app.

## Dicas

- `chave` do modelo não precisa ser única no banco, só dentro do nicho.
- Modelo inativo (`ativo = false`) some das telas; empresas que já o usam mantêm
  os rótulos gravados. "Restaurar padrão do nicho" de uma empresa cujo modelo foi
  desativado reaplica só o nicho.
- Para trocar o modelo de uma empresa: **Configurações → Nicho e modelo** (ou
  `select aplicar_nicho('<ws>', '<nicho>', '<modelo>')` como dono/cofundador).
