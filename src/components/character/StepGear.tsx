import type { StepProps } from './stepTypes';
import { ChapterTitle } from './ChapterTitle';
import { SelectableCard } from './SelectableCard';
import { WEAPONS } from '@/data/weapons';
import { ARMORS } from '@/data/armors';
import { applySelection, gearOptionsForClass, selectionFromChar } from '@/engine/loadout';
import type { GearSelection } from '@/engine/loadout';
import { getClass } from '@/data/classes';
import { useTheme } from '@/lib/useTheme';

export function StepGear({ char, update }: StepProps) {
  const t = useTheme();
  const cls = getClass(char.classId);
  const options = gearOptionsForClass(char.classId);
  const sel = selectionFromChar(char);
  const meleeWeapons = WEAPONS.filter((w) => w.weapon?.range === 'melee' && options.weapons.includes(w.id));
  const rangedWeapons = WEAPONS.filter((w) => w.weapon?.range === 'ranged' && options.ranged.includes(w.id));
  const armors = ARMORS.filter((a) => a.category === 'armor' && options.armors.includes(a.id));

  const apply = (patch: Partial<GearSelection>) =>
    update((c) => applySelection(c, { ...sel, ...patch, shield: options.canUseShield ? (patch.shield ?? sel.shield) : false }));

  const groupTitle = (s: string) => (
    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--acc)', marginBottom: 9 }}>
      {s}
    </div>
  );

  return (
    <div className="animate-riseIn">
      <ChapterTitle
        chapter="Capítulo VI"
        title="Equipamento"
        subtitle={`Todo herói parte com o que carrega. Escolha o arsenal inicial do seu ${cls.label}.`}
      />
      <div style={{ marginBottom: 14, color: 'var(--muted)', fontSize: 13, lineHeight: 1.55 }}>
        {options.note}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Armadura */}
        <div>
          {groupTitle('Proteção')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 11 }}>
            <GearOption
              tag={armors.length ? 'Sem armadura' : 'Padrão da classe'}
              name="Roupas de viajante"
              note="CA 10 + DES · livre"
              selected={sel.armorId === null}
              onClick={() => apply({ armorId: null })}
              jewel={t.acc}
            />
            {armors.map((a) => (
              <GearOption
                key={a.id}
                tag={a.armor!.category}
                name={a.name}
                note={a.note}
                selected={sel.armorId === a.id}
                onClick={() => apply({ armorId: a.id })}
                jewel={t.acc}
              />
            ))}
          </div>
        </div>

        {/* Arma principal */}
        <div>
          {groupTitle('Arma principal')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 11 }}>
            {meleeWeapons.map((w) => (
              <GearOption
                key={w.id}
                tag={w.weapon!.type === 'martial' ? 'Marcial' : 'Simples'}
                name={w.name}
                note={w.note}
                selected={sel.weaponId === w.id}
                onClick={() => apply({ weaponId: w.id })}
                jewel={t.danger}
              />
            ))}
          </div>
        </div>

        {/* À distância + escudo */}
        <div>
          {groupTitle('Alcance & Escudo')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 11 }}>
            <GearOption
              tag="Nenhuma"
              name="Sem arma à distância"
              note="—"
              selected={sel.rangedId === null}
              onClick={() => apply({ rangedId: null })}
              jewel={t.acc}
            />
            {rangedWeapons.map((w) => (
              <GearOption
                key={w.id}
                tag="Distância"
                name={w.name}
                note={w.note}
                selected={sel.rangedId === w.id}
                onClick={() => apply({ rangedId: w.id })}
                jewel={t.acc}
              />
            ))}
            {options.canUseShield && (
              <GearOption
                tag="Defesa"
                name="Escudo de Aço"
                note={sel.shield ? 'Equipado · +2 CA' : '+2 CA'}
                selected={sel.shield}
                onClick={() => apply({ shield: !sel.shield })}
                jewel={t.gold}
              />
            )}
          </div>
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--muted)' }}>
        A mochila inicial (corda, tochas, rações e uma poção de cura) é adicionada automaticamente. Tudo pode ser
        ajustado depois no inventário.
      </p>
    </div>
  );
}

function GearOption({
  tag,
  name,
  note,
  selected,
  onClick,
  jewel,
}: {
  tag: string;
  name: string;
  note: string;
  selected: boolean;
  onClick: () => void;
  jewel: string;
}) {
  return (
    <SelectableCard selected={selected} jewel={jewel} onClick={onClick} badge="EQUIPADO" style={{ padding: '13px 14px' }}>
      <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: selected ? 'var(--gold)' : 'var(--muted)' }}>
        {tag}
      </div>
      <div style={{ marginTop: 9, fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 16, color: 'var(--ink)', lineHeight: 1.15 }}>
        {name}
      </div>
      <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>{note}</div>
    </SelectableCard>
  );
}
