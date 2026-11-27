import { FichaVivaMark } from '@/components/ui/FichaVivaMark';
import { ABILITY_LABELS, ABILITY_SHORT } from '@/data/skills';
import { THEMES } from '@/data/themes';
import { modStr } from '@/engine/dice';
import { syncHitDicePools } from '@/engine/hitDice';
import type { Character } from '@/types/character';
import type { AbilityKey, ThemeName } from '@/types/dnd';
import { COINS, fmtM } from './printData';
import type { usePrintData } from './printData';
import '@/styles/sheet-themed.css';
import '@/styles/themes/print-template.css';

const ABILITIES: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function SheetThemed({
  char, data, theme, blank,
}: {
  char: Character;
  data: ReturnType<typeof usePrintData>;
  theme: ThemeName;
  blank: boolean;
}) {
  const { d, race, sub, bg, classLine, resources } = data;
  const pools = Object.entries(syncHitDicePools(char));
  const conditions = char.combat?.conditions ?? [];
  const stats = [
    ['Classe de armadura', d.ac], ['Iniciativa', modStr(d.initiative)], ['Deslocamento', fmtM(d.speed)],
    ['PV atuais', blank ? '' : char.hpCurrent], ['PV máximos', d.maxHp], ['PV temporários', blank ? '' : (char.combat?.hpTemp ?? 0)],
  ];
  const deathSaves = [
    ['Sucessos', char.combat?.deathSaves?.success ?? 0], ['Falhas', char.combat?.deathSaves?.fail ?? 0],
  ] as const;
  const inventory = char.inventory ?? [];

  return (
    <div className="fv-template" data-template={theme}>
      <section className="fv-template-page" aria-label="Resumo do personagem">
        <img className="fv-template-art" src={`/themes/print/${theme}.webp`} alt="" />
        <header className="fv-template-head">
          <FichaVivaMark className="fv-template-mark" />
          <div>
            <span>Ficha Viva</span>
            <p>Ficha de personagem</p>
            <small>D&D 5ª edição · Regras de 2014</small>
          </div>
        </header>

        <section className="fv-template-panel fv-template-identity" aria-label="Identidade">
          <div><small>Nome do personagem</small><h1>{char.name || 'Sem nome'}</h1></div>
          <dl>
            <div><dt>Classe e nível</dt><dd>{classLine}</dd></div>
            <div><dt>Raça</dt><dd>{race.label}{sub ? ` · ${sub.label}` : ''}</dd></div>
            <div><dt>Antecedente</dt><dd>{bg.label}</dd></div>
          </dl>
        </section>

        <section className="fv-template-attributes">
          <h2>Atributos</h2>
          <dl>
            {ABILITIES.map((key) => (
              <div key={key}><dt>{ABILITY_LABELS[key]}</dt><dd><b>{d.abilities[key].total}</b><span>Mod. {modStr(d.abilities[key].mod)}</span></dd></div>
            ))}
          </dl>
        </section>

        <div className="fv-template-grid">
          <div className="fv-template-stack">
            <section className="fv-template-panel">
              <h2>Salvaguardas</h2>
              <ul className="fv-template-saves">
                {ABILITIES.map((key) => (
                  <li key={key}><b>{modStr(d.abilities[key].save)}</b><i aria-hidden="true" className={d.abilities[key].saveProf ? 'is-trained' : ''} />{ABILITY_LABELS[key]}{d.abilities[key].saveProf && <span className="sr-only">Proficiente</span>}</li>
                ))}
              </ul>
            </section>
            <section className="fv-template-panel">
              <h2>Perícias</h2>
              <ul className="fv-template-skills">
                {d.skills.map((skill) => (
                  <li key={skill.key}>
                    <b>{modStr(skill.bonus)}</b>
                    <i aria-hidden="true" className={skill.expertise ? 'is-expert' : skill.proficient ? 'is-trained' : ''} />
                    {skill.label}<small>{ABILITY_SHORT[skill.ability]}</small>
                    {skill.proficient && <span className="sr-only">{skill.expertise ? 'Especialista' : 'Proficiente'}</span>}
                  </li>
                ))}
              </ul>
              <p className="fv-template-passive"><b>{d.passivePerception}</b> Percepção passiva</p>
            </section>
          </div>

          <div className="fv-template-stack">
            <section className="fv-template-panel">
              <h2>Combate</h2>
              <dl className="fv-template-stats">
                {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <dl className="fv-template-extras">
                <div><dt>Bônus de proficiência</dt><dd>{modStr(d.proficiency)}</dd></div>
                <div><dt>Dados de vida</dt><dd>{pools.map(([die, pool]) => blank ? `${pool.max}d${die}` : `${pool.remaining}/${pool.max} d${die}`).join(' · ')}</dd></div>
                <div><dt>Inspiração</dt><dd><i className={!blank && char.inspiration ? 'is-trained' : ''} aria-hidden="true" /><span className="sr-only">{!blank && char.inspiration ? 'Disponível' : 'Não marcada'}</span></dd></div>
                <div><dt>Condições</dt><dd>{conditions.join(', ') || '—'}</dd></div>
              </dl>
              <div className="fv-template-death">
                <strong>Salvaguardas contra a morte</strong>
                {deathSaves.map(([label, count]) => <span key={label}>{label} {[0, 1, 2].map(index => <i key={index} aria-hidden="true" className={!blank && index < count ? 'is-trained' : ''} />)}<span className="sr-only">{blank ? 0 : count} de 3</span></span>)}
              </div>
            </section>

            <section className="fv-template-panel">
              <h2>Ataques e ações</h2>
              <table className="fv-template-attacks">
                <thead><tr><th scope="col">Nome</th><th scope="col">Acerto</th><th scope="col">Dano / tipo</th></tr></thead>
                <tbody>
                  {d.attacks.slice(0, 4).map(a => (
                    <tr key={a.uid}><td><span>{a.name}</span></td><td>{modStr(a.attackBonus)}</td><td><span>{a.damageDice}d{a.damageDie}{a.damageBonus ? ` ${modStr(a.damageBonus)}` : ''} {a.damageType}</span></td></tr>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - d.attacks.length) }, (_, index) => <tr key={index} aria-hidden="true"><td /><td /><td /></tr>)}
                </tbody>
              </table>
              {d.attacks.length > 4 && <small>Lista completa nas páginas de detalhes.</small>}
            </section>

            <section className="fv-template-panel fv-template-summary">
              <h2>Características e recursos</h2>
              {resources.length > 0 && <p>{resources.slice(0, 3).map(r => r.label).join(' · ')}</p>}
              {d.isCaster && <p>Conjuração · CD {d.spellDC ?? '—'} · Ataque {d.spellAttack === null ? '—' : modStr(d.spellAttack)}</p>}
            </section>

            <section className="fv-template-panel fv-template-summary">
              <h2>Equipamento e anotações</h2>
              {inventory.length > 0 && <p>{inventory.slice(0, 3).map(it => it.name).join(' · ')}</p>}
              {!blank && <p>{COINS.map(([key, label]) => `${char.coins?.[key] ?? 0} ${label}`).join(' · ')}</p>}
            </section>
          </div>
        </div>

        <footer>{THEMES[theme].label}</footer>
      </section>
    </div>
  );
}
