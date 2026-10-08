import { describe, it, expect } from 'vitest';
import {
  dayLabel, fromLocalInput, googleCalendarUrl, isHappening, nextEvent, relativeLabel, shortWhen,
  suggestStart, tally, timeLabel, toIcs, toLocalInput,
} from '@/lib/agenda';
import type { CampaignEvent } from '@/lib/agenda';

// datas montadas na hora local: os testes valem em qualquer fuso
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const ev = (p: Partial<CampaignEvent>): CampaignEvent => ({
  id: 'e1', campaignId: 'c1', startsAt: at(2026, 10, 10, 19, 30), durationMin: 240, title: '', place: '', note: '', canceled: false, createdBy: null, ...p,
});

describe('agenda da campanha', () => {
  const now = at(2026, 10, 7, 15); // quarta, 7/10, 15h

  it('próximo encontro: ignora cancelados e os que já acabaram; o que está rolando conta', () => {
    const past = ev({ id: 'past', startsAt: at(2026, 10, 3, 19) });
    const canceled = ev({ id: 'x', startsAt: at(2026, 10, 8, 19), canceled: true });
    const later = ev({ id: 'later', startsAt: at(2026, 10, 17, 19) });
    const soon = ev({ id: 'soon', startsAt: at(2026, 10, 10, 19) });
    expect(nextEvent([later, past, canceled, soon], now)?.id).toBe('soon');
    expect(nextEvent([past, canceled], now)).toBeNull();
    const live = ev({ id: 'live', startsAt: at(2026, 10, 7, 13) });
    expect(nextEvent([later, live], now)?.id).toBe('live');
    expect(isHappening(live, now)).toBe(true);
    expect(isHappening(soon, now)).toBe(false);
  });

  it('rótulos de data e hora em português', () => {
    expect(timeLabel(at(2026, 10, 10, 19, 30))).toBe('19h30');
    expect(timeLabel(at(2026, 10, 10, 19))).toBe('19h');
    expect(dayLabel(at(2026, 10, 10))).toMatch(/^Sábado, 10 de out/);
    expect(shortWhen(at(2026, 10, 10, 19, 30))).toBe('Sáb, 10/10 · 19h30');
  });

  it('relativo por dia do calendário (23h → 1h do dia seguinte é "amanhã")', () => {
    const late = at(2026, 10, 7, 23);
    expect(relativeLabel(at(2026, 10, 8, 1), late)).toBe('amanhã');
    expect(relativeLabel(at(2026, 10, 7, 20), now)).toBe('hoje');
    expect(relativeLabel(at(2026, 10, 10, 19), now)).toBe('em 3 dias');
    expect(relativeLabel(at(2026, 10, 28, 19), now)).toBe('em 3 semanas');
    expect(relativeLabel(at(2026, 10, 6, 19), now)).toBe('ontem');
  });

  it('contagem de respostas', () => {
    expect(tally([{ status: 'yes' }, { status: 'yes' }, { status: 'maybe' }, { status: 'no' }])).toEqual({ yes: 2, maybe: 1, no: 1 });
  });

  it('campo datetime-local ida e volta; lixo vira null', () => {
    const t = at(2026, 10, 10, 19, 30);
    expect(toLocalInput(t)).toBe('2026-10-10T19:30');
    expect(fromLocalInput('2026-10-10T19:30')).toBe(t);
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('10/10/2026')).toBeNull();
  });

  it('sugestão: uma semana depois do último (pulando semanas passadas) ou o próximo sábado 19h', () => {
    expect(suggestStart(ev({ startsAt: at(2026, 10, 3, 19, 30) }), now)).toBe(at(2026, 10, 10, 19, 30));
    expect(suggestStart(ev({ startsAt: at(2026, 9, 12, 20) }), now)).toBe(at(2026, 10, 10, 20));
    expect(suggestStart(null, now)).toBe(at(2026, 10, 10, 19));
    // sábado à tarde: ainda hoje; sábado à noite: o da semana que vem
    expect(suggestStart(null, at(2026, 10, 10, 14))).toBe(at(2026, 10, 10, 19));
    expect(suggestStart(null, at(2026, 10, 10, 21))).toBe(at(2026, 10, 17, 19));
  });

  it('arquivo .ics válido, com escape e lembrete', () => {
    const e = ev({ id: 'abc', startsAt: Date.UTC(2026, 9, 10, 22, 30), durationMin: 180, title: 'Sessão 5', place: 'Casa do Léo, apto 3', note: 'Tragam dados; e pizza' });
    const ics = toIcs(e, 'A Coroa de Cinzas', 'https://app/mesa/c1', Date.UTC(2026, 9, 1));
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('UID:abc@fichaviva');
    expect(lines).toContain('DTSTART:20261010T223000Z');
    expect(lines).toContain('DTEND:20261011T013000Z');
    expect(lines).toContain('SUMMARY:A Coroa de Cinzas — Sessão 5');
    expect(lines).toContain('LOCATION:Casa do Léo\\, apto 3');
    expect(lines).toContain('DESCRIPTION:Tragam dados\\; e pizza\\n\\nhttps://app/mesa/c1');
    expect(lines).toContain('TRIGGER:-PT2H');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('link do Google Agenda', () => {
    const u = new URL(googleCalendarUrl(ev({ startsAt: Date.UTC(2026, 9, 10, 22), durationMin: 60, place: 'Discord' }), 'Mesa'));
    expect(u.hostname).toBe('calendar.google.com');
    expect(u.searchParams.get('dates')).toBe('20261010T220000Z/20261010T230000Z');
    expect(u.searchParams.get('text')).toBe('Mesa');
    expect(u.searchParams.get('location')).toBe('Discord');
  });
});
