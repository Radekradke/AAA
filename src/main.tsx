import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './store/homebrewStore';
import './styles/fonts';
import './styles/globals.css';
import './styles/session.css';
import './styles/stage.css';
import './styles/master.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
