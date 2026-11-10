import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorHandlers } from './lib/errorReporter';
import { installCardTilt } from './lib/cardTilt';
import './store/homebrewStore';
import { useUiStore } from './store/uiStore';
import './styles/fonts';
import './styles/globals.css';
import './styles/experience.css';
import './styles/mobile.css';
import './styles/responsive.css';
import { loadFixesCss, loadThemeCss, savedTheme } from './lib/themeCss';

// Discord pessoal: o envio só carrega quando há um webhook (não pesa a primeira tela)
const discordOn = () => !!useUiStore.getState().discordWebhook;
if (discordOn()) void import('./lib/discordPersonal');
else {
  const stop = useUiStore.subscribe((s) => {
    if (!s.discordWebhook) return;
    stop();
    void import('./lib/discordPersonal');
  });
}
// animações básicas vêm junto (entradas com opacity:0 não podem esperar a rede
// para aparecer); arrastar/layout (domMax) só nos toasts, carregado à parte.
// strict: nenhum `motion` completo escondido no bundle.

// erros fora do React (eventos, promessas) e código antigo após atualização
installGlobalErrorHandlers();
installCardTilt();

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LazyMotion features={domAnimation} strict>
        <BrowserRouter>
          {/* última rede: se até a casca do app quebrar, ainda aparece a tela de erro */}
          <ErrorBoundary scope="app">
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </LazyMotion>
    </StrictMode>,
  );
}

// o CSS do tema salvo (e os ajustes que vêm depois dele) chega antes da 1ª
// pintura — sem piscar o tema errado; os outros temas só se forem usados
void Promise.all([loadFixesCss(), loadThemeCss(savedTheme())]).then(render);
