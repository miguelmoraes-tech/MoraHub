# SECURITY.md — Padrões de segurança do Hub Empresarial

Este documento existe pra evitar que bugs de segurança já corrigidos uma vez voltem a aparecer em código novo. Toda função ou tabela nova deve ser checada contra este checklist antes de ser considerada pronta.

---

## 🔴 Regra de ouro: funções `SECURITY DEFINER`

Funções `SECURITY DEFINER` rodam com privilégio elevado e **ignoram RLS por padrão** — a validação de segurança precisa estar escrita manualmente dentro da função.

### O bug que já apareceu duas vezes neste projeto

```sql
-- ❌ ERRADO — vulnerável quando auth.uid() é NULL
if p_dono_id <> auth.uid() and not exists (...) then
  return;
end if;
```

Em SQL, `NULL <> qualquer_coisa` avalia para `NULL`, não `FALSE`. Um `IF` com condição `NULL` **não executa o bloco** — o `return` de bloqueio é silenciosamente pulado, e a função continua e devolve dado pra chamada anônima (sem login).

Isso já vazou dado real duas vezes neste projeto: `get_colaboradores_do_dono_by_id` e `get_conversa_participante_info`, ambas corrigidas.

### Como evitar

**Opção 1 (preferida): embuta a checagem direto no `WHERE` da query**
```sql
-- ✅ CORRETO — se auth.uid() for NULL, a comparação não casa nenhuma linha
select * from tabela where user_id = auth.uid();
```

**Opção 2: se precisar de um guard separado, comece SEMPRE assim**
```sql
-- ✅ CORRETO — guard explícito pra NULL antes de qualquer outra lógica
if auth.uid() is null then
  return;
end if;

if p_dono_id <> auth.uid() and not exists (...) then
  return;
end if;
```

### Exceção legítima: funções sem `auth.uid()` por design

`get_convite_by_token(p_token text)` não usa `auth.uid()` de propósito — existe pra alguém **sem conta ainda** pré-visualizar um convite antes de logar. Isso é seguro porque o token (`encode(gen_random_bytes(24), 'hex')`, 192 bits de entropia) funciona como a própria credencial, mesmo padrão de link de reset de senha. Isso NÃO é uma instância do bug — é um design intencional, e deve continuar sendo revisado caso a caso (confirmar que o token é gerado com entropia criptográfica real, nunca previsível).

---

## Checklist ao criar uma tabela nova

1. `ENABLE ROW LEVEL SECURITY`
2. `CREATE POLICY` — sempre `auth.uid() = user_id`, nunca confiar em checagem do lado do app
3. Se colaborador externo (contador/advogado/financeiro/rh/comercial/marketing) precisar acessar: adicionar `OR EXISTS (SELECT 1 FROM membros WHERE dono_id = tabela.user_id AND membro_id = auth.uid() AND status = 'ativo' AND papel = '...')`
4. `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` — **RLS sozinho não basta**, sem o GRANT dá erro de "permission denied" mesmo com policy certa (bug real que já aconteceu neste projeto, ver histórico)
5. Se a tabela precisar de Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE nome_tabela`

## Checklist ao criar uma função `SECURITY DEFINER` nova

1. Ela realmente precisa ser `SECURITY DEFINER`? Se puder ser uma query normal filtrada por RLS, prefira isso
2. Recebe algum parâmetro de ID controlado pelo chamador (`p_algo_id`)? Se sim, redobre a atenção — esse é o padrão de maior risco
3. Testar explicitamente com `auth.uid()` `NULL` (simulando chamada anônima) — a função deve retornar vazio/erro, nunca dado real
4. Testar com `auth.uid()` do usuário legítimo — deve continuar funcionando normalmente
5. Documentar aqui embaixo, na tabela de funções auditadas

---

## Funções `SECURITY DEFINER` auditadas (última varredura completa)

Varredura feita via `pg_proc` com `prosecdef = true`, em todos os schemas — não confiar em lista anterior, sempre reconferir na íntegra se uma nova auditoria for necessária.

| Função | Parâmetro do chamador | Status |
|---|---|---|
| `get_colaboradores_do_dono_by_id(p_dono_id uuid)` | Sim | ✅ Tinha o bug de `NULL` — corrigido |
| `get_conversa_participante_info(p_conversa_id uuid)` | Sim | ✅ Tinha o bug de `NULL` — corrigido |
| `aceitar_convite(p_token text)` | Sim (token) | ✅ Segura (guard explícito + confere e-mail) |
| `recusar_convite(p_token text)` | Sim (token) | ✅ Segura (guard explícito + confere e-mail) |
| `get_convite_by_token(p_token text)` | Sim (token) | ✅ Segura por design (token de alta entropia como credencial) |
| `get_colaboradores_do_dono()` | Não | ✅ Segura (`auth.uid()` embutido no `WHERE`) |
| `get_contas_vinculadas()` | Não | ✅ Segura (`auth.uid()` embutido no `WHERE`) |
| `current_user_email()` | Não | ✅ Segura (`auth.uid()` embutido no `WHERE`) |

**Toda função nova criada depois desta lista deve ser adicionada aqui**, com o mesmo processo de teste (NULL vs. usuário real).

---

## Outras decisões de segurança já tomadas neste projeto

- Sem `service_role key` no front-end em nenhuma hipótese — só `anon`/`publishable key`
- Sem cofre de senha (`vault_items`) — decisão consciente de não assumir esse risco/responsabilidade, mesmo com criptografia
- Papéis de colaborador externo (contador/advogado) podem atender múltiplos "donos" via `membros`; papéis internos (financeiro/rh/comercial/marketing) só podem ter um vínculo ativo por vez (garantido por índice único parcial no banco, não só na aplicação)
