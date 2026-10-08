import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Character } from '@/types/character';
import { DEED_RARITY, DEEDS, earnedDeeds } from '@/engine/deeds';
import { availableTitles, heroTitle, titleDeed, titleName, titleProgress, titlesFor } from '@/engine/titles';
import type { DeedDef, Scar } from '@/engine/deeds';
import { useCharacterStore } from '@/store/characterStore';
import { Icon } from '@/components/ui/Icon';
import { MonsterIcon } from '@/components/bestiary/MonsterPortrait';
import { DICE_TROPHIES, heroDice } from '@/data/diceTrophies';
import { DieChip } from '@/components/dice/DieChip';

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
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Título: a alcunha de lenda do personagem (na forma do gênero da ficha).
 * Os liberados viram escolha; os que faltam mostram como conquistar
 * (os secretos, só "???").
 */
export function TitlePicker({ char }: { char: Character }) {
  const edit = useCharacterStore((s) => s.editCharacter);
  const open = availableTitles(char);
  const openIds = new Set(open.map((t) => t.id));
  const current = heroTitle(char) ? char.title ?? '' : '';
  const chosen = open.find((t) => t.id === current);
  const pool = titlesFor(char);
  // os mais perto de sair primeiro (pela fração já feita); o resto na ordem da lista
  const near = (t: (typeof pool)[number]) => {
    const p = t.secret ? null : titleProgress(t, char);
    return p && p.have > 0 ? p.have / p.need : 0;
  };
  const missing = pool
    .filter((t) => !openIds.has(t.id))
    .map((t, i) => ({ t, i, r: near(t) }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .map((x) => x.t);
  return (
    <section className="fv-vitrine-sec">
      <h3>
        Título · {open.length} de {pool.length}
      </h3>
      {open.length ? (
        <div className="fv-titles" role="radiogroup" aria-label="Título do herói">
          <button type="button" role="radio" aria-checked={!current} className={!current ? 'is-on' : ''} onClick={() => edit(char.id, { title: null })}>
            Sem título
          </button>
          {open.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={current === t.id} className={`is-${t.rarity}` + (current === t.id ? ' is-on' : '')} onClick={() => edit(char.id, { title: t.id })} title={`${t.lore}\nComo conquistou: ${titleDeed(t, char)}`}>
              {titleName(t, char.gender)}
            </button>
          ))}
        </div>
      ) : (
        <p className="fv-vitrine-text fv-titles-hint">Ainda sem alcunha. O mundo começa a chamar o herói por um título quando ele faz por merecer — veja abaixo como.</p>
      )}
      {chosen && (
        <>
          <p className="fv-title-lore">“{chosen.lore}”</p>
          <p className="fv-title-earned">
            <span>Como conquistou</span> {titleDeed(chosen, char)}
          </p>
        </>
      )}
      {missing.length > 0 && (
        <details className="fv-titles-missing">
          <summary>
            Por conquistar · {missing.length}
          </summary>
          <ul>
            {missing.map((t) => {
              const prog = t.secret ? null : titleProgress(t, char);
              return (
              <li key={t.id} className={`is-${t.rarity}`}>
                <b>
                  {t.secret ? '???' : titleName(t, char.gender)}
                  <em className={`fv-rarity is-${t.rarity}`}>{DEED_RARITY[t.rarity].label}</em>
                </b>
                <small>{t.secret ? 'Título secreto — conquiste para descobrir.' : t.hint}</small>
                {prog && prog.have > 0 && (
                  <span className="fv-title-prog" role="progressbar" aria-label={`Progresso: ${prog.have} de ${prog.need}`} aria-valuemin={0} aria-valuemax={prog.need} aria-valuenow={prog.have} style={{ '--p': `${Math.min(100, (prog.have / prog.need) * 100)}%` } as CSSProperties}>
                    {prog.have.toLocaleString('pt-BR')}/{prog.need.toLocaleString('pt-BR')}
                  </span>
                )}
              </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}

/**
 * Dados conquistados: o herói escolhe com que dado rola (no 3D, no 2D e no
 * aviso que a mesa vê). Os trancados mostram como liberar.
 */
export function DicePicker({ char }: { char: Character }) {
  const edit = useCharacterStore((s) => s.editCharacter);
  const open = DICE_TROPHIES.filter((t) => t.unlocked(char));
  const current = heroDice(char)?.id ?? '';
  const locked = DICE_TROPHIES.filter((t) => !t.unlocked(char));
  return (
    <section className="fv-vitrine-sec">
      <h3>
        Dados · {open.length} de {DICE_TROPHIES.length}
      </h3>
      <div className="fv-dicepick" role="radiogroup" aria-label="Dado do herói">
        <button type="button" role="radio" aria-checked={!current} className={!current ? 'is-on' : ''} onClick={() => edit(char.id, { diceSkin: null })}>
          <span className="fv-dicepick-theme" aria-hidden>
            20
          </span>
          Do tema
        </button>
        {open.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={current === t.id} className={`is-${t.rarity}` + (current === t.id ? ' is-on' : '')} onClick={() => edit(char.id, { diceSkin: t.id })}>
            <DieChip skin={t.skin} size={30} />
            {t.skin.label}
          </button>
        ))}
      </div>
      {!open.length && <p className="fv-vitrine-text fv-titles-hint">Nenhum dado conquistado ainda — cada um sai de um feito na mesa.</p>}
      {locked.length > 0 && (
        <details className="fv-dice-missing">
          <summary>Dados por conquistar · {locked.length}</summary>
          <ul className="fv-dicepick-locked">
            {locked.map((t) => (
              <li key={t.id}>
                <DieChip skin={t.skin} size={26} locked />
                <span>
                  <b>
                    {t.skin.label}
                    <em className={`fv-rarity is-${t.rarity}`}>{DEED_RARITY[t.rarity].label}</em>
                  </b>
                  <small>{t.hint}</small>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
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
