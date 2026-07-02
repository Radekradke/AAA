import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import type { Character } from '@/types/character';
import { StepIdentity } from '@/components/character/StepIdentity';
import { StepRace } from '@/components/character/StepRace';
import { StepClass } from '@/components/character/StepClass';
import { StepAbilities } from '@/components/character/StepAbilities';
import { StepSkills } from '@/components/character/StepSkills';
import { StepGear } from '@/components/character/StepGear';
import { StepReview } from '@/components/character/StepReview';
import { defaultSelection, applySelection } from '@/engine/loadout';
import { playLevel } from '@/lib/sfx';
import { RaceAura } from '@/components/animations/RaceAura';
import { getRace } from '@/data/races';
import { getClass } from '@/data/classes';

const STEP_LABELS = ['Identidade', 'Origem', 'Caminho', 'Atributos', 'Perícias', 'Equipamento', 'Despertar'];
const GEAR_STEP = 5;

export function CharacterCreator() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const bump = useUiStore((s) => s.bump);
  const t = useTheme();

  const characters = useCharacterStore((s) => s.characters);
  const { startDraft, setCurrent, updateCharacter, finalizeDraft, deleteCharacter } = useCharacterStore();
  const currentId = useCharacterStore((s) => s.currentId);

  const [step, setStep] = useState(0);
  const startedRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // a cada troca de etapa, volta o conteúdo ao topo (fluxo mais limpo)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // resume rascunho existente ou cria um novo (apenas uma vez)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const existing = characters.find((c) => c.ownerId === user.id && c.draft);
    if (existing) setCurrent(existing.id);
    else startDraft({ ownerId: user.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const char = useMemo(
    () => characters.find((c) => c.id === currentId && c.draft),
    [characters, currentId],
  );

  const update = (recipe: (c: Character) => void) => {
    if (char) updateCharacter(char.id, recipe);
  };

  // pré-preenche o equipamento ao entrar no passo, se ainda vazio
  useEffect(() => {
    if (step === GEAR_STEP && char && char.inventory.length === 0) {
      update((c) => applySelection(c, defaultSelection(c.classId)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, char?.id]);

  if (!char) {
    return (
      <Screen>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
          Preparando a forja de heróis…
        </div>
      </Screen>
    );
  }

  const isLast = step === STEP_LABELS.length - 1;

  // vídeo de fundo: o da classe tem prioridade, depois o da raça; sem mapeamento, sem vídeo
  const creatorVideo = getClass(char.classId).video ?? getRace(char.raceId).video ?? null;
  const creatorVideoOpacity = creatorVideo ? 0.82 : 0;
  const creatorDarken = creatorVideo ? 0.5 : 1;

  const goStep = (i: number) => {
    setStep(i);
    bump(0.8);
  };
  const next = () => {
    setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1));
    bump(0.9);
  };
  const prev = () => {
    setStep((s) => Math.max(0, s - 1));
    bump(0.4);
  };

  const finish = () => {
    finalizeDraft(char.id);
    bump(1.8);
    if (useUiStore.getState().sound) playLevel();
    navigate(`/ficha/${char.id}`);
  };

  const saveAndExit = () => {
    bump(0.6);
    navigate('/personagens');
  };

  const discard = () => {
    deleteCharacter(char.id);
    navigate('/personagens');
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepIdentity char={char} update={update} />;
      case 1: return <StepRace char={char} update={update} />;
      case 2: return <StepClass char={char} update={update} />;
      case 3: return <StepAbilities char={char} update={update} />;
      case 4: return <StepSkills char={char} update={update} />;
      case 5: return <StepGear char={char} update={update} />;
      default: return <StepReview char={char} update={update} />;
    }
  };

  return (
    <Screen
      video={creatorVideo}
      videoOpacity={creatorVideoOpacity}
      darken={creatorDarken}
      actions={
        <>
          <Button onClick={saveAndExit} style={{ fontSize: 12.5 }}>
            Salvar rascunho
          </Button>
          <Button variant="danger" onClick={discard} style={{ fontSize: 12.5 }}>
            Descartar
          </Button>
        </>
      }
    >
      <RaceAura raceId={char.raceId} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 'calc(var(--topbar-h) + 6px) var(--page-x) clamp(14px,3vh,26px)',
          gap: 'clamp(12px,1.8vh,20px)',
        }}
      >
        {/* indicador de progresso */}
        <div
          className="fv-steps fv-no-scrollbar"
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', flex: 'none', maxWidth: '100%' }}
        >
          {STEP_LABELS.map((label, i) => {
            const active = step === i;
            const done = step > i;
            return (
              <div
                key={label}
                onClick={() => goStep(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  minHeight: 38,
                  padding: '7px 14px 7px 8px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  border: '1px solid ' + (active ? t.gold : done ? hexA(t.acc, 0.5) : t.line),
                  background: active ? hexA(t.gold, 0.12) : t.panel,
                  boxShadow: active ? '0 0 22px ' + hexA(t.gold, 0.32) : 'none',
                  transition: '.3s',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(8px)',
                  flex: '0 0 auto',
                }}
              >
                <span
                  style={{
                    width: 23,
                    height: 23,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: "'Chakra Petch', monospace",
                    fontWeight: 700,
                    fontSize: 12,
                    background: active ? t.gold : done ? hexA(t.acc, 0.9) : t.steel,
                    color: active || done ? '#140d04' : t.muted,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '.03em',
                    color: active ? t.gold : done ? 'var(--ink)' : t.muted,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* corpo: ocupa toda a altura disponível, sem rolagem no desktop */}
        <div
          ref={bodyRef}
          className="fv-body"
          style={{
            flex: 1,
            display: 'flex',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <div className="fv-creator-content" style={{ perspective: 1200 }}>
            {/* clarão rúnico ao atravessar o portal entre etapas */}
            <div
              key={`flash-${step}`}
              aria-hidden
              style={{
                position: 'absolute',
                top: 70,
                left: '50%',
                width: 220,
                height: 220,
                borderRadius: 999,
                border: '1px solid var(--gold)',
                boxShadow: '0 0 60px var(--bloom)',
                pointerEvents: 'none',
                zIndex: 2,
                opacity: 0,
                animation: 'portalFlash .6s ease-out',
              }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="fv-step-motion"
                initial={{ opacity: 0, scale: 0.94, rotateX: 8, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, rotateX: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
                transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* navegação */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            paddingTop: 14,
            borderTop: '1px solid var(--line)',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={prev}
            style={{
              cursor: step === 0 ? 'default' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: step === 0 ? 'transparent' : 'var(--muted)',
              minHeight: 42,
              padding: '11px 18px',
              borderRadius: 12,
              border: '1px solid ' + (step === 0 ? 'transparent' : 'var(--line)'),
              background: step === 0 ? 'transparent' : 'var(--panel)',
              pointerEvents: step === 0 ? 'none' : 'auto',
              transition: '.25s',
            }}
          >
            ‹ Voltar
          </button>
          <div style={{ fontFamily: "'Chakra Petch', monospace", fontSize: 12, color: 'var(--muted)', letterSpacing: '.1em', whiteSpace: 'nowrap', margin: '0 auto' }}>
            PASSO {step + 1} DE {STEP_LABELS.length}
          </div>
          <button onClick={isLast ? finish : next} className="fv-btn-gold" style={{ minHeight: 44, padding: '12px 26px', fontSize: 15, whiteSpace: 'nowrap' }}>
            {isLast ? 'Despertar o Herói' : 'Avançar ›'}
          </button>
        </div>
      </div>
    </Screen>
  );
}
