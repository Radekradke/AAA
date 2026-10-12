import { useState } from 'react';
import type { Character } from '@/types/character';
import { previewRest, type RestKind } from '@/engine/rest';
import { useCharacterStore } from '@/store/characterStore';
import { Modal } from '@/components/ui/Modal';

export function useRestPreview() {
  return useState<RestKind | null>(null);
}
export function RestPreview({ char, kind, onClose }: { char: Character; kind: RestKind; onClose: () => void }) {
  const preview = previewRest(char, kind);
  return <Modal title={`Prévia · descanso ${kind === 'short' ? 'curto' : 'longo'}`} onClose={onClose} footer={<>
    <button type="button" className="fv-btn-ghost" onClick={onClose}>Cancelar</button>
    <button type="button" className="fv-btn-gold" disabled={preview.blocked} onClick={() => {
      const store = useCharacterStore.getState();
      if (kind === 'short') store.shortRest(char.id); else store.longRest(char.id);
      onClose();
    }}>Confirmar descanso</button>
  </>}>
    <div className="fv-experience">
      <p>{kind === 'short' ? '1 hora. A cura depende dos Dados de Vida que você decidir gastar; nenhum dado será gasto automaticamente.' : '8 horas. Confirme a duração e as condições do descanso com o mestre.'}</p>
      {preview.blocked && <p role="alert">Exige ao menos 1 PV, menos de três falhas contra a morte e menos de seis níveis de exaustão.</p>}
      {preview.changes.length > 0 ? <table className="fv-experience-table"><thead><tr><th>Recurso</th><th>Agora</th><th>Depois</th></tr></thead><tbody>{preview.changes.map((c) => <tr key={c.label}><th>{c.label}</th><td>{c.before}</td><td>{c.after}</td></tr>)}</tbody></table> : <p>Nenhum saldo de PV, espaços, recursos ou Dados de Vida muda.</p>}
      {preview.removed.length > 0 && <p><b>Serão encerrados/removidos nesta ficha:</b> {preview.removed.join(' · ')}. Condições persistentes devem ser conferidas com o mestre.</p>}
      {preview.spellUses > 0 && <p>{preview.spellUses} uso(s) de magia de item ou talento serão recuperados.</p>}
      {kind === 'long' && <p>Também reinicia ações, movimento e testes contra a morte; encerra Forma Selvagem, limpa Portento e Sobrecarga e recupera o companheiro.</p>}
      {preview.charges.length > 0 && <><b>Cargas ao amanhecer · rolagem só ao confirmar</b><ul>{preview.charges.map((c) => <li key={c}>{c}</li>)}</ul></>}
    </div>
  </Modal>;
}
