import { useEffect } from 'react';
import { useMasterStore } from '../masterStore';
import type { QuickKind } from '../masterStore';
import { QuickCreature, QuickEncounter, QuickHandout, QuickItem, QuickNote, QuickNpc } from './QuickForms';

const QUICK: { kind: QuickKind; label: string; key: string }[] = [
  { kind: 'npc', label: 'NPC', key: 'n' },
  { kind: 'criatura', label: 'Criatura', key: 'c' },
  { kind: 'pista', label: 'Pista', key: 'p' },
  { kind: 'item', label: 'Item', key: 'i' },
  { kind: 'encontro', label: 'Encontro', key: 'e' },
  { kind: 'nota', label: 'Nota', key: 'o' },
];

const TITLE: Record<QuickKind, string> = {
  npc: 'NPC rápido',
  criatura: 'Criatura rápida',
  pista: 'Pista rápida',
  item: 'Dar item',
  encontro: 'Novo encontro',
  nota: 'Nota privada',
};

/**
 * BARRA DE IMPROVISO: sempre à mão. Cada botão abre um cartão pequeno logo
 * acima (não um modal enorme). Atalho: Alt + letra (N, C, P, I, E, O); Esc fecha.
 */
export function MasterQuickBar() {
  const quick = useMasterStore((m) => m.quick);
  const open = useMasterStore((m) => m.openQuick);
  const drawer = useMasterStore((m) => m.drawer);
  const setDrawer = useMasterStore((m) => m.setDrawer);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useMasterStore.getState().quick) return open(null);
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const q = QUICK.find((x) => x.key === e.key.toLowerCase());
      if (q) {
        e.preventDefault();
        open(useMasterStore.getState().quick === q.kind ? null : q.kind);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => open(null);
  return (
    <div className="fv-quickbar" role="toolbar" aria-label="Improviso">
      {quick && (
        <div className="fv-quick-card fv-panel" role="dialog" aria-label={TITLE[quick]}>
          <div className="fv-quick-head">
            <b>{TITLE[quick]}</b>
            <button type="button" className="fv-bs-x" aria-label="Fechar" onClick={close}>
              ×
            </button>
          </div>
          {quick === 'npc' && <QuickNpc onDone={close} />}
          {quick === 'criatura' && <QuickCreature onDone={close} />}
          {quick === 'pista' && <QuickHandout onDone={close} />}
          {quick === 'item' && <QuickItem onDone={close} />}
          {quick === 'encontro' && <QuickEncounter onDone={close} />}
          {quick === 'nota' && <QuickNote onDone={close} />}
        </div>
      )}
      {/* celular/tablet: bastidores e inspetor viram gavetas */}
      <button type="button" className={'fv-quickbar-drawer' + (drawer === 'backstage' ? ' is-on' : '')} onClick={() => setDrawer(drawer === 'backstage' ? null : 'backstage')} aria-expanded={drawer === 'backstage'}>
        ☰ Bastidores
      </button>
      <div className="fv-quickbar-btns">
        {QUICK.map((q) => (
          <button
            key={q.kind}
            type="button"
            className={quick === q.kind ? 'is-on' : ''}
            aria-expanded={quick === q.kind}
            title={`${TITLE[q.kind]} (Alt+${q.key.toUpperCase()})`}
            onClick={() => open(quick === q.kind ? null : q.kind)}
          >
            <span aria-hidden>+</span> {q.label}
          </button>
        ))}
      </div>
      <button type="button" className={'fv-quickbar-drawer' + (drawer === 'inspector' ? ' is-on' : '')} onClick={() => setDrawer(drawer === 'inspector' ? null : 'inspector')} aria-expanded={drawer === 'inspector'}>
        ◧ Inspetor
      </button>
    </div>
  );
}
