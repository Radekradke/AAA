import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import type { Character } from '@/types/character';
import { StepRace } from '@/components/character/StepRace';
import { StepClass } from '@/components/character/StepClass';
import { StepBackground } from '@/components/character/StepBackground';
import { StepAbilities } from '@/components/character/StepAbilities';
import { StepSkills } from '@/components/character/StepSkills';
import { StepGear } from '@/components/character/StepGear';
import { StepAwaken } from '@/components/character/StepAwaken';
import { HeroPanel } from '@/components/character/HeroPanel';
import { Modal } from '@/components/ui/Modal';
import { creationPending, CREATION_STEPS, STEP_GEAR } from '@/engine/creationSummary';
import { defaultSelection, applySelection } from '@/engine/loadout';
import { playLevel } from '@/lib/sfx';
import { heroAvatar } from '@/lib/summary';
import { RaceAura } from '@/components/animations/RaceAura';
import { getRace } from '@/data/races';
import { getClass } from '@/data/classes';

export function CharacterCreator() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const bump = useUiStore((s) => s.bump);

  const characters = useCharacterStore((s) => s.characters);
  const { startDraft, setCurrent, updateCharacter, finalizeDraft, deleteCharacter } = useCharacterStore();
  const currentId = useCharacterStore((s) => s.currentId);

  const [step, setStep] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
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
    if (step === STEP_GEAR && char && char.inventory.length === 0) {
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

  const LAST = CREATION_STEPS.length - 1;
  const isLast = step === LAST;
  const pending = creationPending(char);

  // vídeo de fundo: o da classe tem prioridade, depois o da raça; sem mapeamento, sem vídeo
  const creatorVideo = getClass(char.classId).video ?? getRace(char.raceId).video ?? null;
  const creatorVideoOpacity = creatorVideo ? 0.82 : 0;
  const creatorDarken = creatorVideo ? 0.5 : 1;

  const setPortrait = (url: string | null) => update((c) => { c.portrait = url; });

  const goStep = (i: number) => {
    setStep(i);
    bump(0.8);
  };
  const next = () => {
    setStep((s) => Math.min(LAST, s + 1));
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
    if (!window.confirm(`Descartar ${char.name.trim() || 'este herói'}? Tudo o que foi escolhido até aqui será perdido.`)) return;
    deleteCharacter(char.id);
    navigate('/personagens');
  };

  const renderStep = () => {
    switch (step) {
      case 0: return <StepRace char={char} update={update} />;
      case 1: return <StepClass char={char} update={update} />;
      case 2: return <StepBackground char={char} update={update} />;
      case 3: return <StepAbilities char={char} update={update} />;
      case 4: return <StepSkills char={char} update={update} />;
      case 5: return <StepGear char={char} update={update} />;
      default: return <StepAwaken char={char} update={update} onGoStep={goStep} />;
    }
  };

  return (
    <Screen
      video={creatorVideo}
      videoOpacity={creatorVideoOpacity}
      darken={creatorDarken}
      actions={
        <Button onClick={saveAndExit} style={{ fontSize: 12.5 }}>
          Salvar e sair
        </Button>
      }
      // destrutivo fica no menu, longe do polegar
      menu={[{ label: 'Descartar este herói', icon: 'close', onClick: discard, danger: true }]}
    >
      <RaceAura raceId={char.raceId} />
      <div className="fv-forge">
        {/* capítulos (desktop): um diário de missão, clicável */}
        <nav className="fv-forge-rail" aria-label="Capítulos da criação">
          <div className="fv-rail-title">Forja do Herói</div>
          <ol>
            {CREATION_STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={step === i ? 'step' : undefined}
                  className={step === i ? 'is-current' : i < step ? 'is-done' : ''}
                  onClick={() => goStep(i)}
                >
                  <span className="fv-rail-mark" aria-hidden>{i < step ? '✓' : i + 1}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* progresso (celular/tablet): segmentos clicáveis, sem texto repetido */}
        <nav className="fv-forge-progress" aria-label="Capítulos da criação">
          {CREATION_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${i + 1}. ${s.label}`}
              aria-current={step === i ? 'step' : undefined}
              className={step === i ? 'is-current' : i < step ? 'is-done' : ''}
              onClick={() => goStep(i)}
            />
          ))}
        </nav>

        <main ref={bodyRef} className="fv-forge-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* o herói tomando forma (desktop) */}
        <aside className="fv-forge-hero" aria-label="Seu herói">
          <HeroPanel char={char} onGoStep={goStep} onPortrait={setPortrait} />
        </aside>

        <footer className="fv-forge-foot">
          <button type="button" className="fv-btn-ghost fv-foot-back" onClick={prev} disabled={step === 0} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
            ‹ Voltar
          </button>

          {/* celular/tablet: o herói num toque (retrato + pendências). No Despertar ele já está na página. */}
          <button type="button" className="fv-foot-hero" style={isLast ? { visibility: 'hidden' } : undefined} onClick={() => setSummaryOpen(true)} aria-label={`Ver herói${pending.length ? ` — ${pending.length} pendência(s)` : ''}`}>
            <img src={heroAvatar(char)} alt="" />
            <span>Herói</span>
            {pending.length > 0 && <b>{pending.length}</b>}
          </button>
          <span className="fv-foot-next" aria-hidden>
            {!isLast ? <>Próximo: <b>{CREATION_STEPS[step + 1].label}</b></> : pending.length ? `Falta: ${pending[0].label.toLowerCase()}` : 'Tudo pronto'}
          </span>

          <button
            type="button"
            onClick={isLast ? finish : next}
            disabled={isLast && pending.length > 0}
            title={isLast && pending.length > 0 ? `Falta: ${pending.map((p) => p.label).join(', ')}` : undefined}
            className="fv-btn-gold fv-foot-cta"
          >
            {isLast ? 'Despertar o Herói' : 'Avançar ›'}
          </button>
        </footer>
      </div>

      {summaryOpen && (
        <Modal title="Seu herói" icon="banner" onClose={() => setSummaryOpen(false)} maxWidth={400}>
          <HeroPanel
            char={char}
            onGoStep={(i) => {
              setSummaryOpen(false);
              goStep(i);
            }}
            onPortrait={setPortrait}
          />
        </Modal>
      )}
    </Screen>
  );
}
