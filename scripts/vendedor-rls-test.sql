do $$
declare
  r text := '';
  v_dono uuid; v_ws uuid;
  v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid();
  la uuid; lb uuid; lc uuid;
  n int; x uuid; rid1 uuid; rid2 uuid; cli uuid; vw uuid;
  rec record;
  total_leads int;
begin
  select user_id, id into v_dono, v_ws from perfis_tipos_ativos where tipo='empresarial' limit 1;
  select count(*) into total_leads from leads where workspace_id = v_ws;
  r := r || format(E'\nsetup: dono=%s ws=%s leads_no_ws=%s', v_dono, v_ws, total_leads);

  insert into auth.users (id, email, aud, role, instance_id) values
    (v1, 'vend1.test@example.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (v2, 'vend2.test@example.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into membros (dono_id, membro_id, papel, status, workspace_id) values
    (v_dono, v1, 'comercial', 'ativo', v_ws), (v_dono, v2, 'comercial', 'ativo', v_ws);

  select id into la from leads where workspace_id=v_ws and status='abordar' and vendedor_id is null and not exists (select 1 from clientes c where c.lead_origem_id=leads.id) order by created_at limit 1 offset 0;
  select id into lb from leads where workspace_id=v_ws and status='abordar' and vendedor_id is null and id<>la and not exists (select 1 from clientes c where c.lead_origem_id=leads.id) order by created_at limit 1 offset 1;
  select id into lc from leads where workspace_id=v_ws and status='abordar' and vendedor_id is null and id not in (la,lb) and not exists (select 1 from clientes c where c.lead_origem_id=leads.id) order by created_at limit 1 offset 2;
  r := r || format(E'\nleads de teste: a=%s b=%s c=%s', la, lb, lc);

  -- ===== V1 =====
  perform set_config('request.jwt.claims', json_build_object('sub', v1, 'role','authenticated','email','vend1.test@example.invalid')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from leads;
  r := r || format(E'\nT1 vendedor le leads: %s linhas (esperado %s) -> %s', n, total_leads, case when n = total_leads then 'OK' else 'FALHOU' end);

  update leads set nome = nome || 'x' where id = la; get diagnostics n = row_count;
  r := r || format(E'\nT2a update direto em leads: %s linhas afetadas -> %s', n, case when n=0 then 'OK (bloqueado)' else 'FALHOU' end);
  delete from leads where id = la; get diagnostics n = row_count;
  r := r || format(E'\nT2b delete direto em leads: %s linhas afetadas -> %s', n, case when n=0 then 'OK (bloqueado)' else 'FALHOU' end);
  begin
    insert into leads (user_id, workspace_id, nome) values (v_dono, v_ws, 'hack');
    r := r || E'\nT2c insert direto em leads: FALHOU (inseriu)';
  exception when others then r := r || format(E'\nT2c insert direto em leads: OK (bloqueado: %s)', sqlerrm);
  end;

  begin
    rid1 := agendar_reuniao(la, now() + interval '1 day', 45, 'video', 'https://meet.example/x', 'obs');
    r := r || format(E'\nT3 agendar_reuniao(lead a): OK id=%s', rid1);
  exception when others then r := r || format(E'\nT3 agendar_reuniao(lead a): FALHOU %s', sqlerrm);
  end;
  select * into rec from leads where id = la;
  r := r || format(E'\nT3b lead apos agendar: status=%s estagio=%s vendedor=%s (esperado abordado/contatado/v1) -> %s', rec.status, rec.estagio_funil, rec.vendedor_id,
     case when rec.status='abordado' and rec.estagio_funil='contatado' and rec.vendedor_id=v1 then 'OK' else 'FALHOU' end);

  begin
    perform lead_view_start(lb);
    vw := lead_view_start(lb);
    r := r || format(E'\nT7a lead_view_start(lead b) 2x seguidas: view_id=%s', vw);
    perform lead_view_ping(vw);
  exception when others then r := r || format(E'\nT7a lead_view_start/ping: FALHOU %s', sqlerrm);
  end;
  select count(*) into n from lead_views;
  r := r || format(E'\nT7b vendedor le lead_views: %s linhas -> %s', n, case when n=0 then 'OK (nada visivel)' else 'FALHOU' end);
  begin
    insert into lead_views (workspace_id, lead_id, user_id) values (v_ws, lb, v1);
    r := r || E'\nT7c insert direto em lead_views: FALHOU (inseriu)';
  exception when others then r := r || format(E'\nT7c insert direto em lead_views: OK (bloqueado: %s)', sqlerrm);
  end;

  begin
    perform relatorio_atividade_vendedores(v_ws, 30);
    r := r || E'\nT9 vendedor chama relatorio: FALHOU (executou)';
  exception when others then r := r || format(E'\nT9 vendedor chama relatorio: %s -> %s', sqlerrm, case when sqlerrm like '%sem permiss%' then 'OK' else 'FALHOU' end);
  end;

  -- ===== V2 tenta o lead de V1 =====
  perform set_config('request.jwt.claims', json_build_object('sub', v2, 'role','authenticated','email','vend2.test@example.invalid')::text, true);
  begin
    perform agendar_reuniao(la, now() + interval '2 day');
    r := r || E'\nT4a V2 agenda lead de V1: FALHOU (permitiu)';
  exception when others then r := r || format(E'\nT4a V2 agenda lead de V1: %s -> %s', sqlerrm, case when sqlerrm like '%atribu%' then 'OK' else 'FALHOU' end);
  end;
  begin
    perform converter_lead_em_cliente(la);
    r := r || E'\nT4b V2 converte lead de V1: FALHOU (permitiu)';
  exception when others then r := r || format(E'\nT4b V2 converte lead de V1: %s -> %s', sqlerrm, case when sqlerrm like '%atribu%' then 'OK' else 'FALHOU' end);
  end;
  rid2 := agendar_reuniao(lb, now() + interval '3 day', 30, 'telefone');
  begin
    perform atualizar_reuniao(rid1, null, 'cancelada');
    r := r || E'\nT11a V2 atualiza reuniao de V1: FALHOU (permitiu)';
  exception when others then r := r || format(E'\nT11a V2 atualiza reuniao de V1: %s -> %s', sqlerrm, case when sqlerrm like '%sem permiss%' then 'OK' else 'FALHOU' end);
  end;

  -- ===== V1 de novo =====
  perform set_config('request.jwt.claims', json_build_object('sub', v1, 'role','authenticated','email','vend1.test@example.invalid')::text, true);
  select count(*) into n from reunioes;
  r := r || format(E'\nT8 V1 ve reunioes: %s (esperado 1, so a dele; V2 criou outra) -> %s', n, case when n=1 then 'OK' else 'FALHOU' end);
  update reunioes set observacoes='hack' where id = rid1; get diagnostics n = row_count;
  r := r || format(E'\nT8b update direto em reunioes: %s linhas -> %s', n, case when n=0 then 'OK (bloqueado)' else 'FALHOU' end);

  begin
    perform atualizar_reuniao(rid1, now() + interval '5 day', 'agendada');
    perform atualizar_reuniao(rid1, null, 'realizada');
    r := r || E'\nT11b V1 remarca e marca realizada a propria reuniao: OK';
  exception when others then r := r || format(E'\nT11b V1 atualiza propria reuniao: FALHOU %s', sqlerrm);
  end;
  begin
    perform atualizar_reuniao(rid1, null, 'invalido');
    r := r || E'\nT11c status invalido: FALHOU (aceitou)';
  exception when others then r := r || format(E'\nT11c status invalido: OK (rejeitado: %s)', left(sqlerrm, 70));
  end;
  begin
    perform agendar_reuniao(la, now(), 30, 'sinal-de-fumaca');
    r := r || E'\nT11d canal invalido: FALHOU (aceitou)';
  exception when others then r := r || format(E'\nT11d canal invalido: OK (rejeitado: %s)', left(sqlerrm, 70));
  end;

  begin
    cli := converter_lead_em_cliente(la);
    r := r || format(E'\nT5 V1 converte o proprio lead: OK cliente=%s', cli);
  exception when others then r := r || format(E'\nT5 V1 converte o proprio lead: FALHOU %s', sqlerrm);
  end;
  begin
    perform converter_lead_em_cliente(la);
    r := r || E'\nT6 converter 2x: FALHOU (permitiu)';
  exception when others then r := r || format(E'\nT6 converter 2x: %s -> %s', sqlerrm, case when sqlerrm like '%convertido%' then 'OK' else 'FALHOU' end);
  end;
  begin
    perform agendar_reuniao(la, now() + interval '9 day');
    r := r || E'\nT6b agendar em lead ja convertido (vendedor): FALHOU (permitiu)';
  exception when others then r := r || format(E'\nT6b agendar em lead convertido: %s -> %s', sqlerrm, case when sqlerrm like '%convertido%' then 'OK' else 'FALHOU' end);
  end;

  -- extras: o que mais o vendedor consegue tocar
  begin
    insert into followups_lead (user_id, workspace_id, lead_id, canal, resumo, proximo_followup) values (v_dono, v_ws, lc, 'whatsapp', 'teste', current_date);
    r := r || E'\nX1 vendedor INSERE em followups_lead direto: PERMITIDO (policy "workspace do dono ou comercial vinculado" = ALL)';
  exception when others then r := r || format(E'\nX1 vendedor insere em followups_lead: bloqueado (%s)', left(sqlerrm,60));
  end;
  select count(*) into n from clientes;
  r := r || format(E'\nX2 vendedor le clientes: %s linhas (policy "colaborador vinculado ve clientes" vale p/ qualquer papel)', n);
  select count(*) into n from propostas;
  r := r || format(E'\nX3 vendedor le propostas: %s linhas', n);

  -- ===== DONO =====
  execute 'reset role';
  select * into rec from clientes where id = cli;
  r := r || format(E'\nMAP cliente criado: nome=%s contato=%s telefone=%s email=%s resumo=%s site_link=%s segmento=%s abordado_por=%s lead_origem_id=%s vendedor_id=%s user_id=%s status=%s',
      rec.nome, rec.contato, rec.telefone, rec.email, left(coalesce(rec.resumo,'NULL'),20), rec.site_link, rec.segmento, rec.abordado_por, rec.lead_origem_id, rec.vendedor_id, rec.user_id, rec.status);
  select * into rec from leads where id = la;
  r := r || format(E'\nMAP lead apos converter: status=%s estagio=%s vendedor=%s ultimo_contato=%s', rec.status, rec.estagio_funil, rec.vendedor_id, rec.ultimo_contato);

  perform set_config('request.jwt.claims', json_build_object('sub', v_dono, 'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from lead_views;
  r := r || format(E'\nT10a dono le lead_views: %s (esperado >=1) -> %s', n, case when n>=1 then 'OK' else 'FALHOU' end);
  select count(*) into n from reunioes where workspace_id = v_ws;
  r := r || format(E'\nT10b dono ve reunioes: %s (esperado 2) -> %s', n, case when n=2 then 'OK' else 'FALHOU' end);
  x := lead_view_start(lb);
  r := r || format(E'\nT10c dono lead_view_start: %s -> %s', coalesce(x::text,'null'), case when x is null then 'OK (null)' else 'FALHOU' end);
  for rec in select * from relatorio_atividade_vendedores(v_ws, 30) loop
    r := r || format(E'\nT10d relatorio: vendedor=%s lead=%s aberturas=%s total_seg=%s tem_reuniao=%s convertido=%s atribuido=%s', rec.vendedor_email, rec.lead_nome, rec.aberturas, rec.total_seg, rec.tem_reuniao, rec.convertido, rec.lead_atribuido_a);
  end loop;
  execute 'reset role';

  raise exception E'RESULTADOS (rollback intencional):%', r;
end $$;
