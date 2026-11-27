import { useEffect, useState } from 'react';
import { loadThemeCss } from '@/lib/themeCss';
import type { ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { THEMES, THEME_ORDER, visibleTheme } from '@/data/themes';
import type { ThemeName } from '@/types/dnd';
import type { Character } from '@/types/character';
import { SheetPrint } from './SheetPrint';
import { SheetIllustrated } from './SheetIllustrated';
import type { IllustratedOptions } from './SheetIllustrated';

type Style = 'tematica' | 'retrato' | 'classica';
interface Prefs { style: Style; theme: ThemeName | null; mode: 'light' | 'dark'; blank: boolean }

const THEME_LORE: Partial<Record<ThemeName, string>> = {
  astral: 'Um dragão devorava a primeira estrela que aparecia toda noite. Quando restou apenas uma, os vigias acenderam uma lamparina no centro de um astrolábio e fizeram girar seus anéis de ouro. O dragão mergulhou atrás da chama e ficou preso na órbita. Ainda hoje dá voltas no céu. A cada volta, uma estrela escapa entre seus dentes.',
  carmesim: 'Havia um teatro onde a criatura atrás da cortina devorava quem aplaudisse por último. Na centésima estreia, a trupe esperou a sala esvaziar e fez estalar uma matraca escondida no pano. A criatura tomou o estalo por uma palma e saltou. Os atores puxaram as fitas douradas e costuraram a fera entre as dobras. Na Corte Carmesim, o pano cai antes que alguém bata palmas.',
  eclipse: 'No primeiro eclipse, a sombra da lua desceu às ruas. Tudo o que tocava virava ônix. Uma oleira deixou cair um prato. Da porcelana partida escapou a luz que o barro guardava desde que secara ao sol. A sombra recuou. A cidade inteira quebrou louça até empurrá-la de volta para o céu. Desde então, os oleiros guardam um prato branco para o próximo eclipse.',
  rubra: 'Um javali guardava a passagem da serra. Cada espada que o feria virava mais uma placa de ferro em seu couro. Os ferreiros da Guilda Rubra martelaram à boca de uma fornalha até o javali baixar a cabeça e investir. Os ferreiros saltaram para os lados. Quando o ferro derreteu, de dentro da couraça saiu um leitão. Os ferreiros recolheram o metal ainda em brasa e dele cunharam seus brasões.',
};

const KEY = 'fv-print-prefs';
function loadPrefs(defaultStyle: 'tematica' | 'retrato'): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Prefs> | null;
    if (raw) {
      return {
        style: raw.style === 'classica' || raw.style === 'retrato' || raw.style === 'tematica' ? raw.style : defaultStyle,
        theme: raw.theme && THEME_ORDER.includes(raw.theme) ? raw.theme : null,
        mode: raw.mode === 'dark' ? 'dark' : 'light',
        blank: raw.blank ?? true,
      };
    }
  } catch {
    /* sem localStorage: padrões */
  }
  return { style: defaultStyle, theme: null, mode: 'light', blank: defaultStyle === 'retrato' };
}

/**
 * A ficha para ver e imprimir: temática, com retrato do herói ou clássica.
 * As escolhas ficam lembradas neste
 * aparelho. `lead` = ações do topo (voltar, aviso de link compartilhado).
 */
export function PrintStudio({ char, lead, defaultStyle = 'tematica' }: { char: Character; lead?: ReactNode; defaultStyle?: 'tematica' | 'retrato' }) {
  const appTheme = useUiStore((s) => s.theme);
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(defaultStyle));
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
  const theme = visibleTheme(prefs.theme ?? appTheme);
  // a ficha ilustrada pode usar outro tema que não o da tela: garante o CSS dele
  useEffect(() => {
    void loadThemeCss(theme);
  }, [theme]);
  const themed = prefs.style === 'tematica';
  const lore = themed ? THEME_LORE[theme] : undefined;
  const opts: IllustratedOptions = {
    theme,
    mode: themed ? (theme === 'eclipse' ? 'light' : 'dark') : prefs.mode,
    blank: prefs.blank,
    template: themed,
  };
  const print = async () => {
    const images = [...document.querySelectorAll<HTMLImageElement>('.fv-template-art, .fv-ills-page img')];
    await Promise.allSettled([document.fonts.ready, ...images.map(img => img.decode())]);
    window.print();
  };

  return (
    <main className="fv-printpage" data-style={prefs.style}>
      <div className="fv-printpage-bar">
        {lead}
        <div className="fv-printpage-seg" role="group" aria-label="Estilo da ficha">
          <button type="button" aria-pressed={themed} onClick={() => set({ style: 'tematica' })}>Temática</button>
          <button type="button" aria-pressed={prefs.style === 'retrato'} onClick={() => set({ style: 'retrato' })}>Retrato</button>
          <button type="button" aria-pressed={prefs.style === 'classica'} onClick={() => set({ style: 'classica' })}>Clássica</button>
        </div>
        <button type="button" className="is-primary" onClick={() => void print()}>Imprimir / Salvar PDF</button>
      </div>

      {prefs.style !== 'classica' && (
        <div className="fv-printpage-bar fv-printpage-opts">
          <label>
            Tema
            <select value={theme} onChange={(e) => set({ theme: e.target.value as ThemeName })}>
              {THEME_ORDER.map((t) => <option key={t} value={t}>{THEMES[t].label}{t === appTheme ? ' (atual)' : ''}</option>)}
            </select>
          </label>
          {!themed && <div className="fv-printpage-seg" role="group" aria-label="Cores">
            <button type="button" aria-pressed={prefs.mode === 'light'} onClick={() => set({ mode: 'light' })} title="Fundo claro: gasta bem menos tinta">Claro</button>
            <button type="button" aria-pressed={prefs.mode === 'dark'} onClick={() => set({ mode: 'dark' })}>Escuro</button>
          </div>}
          <label className="fv-printpage-check">
            <input type="checkbox" checked={prefs.blank} onChange={(e) => set({ blank: e.target.checked })} />
            PV, usos e moedas em branco (para lápis)
          </label>
          {lore && (
            <details className="fv-printpage-lore">
              <summary>A lenda do tema</summary>
              <p>{lore}</p>
            </details>
          )}
          {opts.mode === 'dark' && <p className="fv-printpage-hint">No escuro, ligue “Gráficos de fundo” na janela de impressão.</p>}
        </div>
      )}

      {prefs.style === 'classica' ? <SheetPrint char={char} /> : <SheetIllustrated char={char} opts={opts} />}
    </main>
  );
}
