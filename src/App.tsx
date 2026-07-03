import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { CharacterSelect } from '@/pages/CharacterSelect';
import { CharacterCreator } from '@/pages/CharacterCreator';
import { CharacterSheet } from '@/pages/CharacterSheet';
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
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Login />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
