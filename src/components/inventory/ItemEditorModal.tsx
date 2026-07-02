import { useState } from 'react';
import type { InventoryItem } from '@/types/character';
import type { DamageType, WeaponRange, WeaponType } from '@/types/dnd';
import { customInventoryItem } from '@/engine/inventory';
import { RARITY } from '@/data/themes';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Icon } from '@/components/ui/Icon';

interface ItemEditorModalProps {
  /** Item existente para editar; ausente = forjar um novo. */
  item?: InventoryItem;
  onSave: (item: InventoryItem) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'weapon', label: 'Arma' },
  { id: 'armor', label: 'Armadura' },
  { id: 'shield', label: 'Escudo' },
  { id: 'gear', label: 'Equipamento' },
  { id: 'consumable', label: 'Consumível' },
  { id: 'wondrous', label: 'Maravilhoso' },
  { id: 'ring', label: 'Anel' },
];

const DAMAGE_TYPES: DamageType[] = ['cortante', 'perfurante', 'concussão', 'fogo', 'gelo', 'ácido', 'elétrico'];
const DICE = [4, 6, 8, 10, 12];

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 5,
};

/**
 * A Forja: criação de itens únicos/personalizados e edição de qualquer item
 * da mochila — incluindo armas com dados de dano, tipo e propriedades.
 * Alterações refletem em CA, ataques e dano automaticamente.
 */
export function ItemEditorModal({ item, onSave, onClose }: ItemEditorModalProps) {
  const t = useTheme();
  const editing = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? 'weapon');
  const [rarity, setRarity] = useState(item?.rarity ?? 'comum');
  const [weight, setWeight] = useState(String(item?.weight ?? 1));
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [note, setNote] = useState(item?.note ?? '');
  const [attunement, setAttunement] = useState(!!item?.attunement);
  const [acBonus, setAcBonus] = useState(String(item?.acBonus ?? 0));
  // arma
  const [dmgDice, setDmgDice] = useState(String(item?.weapon?.damageDice ?? 1));
  const [dmgDie, setDmgDie] = useState(String(item?.weapon?.damageDie ?? 8));
  const [dmgType, setDmgType] = useState<DamageType>(item?.weapon?.damageType ?? 'cortante');
  const [wpnType, setWpnType] = useState<WeaponType>(item?.weapon?.type ?? 'martial');
  const [wpnRange, setWpnRange] = useState<WeaponRange>(item?.weapon?.range ?? 'melee');
  const [finesse, setFinesse] = useState(!!item?.weapon?.finesse);
  const [versatile, setVersatile] = useState(String(item?.weapon?.versatileDie ?? ''));
  const [properties, setProperties] = useState(item?.weapon?.properties.join(', ') ?? '');
  // armadura
  const [baseAC, setBaseAC] = useState(String(item?.armor?.baseAC ?? 14));
  const [armorCat, setArmorCat] = useState<'leve' | 'média' | 'pesada'>(item?.armor?.category ?? 'leve');
  const [addDex, setAddDex] = useState(item?.armor?.addDex ?? true);
  const [maxDex, setMaxDex] = useState(String(item?.armor?.maxDexBonus ?? ''));

  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) {
      setError('Dê um nome ao item.');
      return;
    }
    const parsedProps = properties.split(',').map((p) => p.trim()).filter(Boolean);
    const weapon =
      category === 'weapon'
        ? {
            damageDice: Math.max(1, parseInt(dmgDice) || 1),
            damageDie: parseInt(dmgDie) || 8,
            damageType: dmgType,
            type: wpnType,
            range: wpnRange,
            properties: parsedProps,
            finesse,
            versatileDie: versatile ? parseInt(versatile) || undefined : undefined,
          }
        : undefined;
    const armor =
      category === 'armor'
        ? {
            baseAC: Math.max(10, parseInt(baseAC) || 10),
            category: armorCat,
            addDex,
            maxDexBonus: addDex && maxDex ? parseInt(maxDex) || undefined : undefined,
          }
        : undefined;
    const bonus = parseInt(acBonus) || 0;

    const base = {
      name: name.trim(),
      category,
      rarity,
      weight: Math.max(0, parseFloat(weight.replace(',', '.')) || 0),
      quantity: Math.max(1, parseInt(quantity) || 1),
      note: note.trim(),
      attunement,
      weapon,
      armor,
      acBonus: category === 'shield' || category === 'ring' ? bonus || (category === 'shield' ? 2 : 0) : bonus || undefined,
    };

    onSave(editing ? ({ ...item!, ...base, itemId: undefined } as InventoryItem) : customInventoryItem(base));
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(4,6,10,.66)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="fv-panel animate-popIn fv-no-scrollbar"
        style={{ width: '100%', maxWidth: 600, maxHeight: '88vh', overflowY: 'auto', padding: 20, border: '1px solid var(--gold)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="anvil" size={20} color={t.gold} />
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
              {editing ? `Retrabalhar: ${item!.name}` : 'Forjar item único'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20 }}>✕</button>
        </div>

        {/* identidade do item */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 11 }}>
          <label style={{ gridColumn: '1 / -1' }}>
            <span style={label}>Nome</span>
            <input className="fv-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lâmina do Crepúsculo" style={{ fontFamily: "'Cinzel', serif" }} />
          </label>
          <label>
            <span style={label}>Categoria</span>
            <select className="fv-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id} style={{ color: '#111' }}>{c.label}</option>)}
            </select>
          </label>
          <label>
            <span style={label}>Raridade</span>
            <select className="fv-input" value={rarity} onChange={(e) => setRarity(e.target.value)}>
              {Object.entries(RARITY).map(([id, r]) => <option key={id} value={id} style={{ color: '#111' }}>{r.label}</option>)}
            </select>
          </label>
          <label>
            <span style={label}>Peso (kg)</span>
            <input className="fv-input" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            <span style={label}>Quantidade</span>
            <input className="fv-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" />
          </label>
        </div>

        {/* propriedades de arma */}
        {category === 'weapon' && (
          <fieldset style={fieldsetStyle(t)}>
            <legend style={legendStyle(t)}>Dano &amp; Combate</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 11 }}>
              <label>
                <span style={label}>Dados de dano</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="fv-input" value={dmgDice} onChange={(e) => setDmgDice(e.target.value)} inputMode="numeric" style={{ width: 54, textAlign: 'center' }} />
                  <span style={{ color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>d</span>
                  <select className="fv-input" value={dmgDie} onChange={(e) => setDmgDie(e.target.value)} style={{ flex: 1 }}>
                    {DICE.map((d) => <option key={d} value={d} style={{ color: '#111' }}>{d}</option>)}
                  </select>
                </div>
              </label>
              <label>
                <span style={label}>Tipo de dano</span>
                <select className="fv-input" value={dmgType} onChange={(e) => setDmgType(e.target.value as DamageType)}>
                  {DAMAGE_TYPES.map((d) => <option key={d} value={d} style={{ color: '#111' }}>{d}</option>)}
                </select>
              </label>
              <label>
                <span style={label}>Alcance</span>
                <select className="fv-input" value={wpnRange} onChange={(e) => setWpnRange(e.target.value as WeaponRange)}>
                  <option value="melee" style={{ color: '#111' }}>Corpo a corpo</option>
                  <option value="ranged" style={{ color: '#111' }}>À distância</option>
                </select>
              </label>
              <label>
                <span style={label}>Treinamento</span>
                <select className="fv-input" value={wpnType} onChange={(e) => setWpnType(e.target.value as WeaponType)}>
                  <option value="simple" style={{ color: '#111' }}>Simples</option>
                  <option value="martial" style={{ color: '#111' }}>Marcial</option>
                </select>
              </label>
              <label>
                <span style={label}>Versátil (dado)</span>
                <select className="fv-input" value={versatile} onChange={(e) => setVersatile(e.target.value)}>
                  <option value="" style={{ color: '#111' }}>Não</option>
                  {DICE.map((d) => <option key={d} value={d} style={{ color: '#111' }}>d{d}</option>)}
                </select>
              </label>
              <CheckRow checked={finesse} onChange={setFinesse} text="Acuidade (usa DES)" />
            </div>
            <label style={{ display: 'block', marginTop: 11 }}>
              <span style={label}>Propriedades (separadas por vírgula)</span>
              <input className="fv-input" value={properties} onChange={(e) => setProperties(e.target.value)} placeholder="Leve, Arremesso, Mágica +1…" />
            </label>
            <p style={{ margin: '9px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
              Inclua “Mágica +1” nas propriedades para somar +1 em acerto e dano.
            </p>
          </fieldset>
        )}

        {/* propriedades de armadura */}
        {category === 'armor' && (
          <fieldset style={fieldsetStyle(t)}>
            <legend style={legendStyle(t)}>Proteção</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 11 }}>
              <label>
                <span style={label}>CA base</span>
                <input className="fv-input" value={baseAC} onChange={(e) => setBaseAC(e.target.value)} inputMode="numeric" />
              </label>
              <label>
                <span style={label}>Categoria</span>
                <select className="fv-input" value={armorCat} onChange={(e) => setArmorCat(e.target.value as 'leve' | 'média' | 'pesada')}>
                  <option value="leve" style={{ color: '#111' }}>Leve</option>
                  <option value="média" style={{ color: '#111' }}>Média</option>
                  <option value="pesada" style={{ color: '#111' }}>Pesada</option>
                </select>
              </label>
              <label>
                <span style={label}>Teto de DES</span>
                <input className="fv-input" value={maxDex} onChange={(e) => setMaxDex(e.target.value)} inputMode="numeric" placeholder="—" disabled={!addDex} />
              </label>
              <CheckRow checked={addDex} onChange={setAddDex} text="Soma modificador de DES" />
            </div>
          </fieldset>
        )}

        {/* bônus e sintonia */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: 11, marginTop: 13 }}>
          {(category === 'shield' || category === 'ring' || category === 'wondrous') && (
            <label>
              <span style={label}>Bônus de CA</span>
              <input className="fv-input" value={acBonus} onChange={(e) => setAcBonus(e.target.value)} inputMode="numeric" />
            </label>
          )}
          <CheckRow checked={attunement} onChange={setAttunement} text="Exige sintonia" />
        </div>

        <label style={{ display: 'block', marginTop: 13 }}>
          <span style={label}>Descrição / efeito</span>
          <textarea className="fv-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que este item faz? História, efeito, condições…" style={{ resize: 'none' }} />
        </label>

        {error && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={save} className="fv-btn-gold" style={{ flex: 1, padding: 13, fontSize: 15 }}>
            {editing ? 'Salvar alterações' : 'Forjar item'}
          </button>
          <button
            onClick={onClose}
            style={{ cursor: 'pointer', padding: '13px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)', color: 'var(--muted)', fontWeight: 600, fontSize: 14 }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function fieldsetStyle(t: ReturnType<typeof useTheme>): React.CSSProperties {
  return {
    marginTop: 13,
    padding: '12px 13px 13px',
    border: '1px solid ' + hexA(t.gold, 0.3),
    borderRadius: 'var(--radius-md)',
    background: hexA(t.gold, 0.04),
  };
}

function legendStyle(t: ReturnType<typeof useTheme>): React.CSSProperties {
  return {
    padding: '0 8px',
    fontFamily: "'Cinzel', serif",
    fontSize: 12,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: t.gold,
  };
}

function CheckRow({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  const t = useTheme();
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        alignSelf: 'end',
        minHeight: 46,
        padding: '0 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid ' + (checked ? t.gold : t.line),
        background: checked ? hexA(t.gold, 0.1) : 'rgba(0,0,0,.24)',
        color: checked ? t.gold : 'var(--muted)',
        fontSize: 12.5,
        fontWeight: 600,
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          flex: 'none',
          transform: 'rotate(45deg)',
          border: '1px solid ' + (checked ? t.gold : t.line),
          background: checked ? t.gold : 'transparent',
        }}
      />
      {text}
    </button>
  );
}
