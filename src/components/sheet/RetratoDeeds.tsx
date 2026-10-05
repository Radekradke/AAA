import { useState } from 'react';
import type { Character } from '@/types/character';
import { availableTitles, DEED_RARITY, DEEDS, earnedDeeds, heroTitle } from '@/engine/deeds';
import type { DeedDef, Scar } from '@/engine/deeds';
import { useCharacterStore } from '@/store/characterStore';
import { Icon } from '@/components/ui/Icon';
import { MonsterIcon } from '@/components/bestiary/MonsterPortrait';

const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Medalha do feito (ícone do HUD ou emblema do tipo de criatura); borda e brilho pela raridade. */
export function DeedSeal({ def, size = 34, locked }: { def: DeedDef; size?: number; locked?: boolean }) {
  const inner = Math.round(size * 0.52);
  const hidden = locked && def.secret;
  return (
    <span className={`fv-seal is-${def.rarity}` + (def.funny ? ' is-funny' : '') + (locked ? ' is-locked' : '')} style={{ width: size, height: size }} aria-hidden>
      {hidden ? <b className="fv-seal-q">?</b> : def.icon.kind === 'monster' ? <MonsterIcon type={def.icon.type} size={inner} /> : <Icon name={def.icon.name} size={inner} />}
    </span>
  );
}

/** Selos na própria carta: os mais raros primeiro (empate: o mais recente). */
export function CardSeals({ char, max = 5 }: { char: Character; max?: number }) {
  const earned = [...earnedDeeds(char.deeds)].sort((a, b) => DEED_RARITY[b.def.rarity].order - DEED_RARITY[a.def.rarity].order);
  if (!earned.length) return null;
  return (
    <span className="fv-vitrine-seals" aria-hidden>
      {earned.slice(0, max).map(({ def }) => (
        <span key={def.id} title={`${def.name} · ${DEED_RARITY[def.rarity].label}`}>
          <DeedSeal def={def} size={32} />
        </span>
      ))}
      {earned.length > max && <span className="fv-seal-more">+{earned.length - max}</span>}
    </span>
  );
}

/** Marcas de garra gravadas na carta, uma por cicatriz (até 3). */
export function CardScars({ scars }: { scars: Scar[] | undefined }) {
  const list = (scars ?? []).slice(-3);
  if (!list.length) return null;
  const spots = [
    { x: 14, y: 30, r: -28 },
    { x: 66, y: 52, r: 22 },
    { x: 30, y: 64, r: -12 },
  ];
  return (
    <span className="fv-vitrine-scars" aria-hidden>
      {list.map((s, i) => (
        <svg key={s.id} viewBox="0 0 60 40" style={{ left: `${spots[i].x}%`, top: `${spots[i].y}%`, transform: `rotate(${spots[i].r}deg)` }}>
          <title>{s.text}</title>
          <path d="M4 30 Q22 18 56 6" />
          <path d="M6 37 Q26 25 58 14" />
          <path d="M10 22 Q24 13 48 3" />
        </svg>
      ))}
    </span>
  );
}

/** Lista de feitos: conquistados (com data) e os que faltam (com progresso). */
export function DeedsSection({ char }: { char: Character }) {
  const counts = char.deeds?.counts ?? {};
  const unlocked = char.deeds?.unlocked ?? {};
  const earned = earnedDeeds(char.deeds);
  return (
    <section className="fv-vitrine-sec">
      <h3>
        Feitos · {earned.length} de {DEEDS.length}
      </h3>
      <ul className="fv-deeds">
        {DEEDS.map((d) => {
          const at = unlocked[d.id];
          const n = Math.min(d.min, counts[d.kind] ?? 0);
          const hidden = !at && d.secret;
          return (
            <li key={d.id} className={(at ? 'is-earned ' : '') + `is-${d.rarity}`}>
              <DeedSeal def={d} size={36} locked={!at} />
              <span>
                <b>
                  {hidden ? '???' : d.name}
                  <em className={`fv-rarity is-${d.rarity}`}>{DEED_RARITY[d.rarity].label}</em>
                </b>
                <small>{hidden ? 'Feito secreto — só aparece quando alguém conquistar.' : at ? `${d.desc} · ${day(at)}` : d.min > 1 ? `${d.desc} (${n}/${d.min})` : d.desc}</small>
                {at && d.title && <small className="fv-deed-title">Título: {d.title}</small>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Título sob o nome: escolhido entre os feitos conquistados que dão título. */
export function TitlePicker({ char }: { char: Character }) {
  const edit = useCharacterStore((s) => s.editCharacter);
  const titles = availableTitles(char.deeds);
  const current = heroTitle(char) ? char.title ?? '' : '';
  const locked = DEEDS.filter((d) => d.title && !char.deeds?.unlocked[d.id]).length;
  return (
    <section className="fv-vitrine-sec">
      <h3>Título</h3>
      {titles.length ? (
        <div className="fv-titles" role="radiogroup" aria-label="Título do herói">
          <button type="button" role="radio" aria-checked={!current} className={!current ? 'is-on' : ''} onClick={() => edit(char.id, { title: null })}>
            Sem título
          </button>
          {titles.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={current === d.id} className={`is-${d.rarity}` + (current === d.id ? ' is-on' : '')} onClick={() => edit(char.id, { title: d.id })} title={`Do feito “${d.name}”`}>
              {d.title}
            </button>
          ))}
        </div>
      ) : null}
      <p className="fv-vitrine-text fv-titles-hint">
        {titles.length ? 'Aparece sob o nome na carta, no cabeçalho da ficha, na mesa e na iniciativa.' : 'Conquiste feitos raros, épicos e lendários para ganhar títulos — eles aparecem sob o nome, na carta e na mesa.'}
        {locked > 0 && ` ${locked} ${locked === 1 ? 'título ainda bloqueado' : 'títulos ainda bloqueados'}.`}
      </p>
    </section>
  );
}

/** Cicatrizes: as do mestre (vindas da mesa) e as que o jogador grava. */
export function ScarsSection({ char }: { char: Character }) {
  const addScar = useCharacterStore((s) => s.addScar);
  const removeScar = useCharacterStore((s) => s.removeScar);
  const [text, setText] = useState('');
  const scars = [...(char.scars ?? [])].reverse();
  const save = () => {
    if (!text.trim()) return;
    addScar(char.id, { text, date: new Date().toISOString(), session: null, by: 'jogador' });
    setText('');
  };
  return (
    <section className="fv-vitrine-sec">
      <h3>Cicatrizes · {scars.length}</h3>
      {scars.length > 0 && (
        <ul className="fv-scars">
          {scars.map((s) => (
            <li key={s.id}>
              <svg viewBox="0 0 60 40" aria-hidden>
                <path d="M4 30 Q22 18 56 6" />
                <path d="M6 37 Q26 25 58 14" />
                <path d="M10 22 Q24 13 48 3" />
              </svg>
              <span>
                <b>{s.text}</b>
                <small>
                  {day(s.date)}
                  {s.session ? ` · ${s.session}` : ''} · {s.by === 'mestre' ? 'pelo mestre' : 'pelo jogador'}
                </small>
              </span>
              {s.by === 'jogador' && (
                <button type="button" className="fv-scar-x" aria-label={`Apagar cicatriz: ${s.text}`} onClick={() => removeScar(char.id, s.id)}>
                  <Icon name="close" size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="fv-scar-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input className="fv-input" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Nova cicatriz: ex. queimadura do dragão no braço" aria-label="Nova cicatriz" />
        <button type="submit" className="fv-btn-ghost" disabled={!text.trim()}>
          Gravar
        </button>
      </form>
    </section>
  );
}
