import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmAction } from '@/store/feedbackStore';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { mayAutoShow } from '@/services/onboardingSync';
import type { Character } from '@/types/character';
import { StepRace } from '@/components/character/StepRace';
import { StepClass } from '@/components/character/StepClass';
import { StepBackground } from '@/components/character/StepBackground';
import { StepAbilities } from '@/components/character/StepAbilities';
import { StepSkills } from '@/components/character/StepSkills';
import { StepGear } from '@/components/character/StepGear';
import { StepSpells } from '@/components/character/StepSpells';
import { StepGifts } from '@/components/character/StepGifts';
import { StepAwaken } from '@/components/character/StepAwaken';
import { HeroPanel } from '@/components/character/HeroPanel';
import { Modal } from '@/components/ui/Modal';
import { creationPending, CREATION_STEPS, STEP_ABILITIES, STEP_BACKGROUND, STEP_CLASS, STEP_GEAR, STEP_GIFTS, STEP_IDENTITY, STEP_RACE, STEP_SKILLS, STEP_SPELLS, visibleSteps } from '@/engine/creationSummary';
import { suggestCreationSpells } from '@/engine/creationSpells';
import { defaultSelection, applySelection } from '@/engine/loadout';
import { playLevel } from '@/lib/sfx';
import { heroAvatar } from '@/lib/summary';
import { RaceAura } from '@/components/animations/RaceAura';
import { raceOf } from '@/data/races';

/**
 * Vídeos animados de fundo por raça/classe (Draconato, Bruxo) — em espera
 * para uma atualização futura. Os arquivos e o mapeamento (`video` em
 * races.ts/classes.ts) continuam no projeto: para religar, troque para true.
 */
const CREATOR_VIDEOS = false;
import { getClass } from '@/data/classes';

export function CharacterCreator() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const bump = useUiStore((s) => s.bump);

  const characters = useCharacterStore((s) => s.characters);
  const { startDraft, setCurrent, updateCharacter, finalizeDraft, deleteCharacter } = useCharacterStore();
  const currentId = useCharacterStore((s) => s.currentId);

  const [step, setStep] = useState(0);
  // 1ª criação neste aparelho: tour guiado pelas partes da tela
  const startTour = useUiStore((s) => s.startTour);
  const creatorTourSeen = useUiStore((s) => !!s.toursSeen.creator || s.tipsOff);
  useEffect(() => {
    if (creatorTourSeen) return;
    let alive = true;
    const t = setTimeout(() => {
      void mayAutoShow((ui) => !!ui.toursSeen.creator).then((ok) => alive && ok && startTour('creator'));
    }, 1300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [creatorTourSeen, startTour]);
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
      update((c) => applySelection(c, defaultSelection(c.classId, c)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, char?.id]);

  // magias: chega com a sugestão clássica da classe (o jogador troca ali mesmo)
  useEffect(() => {
    if (step === STEP_SPELLS && char && char.preparedSpells.length === 0 && (char.knownSpells ?? []).length === 0) {
      update((c) => suggestCreationSpells(c));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, char?.id, char?.classId]);

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
  // etapas deste herói ("Magias" só para quem conjura no 1º nível)
  const steps = visibleSteps(char);
  const nextOf = (i: number) => steps.find((x) => x > i) ?? LAST;
  const prevOf = (i: number) => [...steps].reverse().find((x) => x < i) ?? 0;
  const isLast = step === LAST;
  const pending = creationPending(char);
  // o que ainda falta decidir nesta etapa (o rodapé avisa antes de seguir)
  const hereDue = pending.find((p) => p.step === step && p.step !== STEP_IDENTITY);

  // vídeo de fundo: o da classe tem prioridade, depois o da raça; sem mapeamento, sem vídeo
  const creatorVideo = CREATOR_VIDEOS ? getClass(char.classId).video ?? raceOf(char).video ?? null : null;
  const creatorVideoOpacity = creatorVideo ? 0.82 : 0;
  const creatorDarken = creatorVideo ? 0.5 : 1;

  const setPortrait = (url: string | null) => update((c) => { c.portrait = url; });

  const goStep = (i: number) => {
    setStep(i);
    bump(0.8);
  };
  const next = () => {
    setStep((s) => nextOf(s));
    bump(0.9);
  };
  const prev = () => {
    setStep((s) => prevOf(s));
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

  const discard = async () => {
    const ok = await confirmAction({ title: `Descartar ${char.name.trim() || 'este herói'}?`, message: 'Tudo o que foi escolhido até aqui será perdido.', confirmLabel: 'Descartar', danger: true });
    if (!ok) return;
    deleteCharacter(char.id);
    navigate('/personagens');
  };

  const renderStep = () => {
    switch (step) {
      case STEP_RACE: return <StepRace char={char} update={update} />;
      case STEP_CLASS: return <StepClass char={char} update={update} />;
      case STEP_GIFTS: return <StepGifts char={char} update={update} />;
      case STEP_BACKGROUND: return <StepBackground char={char} update={update} />;
      case STEP_ABILITIES: return <StepAbilities char={char} update={update} />;
      case STEP_SKILLS: return <StepSkills char={char} update={update} />;
      case STEP_SPELLS: return <StepSpells char={char} update={update} />;
      case STEP_GEAR: return <StepGear char={char} update={update} />;
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
      menu={[
        { label: 'Tour da criação', icon: 'compass', onClick: () => startTour('creator') },
        { label: 'Descartar este herói', icon: 'trash', onClick: discard, danger: true },
      ]}
    >
      <RaceAura raceId={char.raceId} />
      <div className="fv-forge">
        {/* capítulos (desktop): um diário de missão, clicável */}
        <nav className="fv-forge-rail" aria-label="Capítulos da criação">
          <div className="fv-rail-title">Forja do Herói</div>
          <ol>
            {steps.map((i, n) => (
              <li key={CREATION_STEPS[i].id}>
                <button
                  type="button"
                  aria-current={step === i ? 'step' : undefined}
                  className={step === i ? 'is-current' : i < step ? 'is-done' : ''}
                  onClick={() => goStep(i)}
                >
                  <span className="fv-rail-mark" aria-hidden>{i < step ? '✓' : n + 1}</span>
                  {CREATION_STEPS[i].label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* progresso (celular/tablet): segmentos clicáveis, sem texto repetido */}
        <nav className="fv-forge-progress" aria-label="Capítulos da criação">
          {steps.map((i, n) => (
            <button
              key={CREATION_STEPS[i].id}
              type="button"
              aria-label={`${n + 1}. ${CREATION_STEPS[i].label}`}
              aria-current={step === i ? 'step' : undefined}
              className={step === i ? 'is-current' : i < step ? 'is-done' : ''}
              onClick={() => goStep(i)}
            />
          ))}
        </nav>

        <main ref={bodyRef} className="fv-forge-main">
          <AnimatePresence mode="wait">
            <m.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {renderStep()}
            </m.div>
          </AnimatePresence>
        </main>

        {/* o herói tomando forma (desktop) */}
        <aside className="fv-forge-hero" aria-label="Seu herói">
          <HeroPanel char={char} onGoStep={goStep} onPortrait={setPortrait} />
        </aside>

        <footer className={'fv-forge-foot' + (isLast ? ' is-last' : '')}>
          <button type="button" className="fv-btn-ghost fv-foot-back" onClick={prev} disabled={step === 0} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
            ‹ Voltar
          </button>

          {/* celular/tablet: o herói num toque (retrato + pendências). No Despertar ele já está na página. */}
          <button type="button" className="fv-foot-hero" onClick={() => setSummaryOpen(true)} aria-label={`Ver herói${pending.length ? ` — ${pending.length} pendência(s)` : ''}`}>
            <img src={heroAvatar(char)} alt="" />
            <span>Herói</span>
            {pending.length > 0 && <b>{pending.length}</b>}
          </button>
          <span className="fv-foot-next" aria-hidden>
            {!isLast ? (
              hereDue ? <>Falta aqui: <b>{hereDue.label.replace(/^Escolha:? /, '').toLowerCase()}</b></> : <>Próximo: <b>{CREATION_STEPS[nextOf(step)].label}</b></>
            ) : pending.length ? `Falta: ${pending[0].label.toLowerCase()}` : 'Tudo pronto'}
          </span>

          <button
            type="button"
            onClick={isLast ? finish : next}
            disabled={isLast && pending.length > 0}
            title={isLast && pending.length > 0 ? `Falta: ${pending.map((p) => p.label).join(', ')}` : undefined}
            className="fv-btn-gold fv-foot-cta"
          >
            {isLast ? <>Despertar<span className="fv-cta-long"> o Herói</span></> : 'Avançar ›'}
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
            showPending
          />
        </Modal>
      )}
    </Screen>
  );
}
