import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from './AppShell';
import { TopBar } from './TopBar';

interface ScreenProps {
  children: ReactNode;
  actions?: ReactNode;
  video?: string | null;
  videoOpacity?: number;
  /** Conteúdo rola internamente (telas longas como a ficha). */
  scroll?: boolean;
}

/**
 * Tela completa: casca + barra superior + área de conteúdo com entrada
 * cinematográfica. Base de todas as páginas.
 */
export function Screen({ children, actions, video, videoOpacity, scroll }: ScreenProps) {
  return (
    <AppShell video={video} videoOpacity={videoOpacity}>
      <TopBar actions={actions} />
      <motion.div
        initial={{ opacity: 0, scale: 1.035, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.99, filter: 'blur(4px)' }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          overflowY: scroll ? 'auto' : 'hidden',
          overflowX: 'hidden',
        }}
      >
        {children}
      </motion.div>
    </AppShell>
  );
}
