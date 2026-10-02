import { useState } from 'react';
import type { ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { THEMES, THEME_ORDER } from '@/data/themes';
import type { ThemeName } from '@/types/dnd';
import type { Character } from '@/types/character';
import { SheetPrint } from './SheetPrint';
import { SheetIllustrated } from './SheetIllustrated';
import type { IllustratedOptions } from './SheetIllustrated';

type Style = 'ilustrada' | 'classica';
interface Prefs { style: Style; theme: ThemeName | null; mode: 'light' | 'dark'; blank: boolean }

const KEY = 'fv-print-prefs';
function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Prefs> | null;
    if (raw) return { style: raw.style === 'classica' ? 'classica' : 'ilustrada', theme: raw.theme && raw.theme in THEMES ? raw.theme : null, mode: raw.mode === 'dark' ? 'dark' : 'light', blank: raw.blank ?? true };
  } catch {
    /* sem localStorage: padrões */
  }
  return { style: 'ilustrada', theme: null, mode: 'light', blank: true };
}

/**
 * A ficha para ver e imprimir: ilustrada (no visual do tema, com a arte do
 * herói) ou clássica (preto no branco). As escolhas ficam lembradas neste
 * aparelho. `lead` = ações do topo (voltar, aviso de link compartilhado).
 */
export function PrintStudio({ char, lead }: { char: Character; lead?: ReactNode }) {
  const appTheme = useUiStore((s) => s.theme);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const set = (p: Partial<Prefs>) =>
    setPrefs((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignora */
      }
      return next;
    });
  const theme = prefs.theme ?? appTheme;
  const opts: IllustratedOptions = { theme, mode: prefs.mode, blank: prefs.blank };

  return (
    <main className="fv-printpage" data-style={prefs.style}>
      <div className="fv-printpage-bar">
        {lead}
        <div className="fv-printpage-seg" role="group" aria-label="Estilo da ficha">
          <button type="button" aria-pressed={prefs.style === 'ilustrada'} onClick={() => set({ style: 'ilustrada' })}>Ilustrada</button>
          <button type="button" aria-pressed={prefs.style === 'classica'} onClick={() => set({ style: 'classica' })}>Clássica</button>
        </div>
        <button type="button" className="is-primary" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
      </div>

      {prefs.style === 'ilustrada' && (
        <div className="fv-printpage-bar fv-printpage-opts">
          <label>
            Tema
            <select value={theme} onChange={(e) => set({ theme: e.target.value as ThemeName })}>
              {THEME_ORDER.map((t) => <option key={t} value={t}>{THEMES[t].label}{t === appTheme ? ' (atual)' : ''}</option>)}
            </select>
          </label>
          <div className="fv-printpage-seg" role="group" aria-label="Cores">
            <button type="button" aria-pressed={prefs.mode === 'light'} onClick={() => set({ mode: 'light' })} title="Fundo claro: gasta bem menos tinta">Claro</button>
            <button type="button" aria-pressed={prefs.mode === 'dark'} onClick={() => set({ mode: 'dark' })}>Escuro</button>
          </div>
          <label className="fv-printpage-check">
            <input type="checkbox" checked={prefs.blank} onChange={(e) => set({ blank: e.target.checked })} />
            PV, usos e moedas em branco (para lápis)
          </label>
          {prefs.mode === 'dark' && <p className="fv-printpage-hint">No escuro, ligue “Gráficos de fundo” na janela de impressão.</p>}
        </div>
      )}

      {prefs.style === 'ilustrada' ? <SheetIllustrated char={char} opts={opts} /> : <SheetPrint char={char} />}
    </main>
  );
}
