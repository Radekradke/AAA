import { getSupabase } from './supabaseClient';
import type { CampaignEvent, Rsvp, RsvpStatus } from '@/lib/agenda';

/**
 * Agenda da campanha (supabase/agenda.sql): o mestre marca a sessão, cada
 * um da mesa responde Vou / Talvez / Não vou. O RLS garante no banco quem
 * pode o quê; aqui só traduzimos linhas ↔ objetos.
 */
function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Nuvem não configurada.');
  return client;
}

/** Encontros que acabaram há pouco ainda aparecem (sessão longa, fuso). */
const RECENT_MS = 12 * 3_600_000;

type Row = Record<string, unknown>;

function mapEvent(r: Row): CampaignEvent {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    startsAt: new Date(String(r.starts_at)).getTime(),
    durationMin: Number(r.duration_min ?? 240),
    title: String(r.title ?? ''),
    place: String(r.place ?? ''),
    note: String(r.note ?? ''),
    canceled: !!r.canceled,
    createdBy: r.created_by ? String(r.created_by) : null,
  };
}

function mapRsvp(r: Row): Rsvp {
  return {
    eventId: String(r.event_id),
    userId: String(r.user_id),
    campaignId: String(r.campaign_id),
    status: r.status as RsvpStatus,
    displayName: String(r.display_name ?? ''),
    heroName: String(r.hero_name ?? ''),
    updatedAt: r.updated_at ? new Date(String(r.updated_at)).getTime() : 0,
  };
}

export interface EventInput {
  startsAt: number;
  durationMin: number;
  title: string;
  place: string;
  note: string;
}

const toRow = (e: EventInput) => ({
  starts_at: new Date(e.startsAt).toISOString(),
  duration_min: Math.round(e.durationMin),
  title: e.title.trim().slice(0, 80) || null,
  place: e.place.trim().slice(0, 120) || null,
  note: e.note.trim().slice(0, 600) || null,
});

async function rsvpsFor(eventIds: string[]): Promise<Rsvp[]> {
  if (!eventIds.length) return [];
  const { data, error } = await sb().from('campaign_rsvps').select('*').in('event_id', eventIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRsvp);
}

export interface UpcomingForMe {
  event: CampaignEvent;
  campaignName: string;
  /** Minha resposta (null = ainda não respondi). */
  mine: RsvpStatus | null;
  going: number;
}

export const agendaService = {
  /** Encontros da mesa a partir de agora (e o último, para sugerir a data do próximo). */
  async list(campaignId: string, now = Date.now()): Promise<{ events: CampaignEvent[]; rsvps: Rsvp[]; last: CampaignEvent | null }> {
    const { data, error } = await sb().from('campaign_events').select('*').eq('campaign_id', campaignId).order('starts_at', { ascending: true });
    if (error) throw new Error(error.message);
    const all = (data ?? []).map(mapEvent).sort((a, b) => a.startsAt - b.startsAt);
    const events = all.filter((e) => e.startsAt + e.durationMin * 60_000 > now - RECENT_MS);
    const last = [...all].reverse().find((e) => !e.canceled) ?? null;
    return { events, rsvps: await rsvpsFor(events.map((e) => e.id)), last };
  },

  async schedule(campaignId: string, input: EventInput): Promise<CampaignEvent> {
    const { data, error } = await sb().from('campaign_events').insert({ campaign_id: campaignId, ...toRow(input) }).select().single();
    if (error) throw new Error(error.message);
    return mapEvent(data as Row);
  },

  async update(id: string, input: EventInput): Promise<void> {
    const { error } = await sb().from('campaign_events').update({ ...toRow(input), updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async setCanceled(id: string, canceled: boolean): Promise<void> {
    const { error } = await sb().from('campaign_events').update({ canceled, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await sb().from('campaign_events').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  /** Responde (ou troca a resposta) — uma linha por pessoa por encontro. */
  async respond(e: Pick<CampaignEvent, 'id' | 'campaignId'>, userId: string, status: RsvpStatus, displayName: string, heroName = ''): Promise<void> {
    const { error } = await sb().from('campaign_rsvps').upsert(
      {
        event_id: e.id,
        campaign_id: e.campaignId,
        user_id: userId,
        status,
        display_name: displayName.trim().slice(0, 60) || null,
        hero_name: heroName.trim().slice(0, 60) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' },
    );
    if (error) throw new Error(error.message);
  },

  /**
   * Para a tela inicial: os próximos encontros de todas as minhas mesas
   * (o RLS já filtra só as mesas de que participo), com a minha resposta.
   */
  async upcomingForMe(userId: string, now = Date.now()): Promise<UpcomingForMe[]> {
    const { data, error } = await sb()
      .from('campaign_events')
      .select('*')
      .eq('canceled', false)
      .gte('starts_at', new Date(now - RECENT_MS).toISOString())
      .order('starts_at', { ascending: true })
      .limit(12);
    if (error) throw new Error(error.message);
    const events = (data ?? []).map(mapEvent).filter((e) => e.startsAt + e.durationMin * 60_000 > now).sort((a, b) => a.startsAt - b.startsAt);
    if (!events.length) return [];
    const ids = [...new Set(events.map((e) => e.campaignId))];
    const [{ data: camps }, rsvps] = await Promise.all([
      sb().from('campaigns').select('id,name').in('id', ids),
      rsvpsFor(events.map((e) => e.id)),
    ]);
    const names = new Map((camps ?? []).map((c: Row) => [String(c.id), String(c.name)]));
    return events.map((event) => {
      const mineRow = rsvps.find((r) => r.eventId === event.id && r.userId === userId);
      return {
        event,
        campaignName: names.get(event.campaignId) ?? 'Mesa',
        mine: mineRow?.status ?? null,
        going: rsvps.filter((r) => r.eventId === event.id && r.status === 'yes').length,
      };
    });
  },
};

/** Ao vivo: a data e as respostas mudam sem recarregar. */
export function subscribeAgenda(campaignId: string, onChange: () => void): () => void {
  const client = getSupabase();
  if (!client) return () => undefined;
  const channel = client
    .channel(`agenda-${campaignId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_events', filter: `campaign_id=eq.${campaignId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_rsvps', filter: `campaign_id=eq.${campaignId}` }, onChange)
    .subscribe();
  return () => void client.removeChannel(channel);
}
