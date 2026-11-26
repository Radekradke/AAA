-- Mesa de dezembro. Rode depois de mesa_vida.sql e dos scripts do palco.
begin;

alter table public.combatants add column if not exists hp_event_id uuid;

create or replace function public.update_own_combatant(p_combatant uuid, p_patch jsonb)
returns public.combatants language plpgsql security definer set search_path = public, pg_temp as $fn$
declare
  c public.combatants;
  v_hp int;
  v_max int;
  v_conditions jsonb;
  v_event uuid;
  v_before int;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  select * into c from public.combatants where id = p_combatant for update;
  if not found then raise exception 'Combatente não encontrado.'; end if;
  if c.type <> 'player' or c.owner_id is distinct from auth.uid() then
    raise exception 'Você só pode atualizar o seu próprio herói.';
  end if;
  if not exists (
    select 1 from public.encounters e
    join public.sessions s on s.id = e.session_id
    join public.shared_sheets l on l.campaign_id = c.campaign_id and l.sheet_id = c.sheet_id and l.owner_id = c.owner_id
    where e.id = c.encounter_id and e.status in ('preparing', 'active', 'paused')
      and s.status in ('active', 'paused') and public.is_campaign_participant(c.campaign_id)
  ) then raise exception 'O herói não está vinculado a um encontro aberto.'; end if;

  if p_patch ? 'hp_event_id' then
    select incoming.id into v_event from public.session_events incoming
    where incoming.id = (p_patch->>'hp_event_id')::uuid and incoming.session_id = c.session_id
      and incoming.target_id = c.id::text and incoming.payload->>'sheetId' = c.sheet_id
      and incoming.type in ('hero_hp', 'hero_hp_correction')
      and incoming.actor_id = (select master_id from public.campaigns where id = c.campaign_id)
      and not exists (
        select 1 from public.session_events confirmed where confirmed.id = c.hp_event_id
          and (confirmed.created_at, confirmed.id) > (incoming.created_at, incoming.id)
      );
    if v_event is null then raise exception 'A ordem de PV já mudou. Confira o encontro e tente de novo.'; end if;
  end if;

  v_max := case when p_patch ? 'hp_max' then greatest(1, least(9999, (p_patch->>'hp_max')::int)) else c.hp_max end;
  v_hp := case when p_patch ? 'hp_current' then greatest(0, least(coalesce(v_max, 9999), (p_patch->>'hp_current')::int)) else c.hp_current end;
  v_conditions := case when jsonb_typeof(p_patch->'conditions') = 'array' then p_patch->'conditions' else c.conditions end;
  if (v_hp, v_max, v_conditions, coalesce(v_event, c.hp_event_id)) is not distinct from
     (c.hp_current, c.hp_max, c.conditions, c.hp_event_id) then return c; end if;

  v_before := c.hp_current;
  update public.combatants set
    hp_current = v_hp, hp_max = v_max, conditions = v_conditions,
    hp_event_id = coalesce(v_event, c.hp_event_id), updated_at = now()
  where id = p_combatant returning * into c;

  if v_event is null and v_hp is distinct from v_before then
    perform public._fv_log(c.session_id, c.campaign_id, 'hero_vitals', c.id::text,
      jsonb_build_object('name', c.name, 'before', v_before, 'after', v_hp),
      case when c.hidden then 'master' else 'public' end);
  end if;
  return c;
end;
$fn$;
revoke all on function public.update_own_combatant(uuid, jsonb) from public, anon;
grant execute on function public.update_own_combatant(uuid, jsonb) to authenticated;

-- A inserção de recompensa exige permissão atual do dono da ficha, inclusive
-- quando o mestre estiver em uma versão antiga do app.
drop policy if exists fv_session_events_inventory_guard on public.session_events;
create policy fv_session_events_inventory_guard on public.session_events as restrictive for insert to authenticated
with check (
  type <> 'hero_item' or (
    public.is_campaign_master(campaign_id) and exists (
      select 1 from public.shared_sheets links where links.campaign_id = session_events.campaign_id
        and links.sheet_id = session_events.payload->>'sheetId'
        and links.permissions @> '{"editInventory":true}'::jsonb
    )
  )
);

-- Mantém a regra de destinatários mesmo se outra policy permissiva for instalada.
drop policy if exists fv_handouts_recipient_guard on public.campaign_handouts;
create policy fv_handouts_recipient_guard on public.campaign_handouts as restrictive for select to authenticated
using (
  public.is_campaign_master(campaign_id) or (
    shown_at is not null and public.is_campaign_member(campaign_id)
    and (recipients is null or auth.uid() = any(recipients))
  )
);

insert into public.app_schema_steps (step) values ('mesa_dezembro') on conflict (step) do nothing;
commit;
