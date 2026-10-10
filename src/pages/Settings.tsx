import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
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
import { wakeLockSupported } from '@/lib/wakeLock';

/** Contador de artes: só baixa (catálogo de magias, itens e criaturas) quando abrir. */
const ArtCounter = lazy(() => import('@/components/ArtCounter'));

const SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: 'conta', label: 'Conta', icon: 'user' },
  { id: 'aparencia', label: 'Aparência', icon: 'palette' },
  { id: 'som', label: 'Som e música', icon: 'volume' },
  { id: 'dados', label: 'Dados e mesa', icon: 'd20' },
  { id: 'livros', label: 'Livros', icon: 'book' },
  { id: 'app', label: 'App e ajuda', icon: 'help' },
  { id: 'avancado', label: 'Avançado', icon: 'sliders' },
];

/** Qual seção está na tela agora (para marcar no índice). */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id.replace('cfg-', ''), e.isIntersecting);
        const first = ids.find((id) => seen.get(id));
        if (first) setActive(first);
      },
      // a faixa "lida" fica logo abaixo da barra do topo
      { rootMargin: '-20% 0px -65% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(`cfg-${id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const SECTION_IDS = SECTIONS.map((s) => s.id);

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
  const cinematics = useUiStore((s) => s.cinematics);
  const toggleCinematics = useUiStore((s) => s.toggleCinematics);
  const keepAwake = useUiStore((s) => s.keepAwake);
  const toggleKeepAwake = useUiStore((s) => s.toggleKeepAwake);
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
  const [artCount, setArtCount] = useState(false);

  const active = useActiveSection(SECTION_IDS);
  const jump = (id: string) => document.getElementById(`cfg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const enter = () => {
    if (user) logout();
    rememberNext('/config');
    navigate('/entrar');
  };

  return (
    <Screen scroll>
      <div className="fv-settings">
        <header className="fv-settings-head">
          <h1 className="fv-page-title">Configurações</h1>
          <p>Ajustes deste aparelho. Mudou, já vale — não precisa salvar.</p>
        </header>

        <nav className="fv-settings-index" aria-label="Seções das configurações">
          {SECTIONS.map((sec) => (
            <button key={sec.id} type="button" className={active === sec.id ? 'is-on' : ''} aria-current={active === sec.id ? 'true' : undefined} onClick={() => jump(sec.id)}>
              <Icon name={sec.icon} size={15} />
              {sec.label}
            </button>
          ))}
        </nav>

        <div className="fv-settings-body">
        <section id="cfg-conta" className="fv-panel fv-set-card fv-set-account" aria-labelledby="cfg-conta-t">
          <h2 id="cfg-conta-t" className="fv-sr-only">Conta</h2>
          <span className="fv-set-avatar" aria-hidden>{(user?.name.trim().charAt(0) || '?').toUpperCase()}</span>
          <div className="fv-set-account-text">
            <b>{!user ? 'Você ainda não entrou' : user.guest ? 'Jogando offline' : user.name}</b>
            <small>
              {!user
                ? 'Entre para guardar seus heróis na nuvem — ou continue offline.'
                : user.guest
                  ? 'As fichas ficam só neste aparelho. Entre com uma conta para sincronizar entre aparelhos.'
                  : `${user.email ?? 'Conta na nuvem'} · fichas e diário sincronizam entre os seus aparelhos.`}
            </small>
          </div>
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
            <button type="button" className="fv-btn-gold fv-set-btn" onClick={enter}>
              Entrar
            </button>
          )}
        </section>

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
          <h2 id="cfg-dados-t">Dados e mesa</h2>
          <Row title="Dados 3D" hint="Dados com física rolando pela tela. Desligado, aparece um dado 2D mais leve (bom para celulares antigos).">
            <Switch on={dice3d} label="Dados 3D" onToggle={toggleDice3d} />
          </Row>
          <Row title="Crítico cinematográfico" hint="No 20 natural, um momento em tela cheia com a arte do herói; no 1, um tropeço com humor. Na mesa ao vivo aparece para todos.">
            <Switch on={cinematics} label="Crítico cinematográfico" onToggle={toggleCinematics} />
          </Row>
          <Row title="Tela acesa na mesa ao vivo" hint={wakeLockSupported() ? 'Durante a sessão, o celular não apaga sozinho — dá para deixar a ficha aberta em cima da mesa.' : 'Este navegador não deixa manter a tela acesa; ajuste o tempo de bloqueio do aparelho.'}>
            <Switch on={keepAwake} label="Tela acesa na mesa ao vivo" onToggle={toggleKeepAwake} />
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
          <h2 id="cfg-app-t">App e ajuda</h2>
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
        </section>

        <section id="cfg-avancado" className="fv-panel fv-set-card" aria-labelledby="cfg-avancado-t">
          <h2 id="cfg-avancado-t">Avançado</h2>
          <p className="fv-set-lead">Ferramentas para quando algo não funciona — ou para quem cuida do app.</p>
          <Row title="Diagnóstico da nuvem" hint="Testa a conexão e o login. Use se a nuvem não sincronizar ou o login falhar.">
            <button type="button" className="fv-btn-ghost fv-set-btn" onClick={() => navigate('/diagnostico')}>
              Abrir
            </button>
          </Row>
          <Row title="Contador de artes" hint="Para quem faz as artes: quantas imagens já existem de magias, itens, criaturas, retratos e vozes, e o que ainda falta. Conta sozinho a cada versão.">
            <button type="button" className="fv-btn-ghost fv-set-btn" aria-expanded={artCount} aria-label={artCount ? 'Fechar contador de artes' : 'Abrir contador de artes'} onClick={() => setArtCount((v) => !v)}>
              {artCount ? 'Fechar' : 'Abrir'}
            </button>
          </Row>
          {artCount && (
            <Suspense fallback={<p className="fv-set-lead">Contando…</p>}>
              <ArtCounter />
            </Suspense>
          )}
          <Row title="Oficina de retratos" hint="Para quem mantém o app: prepara a arte padrão das classes (as imagens que aparecem quando o herói não tem retrato próprio). Para trocar o retrato do SEU herói, use a aba Retrato da ficha.">
            <button type="button" className="fv-btn-ghost fv-set-btn" onClick={() => navigate('/retratos')}>
              Abrir
            </button>
          </Row>
        </section>
        </div>
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
