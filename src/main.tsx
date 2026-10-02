import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { App } from './App';
import './store/homebrewStore';
import './styles/fonts';
import './styles/globals.css';
import './styles/themes/index.css';
import './styles/polish.css';
// animações básicas vêm junto (entradas com opacity:0 não podem esperar a rede
// para aparecer); arrastar/layout (domMax) só nos toasts, carregado à parte.
// strict: nenhum `motion` completo escondido no bundle.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LazyMotion>
  </StrictMode>,
);
