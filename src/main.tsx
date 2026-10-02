import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorHandlers } from './lib/errorReporter';
import './store/homebrewStore';
import './styles/fonts';
import './styles/globals.css';
import './styles/themes/index.css';
import './styles/polish.css';
import './styles/contrast.css';
// animações básicas vêm junto (entradas com opacity:0 não podem esperar a rede
// para aparecer); arrastar/layout (domMax) só nos toasts, carregado à parte.
// strict: nenhum `motion` completo escondido no bundle.

// erros fora do React (eventos, promessas) e código antigo após atualização
installGlobalErrorHandlers();

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
