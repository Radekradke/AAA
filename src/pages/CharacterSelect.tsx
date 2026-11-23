import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/store/feedbackStore';
import { deleteHeroWithUndo, duplicateHero } from '@/lib/heroActions';
import { useNavigate } from 'react-router-dom';
import { prefetchOnIdle } from '@/lib/prefetch';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { GAME_ICONS } from '@/components/ui/gameIcons';
import type { IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { useTilt } from '@/lib/useTilt';
import '@/styles/heroes.css';
import { shortSubtitle, heroAvatar, heroFace, heroPortraitPosition } from '@/lib/summary';
import { getClass } from '@/data/classes';
import { raceOf } from '@/data/races';
import { derivedOf } from '@/lib/derivedCache';
import type { Character } from '@/types/character';
import { GuildDashboard } from '@/components/character/GuildDashboard';
import { HeroRescueNotice } from '@/components/character/HeroRescueNotice';
import { BackupReminder } from '@/components/character/BackupReminder';
import { PasteImportModal } from '@/components/character/PasteImportModal';
import { DdbImportModal } from '@/components/character/DdbImportModal';
import { QuickHeroModal } from '@/components/character/QuickHeroModal';
import { importHeroText } from '@/lib/heroImport';

export function CharacterSelect() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const bump = useUiStore((s) => s.bump);
  const theme = useUiStore((s) => s.theme);
  // tocar num herói abre a ficha na hora: o pedaço dela já vem com o aparelho ocioso
  useEffect(() => prefetchOnIdle('sheet', 'creator'), []);
  const tilt = useTilt();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const characters = useCharacterStore((s) => s.characters);
  const setCurrent = useCharacterStore((s) => s.setCurrent);

  const mine = useMemo(
    () =>
      characters
        .filter((c) => c.ownerId === user.id && !c.draft)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [characters, user.id],
  );

  const [importError, setImportError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [ddb, setDdb] = useState(false);
  // Herói rápido: também abre direto quando a Home manda (estado da navegação)
  const [quick, setQuick] = useState(() => !!(window.history.state?.usr as { quick?: boolean } | undefined)?.quick);

  const openId = (id: string) => {
    setCurrent(id);
    bump(1.3);
    navigate(`/ficha/${id}`);
  };
  const open = (c: Character) => openId(c.id);

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importHeroText(String(reader.result), user.id);
      if (!res.ok) setImportError(res.error ?? 'Falha ao importar.');
      else {
        setImportError(null);
        bump(1.2);
        toast(res.warnings?.length ? `Personagem importado — ${res.warnings.length} ajuste(s): ${res.warnings[0]}` : 'Personagem importado.', { tone: res.warnings?.length ? 'info' : 'ok' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Screen
      scroll
    >
      {theme === 'rubra' ? (
        <GuildDashboard
          heroes={mine}
          onOpen={open}
          onNew={() => { bump(1); navigate('/criar'); }}
          onImport={() => fileRef.current?.click()}
          onPaste={() => setPasting(true)}
          importError={importError}
          notices={
            <>
              <HeroRescueNotice />
              <BackupReminder />
            </>
          }
        />
      ) : (
      <div className="fv-heroes">
        <div className="fv-heroes-head">
          <div className="fv-label">Bem-vindo, {user.name}</div>
          <h1 className="fv-page-title">
            Seus Heróis
          </h1>
          <p className="fv-heroes-lead">
            Escolha um personagem para jogar ou forje uma nova lenda.
          </p>
        </div>
        <div className="fv-rescue-slot">
          <HeroRescueNotice />
          <BackupReminder />
        </div>

        <div className="fv-heroes-grid">
          {/* card criar novo */}
          <button
            className="fv-new-hero"
            onClick={() => { bump(1); navigate('/criar'); }}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
          >
            <div className="fv-new-hero-plus">
              +
            </div>
            <span className="fv-new-hero-text">
              <span className="fv-new-hero-title">Novo Personagem</span>
              <span className="fv-new-hero-sub">Criação interativa, capítulo a capítulo</span>
            </span>
          </button>

          {mine.map((c) => {
            const cls = getClass(c.classId);
            const race = raceOf(c);
            const d = derivedOf(c);
            return (
              <div
                key={c.id}
                className="fv-hero-card"
                onMouseMove={tilt.onMouseMove}
                onMouseLeave={tilt.onMouseLeave}
                style={{ '--jewel': cls.jewel } as React.CSSProperties}
              >
                {/* arte do herói ao fundo, esmaecendo para a esquerda (estilo seleção de personagem) */}
                <div
                  aria-hidden
                  className="fv-hero-card-art"
                  style={{ backgroundImage: `url("${heroAvatar(c)}")`, backgroundPosition: heroPortraitPosition(c) }}
                />
                <button type="button" className="fv-hero-card-main" onClick={() => open(c)}>
                  <div className="fv-hero-card-top">
                    <span className="fv-hero-card-face">
                    <div className="fv-hero-card-avatar" style={{ '--race': race.jewel } as React.CSSProperties}>
                      <div style={{ backgroundImage: `url("${heroAvatar(c)}")`, ...heroFace(c) }} />
                    </div>
                      {/* selo discreto da raça (a classe já aparece na arte) */}
                      <span className="fv-hero-card-race" style={{ color: race.jewel }} title={race.label} aria-hidden>
                        <Icon name={raceIcon(race)} size={13} />
                      </span>
                    </span>
                    <div className="fv-hero-card-text">
                      <div className="fv-hero-card-name">
                        {c.name}
                      </div>
                      <div className="fv-hero-card-sub">{shortSubtitle(c)}</div>
                    </div>
                  </div>

                  <div className="fv-hero-card-stats">
                    {[
                      { k: 'CA', v: d.ac },
                      { k: 'PV', v: `${c.hpCurrent}/${d.maxHp}` },
                      { k: 'PROF', v: `+${d.proficiency}` },
                    ].map((stat) => (
                      <div key={stat.k} className="fv-hero-card-stat">
                        {/* placa escura sobre a arte em qualquer modo: texto sempre claro */}
                        <div className="fv-hero-card-stat-v">
                          {stat.v}
                        </div>
                        <div className="fv-hero-card-stat-k">
                          {stat.k}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>

                {/* abrir em destaque; duplicar perto; excluir afastado (e com Desfazer no aviso) */}
                <div className="fv-hero-card-actions">
                  <button type="button" className="fv-hero-open" onClick={() => open(c)} aria-label={`Abrir a ficha de ${c.name}`}>
                    Abrir ficha <span aria-hidden>›</span>
                  </button>
                  <CardAction icon="copy" label="Duplicar" name={c.name} onClick={() => duplicateHero(c.id)} />
                  <span className="fv-hero-card-sep" aria-hidden />
                  <CardAction icon="trash" label="Excluir" name={c.name} danger onClick={() => deleteHeroWithUndo(c.id)} />
                </div>
              </div>
            );
          })}
        </div>

        {mine.length === 0 && (
          <p className="fv-heroes-empty">
            Você ainda não tem heróis. Clique em <b>Novo Personagem</b> para
            começar — ou importe um personagem salvo em JSON.
          </p>
        )}

        <div className="fv-heroes-tools">
          <Button onClick={() => fileRef.current?.click()}>Importar personagem (JSON)</Button>
          <Button onClick={() => setPasting(true)}>Colar ficha (ChatGPT)</Button>
          <Button onClick={() => setDdb(true)}>Importar do D&amp;D Beyond</Button>
          <Button onClick={() => setQuick(true)}>Herói rápido (one-shot)</Button>
          {importError && <span className="fv-heroes-error">{importError}</span>}
        </div>
      </div>
      )}
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} hidden />
      {quick && (
        <QuickHeroModal
          ownerId={user.id}
          onClose={() => setQuick(false)}
          onOpen={(id) => {
            setQuick(false);
            toast('Herói rápido pronto.');
            openId(id);
          }}
        />
      )}
      {ddb && (
        <DdbImportModal
          ownerId={user.id}
          onClose={() => setDdb(false)}
          onOpen={(id) => {
            setDdb(false);
            toast('Herói importado do D&D Beyond.');
            openId(id);
          }}
        />
      )}
      {pasting && (
        <PasteImportModal
          ownerId={user.id}
          onClose={() => setPasting(false)}
          onOpen={(id) => {
            setPasting(false);
            toast('Herói importado.');
            openId(id);
          }}
        />
      )}
    </Screen>
  );
}

function CardAction({ icon, label, name, onClick, danger }: { icon: IconName; label: string; name: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={'fv-hero-act' + (danger ? ' is-danger' : '')} onClick={onClick} title={`${label} ${name}`} aria-label={`${label} ${name}`}>
      <Icon name={icon} size={15} />
      <span>{label}</span>
    </button>
  );
}

/** Ícone da raça (o do livro, o escolhido na raça homebrew, ou o brasão). */
function raceIcon(race: { id: string; icon?: string }): IconName {
  if (race.icon && race.icon in GAME_ICONS) return race.icon as IconName;
  const own = `race-${race.id}`;
  return (own in GAME_ICONS ? own : 'crest') as IconName;
}
