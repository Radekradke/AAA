import { useCallback, useEffect, useMemo, useState } from 'react';
import { agendaService, subscribeAgenda } from '@/services/agendaService';
import type { EventInput } from '@/services/agendaService';
import {
  RSVP_LABEL, dayLabel, fromLocalInput, googleCalendarUrl, isHappening, nextEvent, relativeLabel,
  shortWhen, suggestStart, tally, timeLabel, toIcs, toLocalInput,
} from '@/lib/agenda';
import type { CampaignEvent, Rsvp, RsvpStatus } from '@/lib/agenda';
import { confirmAction, toast } from '@/store/feedbackStore';
import { Icon } from '@/components/ui/Icon';
import '@/styles/agenda.css';

interface Props {
  campaignId: string;
  campaignName: string;
  isMaster: boolean;
  userId: string;
  userName: string;
  /** Herói que o jogador vinculou à mesa (aparece ao lado do nome). */
  heroName?: string;
}

const DURATIONS = [120, 180, 240, 300, 360];
const STATUSES: RsvpStatus[] = ['yes', 'maybe', 'no'];

/**
 * Agenda na sala da campanha: a próxima sessão em destaque (folha de
 * calendário), a presença de cada um e — para o mestre — marcar, editar,
 * cancelar. Sem o supabase/agenda.sql rodado, o card não aparece (o
 * SchemaNotice já avisa o mestre).
 */
export function AgendaCard({ campaignId, campaignName, isMaster, userId, userName, heroName = '' }: Props) {
  const [events, setEvents] = useState<CampaignEvent[] | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [last, setLast] = useState<CampaignEvent | null>(null);
  const [editing, setEditing] = useState<CampaignEvent | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    agendaService
      .list(campaignId)
      .then((r) => {
        setEvents(r.events);
        setRsvps(r.rsvps);
        setLast(r.last);
        setNow(Date.now());
      })
      .catch(() => setEvents(null));
  }, [campaignId]);
  useEffect(load, [load]);
  useEffect(() => subscribeAgenda(campaignId, load), [campaignId, load]);
  // "em 3 dias" → "hoje" → "agora" sem recarregar
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(() => (events ? nextEvent(events, now) : null), [events, now]);
  const later = useMemo(() => (events ?? []).filter((e) => e !== next && e.startsAt + e.durationMin * 60_000 > now), [events, next, now]);

  if (!events) return null;

  const respond = async (e: CampaignEvent, status: RsvpStatus) => {
    // otimista: o botão acende na hora; o realtime/recarga confirma
    setRsvps((rs) => [
      ...rs.filter((r) => !(r.eventId === e.id && r.userId === userId)),
      { eventId: e.id, userId, campaignId, status, displayName: userName, heroName, updatedAt: Date.now() },
    ]);
    try {
      await agendaService.respond(e, userId, status, userName, heroName);
    } catch (err) {
      toast((err as Error).message, { tone: 'danger' });
    }
    load();
  };

  const save = async (input: EventInput) => {
    setBusy(true);
    try {
      if (editing && editing !== 'new') await agendaService.update(editing.id, input);
      else await agendaService.schedule(campaignId, input);
      toast(editing === 'new' ? 'Sessão marcada — a mesa já vê a data.' : 'Sessão atualizada.');
      setEditing(null);
      load();
    } catch (err) {
      toast((err as Error).message, { tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const toggleCancel = async (e: CampaignEvent) => {
    if (!e.canceled) {
      const ok = await confirmAction({ title: 'Cancelar esta sessão?', message: `${shortWhen(e.startsAt)} — a mesa verá como cancelada. Dá para reativar depois.`, confirmLabel: 'Cancelar sessão', cancelLabel: 'Manter', danger: true });
      if (!ok) return;
    }
    await agendaService.setCanceled(e.id, !e.canceled).catch((err) => toast((err as Error).message, { tone: 'danger' }));
    load();
  };

  const remove = async (e: CampaignEvent) => {
    const ok = await confirmAction({ title: 'Apagar da agenda?', message: 'As confirmações de presença somem junto.', confirmLabel: 'Apagar', danger: true });
    if (!ok) return;
    await agendaService.remove(e.id).catch((err) => toast((err as Error).message, { tone: 'danger' }));
    load();
  };

  if (editing) {
    return (
      <EventForm
        initial={editing === 'new' ? null : editing}
        suggested={suggestStart(last, now)}
        busy={busy}
        onSave={save}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <section className="fv-panel fv-agenda" aria-labelledby="fv-agenda-title">
      <div className="fv-agenda-head">
        <h2 id="fv-agenda-title" className="fv-label">
          <Icon name="calendar" size={13} /> Próxima sessão
        </h2>
        {isMaster && (
          <button type="button" className="fv-agenda-link" onClick={() => setEditing('new')}>
            + Marcar {next ? 'outra' : 'sessão'}
          </button>
        )}
      </div>

      {next ? (
        <EventHero
          e={next}
          now={now}
          campaignName={campaignName}
          rsvps={rsvps.filter((r) => r.eventId === next.id)}
          userId={userId}
          isMaster={isMaster}
          onRespond={(s) => void respond(next, s)}
          onEdit={() => setEditing(next)}
          onCancel={() => void toggleCancel(next)}
        />
      ) : (
        <div className="fv-agenda-empty">
          {isMaster ? (
            <>
              <p>Nenhuma sessão marcada. Marque o dia e a mesa confirma a presença por aqui.</p>
              <button type="button" className="fv-btn-gold" onClick={() => setEditing('new')}>
                Marcar próxima sessão
              </button>
            </>
          ) : (
            <p>O mestre ainda não marcou a próxima sessão.</p>
          )}
        </div>
      )}

      {later.length > 0 && (
        <ul className="fv-agenda-later" aria-label="Mais adiante">
          {later.map((e) => {
            const t = tally(rsvps.filter((r) => r.eventId === e.id));
            return (
              <li key={e.id} className={e.canceled ? 'is-canceled' : undefined}>
                <span className="fv-agenda-later-when">{shortWhen(e.startsAt)}</span>
                <span className="fv-agenda-later-title">{e.title || relativeLabel(e.startsAt, now)}</span>
                {e.canceled ? <span className="fv-agenda-tag is-off">Cancelada</span> : <span className="fv-agenda-later-count">{t.yes} vão</span>}
                {isMaster && (
                  <span className="fv-agenda-later-acts">
                    {!e.canceled && <button type="button" onClick={() => setEditing(e)}>Editar</button>}
                    <button type="button" onClick={() => void toggleCancel(e)}>{e.canceled ? 'Reativar' : 'Cancelar'}</button>
                    <button type="button" onClick={() => void remove(e)}>Apagar</button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EventHero({
  e, now, campaignName, rsvps, userId, isMaster, onRespond, onEdit, onCancel,
}: {
  e: CampaignEvent;
  now: number;
  campaignName: string;
  rsvps: Rsvp[];
  userId: string;
  isMaster: boolean;
  onRespond: (s: RsvpStatus) => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const d = new Date(e.startsAt);
  const live = isHappening(e, now);
  const mine = rsvps.find((r) => r.userId === userId)?.status ?? null;
  const counts = tally(rsvps);
  const ordered = [...rsvps].sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || a.displayName.localeCompare(b.displayName));
  const roomUrl = typeof location !== 'undefined' ? `${location.origin}/mesa/${e.campaignId}` : undefined;

  const downloadIcs = () => {
    const url = URL.createObjectURL(new Blob([toIcs(e, campaignName, roomUrl)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessao-${toLocalInput(e.startsAt).slice(0, 10)}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fv-agenda-hero">
      {/* folha de calendário: o dia é o que importa */}
      <div className={'fv-agenda-leaf' + (live ? ' is-live' : '')} aria-hidden>
        <span className="fv-agenda-leaf-month">{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '')}</span>
        <span className="fv-agenda-leaf-day">{d.getDate()}</span>
        <span className="fv-agenda-leaf-week">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', '')}</span>
      </div>

      <div className="fv-agenda-info">
        <div className="fv-agenda-when">
          <b>{dayLabel(e.startsAt)} · {timeLabel(e.startsAt)}</b>
          <span className={'fv-agenda-tag' + (live ? ' is-live' : '')}>{live ? 'Acontecendo agora' : relativeLabel(e.startsAt, now)}</span>
        </div>
        {e.title && <div className="fv-agenda-title">{e.title}</div>}
        {e.place && <div className="fv-agenda-place">📍 {e.place}</div>}
        {e.note && <p className="fv-agenda-note">{e.note}</p>}

        <div className="fv-agenda-rsvp" role="group" aria-label="Sua presença">
          {STATUSES.map((s) => (
            <button key={s} type="button" className={`fv-agenda-rsvp-btn is-${s}`} aria-pressed={mine === s} onClick={() => onRespond(s)}>
              {RSVP_LABEL[s]}
              <span className="fv-agenda-rsvp-n">{counts[s]}</span>
            </button>
          ))}
        </div>

        {ordered.length > 0 ? (
          <ul className="fv-agenda-who" aria-label="Quem respondeu">
            {ordered.map((r) => (
              <li key={r.userId} className={`is-${r.status}`} title={RSVP_LABEL[r.status]}>
                <i aria-hidden />
                {r.displayName || 'Alguém'}
                {r.heroName && <small> · {r.heroName}</small>}
                <span className="fv-sr-only"> — {RSVP_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="fv-agenda-nobody">Ninguém respondeu ainda.</div>
        )}

        <div className="fv-agenda-acts">
          <button type="button" className="fv-agenda-link" onClick={downloadIcs}>
            Adicionar ao calendário
          </button>
          <a className="fv-agenda-link" href={googleCalendarUrl(e, campaignName, roomUrl)} target="_blank" rel="noopener noreferrer">
            Google Agenda
          </a>
          {isMaster && (
            <>
              <button type="button" className="fv-agenda-link" onClick={onEdit}>Editar</button>
              <button type="button" className="fv-agenda-link is-danger" onClick={onCancel}>Cancelar sessão</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EventForm({
  initial, suggested, busy, onSave, onCancel,
}: {
  initial: CampaignEvent | null;
  suggested: number;
  busy: boolean;
  onSave: (e: EventInput) => void;
  onCancel: () => void;
}) {
  const [when, setWhen] = useState(() => toLocalInput(initial?.startsAt ?? suggested));
  const [duration, setDuration] = useState(initial?.durationMin ?? 240);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [place, setPlace] = useState(initial?.place ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const startsAt = fromLocalInput(when);
  const past = startsAt != null && startsAt < Date.now() - 3_600_000;

  return (
    <form
      className="fv-panel fv-agenda fv-agenda-form"
      aria-label={initial ? 'Editar sessão' : 'Marcar sessão'}
      onSubmit={(ev) => {
        ev.preventDefault();
        if (startsAt == null) return;
        onSave({ startsAt, durationMin: duration, title, place, note });
      }}
    >
      <h2 className="fv-label">
        <Icon name="calendar" size={13} /> {initial ? 'Editar sessão' : 'Marcar próxima sessão'}
      </h2>
      <div className="fv-agenda-form-row">
        <label>
          <span>Dia e hora</span>
          <input className="fv-input" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <label>
          <span>Duração</span>
          <select className="fv-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>{m / 60} h</option>
            ))}
          </select>
        </label>
      </div>
      {startsAt != null && <div className="fv-agenda-form-hint">{dayLabel(startsAt)} · {timeLabel(startsAt)} — {relativeLabel(startsAt)}{past ? ' (já passou)' : ''}</div>}
      <label>
        <span>Título (opcional)</span>
        <input className="fv-input" maxLength={80} placeholder="Sessão 5 — O Baile de Máscaras" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        <span>Onde (opcional)</span>
        <input className="fv-input" maxLength={120} placeholder="Casa do Léo · Discord · Loja Dragão" value={place} onChange={(e) => setPlace(e.target.value)} />
      </label>
      <label>
        <span>Recado para a mesa (opcional)</span>
        <textarea className="fv-input" maxLength={600} rows={2} placeholder="Tragam os dados; começa pontual." value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="fv-agenda-form-acts">
        <button type="button" className="fv-btn-ghost" onClick={onCancel}>Voltar</button>
        <button type="submit" className="fv-btn-gold" disabled={busy || startsAt == null}>
          {busy ? 'Salvando…' : initial ? 'Salvar' : 'Marcar sessão'}
        </button>
      </div>
    </form>
  );
}
