/**
 * Agenda da campanha: a próxima sessão marcada pelo mestre e quem vai.
 * Funções puras (datas em ms, fuso do aparelho) — o serviço fala com o
 * banco, a interface só formata.
 */

export type RsvpStatus = 'yes' | 'maybe' | 'no';

export interface CampaignEvent {
  id: string;
  campaignId: string;
  /** Início, em ms. */
  startsAt: number;
  durationMin: number;
  title: string;
  place: string;
  note: string;
  canceled: boolean;
  createdBy: string | null;
}

export interface Rsvp {
  eventId: string;
  userId: string;
  campaignId: string;
  status: RsvpStatus;
  displayName: string;
  heroName: string;
  updatedAt: number;
}

export const RSVP_LABEL: Record<RsvpStatus, string> = { yes: 'Vou', maybe: 'Talvez', no: 'Não vou' };

const DAY = 86_400_000;

/** Fim do encontro (ms). */
export const endsAt = (e: Pick<CampaignEvent, 'startsAt' | 'durationMin'>) => e.startsAt + e.durationMin * 60_000;

/** O próximo encontro que ainda não acabou (cancelados não contam). */
export function nextEvent<T extends CampaignEvent>(events: T[], now = Date.now()): T | null {
  return events.filter((e) => !e.canceled && endsAt(e) > now).sort((a, b) => a.startsAt - b.startsAt)[0] ?? null;
}

/** Já começou e ainda não acabou. */
export const isHappening = (e: CampaignEvent, now = Date.now()) => e.startsAt <= now && endsAt(e) > now;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "19h", "19h30". */
export function timeLabel(ms: number): string {
  const d = new Date(ms);
  const m = d.getMinutes();
  return `${d.getHours()}h${m ? String(m).padStart(2, '0') : ''}`;
}

/** "Sábado, 12 de out." */
export function dayLabel(ms: number): string {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(ms));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "hoje", "amanhã", "em 3 dias", "em 2 semanas" — por dia do calendário, não por 24 h. */
export function relativeLabel(ms: number, now = Date.now()): string {
  const days = Math.round((startOfDay(ms) - startOfDay(now)) / DAY);
  if (days < 0) return days === -1 ? 'ontem' : `há ${-days} dias`;
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days < 14) return `em ${days} dias`;
  return `em ${Math.round(days / 7)} semanas`;
}

/** Linha curta para chips e listas: "Sáb, 12/10 · 19h30". */
export function shortWhen(ms: number): string {
  const d = new Date(ms);
  const wd = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', '');
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${timeLabel(ms)}`;
}

export function tally(rsvps: Pick<Rsvp, 'status'>[]): Record<RsvpStatus, number> {
  const out: Record<RsvpStatus, number> = { yes: 0, maybe: 0, no: 0 };
  for (const r of rsvps) out[r.status]++;
  return out;
}

/** Valor para <input type="datetime-local"> (hora local, sem fuso). */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Lê o <input type="datetime-local"> como hora local; inválido → null. */
export function fromLocalInput(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi).getTime();
}

/**
 * Sugestão para o formulário: uma semana depois do último encontro (mesma
 * hora — o grupo costuma ter dia fixo) ou, sem histórico, o próximo sábado às 19h.
 */
export function suggestStart(last: Pick<CampaignEvent, 'startsAt'> | null, now = Date.now()): number {
  if (last) {
    // soma no calendário (não 7 × 24 h): no horário de verão a hora se mantém
    const d = new Date(last.startsAt);
    do d.setDate(d.getDate() + 7);
    while (d.getTime() < now);
    return d.getTime();
  }
  const d = new Date(now);
  d.setHours(19, 0, 0, 0);
  const add = (6 - d.getDay() + 7) % 7 || (d.getTime() <= now ? 7 : 0);
  d.setDate(d.getDate() + add);
  return d.getTime();
}

// ---------------------------------------------------------------------
// levar para o calendário do celular / Google Agenda
// ---------------------------------------------------------------------

const icsDate = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** Arquivo .ics (iPhone, Android, Outlook) com lembrete 2 h antes. */
export function toIcs(e: CampaignEvent, campaignName: string, url?: string, now = Date.now()): string {
  const summary = e.title ? `${campaignName} — ${e.title}` : campaignName;
  const desc = [e.note, url].filter(Boolean).join('\n\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ficha Viva//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@fichaviva`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(endsAt(e))}`,
    `SUMMARY:${icsText(summary)}`,
    ...(e.place ? [`LOCATION:${icsText(e.place)}`] : []),
    ...(desc ? [`DESCRIPTION:${icsText(desc)}`] : []),
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(summary)}`,
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function googleCalendarUrl(e: CampaignEvent, campaignName: string, url?: string): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title ? `${campaignName} — ${e.title}` : campaignName,
    dates: `${icsDate(e.startsAt)}/${icsDate(endsAt(e))}`,
    details: [e.note, url].filter(Boolean).join('\n\n'),
    location: e.place,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
