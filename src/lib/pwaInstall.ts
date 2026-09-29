import { useEffect, useState } from 'react';

/**
 * Instalação do app (PWA). Android/Chrome/Edge disparam `beforeinstallprompt`
 * — guardamos o evento para oferecer "Instalar app" no menu. iPhone/iPad
 * (Safari) não têm esse evento: mostramos o passo a passo do "Compartilhar →
 * Adicionar à Tela de Início".
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // nada de banner automático: o jogador escolhe quando
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Já está aberto como app instalado? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS 13+ se apresenta como Mac com toque
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  const standalone = isStandalone();
  return {
    /** Pode mostrar o prompt nativo (Android/desktop). */
    canPrompt: !standalone && !!deferred,
    /** iOS fora do app: só dá para ensinar o caminho manual. */
    needsIOSGuide: !standalone && !deferred && isIOS(),
    async install() {
      if (!deferred) return false;
      const ev = deferred;
      deferred = null;
      notify();
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      return outcome === 'accepted';
    },
  };
}
