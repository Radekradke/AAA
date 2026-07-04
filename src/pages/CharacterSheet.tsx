import { useMemo, useState } from 'react';
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
import { TabDiario } from '@/components/sheet/TabDiario';
import { DiceRoller } from '@/components/dice/DiceRoller';
import { TabMesa } from '@/components/sheet/TabMesa';
import { TabEvoluir } from '@/components/sheet/TabEvoluir';
import { CharacterEditModal } from '@/components/character/CharacterEditModal';
import { RollModeToggle } from '@/components/dice/RollModeToggle';

export function CharacterSheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const characters = useCharacterStore((s) => s.characters);
  const exportCharacter = useCharacterStore((s) => s.exportCharacter);

  const char = useMemo(() => characters.find((c) => c.id === id), [characters, id]);
  const [tab, setTab] = useState('mesa');
  const [editing, setEditing] = useState(false);

  const derived = useMemo(() => (char ? deriveCharacter(char) : null), [char]);

  if (!char || !derived) {
    return (
      <Screen actions={<Button onClick={() => navigate('/personagens')}>Voltar</Button>}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: 'var(--ink)' }}>Personagem não encontrado</div>
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
  const isCaster = derived.isCaster;
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
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'mesa': return <TabMesa char={char} derived={derived} />;
      case 'evoluir': return <TabEvoluir char={char} derived={derived} />;
      case 'combate': return <TabCombate char={char} derived={derived} />;
      case 'inventario': return <TabInventario char={char} derived={derived} />;
      case 'magias': return <TabMagias char={char} derived={derived} />;
      case 'descanso': return <TabDescanso char={char} derived={derived} />;
      case 'diario': return <TabDiario char={char} derived={derived} />;
      case 'dados': return <DiceRoller />;
      default: return <TabFicha char={char} derived={derived} />;
    }
  };

  return (
    <Screen
      scroll
      actions={
        <>
          <RollModeToggle />
          <Button variant="accent" onClick={() => setEditing(true)} style={{ fontSize: 12.5 }}>Editar</Button>
          <Button onClick={exportJson} style={{ fontSize: 12.5 }}>Exportar</Button>
          <Button onClick={() => navigate('/personagens')} style={{ fontSize: 12.5 }}>Heróis</Button>
        </>
      }
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: 'clamp(70px,9vh,92px) clamp(14px,3.6vw,40px) calc(86px + env(safe-area-inset-bottom))',
        }}
      >
        <SheetHeader char={char} derived={derived} />

        <div className="fv-desktop-only">
          <SheetTabs active={activeTab} onSelect={setTab} isCaster={isCaster} />
        </div>
        <div style={{ height: 'clamp(16px,2.2vw,22px)' }} className="fv-mobile-only" />

        {renderTab()}
      </div>

      <MobileNav active={activeTab} onSelect={setTab} isCaster={isCaster} />

      {editing && <CharacterEditModal char={char} onClose={() => setEditing(false)} />}
    </Screen>
  );
}
