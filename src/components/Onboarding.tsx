import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { rememberNext } from '@/lib/nextPath';

interface Step {
  icon: IconName;
  kicker: string;
  title: string;
  lead: string;
  tips: ReactNode[];
}

const STEPS: Step[] = [
  {
    icon: 'spark',
    kicker: 'Boas-vindas',
    title: 'Sua ficha que faz as contas',
    lead: 'A Ficha Viva é uma ficha de D&D 5ª edição (regras de 2014) que calcula tudo sozinha: bônus, CA, perícias, magias e recursos. Você joga; ela confere a regra.',
    tips: [
      <>Funciona no PC e no celular, e dá para <b>instalar como app</b> e usar sem internet.</>,
      <>Sem conta? Escolha <b>Continuar offline</b>: as fichas ficam salvas neste aparelho.</>,
      <>Com conta, as fichas vão para a nuvem e você joga em <b>mesas</b> com amigos.</>,
    ],
  },
  {
    icon: 'anvil',
    kicker: 'Passo 1',
    title: 'Crie seu herói em 7 capítulos',
    lead: 'Origem, Caminho, Passado, Atributos, Perícias, Equipamento e Despertar. Cada capítulo explica as opções e mostra o que muda na ficha.',
    tips: [
      <>O <b>painel do herói</b> (à direita) mostra o retrato, os atributos e o que ainda falta escolher.</>,
      <>Dá para voltar a qualquer capítulo pela trilha — nada se perde, tudo salva sozinho.</>,
      <>Livros extras (Xanathar, Tasha) ficam em <b>Configurações → Livros</b>.</>,
    ],
  },
  {
    icon: 'quill',
    kicker: 'Passo 2',
    title: 'A ficha, aba por aba',
    lead: 'A aba Mesa reúne o que você usa no turno. As outras guardam o resto: Ficha, Combate, Inventário, Magias, Evoluir, Descanso e Diário.',
    tips: [
      <>Passe o mouse (ou segure o dedo) num número para ver <b>de onde ele vem</b>.</>,
      <>Em <b>Evoluir</b> você sobe de nível: a ficha pede só as escolhas novas.</>,
      <>No celular, as abas ficam na barra de baixo; o resto mora em <b>Mais</b>.</>,
    ],
  },
  {
    icon: 'd20',
    kicker: 'Passo 3',
    title: 'Clique no número e role',
    lead: 'Perícias, ataques, resistências e dano: tocar no valor rola o dado certo com o bônus certo. O resultado aparece no centro e vai para o histórico.',
    tips: [
      <>No topo da ficha você escolhe <b>Normal, Vantagem ou Desvantagem</b> para o próximo teste.</>,
      <>20 natural é <b>crítico</b> (a tela explode em luz); 1 natural é falha crítica.</>,
      <>Dados 3D com física ligam e desligam em <b>Configurações → Dados</b>.</>,
    ],
  },
  {
    icon: 'swords',
    kicker: 'Passo 4',
    title: 'Combate e descanso',
    lead: 'O painel de vida aplica dano e cura, controla PV temporários e testes contra a morte. Recursos de classe mostram quantos usos sobram.',
    tips: [
      <>Ataques com alvo comparam com a CA e aplicam o dano sozinhos.</>,
      <><b>Descanso curto</b> gasta dados de vida; <b>longo</b> recupera tudo — a ficha recarrega o que cada um devolve.</>,
      <>Ação, ação bônus e reação marcam o turno; <b>Novo turno</b> zera.</>,
    ],
  },
  {
    icon: 'banner',
    kicker: 'Passo 5',
    title: 'Mesas: jogue com amigos',
    lead: 'O mestre cria uma mesa e manda o link de convite. Cada jogador entra e vincula a sua ficha. Na sessão ao vivo todos veem o mapa, a iniciativa e as rolagens.',
    tips: [
      <>Mesas precisam de <b>conta</b> (a nuvem liga mestre e jogadores).</>,
      <>O mestre aplica dano e condições, controla NPCs, cenas e a névoa do mapa.</>,
      <>Rolagens podem ser públicas, só para o mestre ou privadas.</>,
    ],
  },
  {
    icon: 'image',
    kicker: 'Pronto',
    title: 'Do seu jeito',
    lead: 'Troque o tema (cada um tem cores, fontes e dados próprios), ligue a trilha sonora e escolha os livros da sua mesa em Configurações. O tutorial fica no menu principal.',
    tips: [
      <>Atalho: o menu <b>⋯</b> no topo de qualquer tela também troca o tema.</>,
      <>Envie a arte do seu personagem pelo botão <b>Sua arte</b> no retrato.</>,
    ],
  },
];

/**
 * Tutorial de boas-vindas: abre sozinho na 1ª visita (menu principal) e
 * pelo item "Tutorial". Setas ←/→ trocam o passo; Esc fecha.
 */
export function Onboarding() {
  const open = useUiStore((s) => s.tutorialOpen);
  const close = useUiStore((s) => s.closeTutorial);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const last = i === STEPS.length - 1;

  // sempre recomeça do primeiro passo
  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  const goTo = (n: number) => {
    setDir(n > i ? 1 : -1);
    setI(Math.max(0, Math.min(STEPS.length - 1, n)));
  };

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') goTo(i + 1);
      else if (e.key === 'ArrowLeft') goTo(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i]);

  const createHero = () => {
    close();
    if (!user) {
      rememberNext('/criar');
      navigate('/entrar');
    } else navigate('/criar');
  };

  const step = STEPS[i];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fv-onb-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fv-onb-title"
            className="fv-onb fv-panel"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ilustração: o símbolo do passo num sigilo, com o contador */}
            <div className="fv-onb-art" aria-hidden>
              <span className="fv-onb-count">
                {String(i + 1).padStart(2, '0')}
                <i>/{String(STEPS.length).padStart(2, '0')}</i>
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={i}
                  className="fv-onb-sigil"
                  initial={{ opacity: 0, rotate: -30 * dir, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 30 * dir, scale: 0.85 }}
                  transition={{ duration: 0.32 }}
                >
                  <Icon name={step.icon} size={64} />
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="fv-onb-body">
              <button type="button" className="fv-onb-skip" onClick={close}>
                {last ? 'Fechar' : 'Pular tutorial'}
              </button>
              <AnimatePresence mode="wait">
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 18 * dir }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 * dir }}
                  transition={{ duration: 0.24 }}
                >
                  <div className="fv-onb-kicker">{step.kicker}</div>
                  <h2 id="fv-onb-title">{step.title}</h2>
                  <p className="fv-onb-lead">{step.lead}</p>
                  <ul className="fv-onb-tips">
                    {step.tips.map((tip, k) => (
                      <li key={k}>{tip}</li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>

              <div className="fv-onb-foot">
                <div className="fv-onb-dots" role="tablist" aria-label="Passos do tutorial">
                  {STEPS.map((s, k) => (
                    <button
                      key={s.title}
                      type="button"
                      role="tab"
                      aria-selected={k === i}
                      aria-label={`Passo ${k + 1}: ${s.title}`}
                      className={k === i ? 'is-on' : k < i ? 'is-done' : ''}
                      onClick={() => goTo(k)}
                    />
                  ))}
                </div>
                <div className="fv-onb-actions">
                  {i > 0 && (
                    <button type="button" className="fv-btn-ghost fv-onb-btn" onClick={() => goTo(i - 1)}>
                      Voltar
                    </button>
                  )}
                  {last ? (
                    <button ref={primaryRef} type="button" className="fv-btn-gold fv-onb-btn" onClick={createHero}>
                      Criar meu herói
                    </button>
                  ) : (
                    <button ref={primaryRef} type="button" className="fv-btn-gold fv-onb-btn" onClick={() => goTo(i + 1)}>
                      Próximo ›
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
