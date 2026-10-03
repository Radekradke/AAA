import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { ThemeGrid } from '@/components/layout/ThemePickerModal';
import { PackList } from '@/components/layout/ContentPacksModal';
import { Modal } from '@/components/ui/Modal';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { music, useMusic } from '@/lib/music';
import { MOODS } from '@/data/soundtrack';
import { useInstallPrompt } from '@/lib/pwaInstall';
import { THEMES } from '@/data/themes';
import { rememberNext } from '@/lib/nextPath';

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'aparencia', label: 'Aparência', icon: 'image' },
  { id: 'som', label: 'Som e música', icon: 'volume' },
  { id: 'dados', label: 'Dados', icon: 'd20' },
  { id: 'livros', label: 'Livros', icon: 'quill' },
  { id: 'app', label: 'App e conta', icon: 'gear' },
];

/** Uma linha de ajuste: título + explicação à esquerda, controle à direita. */
function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="fv-set-row">
      <div className="fv-set-row-text">
        <b>{title}</b>
        {hint && <small>{hint}</small>}
      </div>
      <div className="fv-set-row-ctl">{children}</div>
    </div>
  );
}

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="fv-switch" onClick={onToggle}>
      <span aria-hidden />
    </button>
  );
}

/**
 * Configurações: tudo o que antes ficava espalhado no menu "⋯" num só lugar —
 * tema, som e trilha, dados 3D, livros (pacotes de conteúdo), instalar o app,
 * rever o tutorial e a conta. Vale para este aparelho.
 */
export function Settings() {
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const sound = useUiStore((s) => s.sound);
  const toggleSound = useUiStore((s) => s.toggleSound);
  const dice3d = useUiStore((s) => s.dice3d);
  const toggleDice3d = useUiStore((s) => s.toggleDice3d);
  const openTutorial = useUiStore((s) => s.openTutorial);
  const resetTours = useUiStore((s) => s.resetTours);
  const tipsOff = useUiStore((s) => s.tipsOff);
  const setTipsOff = useUiStore((s) => s.setTipsOff);
  const toursSeenCount = useUiStore((s) => Object.values(s.toursSeen).filter(Boolean).length);
  const clearHistory = useUiStore((s) => s.clearHistory);
  const historyCount = useUiStore((s) => s.history.length);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const m = useMusic();
  const installer = useInstallPrompt();
  const [iosGuide, setIosGuide] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const jump = (id: string) => document.getElementById(`cfg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <Screen scroll actions={<Button onClick={() => navigate('/')} style={{ fontSize: 12.5 }}>Menu</Button>}>
      <div className="fv-settings">
        <header className="fv-settings-head">
          <h1 className="fv-page-title">Configurações</h1>
          <p>Ajustes deste aparelho. Mudou, já vale — não precisa salvar.</p>
          <nav className="fv-settings-jump" aria-label="Seções">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" className="fv-pill" onClick={() => jump(s.id)}>
                <Icon name={s.icon} size={15} /> {s.label}
              </button>
            ))}
          </nav>
        </header>

        <section id="cfg-aparencia" className="fv-panel fv-set-card" aria-labelledby="cfg-aparencia-t">
          <h2 id="cfg-aparencia-t">Aparência</h2>
          <p className="fv-set-lead">
            Tema atual: <b>{THEMES[theme].label}</b> — {THEMES[theme].tagline.toLowerCase()}. Cada tema é uma identidade
            própria (layout, formas, fontes e o dado), com paleta clara e escura.
          </p>
          <ThemeGrid />
        </section>

        <section id="cfg-som" className="fv-panel fv-set-card" aria-labelledby="cfg-som-t">
          <h2 id="cfg-som-t">Som e música</h2>
          <Row title="Efeitos sonoros" hint="Som dos dados e das ações da ficha.">
            <Switch on={sound} label="Efeitos sonoros" onToggle={toggleSound} />
          </Row>
          <Row title="Trilha sonora" hint={m.track ? `Tocando: ${m.track.title}` : 'Música medieval livre (CC0). Só toca quando você manda.'}>
            <button type="button" className="fv-btn-ghost fv-set-btn" onClick={() => music.toggle()}>
              {m.playing ? '❚❚ Pausar' : '▶ Tocar'}
            </button>
          </Row>
          <Row title="Ambiente" hint="Combate toca sozinho ao rolar iniciativa.">
            <div className="fv-seg" role="radiogroup" aria-label="Ambiente da trilha">
              {MOODS.map((md) => (
                <button
                  key={md.id}
                  type="button"
                  role="radio"
                  aria-checked={m.mood === md.id}
                  className={m.mood === md.id ? 'is-on' : ''}
                  title={md.hint}
                  onClick={() => music.setMood(md.id)}
                >
                  {md.label}
                </button>
              ))}
            </div>
          </Row>
          <Row title="Volume da trilha">
            <label className="fv-set-range">
              <input type="range" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => music.setVolume(Number(e.target.value))} aria-label="Volume da trilha" />
              <b>{Math.round(m.volume * 100)}%</b>
            </label>
          </Row>
        </section>

        <section id="cfg-dados" className="fv-panel fv-set-card" aria-labelledby="cfg-dados-t">
          <h2 id="cfg-dados-t">Dados</h2>
          <Row title="Dados 3D" hint="Dados com física rolando pela tela. Desligado, aparece um dado 2D mais leve (bom para celulares antigos).">
            <Switch on={dice3d} label="Dados 3D" onToggle={toggleDice3d} />
          </Row>
          <Row title="Histórico de rolagens" hint={`${historyCount} rolagem(ns) guardada(s) neste aparelho.`}>
            <button
              type="button"
              className="fv-btn-ghost fv-set-btn"
              disabled={!historyCount}
              onClick={() => {
                if (confirmClear) {
                  clearHistory();
                  setConfirmClear(false);
                } else setConfirmClear(true);
              }}
            >
              {confirmClear ? 'Confirmar?' : 'Limpar'}
            </button>
          </Row>
        </section>

        <section id="cfg-livros" className="fv-panel fv-set-card" aria-labelledby="cfg-livros-t">
          <h2 id="cfg-livros-t">Livros</h2>
          <PackList />
        </section>

        <section id="cfg-app" className="fv-panel fv-set-card" aria-labelledby="cfg-app-t">
          <h2 id="cfg-app-t">App e conta</h2>
          <Row
            title="Tutorial e tours automáticos"
            hint={
              (tipsOff ? 'Desligados: não abrem sozinhos.' : 'Abrem sozinhos só na primeira vez.') +
              (user && !user.guest ? ' Vale para a sua conta em qualquer aparelho.' : ' Vale para este aparelho.') +
              ' Pelo menu continuam disponíveis.'
            }
          >
            <Switch on={!tipsOff} label="Tutorial e tours automáticos" onToggle={() => setTipsOff(!tipsOff)} />
          </Row>
          <Row title="Tutorial" hint="Rever o passo a passo do básico.">
            <button type="button" className="fv-btn-ghost fv-set-btn" onClick={openTutorial}>
              Abrir
            </button>
          </Row>
          <Row title="Tours guiados" hint="Mostrar de novo, na próxima vez que abrir, o tour da ficha e o da criação (com holofote sobre a tela).">
            <button
              type="button"
              className="fv-btn-ghost fv-set-btn"
              disabled={!toursSeenCount}
              onClick={resetTours}
            >
              {toursSeenCount ? 'Rever' : 'Ativados'}
            </button>
          </Row>
          {(installer.canPrompt || installer.needsIOSGuide) && (
            <Row title="Instalar no aparelho" hint="Vira um ícone na tela inicial e funciona sem internet.">
              <button type="button" className="fv-btn-ghost fv-set-btn" onClick={() => (installer.canPrompt ? void installer.install() : setIosGuide(true))}>
                Instalar
              </button>
            </Row>
          )}
          <Row title="Oficina de retratos" hint="Gere e troque a arte dos heróis.">
            <button type="button" className="fv-btn-ghost fv-set-btn" onClick={() => navigate('/retratos')}>
              Abrir
            </button>
          </Row>
          <Row title="Diagnóstico" hint="Teste a conexão com a nuvem se algo não sincronizar.">
            <button type="button" className="fv-btn-ghost fv-set-btn" onClick={() => navigate('/diagnostico')}>
              Abrir
            </button>
          </Row>
          <Row
            title="Conta"
            hint={user ? (user.guest ? 'Offline: as fichas ficam só neste aparelho. Entre para sincronizar na nuvem.' : `${user.name}${user.email ? ` · ${user.email}` : ''}`) : 'Você ainda não entrou.'}
          >
            {user && !user.guest ? (
              <button
                type="button"
                className="fv-btn-ghost fv-set-btn"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Sair
              </button>
            ) : (
              <button
                type="button"
                className="fv-btn-ghost fv-set-btn"
                onClick={() => {
                  if (user) logout();
                  rememberNext('/config');
                  navigate('/entrar');
                }}
              >
                Entrar
              </button>
            )}
          </Row>
        </section>
      </div>

      {iosGuide && (
        <Modal title="Instalar no iPhone / iPad" icon="d20" onClose={() => setIosGuide(false)} maxWidth={420}>
          <ol className="fv-set-ios">
            <li>Abra este site no <b>Safari</b>.</li>
            <li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
            <li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li>
          </ol>
        </Modal>
      )}
    </Screen>
  );
}
