import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icon } from '@/components/ui/Icon';

/** Verifica versão nova a cada 30 min enquanto o app está aberto. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

/**
 * Avisos do app instalável: "pronto para usar offline" (uma vez) e "nova
 * versão disponível" — a atualização só acontece quando o jogador tocar em
 * Atualizar, para nunca recarregar no meio de uma rolagem.
 */
export function PwaStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update(), CHECK_EVERY_MS);
    },
  });

  // o aviso de offline some sozinho
  useEffect(() => {
    if (!offlineReady) return;
    const id = setTimeout(() => setOfflineReady(false), 5000);
    return () => clearTimeout(id);
  }, [offlineReady, setOfflineReady]);

  const show = offlineReady || needRefresh;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fv-panel fv-pwa-toast"
        >
          <Icon name="d20" size={22} color="var(--gold)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>
              {needRefresh ? 'Nova versão da Ficha Viva' : 'Pronto para jogar offline'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              {needRefresh ? 'Atualize quando estiver fora de uma rolagem.' : 'O app agora abre mesmo sem internet.'}
            </div>
          </div>
          {needRefresh && (
            <button className="fv-btn-gold" style={{ padding: '8px 14px', fontSize: 12.5, flex: 'none' }} onClick={() => void updateServiceWorker(true)}>
              Atualizar
            </button>
          )}
          <button
            aria-label="Fechar aviso"
            onClick={() => {
              setOfflineReady(false);
              setNeedRefresh(false);
            }}
            style={{ cursor: 'pointer', flex: 'none', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)' }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
