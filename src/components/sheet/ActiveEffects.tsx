import { useState } from 'react';
import type { ActiveSpellEffect, Character } from '@/types/character';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { castDiceLabel, rollCastDice } from '@/components/spells/castRoll';
import { getSpell } from '@/data/spells';
import { confirmAction, toast } from '@/store/feedbackStore';
import { effectState, effectUndoGuard, undoEffectRemoval } from '@/engine/effectUndo';
import { Modal } from '@/components/ui/Modal';
import { barbarianState } from '@/engine/barbarian';
import { characterResources } from '@/engine/classResources';

const UNTIL = { turn: 'Início do próximo turno', concentration: 'Romper a concentração, ficar incapacitado ou entrar em Fúria', rest: 'Remoção manual ou descanso longo' };
const MARKS: Record<string, { label: string; end: string }> = {
  hex: { label: 'Bruxaria · +1d6 necrótico', end: 'Fim da concentração ou do tempo da magia' },
  huntersMark: { label: 'Marca do Caçador · +1d6', end: 'Fim da concentração ou do tempo da magia' },
  rage: { label: 'Fúria · dano e resistências conforme sua classe', end: '1 minuto, fim manual, inconsciência ou turno sem atacar/sofrer dano (antes de Fúria Persistente)' },
  frenzy: { label: 'Frenesi · ataque bônus; +1 exaustão ao fim', end: 'Fim da Fúria; o custo de exaustão será aplicado' },
  reckless: { label: 'Imprudente · vantagem em FOR; inimigos com vantagem', end: 'Próximo turno' },
  assassinate: { label: 'Assassinar · vantagem contra quem não agiu', end: 'Próximo turno' },
  dodge: { label: 'Esquiva · desvantagem contra você e vantagem em DES', end: 'Próximo turno; confira se ainda pode se mover' },
  sacredWeapon: { label: 'Arma Sagrada · CAR no acerto da arma escolhida', end: '1 minuto, largar a arma ou ficar inconsciente' },
  vow: { label: 'Voto de Inimizade · vantagem contra o alvo jurado', end: '1 minuto, alvo a 0 PV ou inconsciente' },
  camouflage: { label: 'Camuflagem · bônus de Furtividade parado', end: 'Movimento, ação ou reação' },
  draconicWard: { label: 'Proteção dracônica · resistência escolhida', end: '1 hora' },
  arcaneWard: { label: 'Proteção Arcana · absorção no painel de Mago', end: 'Confira os PV da proteção; encerra no descanso longo' },
  overchannel: { label: 'Sobrecarga · maximiza o dano permitido', end: 'Depois da magia afetada; usos reiniciam no descanso longo' },
};

export function ActiveEffects({ char }: { char: Character }) {
  const store = useCharacterStore();
  const pushRoll = useUiStore((s) => s.pushRoll);
  const [editing, setEditing] = useState<ActiveSpellEffect | null>(null);
  const effects = char.combat.spellEffects ?? [];
  const marks = char.combat.marks ?? [];
  const rage = barbarianState(char);
  const ward = characterResources(char).find((r) => r.id === 'arcaneWard');
  const remove = async (name: string, explanation: string, action: () => void) => {
    if (!await confirmAction({ title: `Encerrar ${name}?`, message: explanation, confirmLabel: 'Encerrar efeito' })) return;
    const live = store.getCharacter(char.id);
    if (!live) return;
    const before = effectState(live);
    action();
    const after = store.getCharacter(char.id);
    if (!after) return;
    const guard = effectUndoGuard(after);
    toast(`${name} encerrado.`, { action: { label: 'Desfazer', run: () => {
      const current = store.getCharacter(char.id);
      if (!current || effectUndoGuard(current) !== guard) { toast('A ficha mudou depois da remoção. Confira o efeito antes de reaplicá-lo.', { tone: 'info' }); return; }
      store.updateCharacter(char.id, (c) => { undoEffectRemoval(c, before, guard); });
    } } });
  };
  const newAdjustment = () => setEditing({ spellId: `manual:${crypto.randomUUID()}`, name: '', label: '', until: 'rest', kind: 'manual', appliedBy: '', endsWhen: '' });
  const renderEffect = (e: ActiveSpellEffect) => <article className="fv-effect-card" key={e.spellId}>
    <b>{e.name}</b><p>{e.label || 'Efeito registrado sem bônus numérico.'}</p>{e.kind === 'manual' && <p>Bônus aplicados: CA {e.ac ?? 0} · deslocamento {e.speed ?? 0} m.</p>}
    <small>Aplicado por: {e.appliedBy || 'não informado'} · Origem: {e.kind === 'manual' ? 'ajuste do mestre' : 'magia'}</small>
    <small>Duração: {e.duration || getSpell(e.spellId)?.duration || 'conforme o registro'}</small>
    <small>Encerra: {e.endsWhen || UNTIL[e.until]}. Durações em minutos/horas precisam ser conferidas na sessão.</small>
    <div className="fv-experience-actions">
      {e.roll && <button type="button" className="fv-btn-ghost" title={e.roll.when} onClick={() => { const r = rollCastDice(e.roll!); if (r) pushRoll(r); }}>Rolar {castDiceLabel(e.roll)}</button>}
      <button type="button" className="fv-link-btn" onClick={() => setEditing(structuredClone(e))}>Detalhes</button>
      <button type="button" className="fv-link-btn" onClick={() => remove(e.name, e.until === 'concentration' ? 'Encerra sua concentração e todos os efeitos que dependem dela. Não devolve espaços ou recursos.' : 'Remove os bônus deste efeito. PV acima do novo máximo podem ser reduzidos. Não devolve espaços ou recursos.', () => e.until === 'concentration' ? store.endConcentrationEffects(char.id) : store.removeSpellEffect(char.id, e.spellId))}>Encerrar</button>
    </div>
  </article>;
  const concMarks: NonNullable<Character['combat']['marks']> = marks.filter((m) => m === 'hex' || m === 'huntersMark');
  const renderMark = (m: NonNullable<Character['combat']['marks']>[number]) => <article className="fv-effect-card" key={m}><b>{MARKS[m]?.label ?? m}</b>{m === 'rage' && rage && <p>+{rage.bonus} dano nos ataques corpo a corpo com FOR · resistência: {rage.resistance}.</p>}{m === 'arcaneWard' && ward && <p>Proteção: {char.combat.resources.arcaneWard ?? ward.max}/{ward.max} PV.</p>}<small>Aplicado por: {char.name || 'este herói'} · Origem: habilidade/marca de classe</small><small>Duração e término: {MARKS[m]?.end ?? 'manual'}</small><small>Encerra: {MARKS[m]?.end ?? 'remoção manual'}</small><button type="button" className="fv-link-btn" onClick={() => remove(MARKS[m]?.label ?? m, m === 'frenzy' || m === 'rage' ? 'Encerra a Fúria e o Frenesi. Frenesi cobra um nível de exaustão; recursos gastos não voltam.' : concMarks.includes(m) ? 'Encerra a concentração e todos os efeitos associados a ela.' : 'Remove a marca e seus benefícios. Recursos gastos não voltam.', () => concMarks.includes(m) ? store.endConcentrationEffects(char.id) : m === 'rage' || m === 'frenzy' ? store.endRage(char.id) : store.setMark(char.id, m, false))}>Encerrar</button></article>;
  return <section className="fv-experience fv-effects-summary" aria-label="Efeitos ativos">
    <div className="fv-experience-actions"><b>Efeitos ativos</b><button type="button" className="fv-link-btn" onClick={newAdjustment}>+ Ajuste do mestre</button></div>
    {!effects.length && !marks.length && !char.combat.concentration && <small>Nenhum efeito registrado.</small>}
    {(char.combat.concentration || concMarks.length > 0 || effects.some((e) => e.until === 'concentration')) && <div><h4>Concentração</h4>{effects.filter((e) => e.until === 'concentration').map(renderEffect)}{concMarks.map(renderMark)}{!concMarks.length && !effects.some((e) => e.until === 'concentration') && <p>Concentração ativa, magia não registrada. <button className="fv-link-btn" type="button" onClick={() => remove('concentração', 'Encerra sua concentração e suas dependências.', () => store.endConcentrationEffects(char.id))}>Encerrar</button></p>}</div>}
    {(['Duração', 'Marcas de classe', 'Ajustes do mestre'] as const).map((group) => {
      const list = group === 'Marcas de classe' ? marks.filter((m) => !concMarks.includes(m)).map(renderMark) : effects.filter((e) => e.until !== 'concentration' && (group === 'Ajustes do mestre' ? e.kind === 'manual' : e.kind !== 'manual')).map(renderEffect);
      return list.length > 0 && <div key={group}><h4>{group}</h4>{list}</div>;
    })}
    {editing && <Modal title="Detalhes do efeito" onClose={() => setEditing(null)} footer={<button className="fv-btn-gold" type="button" disabled={!editing.name.trim()} onClick={() => {
      if (editing.kind === 'manual' && !effects.some((e) => e.spellId === editing.spellId)) store.applySpellEffect(char.id, editing);
      else store.updateCharacter(char.id, (c) => { const e = c.combat.spellEffects?.find((x) => x.spellId === editing.spellId); if (e) Object.assign(e, { appliedBy: editing.appliedBy, duration: editing.duration, endsWhen: editing.endsWhen }); });
      setEditing(null);
    }}>Salvar efeito</button>}><div className="fv-experience">
      {([['name', 'Nome'], ['label', 'Benefício / descrição'], ['appliedBy', 'Quem aplicou'], ['duration', 'Duração'], ['endsWhen', 'O que encerra']] as const).map(([key, label]) => <label className="fv-field" key={key}>{label}<input className="fv-input" maxLength={300} disabled={(key === 'name' || key === 'label') && effects.some((e) => e.spellId === editing.spellId)} value={editing[key] ?? ''} onChange={(ev) => setEditing({ ...editing, [key]: ev.target.value })} /></label>)}
      {editing.kind === 'manual' && !effects.some((e) => e.spellId === editing.spellId) && <><label className="fv-field">Encerramento automático na ficha<select className="fv-input" value={editing.until} onChange={(e) => setEditing({ ...editing, until: e.target.value as 'rest' | 'turn' })}><option value="rest">Descanso longo</option><option value="turn">Próximo turno</option></select></label>{(['ac', 'speed'] as const).map((k) => <label className="fv-field" key={k}>{k === 'ac' ? 'Ajuste de CA' : 'Ajuste de deslocamento (m)'}<input className="fv-input" type="number" min={-30} max={30} step={0.5} value={editing[k] ?? 0} onChange={(ev) => setEditing({ ...editing, [k]: Math.max(-30, Math.min(30, Number(ev.target.value) || 0)) })} /></label>)}<p>Somente CA e deslocamento são somados automaticamente; outros benefícios ficam como lembrete.</p></>}
    </div></Modal>}
  </section>;
}
