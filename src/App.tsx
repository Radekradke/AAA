import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { AuthCallback } from '@/pages/AuthCallback';
import { CharacterSelect } from '@/pages/CharacterSelect';
import { CharacterCreator } from '@/pages/CharacterCreator';
import { CharacterSheet } from '@/pages/CharacterSheet';
import { Campaigns } from '@/pages/Campaigns';
import { CampaignRoom } from '@/pages/CampaignRoom';
import { JoinCampaign } from '@/pages/JoinCampaign';
import { Diagnostics } from '@/pages/Diagnostics';
import type { ReactNode } from 'react';
import { useCloudSync } from '@/hooks/useCloudSync';

/** Protege rotas que exigem usuário autenticado (ou convidado). */
function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/entrar" replace />;
  return <>{children}</>;
}


export function App() {
  const location = useLocation();
  useCloudSync(); // offline-first: sincroniza ao logar, reconectar e após edições

  return (
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/diagnostico" element={<Diagnostics />} />
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
              <CharacterCreator />
            </RequireAuth>
          }
        />
        <Route
          path="/ficha/:id"
          element={
            <RequireAuth>
              <CharacterSheet />
            </RequireAuth>
          }
        />
        <Route
          path="/mesas"
          element={
            <RequireAuth>
              <Campaigns />
            </RequireAuth>
          }
        />
        <Route
          path="/mesa/:id"
          element={
            <RequireAuth>
              <CampaignRoom />
            </RequireAuth>
          }
        />
        {/* convite: acessível sem login (a página guia para entrar) */}
        <Route path="/sala/:token" element={<JoinCampaign />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
