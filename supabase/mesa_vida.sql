-- =====================================================================
-- Ficha Viva · Mesa ao vivo: PV e condições do herói sempre iguais
-- =====================================================================
-- Rode DEPOIS de multiplayer_session.sql. Pode rodar mais de uma vez.
--
-- O problema: o PV que o mestre vê na linha do encontro só mudava quando
-- ERA ELE quem aplicava o dano. Poção, descanso ou dano tomado na própria
-- ficha deixavam o número do mestre velho (e o PV temporário nunca entrava
-- na conta). A ficha do jogador é a verdade sobre o herói; agora ela manda
-- PV e condições para o próprio combatente.
--
-- Regras: só o DONO do combatente (owner_id) usa esta função, e ela só mexe
-- em PV atual, PV máximo e condições — nunca em nome, CA, ordem ou
-- visibilidade, que continuam sendo do mestre.
-- =====================================================================

create or replace function public.update_own_combatant(p_combatant uuid, p_patch jsonb)
returns public.combatants language plpgsql security definer set search_path = public as $fn$
declare c public.combatants; v_hp int; v_max int;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  select * into c from combatants where id = p_combatant;
  if not found then raise exception 'Combatente não encontrado.'; end if;
  if c.owner_id is distinct from auth.uid() then
    raise exception 'Você só pode atualizar o seu próprio herói.';
  end if;

  v_max := case when p_patch ? 'hp_max' then greatest(1, least(9999, (p_patch->>'hp_max')::int)) else c.hp_max end;
  v_hp := case when p_patch ? 'hp_current' then greatest(0, least(coalesce(v_max, 9999), (p_patch->>'hp_current')::int)) else c.hp_current end;

  update combatants set
    hp_current = v_hp,
    hp_max = v_max,
    conditions = case
      when p_patch ? 'conditions' and jsonb_typeof(p_patch->'conditions') = 'array' then p_patch->'conditions'
      else conditions end,
    updated_at = now()
  where id = p_combatant returning * into c;

  -- avisa a mesa pelo encontro (mesmo caminho do update_combatant do mestre)
  update encounters set updated_at = now() where id = c.encounter_id;
  return c;
end $fn$;

revoke all on function public.update_own_combatant(uuid, jsonb) from public;
grant execute on function public.update_own_combatant(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- registra a versão do banco (o app para de avisar que falta este script)
-- ---------------------------------------------------------------------
create table if not exists public.app_schema_steps (
  step text primary key,
  applied_at timestamptz not null default now()
);
alter table public.app_schema_steps enable row level security;
drop policy if exists "schema_steps_read" on public.app_schema_steps;
create policy "schema_steps_read" on public.app_schema_steps for select to authenticated using (true);
grant select on public.app_schema_steps to authenticated;
insert into public.app_schema_steps (step) values ('mesa_vida') on conflict (step) do nothing;

-- conferência: a função existe
select proname from pg_proc where proname = 'update_own_combatant';
