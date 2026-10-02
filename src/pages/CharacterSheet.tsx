import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from '@/store/feedbackStore';
import { itemGrantedSpells } from '@/engine/spellcasting';
import { useNavigate, useParams } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useCharacterStore } from '@/store/characterStore';
import { deriveCharacter } from '@/engine/dndRules';
import { SheetHeader } from '@/components/sheet/SheetHeader';
import { SheetTabs } from '@/components/sheet/SheetTabs';
import { MobileNav } from '@/components/sheet/MobileNav';
import { TabFicha } from '@/components/sheet/TabFicha';
import { TabCombate } from '@/components/sheet/TabCombate';
import { TabInventario } from '@/components/sheet/TabInventario';
import { TabMagias } from '@/components/sheet/TabMagias';
import { TabDescanso } from '@/components/sheet/TabDescanso';
import { DiceRoller } from '@/components/dice/DiceRoller';
import { TabMesa } from '@/components/sheet/TabMesa';
import { TabEvoluir } from '@/components/sheet/TabEvoluir';
import { CharacterEditModal } from '@/components/character/CharacterEditModal';
import { RollModeToggle } from '@/components/dice/RollModeToggle';
import { useUiStore } from '@/store/uiStore';
import { loadDice3d } from '@/lib/dice3d';

// diário puxa handouts/NPCs da mesa (código e estilos do palco): só quando a aba abre
const SheetHistoryModal = lazy(() => import('@/components/sheet/SheetHistoryModal').then((m) => ({ default: m.SheetHistoryModal })));
const ShareSheetModal = lazy(() => import('@/components/sheet/ShareSheetModal').then((m) => ({ default: m.ShareSheetModal })));
const TabDiario = lazy(() => import('@/components/sheet/TabDiario').then((m) => ({ default: m.TabDiario })));

export function CharacterSheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const characters = useCharacterStore((s) => s.characters);
  const exportCharacter = useCharacterStore((s) => s.exportCharacter);

  const char = useMemo(() => characters.find((c) => c.id === id), [characters, id]);
  const [tab, setTab] = useState('mesa');
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [history, setHistory] = useState(false);

  const derived = useMemo(() => (char ? deriveCharacter(char) : null), [char]);

  // dados 3D: pré-carrega em segundo plano (a 1ª rolagem já sai em 3D)
  const dice3d = useUiStore((s) => s.dice3d);
  useEffect(() => {
    if (!dice3d) return;
    const warm = () => void loadDice3d(useUiStore.getState().theme);
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm);
      return () => w.cancelIdleCallback?.(id);
    }
    const id = setTimeout(warm, 1200);
    return () => clearTimeout(id);
  }, [dice3d]);

  // toda rolagem feita com esta ficha aberta entra no histórico dela
  const setActiveChar = useUiStore((s) => s.setActiveChar);
  useEffect(() => {
    setActiveChar(id ?? null);
    return () => setActiveChar(null);
  }, [id, setActiveChar]);

  // 1ª ficha aberta neste aparelho: o tour guiado mostra onde fica cada coisa
  const startTour = useUiStore((s) => s.startTour);
  const sheetTourSeen = useUiStore((s) => !!s.toursSeen.sheet);
  const hasChar = !!char;
  useEffect(() => {
    if (!hasChar || sheetTourSeen) return;
    const t = setTimeout(() => {
      const ui = useUiStore.getState();
      if (!ui.tour && !ui.tutorialOpen) startTour('sheet');
    }, 1300);
    return () => clearTimeout(t);
  }, [hasChar, sheetTourSeen, startTour]);

  if (!char || !derived) {
    return (
      <Screen actions={<Button onClick={() => navigate('/personagens')}>Voltar</Button>}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)' }}>Personagem não encontrado</div>
            <p style={{ color: 'var(--muted)' }}>Talvez ele tenha sido removido. Volte para a seleção de heróis.</p>
            <Button variant="gold" onClick={() => navigate('/personagens')} style={{ marginTop: 8 }}>
              Voltar aos heróis
            </Button>
          </div>
        </div>
      </Screen>
    );
  }

  // o conjurador define se a aba Magias aparece
  // a aba Magias aparece para conjuradores e para quem tem magias de itens ou talentos
  const isCaster = derived.isCaster || itemGrantedSpells(char).length > 0;
  const activeTab = tab === 'magias' && !isCaster ? 'ficha' : tab;

  const exportJson = () => {
    const json = exportCharacter(char.id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${char.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Ficha exportada como arquivo JSON.');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'mesa': return <TabMesa char={char} derived={derived} />;
      case 'evoluir': return <TabEvoluir char={char} derived={derived} />;
      case 'combate': return <TabCombate char={char} derived={derived} />;
      case 'inventario': return <TabInventario char={char} derived={derived} />;
      case 'magias': return <TabMagias char={char} derived={derived} />;
      case 'descanso': return <TabDescanso char={char} derived={derived} />;
      case 'diario': return <Suspense fallback={null}><TabDiario char={char} derived={derived} /></Suspense>;
      case 'dados': return <DiceRoller char={char} />;
      default: return <TabFicha char={char} derived={derived} />;
    }
  };

  return (
    <Screen
      scroll
      actions={
        <>
          <RollModeToggle />
          <Button variant="accent" className="fv-hide-mobile" onClick={() => setEditing(true)} style={{ fontSize: 12.5 }}>Editar</Button>
          <Button className="fv-hide-mobile" onClick={() => navigate('/personagens')} style={{ fontSize: 12.5 }}>Heróis</Button>
        </>
      }
      menu={[
        { label: 'Editar personagem', icon: 'edit', onClick: () => setEditing(true), mobileOnly: true },
        { label: 'Voltar aos heróis', icon: 'banner', onClick: () => navigate('/personagens'), mobileOnly: true },
        { label: 'Imprimir / salvar PDF', icon: 'book', onClick: () => navigate(`/ficha/${char.id}/imprimir`) },
        { label: 'Compartilhar por link', icon: 'banner', onClick: () => setSharing(true) },
        { label: 'Histórico e versões', icon: 'book', onClick: () => setHistory(true) },
        { label: 'Exportar ficha (JSON)', icon: 'quill', onClick: exportJson },
        {
          label: 'Tour pela ficha',
          icon: 'spark',
          onClick: () => {
            setTab('mesa');
            setTimeout(() => startTour('sheet'), 250);
          },
        },
      ]}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: 'clamp(70px,9vh,92px) clamp(14px,3.6vw,40px) calc(86px + env(safe-area-inset-bottom))',
        }}
      >
        {/* na Mesa, o painel de vitais já traz CA/iniciativa/etc. — o cabeçalho fica só com a identidade */}
        <SheetHeader char={char} derived={derived} compact={activeTab === 'mesa'} />

        <div className="fv-desktop-only">
          <SheetTabs active={activeTab} onSelect={setTab} isCaster={isCaster} />
        </div>
        <div style={{ height: 'clamp(16px,2.2vw,22px)' }} className="fv-mobile-only" />

        {renderTab()}
      </div>

      <MobileNav active={activeTab} onSelect={setTab} isCaster={isCaster} />

      {editing && <CharacterEditModal char={char} onClose={() => setEditing(false)} />}
      {sharing && (
        <Suspense fallback={null}>
          <ShareSheetModal char={char} onClose={() => setSharing(false)} />
        </Suspense>
      )}
      {history && (
        <Suspense fallback={null}>
          <SheetHistoryModal char={char} onClose={() => setHistory(false)} />
        </Suspense>
      )}
    </Screen>
  );
}
