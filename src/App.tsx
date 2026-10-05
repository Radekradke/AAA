import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore, useCharactersHydrated } from '@/store/characterStore';
import { heroAvatar } from '@/lib/summary';
import { Home } from '@/pages/Home';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// telas pesadas carregam só quando abertas (o pacote inicial fica bem menor);
// o app instalado guarda todas no cache, então continuam funcionando offline
// fora da tela inicial: cada tela baixa só quando alguém vai até ela
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));
const AuthCallback = lazy(() => import('@/pages/AuthCallback').then((m) => ({ default: m.AuthCallback })));
const CharacterSelect = lazy(() => import('@/pages/CharacterSelect').then((m) => ({ default: m.CharacterSelect })));
const CharacterCreator = lazy(() => import('@/pages/CharacterCreator').then((m) => ({ default: m.CharacterCreator })));
const CharacterSheet = lazy(() => import('@/pages/CharacterSheet').then((m) => ({ default: m.CharacterSheet })));
const Campaigns = lazy(() => import('@/pages/Campaigns').then((m) => ({ default: m.Campaigns })));
const CampaignRoom = lazy(() => import('@/pages/CampaignRoom').then((m) => ({ default: m.CampaignRoom })));
const JoinCampaign = lazy(() => import('@/pages/JoinCampaign').then((m) => ({ default: m.JoinCampaign })));
const LiveSession = lazy(() => import('@/pages/LiveSession').then((m) => ({ default: m.LiveSession })));
const PortraitWorkshop = lazy(() => import('@/pages/PortraitWorkshop').then((m) => ({ default: m.PortraitWorkshop })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const PrintSheet = lazy(() => import('@/pages/PrintSheet').then((m) => ({ default: m.PrintSheet })));
const SharedSheet = lazy(() => import('@/pages/SharedSheet').then((m) => ({ default: m.SharedSheet })));
const Diagnostics = lazy(() => import('@/pages/Diagnostics').then((m) => ({ default: m.Diagnostics })));

/** Enquanto a tela baixa: o sigilo pulsando (só aparece se demorar, sem piscar). */
function PageLoading() {
  return (
    <div role="status" aria-label="Carregando" className="fv-page-loading">
      <span className="fv-page-loading-sigil" aria-hidden>
        F
      </span>
      <small>Carregando…</small>
    </div>
  );
}

/** Telas pesadas carregam sob demanda, com o aviso acima enquanto isso. */
function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}
import { useCloudSync } from '@/hooks/useCloudSync';
import { PwaStatus } from '@/components/PwaStatus';
import { FeedbackHost } from '@/components/feedback/FeedbackHost';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useUiStore } from '@/store/uiStore';
import { cloudEnabled } from '@/services/supabaseClient';
import { watchCharacters } from '@/services/sheetHistory';
import { startOnboardingSync } from '@/services/onboardingSync';

// peças globais que quase nunca aparecem: baixam na primeira vez que precisam
const SessionDock = lazy(() => import('@/components/session/SessionDock').then((m) => ({ default: m.SessionDock })));
const Onboarding = lazy(() => import('@/components/Onboarding').then((m) => ({ default: m.Onboarding })));
const GuidedTour = lazy(() => import('@/components/tour/GuidedTour').then((m) => ({ default: m.GuidedTour })));

/** Fica true para sempre depois da 1ª vez (o componente continua montado e anima a saída). */
function useOnceTrue(flag: boolean): boolean {
  const [seen, setSeen] = useState(flag);
  useEffect(() => {
    if (flag) setSeen(true);
  }, [flag]);
  return seen || flag;
}

/**
 * Ficha: a arte do herói é o maior elemento da tela (LCP), mas só seria
 * descoberta depois que o código da página baixa e desenha. Aqui ela começa a
 * baixar junto com esse código.
 */
function useHeroArtPreload(pathname: string) {
  const id = /^\/ficha\/([^/]+)/.exec(pathname)?.[1];
  const url = useCharacterStore((s) => {
    const c = id ? s.characters.find((x) => x.id === id) : undefined;
    return c ? heroAvatar(c) : null;
  });
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.fetchPriority = 'high';
    img.src = url;
  }, [url]);
}

/** Protege rotas que exigem usuário autenticado (ou convidado). */
function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useCharactersHydrated();
  if (!user) return <Navigate to="/entrar" replace />;
  // fichas ainda carregando do IndexedDB: não renderiza a página (que poderia
  // criar rascunho/editar sobre uma lista vazia e apagar os heróis salvos)
  if (!hydrated) return <div role="status" aria-label="Carregando heróis" style={{ position: 'fixed', inset: 0 }} />;
  return <>{children}</>;
}

export function App() {
  const location = useLocation();
  useCloudSync(); // offline-first: sincroniza ao logar, reconectar e após edições
  useEffect(() => watchCharacters(useCharacterStore.subscribe), []); // histórico da ficha (versões no aparelho)
  useEffect(() => void import('@/lib/deedTracker').then((m) => m.startDeedTracker()), []); // feitos da carta (críticos, 0 PV e volta), sob demanda
  useEffect(startOnboardingSync, []); // tutorial visto vale para a conta, em qualquer aparelho
  useHeroArtPreload(location.pathname);
  const user = useAuthStore((s) => s.user);
  const showTutorial = useOnceTrue(useUiStore((s) => s.tutorialOpen));
  const showTour = useOnceTrue(useUiStore((s) => !!s.tour));
  // a mesa ao vivo só existe com conta na nuvem (convidado nunca baixa esse código)
  const canLive = !!user && !user.guest && cloudEnabled();

  return (
    <>
    {/* app instalável: avisos de offline pronto / nova versão */}
    <ErrorBoundary scope="pwa" silent>
      <PwaStatus />
    </ErrorBoundary>
    {/* peças globais: se uma quebrar, some em silêncio (o erro vai pro registro) e a tela continua */}
    <ErrorBoundary scope="globais" silent>
      <Suspense fallback={null}>
        {/* mesa ao vivo: pílula global + "SEU TURNO" em qualquer tela */}
        {canLive && <SessionDock />}
        {/* tutorial de boas-vindas (1ª visita ou menu → Tutorial) */}
        {showTutorial && <Onboarding />}
        {/* tour guiado com holofote (ficha e criação) */}
        {showTour && <GuidedTour />}
      </Suspense>
    </ErrorBoundary>
    {/* avisos rápidos e confirmações no visual do tema */}
    <ErrorBoundary scope="avisos" silent>
      <FeedbackHost />
    </ErrorBoundary>
    <AnimatePresence>
      {/* airbag por tela: um erro numa página mostra a tela de erro, não o app em branco; navegar limpa */}
      <ErrorBoundary key={location.pathname} scope={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Page><Login /></Page>} />
        <Route path="/auth/callback" element={<Page><AuthCallback /></Page>} />
        <Route path="/diagnostico" element={<Page><Diagnostics /></Page>} />
        <Route path="/retratos" element={<Page><PortraitWorkshop /></Page>} />
        <Route path="/config" element={<Page><Settings /></Page>} />
        <Route
          path="/personagens"
          element={
            <RequireAuth>
              <Page><CharacterSelect /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/criar"
          element={
            <RequireAuth>
              <Page><CharacterCreator /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/ficha/:id"
          element={
            <RequireAuth>
              <Page><CharacterSheet /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/ficha/:id/imprimir"
          element={
            <RequireAuth>
              <Page><PrintSheet /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/mesas"
          element={
            <RequireAuth>
              <Page><Campaigns /></Page>
            </RequireAuth>
          }
        />
        <Route
          path="/mesa/:id"
          element={
            <RequireAuth>
              <Page><CampaignRoom /></Page>
            </RequireAuth>
          }
        />
        {/* mesa ao vivo: sessão, encontro e iniciativa compartilhada */}
        <Route
          path="/mesa/:id/jogar"
          element={
            <RequireAuth>
              <Page><LiveSession /></Page>
            </RequireAuth>
          }
        />
        {/* convite: acessível sem login (a página guia para entrar) */}
        <Route path="/sala/:token" element={<Page><JoinCampaign /></Page>} />
        {/* ficha compartilhada por link: pública, só leitura */}
        <Route path="/f/:token" element={<Page><SharedSheet /></Page>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </AnimatePresence>
    </>
  );
}
