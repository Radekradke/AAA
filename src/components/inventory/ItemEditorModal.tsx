import { useState } from 'react';
import type { InventoryItem } from '@/types/character';
import type { DamageType, WeaponRange, WeaponType } from '@/types/dnd';
import { customInventoryItem } from '@/engine/inventory';
import { SPELLS } from '@/data/spells';
import { RARITY } from '@/data/themes';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { Modal } from '@/components/ui/Modal';

interface ItemEditorModalProps {
  /** Item existente para editar; ausente = forjar um novo. */
  item?: InventoryItem;
  onSave: (item: InventoryItem) => void;
  onClose: () => void;
  /** Categoria pré-selecionada ao abrir (ex.: "other" pela mochila). */
  initialCategory?: string;
}

const CATEGORIES = [
  { id: 'weapon', label: 'Arma' },
  { id: 'armor', label: 'Armadura' },
  { id: 'shield', label: 'Escudo' },
  { id: 'gear', label: 'Equipamento' },
  { id: 'tool', label: 'Ferramenta' },
  { id: 'consumable', label: 'Poção / Consumível' },
  { id: 'wondrous', label: 'Item Mágico' },
  { id: 'ring', label: 'Anel' },
  { id: 'treasure', label: 'Tesouro' },
  { id: 'other', label: 'Outros' },
];

const DAMAGE_TYPES: DamageType[] = ['cortante', 'perfurante', 'concussão', 'fogo', 'gelo', 'ácido', 'elétrico', 'radiante', 'necrótico', 'força', 'veneno', 'psíquico', 'trovejante'];
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
 * da mochila — armas com dano/tipo/propriedades/alcance e bônus mágico
 * +1/+2/+3 estruturado (refletido em ataque e dano automaticamente).
 */
export function ItemEditorModal({ item, onSave, onClose, initialCategory }: ItemEditorModalProps) {
  const t = useTheme();
  const editing = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? initialCategory ?? 'weapon');
  const [rarity, setRarity] = useState(item?.rarity ?? 'comum');
  const [weight, setWeight] = useState(String(item?.weight ?? 1));
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [value, setValue] = useState(String(item?.value ?? ''));
  const [note, setNote] = useState(item?.note ?? '');
  const [favorite, setFavorite] = useState(!!item?.favorite);
  const [attunement, setAttunement] = useState(!!item?.attunement);
  const [acBonus, setAcBonus] = useState(String(item?.acBonus ?? 0));
  // magia concedida pelo item (estilo BG3)
  const [grantSpell, setGrantSpell] = useState(item?.grantsSpells?.[0]?.spellId ?? '');
  const [grantRecharge, setGrantRecharge] = useState<'atwill' | 'short' | 'long'>(item?.grantsSpells?.[0]?.recharge ?? 'atwill');
  const [grantUses, setGrantUses] = useState(String(item?.grantsSpells?.[0]?.uses ?? 1));
  // arma
  const [dmgDice, setDmgDice] = useState(String(item?.weapon?.damageDice ?? 1));
  const [dmgDie, setDmgDie] = useState(String(item?.weapon?.damageDie ?? 8));
  const [dmgType, setDmgType] = useState<DamageType>(item?.weapon?.damageType ?? 'cortante');
  const [wpnType, setWpnType] = useState<WeaponType>(item?.weapon?.type ?? 'martial');
  const [wpnRange, setWpnRange] = useState<WeaponRange>(item?.weapon?.range ?? 'melee');
  const [rangeLabel, setRangeLabel] = useState(item?.weapon?.rangeLabel ?? '');
  const [magicBonus, setMagicBonus] = useState(String(item?.weapon?.magicBonus ?? 0));
  const [finesse, setFinesse] = useState(!!item?.weapon?.finesse);
  const [versatile, setVersatile] = useState(String(item?.weapon?.versatileDie ?? ''));
  // dano extra de outro tipo (ex.: +2d6 fogo)
  const [bonusDmgDice, setBonusDmgDice] = useState(String(item?.weapon?.bonusDamage?.dice ?? 0));
  const [bonusDmgDie, setBonusDmgDie] = useState(String(item?.weapon?.bonusDamage?.die ?? 6));
  const [bonusDmgType, setBonusDmgType] = useState<DamageType>(item?.weapon?.bonusDamage?.type ?? 'fogo');
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
    const magic = Math.max(0, Math.min(3, parseInt(magicBonus) || 0));
    const weapon =
      category === 'weapon'
        ? {
            damageDice: Math.max(1, parseInt(dmgDice) || 1),
            damageDie: parseInt(dmgDie) || 8,
            damageType: dmgType,
            type: wpnType,
            range: wpnRange,
            rangeLabel: wpnRange === 'ranged' ? rangeLabel.trim() || undefined : undefined,
            properties: parsedProps,
            magicBonus: magic || undefined,
            finesse,
            versatileDie: versatile ? parseInt(versatile) || undefined : undefined,
            bonusDamage:
              (parseInt(bonusDmgDice) || 0) > 0
                ? { dice: parseInt(bonusDmgDice), die: parseInt(bonusDmgDie) || 6, type: bonusDmgType }
                : undefined,
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
    const grantsSpells = grantSpell
      ? [{ spellId: grantSpell, recharge: grantRecharge, uses: grantRecharge === 'atwill' ? undefined : Math.max(1, parseInt(grantUses) || 1) }]
      : undefined;

    const base = {
      name: name.trim(),
      category,
      rarity,
      weight: Math.max(0, parseFloat(weight.replace(',', '.')) || 0),
      quantity: Math.max(1, parseInt(quantity) || 1),
      value: value.trim() ? Math.max(0, parseFloat(value.replace(',', '.')) || 0) : undefined,
      note: note.trim(),
      favorite,
      attunement,
      weapon,
      armor,
      grantsSpells,
      acBonus: category === 'shield' || category === 'ring' ? bonus || (category === 'shield' ? 2 : 0) : bonus || undefined,
    };

    onSave(editing ? ({ ...item!, ...base, itemId: undefined, homebrew: true } as InventoryItem) : customInventoryItem(base));
    onClose();
  };

  return (
    <Modal
      title={editing ? `Retrabalhar: ${item!.name}` : 'Forjar item único'}
      icon="anvil"
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <button onClick={save} className="fv-btn-gold" style={{ flex: 1, minHeight: 46, fontSize: 15 }}>
            {editing ? 'Salvar alterações' : 'Forjar item'}
          </button>
          <button
            onClick={onClose}
            style={{ cursor: 'pointer', minHeight: 46, padding: '0 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'rgba(0,0,0,.26)', color: 'var(--muted)', fontWeight: 600, fontSize: 14 }}
          >
            Cancelar
          </button>
        </>
      }
    >
      {/* identidade do item */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 11 }}>
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
        <label>
          <span style={label}>Valor (po)</span>
          <input className="fv-input" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="—" />
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
              <span style={label}>Bônus mágico</span>
              <select className="fv-input" value={magicBonus} onChange={(e) => setMagicBonus(e.target.value)}>
                <option value="0" style={{ color: '#111' }}>Comum (sem bônus)</option>
                <option value="1" style={{ color: '#111' }}>+1 (acerto e dano)</option>
                <option value="2" style={{ color: '#111' }}>+2 (acerto e dano)</option>
                <option value="3" style={{ color: '#111' }}>+3 (acerto e dano)</option>
              </select>
            </label>
            <label>
              <span style={label}>Alcance</span>
              <select className="fv-input" value={wpnRange} onChange={(e) => setWpnRange(e.target.value as WeaponRange)}>
                <option value="melee" style={{ color: '#111' }}>Corpo a corpo</option>
                <option value="ranged" style={{ color: '#111' }}>À distância</option>
              </select>
            </label>
            {wpnRange === 'ranged' && (
              <label>
                <span style={label}>Distância (m)</span>
                <input className="fv-input" value={rangeLabel} onChange={(e) => setRangeLabel(e.target.value)} placeholder="45/180 m" />
              </label>
            )}
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

          {/* Dano extra de outro tipo (ex.: +2d6 fogo) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 11, marginTop: 11 }}>
            <label>
              <span style={label}>Dano extra (dados)</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="fv-input" value={bonusDmgDice} onChange={(e) => setBonusDmgDice(e.target.value)} inputMode="numeric" style={{ width: 54, textAlign: 'center' }} title="0 = sem dano extra" />
                <span style={{ color: 'var(--muted)', fontFamily: "'Chakra Petch', monospace" }}>d</span>
                <select className="fv-input" value={bonusDmgDie} onChange={(e) => setBonusDmgDie(e.target.value)} style={{ flex: 1 }} disabled={(parseInt(bonusDmgDice) || 0) <= 0}>
                  {DICE.map((d) => <option key={d} value={d} style={{ color: '#111' }}>{d}</option>)}
                </select>
              </div>
            </label>
            <label>
              <span style={label}>Tipo do dano extra</span>
              <select className="fv-input" value={bonusDmgType} onChange={(e) => setBonusDmgType(e.target.value as DamageType)} disabled={(parseInt(bonusDmgDice) || 0) <= 0}>
                {DAMAGE_TYPES.map((d) => <option key={d} value={d} style={{ color: '#111' }}>{d}</option>)}
              </select>
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 11 }}>
            <span style={label}>Propriedades (separadas por vírgula)</span>
            <input className="fv-input" value={properties} onChange={(e) => setProperties(e.target.value)} placeholder="Leve, Arremesso, Pesada…" />
          </label>
          <p style={{ margin: '9px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
            O bônus mágico soma no acerto e no dano. O <b style={{ color: 'var(--ink)' }}>dano extra</b> (ex.: 2d6 fogo) é rolado junto, num tipo separado, e dobra os dados no crítico. Deixe os dados em 0 para não ter dano extra.
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

      {/* magia concedida (estilo BG3) */}
      <fieldset style={fieldsetStyle(t)}>
        <legend style={legendStyle(t)}>Magia concedida (opcional)</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 11 }}>
          <label style={{ gridColumn: '1 / -1' }}>
            <span style={label}>Magia</span>
            <select className="fv-input" value={grantSpell} onChange={(e) => setGrantSpell(e.target.value)}>
              <option value="" style={{ color: '#111' }}>— nenhuma —</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lv) => {
                const opts = SPELLS.filter((s) => s.level === lv);
                if (!opts.length) return null;
                return (
                  <optgroup key={lv} label={lv === 0 ? 'Truques' : `${lv}º círculo`}>
                    {opts.map((s) => <option key={s.id} value={s.id} style={{ color: '#111' }}>{s.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </label>
          {grantSpell && (
            <>
              <label>
                <span style={label}>Recarga</span>
                <select className="fv-input" value={grantRecharge} onChange={(e) => setGrantRecharge(e.target.value as 'atwill' | 'short' | 'long')}>
                  <option value="atwill" style={{ color: '#111' }}>À vontade (como truque)</option>
                  <option value="short" style={{ color: '#111' }}>1×/descanso curto</option>
                  <option value="long" style={{ color: '#111' }}>1×/descanso longo</option>
                </select>
              </label>
              {grantRecharge !== 'atwill' && (
                <label>
                  <span style={label}>Usos por descanso</span>
                  <input className="fv-input" value={grantUses} onChange={(e) => setGrantUses(e.target.value)} inputMode="numeric" />
                </label>
              )}
            </>
          )}
        </div>
        <p style={{ margin: '9px 0 0', fontSize: 11.5, color: 'var(--muted)' }}>
          Ex.: um bastão que concede <b style={{ color: 'var(--ink)' }}>Criar Água</b> à vontade, ou um arco com <b style={{ color: 'var(--ink)' }}>Raio de Gelo</b> 1×/descanso curto. A magia só vale com o item equipado ou sintonizado.
        </p>
      </fieldset>

      {/* bônus, sintonia e destaque */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 11, marginTop: 13 }}>
        {(category === 'shield' || category === 'ring' || category === 'wondrous') && (
          <label>
            <span style={label}>Bônus de CA</span>
            <input className="fv-input" value={acBonus} onChange={(e) => setAcBonus(e.target.value)} inputMode="numeric" />
          </label>
        )}
        <CheckRow checked={attunement} onChange={setAttunement} text="Exige sintonia" />
        <CheckRow checked={favorite} onChange={setFavorite} text="Favorito / importante" />
      </div>

      <label style={{ display: 'block', marginTop: 13 }}>
        <span style={label}>Descrição / efeito / observações</span>
        <textarea className="fv-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que este item faz? História, efeito, condições de uso…" style={{ resize: 'none' }} />
      </label>

      {error && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>{error}</div>}
    </Modal>
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
