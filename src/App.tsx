import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useCharactersHydrated } from '@/store/characterStore';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { AuthCallback } from '@/pages/AuthCallback';
import { CharacterSelect } from '@/pages/CharacterSelect';
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

// telas pesadas carregam só quando abertas (o pacote inicial fica bem menor);
// o app instalado guarda todas no cache, então continuam funcionando offline
const CharacterCreator = lazy(() => import('@/pages/CharacterCreator').then((m) => ({ default: m.CharacterCreator })));
const CharacterSheet = lazy(() => import('@/pages/CharacterSheet').then((m) => ({ default: m.CharacterSheet })));
const Campaigns = lazy(() => import('@/pages/Campaigns').then((m) => ({ default: m.Campaigns })));
const CampaignRoom = lazy(() => import('@/pages/CampaignRoom').then((m) => ({ default: m.CampaignRoom })));
const JoinCampaign = lazy(() => import('@/pages/JoinCampaign').then((m) => ({ default: m.JoinCampaign })));
const LiveSession = lazy(() => import('@/pages/LiveSession').then((m) => ({ default: m.LiveSession })));
const PortraitWorkshop = lazy(() => import('@/pages/PortraitWorkshop').then((m) => ({ default: m.PortraitWorkshop })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const Diagnostics = lazy(() => import('@/pages/Diagnostics').then((m) => ({ default: m.Diagnostics })));

/** Enquanto a tela baixa: fundo vazio (a cena de fundo continua atrás). */
function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div role="status" aria-label="Carregando" style={{ position: 'fixed', inset: 0 }} />}>{children}</Suspense>;
}
import { useCloudSync } from '@/hooks/useCloudSync';
import { PwaStatus } from '@/components/PwaStatus';
import { SessionDock } from '@/components/session/SessionDock';
import { Onboarding } from '@/components/Onboarding';

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

  return (
    <>
    {/* app instalável: avisos de offline pronto / nova versão */}
    <PwaStatus />
    {/* mesa ao vivo: pílula global + "SEU TURNO" em qualquer tela */}
    <SessionDock />
    {/* tutorial de boas-vindas (1ª visita ou menu → Tutorial) */}
    <Onboarding />
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/diagnostico" element={<Page><Diagnostics /></Page>} />
        <Route path="/retratos" element={<Page><PortraitWorkshop /></Page>} />
        <Route path="/config" element={<Page><Settings /></Page>} />
        <Route
          path="/personagens"
          element={
            <RequireAuth>
              <CharacterSelect />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
    </>
  );
}
