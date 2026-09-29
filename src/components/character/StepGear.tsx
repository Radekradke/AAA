import { useMemo, useState } from 'react';
import type { StepProps } from './stepTypes';
import { StepHeader, SectionTitle } from './creatorUi';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { getItem } from '@/data/items';
import { applySelection, defaultSelection, gearOptionsForClass, selectionFromChar } from '@/engine/loadout';
import type { GearSelection } from '@/engine/loadout';
import { getClass } from '@/data/classes';
import { deriveCharacter } from '@/engine/dndRules';
import { damageExpr } from '@/engine/combat';
import { modStr } from '@/engine/dice';
import { Icon } from '@/components/ui/Icon';

/**
 * Capítulo VI — Equipamento. O kit recomendado da classe já vem escolhido
 * num cartão só (com CA e ataques calculados); personalizar é opcional e
 * fica recolhido em listas compactas.
 */
export function StepGear({ char, update }: StepProps) {
  const [custom, setCustom] = useState(false);
  const cls = getClass(char.classId);
  const options = gearOptionsForClass(char.classId);
  const sel = selectionFromChar(char);
  const rec = defaultSelection(char.classId);
  const isRecommended = sel.armorId === rec.armorId && sel.weaponId === rec.weaponId && sel.rangedId === rec.rangedId && sel.shield === rec.shield;
  const derived = useMemo(() => deriveCharacter(char), [char]);

  const melee = WEAPONS.filter((w) => w.weapon?.range === 'melee' && options.weapons.includes(w.id));
  const ranged = WEAPONS.filter((w) => w.weapon?.range === 'ranged' && options.ranged.includes(w.id));
  const armors = ARMORS.filter((a) => a.category === 'armor' && options.armors.includes(a.id));

  const apply = (patch: Partial<GearSelection>) =>
    update((c) => applySelection(c, { ...sel, ...patch, shield: options.canUseShield ? (patch.shield ?? sel.shield) : false }));

  const kit = [
    { icon: 'equipped' as const, label: 'Proteção', value: sel.armorId ? getItem(sel.armorId)?.name ?? '—' : 'Roupas de viajante' },
    ...(options.canUseShield ? [{ icon: 'crest' as const, label: 'Escudo', value: sel.shield ? 'Escudo de Aço' : 'Sem escudo' }] : []),
    { icon: 'sword' as const, label: 'Arma', value: sel.weaponId ? getItem(sel.weaponId)?.name ?? '—' : '—' },
    { icon: 'class-ranger' as const, label: 'Distância', value: sel.rangedId ? getItem(sel.rangedId)?.name ?? '—' : 'Nenhuma' },
  ];

  return (
    <div className="fv-step">
      <StepHeader step={5} subtitle={options.note || `O arsenal inicial do seu ${cls.label}.`} />

      <section className="fv-kit">
        <div className="fv-kit-head">
          <div>
            <div className="fv-detail-eyebrow">{isRecommended ? 'Kit recomendado' : 'Kit personalizado'}</div>
            <h3>Arsenal do {cls.label}</h3>
          </div>
          <div className="fv-kit-ac" title="Classe de Armadura com este kit">
            <b>{derived.ac}</b>
            <span>CA</span>
          </div>
        </div>
        <dl className="fv-kit-list">
          {kit.map((k) => (
            <div key={k.label}>
              <dt><Icon name={k.icon} size={16} /> {k.label}</dt>
              <dd>{k.value}</dd>
            </div>
          ))}
        </dl>
        {derived.attacks.length > 0 && (
          <div className="fv-kit-attacks">
            {derived.attacks.map((a) => (
              <span key={a.uid}>
                {a.name} <b>{modStr(a.attackBonus)}</b> · {damageExpr(a)}
              </span>
            ))}
          </div>
        )}
        <div className="fv-kit-actions">
          <button type="button" className="fv-link-btn" aria-expanded={custom} onClick={() => setCustom((v) => !v)}>
            {custom ? 'Fechar personalização' : 'Personalizar kit'}
          </button>
          {!isRecommended && (
            <button type="button" className="fv-link-btn is-muted" onClick={() => update((c) => applySelection(c, rec))}>
              Voltar ao recomendado
            </button>
          )}
        </div>
        <p className="fv-step-note" style={{ margin: '10px 0 0' }}>Mochila básica (corda, tochas, rações e poção de cura) incluída. Tudo muda depois no inventário.</p>
      </section>

      {custom && (
        <div className="fv-gear-custom">
          <GearList
            title="Proteção"
            value={sel.armorId}
            onPick={(id) => apply({ armorId: id })}
            items={[{ id: null, name: 'Roupas de viajante', note: 'CA 10 + DES' }, ...armors.map((a) => ({ id: a.id, name: a.name, note: a.note }))]}
          />
          <GearList title="Arma principal" value={sel.weaponId} onPick={(id) => apply({ weaponId: id })} items={melee.map((w) => ({ id: w.id, name: w.name, note: w.note }))} />
          <GearList
            title="À distância"
            value={sel.rangedId}
            onPick={(id) => apply({ rangedId: id })}
            items={[{ id: null, name: 'Nenhuma', note: '' }, ...ranged.map((w) => ({ id: w.id, name: w.name, note: w.note }))]}
          />
          {options.canUseShield && (
            <div>
              <SectionTitle>Escudo</SectionTitle>
              <button type="button" role="switch" aria-checked={sel.shield} className={'fv-gear-row' + (sel.shield ? ' is-on' : '')} onClick={() => apply({ shield: !sel.shield })}>
                <span className="fv-gear-dot is-square" aria-hidden />
                <span className="fv-gear-name">Escudo de Aço</span>
                <span className="fv-gear-note">+2 CA</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GearList({ title, items, value, onPick }: {
  title: string;
  items: { id: string | null; name: string; note: string }[];
  value: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div role="radiogroup" aria-label={title} className="fv-gear-list">
        {items.map((it) => {
          const on = value === it.id;
          return (
            <button key={it.id ?? 'none'} type="button" role="radio" aria-checked={on} className={'fv-gear-row' + (on ? ' is-on' : '')} onClick={() => onPick(it.id)}>
              <span className="fv-gear-dot" aria-hidden />
              <span className="fv-gear-name">{it.name}</span>
              <span className="fv-gear-note">{it.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
