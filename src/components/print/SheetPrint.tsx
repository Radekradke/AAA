import type { Character } from '@/types/character';
import type { AbilityKey } from '@/types/dnd';
import { modStr } from '@/engine/dice';
import { getFeat } from '@/data/feats';
import { ABILITY_LABELS, ABILITY_SHORT } from '@/data/skills';
import { toolLabel } from '@/data/tools';
import { COINS, fmtM, usePrintData } from './printData';
import '@/styles/print.css';

const KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/**
 * Ficha no formato clássico de papel (A4): preto no branco, legível impressa
 * e em PDF. É a mesma visão do link compartilhado (só leitura).
 */
export function SheetPrint({ char }: { char: Character }) {
  const { d, race, sub, bg, slots, spells, prepared, equippedIds, traits, features, classLine } = usePrintData(char);

  return (
    <article className="fv-print" aria-label={`Ficha de ${char.name || 'personagem'}`}>
      {/* ===== página 1 ===== */}
      <header className="fv-print-head">
        <div className="fv-print-name">
          <h1>{char.name || 'Sem nome'}</h1>
          <span>Nome do personagem</span>
        </div>
        <dl className="fv-print-ident">
          <div><dt>Classe e nível</dt><dd>{classLine}</dd></div>
          <div><dt>Antecedente</dt><dd>{bg.label}</dd></div>
          <div><dt>Raça</dt><dd>{race.label}{sub ? ` · ${sub.label}` : ''}</dd></div>
          <div><dt>Tendência</dt><dd>{char.alignment || '—'}</dd></div>
          <div><dt>Experiência</dt><dd>{char.xp ?? '—'}</dd></div>
          <div><dt>Nível total</dt><dd>{char.level}</dd></div>
        </dl>
      </header>

      <div className="fv-print-grid">
        {/* coluna 1: atributos, salvaguardas e perícias */}
        <section className="fv-print-col">
          <div className="fv-print-abils">
            {KEYS.map((k) => (
              <div key={k} className="fv-print-abil">
                <span className="fv-print-abil-name">{ABILITY_LABELS[k]}</span>
                <b className="fv-print-abil-mod">{modStr(d.abilities[k].mod)}</b>
                <span className="fv-print-abil-score">{d.abilities[k].total}</span>
              </div>
            ))}
          </div>
          <div className="fv-print-box fv-print-inline">
            <b>{modStr(d.proficiency)}</b>
            <span>Bônus de proficiência</span>
          </div>
          <div className="fv-print-box fv-print-inline">
            <b>{(char.inspirationPoints ?? (char.inspiration ? 1 : 0)) || '—'}</b>
            <span>Inspiração</span>
          </div>
          <div className="fv-print-box">
            <h2>Testes de resistência</h2>
            <ul className="fv-print-checks">
              {KEYS.map((k) => (
                <li key={k}>
                  <i role="img" className={d.abilities[k].saveProf ? 'is-on' : ''} aria-label={d.abilities[k].saveProf ? 'proficiente' : 'não proficiente'} />
                  <b>{modStr(d.abilities[k].save)}</b> {ABILITY_LABELS[k]}
                </li>
              ))}
            </ul>
          </div>
          <div className="fv-print-box">
            <h2>Perícias</h2>
            <ul className="fv-print-checks">
              {d.skills.map((s) => (
                <li key={s.key}>
                  <i role="img" className={s.expertise ? 'is-exp' : s.proficient ? 'is-on' : ''} aria-label={s.expertise ? 'especialista' : s.proficient ? 'proficiente' : 'não proficiente'} />
                  <b>{modStr(s.bonus)}</b> {s.label} <small>({ABILITY_SHORT[s.ability]})</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="fv-print-box fv-print-passives">
            <div><b>{d.passivePerception}</b> Percepção passiva</div>
            <div><b>{d.passiveInvestigation}</b> Investigação passiva</div>
            <div><b>{d.passiveInsight}</b> Intuição passiva</div>
          </div>
        </section>

        {/* coluna 2: combate */}
        <section className="fv-print-col">
          <div className="fv-print-vitals">
            <div className="fv-print-stat"><b>{d.ac}</b><span>Classe de armadura</span></div>
            <div className="fv-print-stat"><b>{modStr(d.initiative)}</b><span>Iniciativa</span></div>
            <div className="fv-print-stat"><b>{fmtM(d.speed)}</b><span>Deslocamento</span></div>
          </div>
          <div className="fv-print-box fv-print-hp">
            <div><span>PV máximo</span><b>{d.maxHp}</b></div>
            <div><span>PV atuais</span><b>{char.hpCurrent}</b></div>
            <div><span>PV temporários</span><b>{char.combat?.hpTemp || '—'}</b></div>
          </div>
          <div className="fv-print-row2">
            <div className="fv-print-box">
              <span className="fv-print-k">Dados de vida</span>
              <b className="fv-print-v">{char.combat?.hitDiceRemaining ?? d.hitDiceMax}/{d.hitDiceMax} · d{d.hitDie}</b>
            </div>
            <div className="fv-print-box">
              <span className="fv-print-k">Testes contra a morte</span>
              <b className="fv-print-v">✓ {char.combat?.deathSaves.success ?? 0}/3 · ✗ {char.combat?.deathSaves.fail ?? 0}/3</b>
            </div>
          </div>
          <div className="fv-print-box">
            <h2>Ataques</h2>
            {d.attacks.length ? (
              <table className="fv-print-table">
                <thead>
                  <tr><th>Nome</th><th>Ataque</th><th>Dano / tipo</th></tr>
                </thead>
                <tbody>
                  {d.attacks.map((a) => (
                    <tr key={a.uid}>
                      <td>{a.name}{a.note ? <small> · {a.note}</small> : null}</td>
                      <td>{modStr(a.attackBonus)}</td>
                      <td>
                        {a.damageDice}d{a.damageDie}{a.damageBonus ? ` ${modStr(a.damageBonus)}` : ''} {a.damageType}
                        {a.bonusDamage ? ` + ${a.bonusDamage.dice}d${a.bonusDamage.die} ${a.bonusDamage.type}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="fv-print-empty">Sem ataques com arma.</p>
            )}
          </div>
          {d.isCaster && (
            <div className="fv-print-box fv-print-inline-3">
              <div><b>{d.spellDC ?? '—'}</b><span>CD das magias</span></div>
              <div><b>{d.spellAttack !== null ? modStr(d.spellAttack) : '—'}</b><span>Ataque mágico</span></div>
              <div><b>{Object.values(slots).reduce((a, b) => a + b, 0) || '—'}</b><span>Espaços (total)</span></div>
            </div>
          )}
          <div className="fv-print-box">
            <h2>Proficiências e idiomas</h2>
            <p><b>Armaduras:</b> {d.weaponArmorProfs.armor || '—'}</p>
            <p><b>Armas:</b> {d.weaponArmorProfs.weapons || '—'}</p>
            <p><b>Ferramentas:</b> {(char.toolProfs ?? []).map((t) => t.label || toolLabel(t.id)).join(', ') || '—'}</p>
            <p><b>Idiomas:</b> {d.languages.join(', ') || '—'}</p>
            {d.darkvision && <p><b>Visão no escuro:</b> {fmtM(d.darkvision.range)}</p>}
            {d.resistances.length > 0 && <p><b>Resistências:</b> {d.resistances.map((r) => r.value).join(', ')}</p>}
          </div>
        </section>

        {/* coluna 3: traços e características */}
        <section className="fv-print-col">
          <div className="fv-print-box">
            <h2>Traços de {race.label}</h2>
            <ul className="fv-print-list">{traits.map((t) => <li key={t}>{t}</li>)}</ul>
            {sub && sub.traits?.length ? <ul className="fv-print-list">{sub.traits.map((t) => <li key={t}>{t} <small>({sub.label})</small></li>)}</ul> : null}
          </div>
          <div className="fv-print-box">
            <h2>Características de classe</h2>
            {features.map((c) => (
              <div key={c.classId} className="fv-print-feats">
                {features.length > 1 && <h3>{c.label}</h3>}
                {c.rows.map((r) => (
                  <p key={r.lv}><b>{r.lv}º</b> {r.f.join(', ')}</p>
                ))}
              </div>
            ))}
          </div>
          {char.feats?.length > 0 && (
            <div className="fv-print-box">
              <h2>Talentos</h2>
              <ul className="fv-print-list">{char.feats.map((f) => <li key={f}>{getFeat(f)?.label ?? f}</li>)}</ul>
            </div>
          )}
          <div className="fv-print-box">
            <h2>Antecedente: {bg.label}</h2>
            {(bg.featureName || bg.feature) && <p><b>{bg.featureName ?? 'Característica'}:</b> {bg.feature}</p>}
            {char.concept && <p>{char.concept}</p>}
            {char.age && <p><b>Idade:</b> {char.age}</p>}
          </div>
        </section>
      </div>

      {/* ===== página 2 ===== */}
      <div className="fv-print-page2">
        <section className="fv-print-box">
          <h2>Equipamento</h2>
          <div className="fv-print-coins">
            {COINS.map(([k, label]) => (
              <span key={k}><b>{char.coins?.[k] ?? 0}</b> {label}</span>
            ))}
          </div>
          <ul className="fv-print-equip">
            {(char.inventory ?? []).map((it) => (
              <li key={it.uid}>
                {equippedIds.has(it.uid) && <i aria-label="equipado">■</i>}
                {it.quantity > 1 ? `${it.quantity}× ` : ''}{it.name}
                {it.attuned ? <small> (sintonizado)</small> : null}
              </li>
            ))}
            {!char.inventory?.length && <li className="fv-print-empty">Mochila vazia.</li>}
          </ul>
          <p className="fv-print-foot">Carga: {d.carriedWeight.toFixed(1).replace('.', ',')} / {d.carryCapacity} kg · ■ = equipado</p>
        </section>

        {d.isCaster && spells.size > 0 && (
          <section className="fv-print-box">
            <h2>Magias</h2>
            <div className="fv-print-spells">
              {[...spells.entries()].map(([lv, list]) => (
                <div key={lv} className="fv-print-spell-lv">
                  <h3>
                    {lv === 0 ? 'Truques' : `${lv}º círculo`}
                    {lv > 0 && slots[lv] ? <small> · {slots[lv]} espaço(s)</small> : null}
                  </h3>
                  <ul>
                    {list.map((s) => (
                      <li key={s.id}>
                        {lv > 0 && <i role="img" className={prepared.has(s.id) ? 'is-on' : ''} aria-label={prepared.has(s.id) ? 'preparada' : 'conhecida'} />}
                        {s.name}
                        <small> · {[s.castingTime, s.range, s.duration].filter(Boolean).join(' · ')}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {char.notes?.trim() && (
          <section className="fv-print-box">
            <h2>Notas</h2>
            <p className="fv-print-notes">{char.notes}</p>
          </section>
        )}
      </div>
      <p className="fv-print-credit">Ficha Viva · {new Date(char.updatedAt || Date.now()).toLocaleDateString('pt-BR')}</p>
    </article>
  );
}
