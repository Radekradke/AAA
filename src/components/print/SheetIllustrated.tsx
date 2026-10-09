import { printableNotes } from '@/engine/diary';
import type { Character } from '@/types/character';
import type { AbilityKey } from '@/types/dnd';
import type { ThemeName } from '@/types/dnd';
import { modStr } from '@/engine/dice';
import { getFeat } from '@/data/feats';
import { ABILITY_LABELS, ABILITY_SHORT } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import { heroAvatar } from '@/lib/summary';
import { COINS, fmtM, usePrintData } from './printData';
import '@/styles/sheet-illustrated.css';

const KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Bolinhas para marcar a lápis (usos, espaços, dados de vida). */
function Pips({ n, used = 0, label }: { n: number; used?: number; label: string }) {
  if (n <= 0) return null;
  const shown = Math.min(n, 20);
  return (
    <span className="fv-ills-pips" role="img" aria-label={`${label}: ${n - used} de ${n}`}>
      {Array.from({ length: shown }, (_, i) => <i key={i} className={i < used ? 'is-used' : ''} />)}
      {n > shown && <small>+{n - shown}</small>}
    </span>
  );
}

/** Caixa vazia para escrever a lápis (ou o valor atual, se pedido). */
function Write({ value, blank }: { value: string | number | null | undefined; blank: boolean }) {
  return <span className="fv-ills-write">{blank ? '' : (value ?? '')}</span>;
}

export interface IllustratedOptions {
  theme: ThemeName;
  mode: 'light' | 'dark';
  /** PV atual, usos gastos etc. em branco — para a mesa presencial, a lápis. */
  blank: boolean;
}

/**
 * Ficha ilustrada: a ficha pronta para imprimir no visual do tema, com a arte
 * do herói em destaque. Página 1 = o herói e tudo o que se olha em jogo
 * (atributos, combate, perícias, ataques, recursos para marcar); página 2 =
 * características, equipamento, magias e notas.
 */
export function SheetIllustrated({ char, opts }: { char: Character; opts: IllustratedOptions }) {
  const { d, race, sub, bg, slots, spells, prepared, equippedIds, traits, features, resources, classLine } = usePrintData(char);
  const art = heroAvatar(char);
  const blank = opts.blank;
  const slotUsed = (lv: number) => (blank ? 0 : (char.combat?.spellSlots?.[lv]?.used ?? 0));
  const resUsed = (id: string) => (blank ? 0 : (char.combat?.resources?.[id] ?? 0));
  const hitDiceLeft = char.combat?.hitDiceRemaining ?? d.hitDiceMax;
  const slotLevels = Object.entries(slots).map(([lv, n]) => [Number(lv), n] as const).filter(([, n]) => n > 0);
  // quanto a página 1 tem para mostrar além do herói: passou do ponto, a arte encolhe um pouco
  const dense = Math.ceil(slotLevels.length / 3) + resources.length + d.attacks.length + (d.hitDiceMax > 12 ? 1 : 0) > 7;

  return (
    <article className="fv-ills" data-theme={opts.theme} data-mode={opts.mode} aria-label={`Ficha ilustrada de ${char.name || 'personagem'}`}>
      {/* ================= PÁGINA 1: o herói ================= */}
      <section className={'fv-ills-page fv-ills-p1' + (dense ? ' is-dense' : '')}>
        <div className="fv-ills-hero">
          <figure className="fv-ills-art">
            <img src={art} alt={`Retrato de ${char.name || 'personagem'}`} />
            <figcaption className="fv-ills-plate">
              <h1>{char.name || 'Sem nome'}</h1>
              <p>{classLine}</p>
              <p className="fv-ills-plate-sub">{race.label}{sub ? ` · ${sub.label}` : ''} · {bg.label}</p>
            </figcaption>
          </figure>

          <div className="fv-ills-side">
            <dl className="fv-ills-ident">
              <div><dt>Nível</dt><dd>{char.level}</dd></div>
              <div><dt>Tendência</dt><dd>{char.alignment || '—'}</dd></div>
              <div><dt>Experiência</dt><dd>{char.xp ?? '—'}</dd></div>
              <div><dt>Proficiência</dt><dd>{modStr(d.proficiency)}</dd></div>
            </dl>

            <div className="fv-ills-vitals">
              <div className="fv-ills-shield"><b>{d.ac}</b><span>CA</span></div>
              <div className="fv-ills-medal"><b>{modStr(d.initiative)}</b><span>Iniciativa</span></div>
              <div className="fv-ills-medal"><b>{fmtM(d.speed)}</b><span>Deslocamento</span></div>
              <div className="fv-ills-medal"><b>{d.passivePerception}</b><span>Percepção passiva</span></div>
            </div>

            <div className="fv-ills-abils">
              {KEYS.map((k) => (
                <div key={k} className="fv-ills-abil">
                  <span className="fv-ills-abil-name">{ABILITY_LABELS[k]}</span>
                  <b>{modStr(d.abilities[k].mod)}</b>
                  <span className="fv-ills-abil-score">{d.abilities[k].total}</span>
                  <span className={'fv-ills-abil-save' + (d.abilities[k].saveProf ? ' is-on' : '')} title="Teste de resistência">
                    TR {modStr(d.abilities[k].save)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* faixa de jogo: o que muda durante a sessão */}
        <div className="fv-ills-track">
          <div className="fv-ills-hp">
            <span className="fv-ills-k">Pontos de vida</span>
            <div className="fv-ills-hp-row">
              <Write value={char.hpCurrent} blank={blank} />
              <span className="fv-ills-hp-max">/ {d.maxHp}</span>
            </div>
          </div>
          <div className="fv-ills-cell">
            <span className="fv-ills-k">PV temporários</span>
            <Write value={char.combat?.hpTemp || ''} blank={blank} />
          </div>
          <div className="fv-ills-cell">
            <span className="fv-ills-k">Dados de vida · d{d.hitDie}</span>
            <Pips n={d.hitDiceMax} used={blank ? 0 : d.hitDiceMax - hitDiceLeft} label="Dados de vida" />
          </div>
          <div className="fv-ills-cell">
            <span className="fv-ills-k">Contra a morte</span>
            <span className="fv-ills-death">
              <span>✓</span><Pips n={3} used={blank ? 0 : (char.combat?.deathSaves.success ?? 0)} label="Sucessos" />
              <span>✗</span><Pips n={3} used={blank ? 0 : (char.combat?.deathSaves.fail ?? 0)} label="Falhas" />
            </span>
          </div>
          <div className="fv-ills-cell">
            <span className="fv-ills-k">Inspiração</span>
            <Pips n={1} used={blank ? 0 : char.inspiration ? 1 : 0} label="Inspiração" />
          </div>
        </div>

        <div className="fv-ills-body">
          <section className="fv-ills-box fv-ills-skills">
            <h2>Perícias</h2>
            <ul>
              {d.skills.map((s) => (
                <li key={s.key} className={s.expertise ? 'is-exp' : s.proficient ? 'is-on' : ''}>
                  <i aria-hidden />
                  <b>{modStr(s.bonus)}</b>
                  <span>{s.label}</span>
                  <small>{ABILITY_SHORT[s.ability]}</small>
                </li>
              ))}
            </ul>
            <p className="fv-ills-legend"><i className="is-on" aria-hidden /> proficiente <i className="is-exp" aria-hidden /> especialista</p>
          </section>

          <div className="fv-ills-col">
            <section className="fv-ills-box">
              <h2>Ataques</h2>
              {d.attacks.length ? (
                <table className="fv-ills-table">
                  <thead><tr><th>Arma</th><th>Ataque</th><th>Dano</th></tr></thead>
                  <tbody>
                    {d.attacks.map((a) => (
                      <tr key={a.uid}>
                        <td>{a.name}{a.note ? <small> · {a.note}</small> : null}</td>
                        <td className="fv-ills-num">{modStr(a.attackBonus)}</td>
                        <td>
                          <span className="fv-ills-num">{a.damageDice}d{a.damageDie}{a.damageBonus ? ` ${modStr(a.damageBonus)}` : ''}</span> {a.damageType}
                          {a.bonusDamage ? ` + ${a.bonusDamage.dice}d${a.bonusDamage.die} ${a.bonusDamage.type}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="fv-ills-empty">Sem ataques com arma.</p>
              )}
            </section>

            {d.isCaster && (
              <section className="fv-ills-box">
                <h2>Conjuração</h2>
                <div className="fv-ills-cast">
                  <div><b>{d.spellDC ?? '—'}</b><span>CD</span></div>
                  <div><b>{d.spellAttack !== null ? modStr(d.spellAttack) : '—'}</b><span>Ataque</span></div>
                </div>
                {slotLevels.length > 0 && (
                  <ul className="fv-ills-slots">
                    {slotLevels.map(([lv, n]) => (
                      <li key={lv}><span>{lv}º</span><Pips n={n} used={slotUsed(lv)} label={`Espaços de ${lv}º círculo`} /></li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {resources.length > 0 && (
              <section className="fv-ills-box">
                <h2>Recursos</h2>
                <ul className="fv-ills-res">
                  {resources.map((r) => (
                    <li key={r.id}>
                      <span>{r.label}{r.die ? <small> ({r.die})</small> : null}</span>
                      {r.unlimited ? <em>ilimitado</em> : <Pips n={r.max} used={resUsed(r.id)} label={r.label} />}
                      <small className="fv-ills-recharge">{r.recharge === 'short' ? 'curto' : 'longo'}</small>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="fv-ills-box fv-ills-passives">
              <div><b>{d.passiveInvestigation}</b> Investigação passiva</div>
              <div><b>{d.passiveInsight}</b> Intuição passiva</div>
              {d.darkvision && <div><b>{fmtM(d.darkvision.range)}</b> Visão no escuro</div>}
            </section>
          </div>
        </div>
      </section>

      {/* ================= PÁGINA 2: o livro do herói ================= */}
      <section className="fv-ills-page fv-ills-p2">
        <header className="fv-ills-p2-head">
          <img src={art} alt="" />
          <div>
            <h2>{char.name || 'Sem nome'}</h2>
            <p>{classLine} · {race.label}</p>
          </div>
        </header>

        <div className="fv-ills-flow">
          <section className="fv-ills-box">
            <h2>Características de classe</h2>
            {features.map((c) => (
              <div key={c.classId} className="fv-ills-feats">
                {features.length > 1 && <h3>{c.label}</h3>}
                {c.rows.map((r) => <p key={r.lv}><b>{r.lv}º</b> {r.f.join(', ')}</p>)}
              </div>
            ))}
          </section>

          <section className="fv-ills-box">
            <h2>Traços de {race.label}</h2>
            <ul className="fv-ills-list">
              {traits.map((t) => <li key={t}>{t}</li>)}
              {sub?.traits?.map((t) => <li key={t}>{t} <small>({sub.label})</small></li>)}
            </ul>
          </section>

          {char.feats?.length > 0 && (
            <section className="fv-ills-box">
              <h2>Talentos</h2>
              <ul className="fv-ills-list">{char.feats.map((f) => <li key={f}>{getFeat(f)?.label ?? f}</li>)}</ul>
            </section>
          )}

          <section className="fv-ills-box">
            <h2>Antecedente · {bg.label}</h2>
            {(bg.featureName || bg.feature) && <p><b>{bg.featureName ?? 'Característica'}:</b> {bg.feature}</p>}
            {char.concept && <p className="fv-ills-quote">“{char.concept}”</p>}
            {char.age && <p><b>Idade:</b> {char.age}</p>}
          </section>

          <section className="fv-ills-box">
            <h2>Proficiências e idiomas</h2>
            <p><b>Armaduras:</b> {d.weaponArmorProfs.armor || '—'}</p>
            <p><b>Armas:</b> {d.weaponArmorProfs.weapons || '—'}</p>
            <p><b>Ferramentas:</b> {(char.toolProfs ?? []).map((t) => t.label || toolLabel(t.id)).join(', ') || '—'}</p>
            <p><b>Idiomas:</b> {d.languages.join(', ') || '—'}</p>
            {d.resistances.length > 0 && <p><b>Resistências:</b> {d.resistances.map((r) => r.value).join(', ')}</p>}
          </section>

          <section className="fv-ills-box">
            <h2>Equipamento</h2>
            <div className="fv-ills-coins">
              {COINS.map(([k, label]) => (
                <span key={k}><b>{blank ? '' : (char.coins?.[k] ?? 0)}</b>{label}</span>
              ))}
            </div>
            <ul className="fv-ills-equip">
              {(char.inventory ?? []).map((it) => (
                <li key={it.uid} className={equippedIds.has(it.uid) ? 'is-eq' : ''}>
                  {it.quantity > 1 ? `${it.quantity}× ` : ''}{it.name}
                  {it.attuned ? <small> (sintonizado)</small> : null}
                </li>
              ))}
              {!char.inventory?.length && <li className="fv-ills-empty">Mochila vazia.</li>}
            </ul>
            <p className="fv-ills-foot">Carga {d.carriedWeight.toFixed(1).replace('.', ',')} / {d.carryCapacity} kg · ◆ equipado</p>
          </section>

          {d.isCaster && spells.size > 0 && (
            <section className="fv-ills-box fv-ills-spells">
              <h2>Magias</h2>
              {[...spells.entries()].map(([lv, list]) => (
                <div key={lv} className="fv-ills-spell-lv">
                  <h3>{lv === 0 ? 'Truques' : `${lv}º círculo`}</h3>
                  <ul>
                    {list.map((s) => (
                      <li key={s.id} className={lv > 0 && prepared.has(s.id) ? 'is-prep' : ''}>
                        {s.name}
                        <small> · {[s.castingTime, s.range, s.duration].filter(Boolean).join(' · ')}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="fv-ills-foot">◆ preparada</p>
            </section>
          )}

          <section className="fv-ills-box fv-ills-notes">
            <h2>Notas</h2>
            {printableNotes(char) ? <p>{printableNotes(char)}</p> : <div className="fv-ills-lines" aria-hidden />}
          </section>
        </div>
        <p className="fv-ills-credit">Ficha Viva · {new Date(char.updatedAt || Date.now()).toLocaleDateString('pt-BR')}</p>
      </section>
    </article>
  );
}
