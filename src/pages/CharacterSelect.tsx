import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/store/feedbackStore';
import { deleteHeroWithUndo, duplicateHero } from '@/lib/heroActions';
import { useNavigate } from 'react-router-dom';
import { prefetchOnIdle } from '@/lib/prefetch';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { useTilt } from '@/lib/useTilt';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { shortSubtitle, heroAvatar, heroFace, heroPortraitPosition } from '@/lib/summary';
import { getClass } from '@/data/classes';
import { raceOf } from '@/data/races';
import { derivedOf } from '@/lib/derivedCache';
import type { Character } from '@/types/character';
import { GuildDashboard } from '@/components/character/GuildDashboard';

export function CharacterSelect() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const bump = useUiStore((s) => s.bump);
  const theme = useUiStore((s) => s.theme);
  // tocar num herói abre a ficha na hora: o pedaço dela já vem com o aparelho ocioso
  useEffect(() => prefetchOnIdle('sheet', 'creator'), []);
  const t = useTheme();
  const tilt = useTilt();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const characters = useCharacterStore((s) => s.characters);
  const setCurrent = useCharacterStore((s) => s.setCurrent);
  const importCharacter = useCharacterStore((s) => s.importCharacter);

  const mine = useMemo(
    () =>
      characters
        .filter((c) => c.ownerId === user.id && !c.draft)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [characters, user.id],
  );

  const [importError, setImportError] = useState<string | null>(null);

  const open = (c: Character) => {
    setCurrent(c.id);
    bump(1.3);
    navigate(`/ficha/${c.id}`);
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importCharacter(String(reader.result), user.id);
      if (!res.ok) setImportError(res.error ?? 'Falha ao importar.');
      else {
        setImportError(null);
        bump(1.2);
        toast('Personagem importado.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Screen
      scroll
      actions={
        <>
          <Button variant="accent" onClick={() => navigate('/mesas')} style={{ fontSize: 12.5 }}>
            Mesas
          </Button>
          <Button onClick={() => navigate('/')} style={{ fontSize: 12.5 }}>
            Menu
          </Button>
        </>
      }
    >
      {theme === 'rubra' ? (
        <GuildDashboard
          heroes={mine}
          onOpen={open}
          onNew={() => { bump(1); navigate('/criar'); }}
          onImport={() => fileRef.current?.click()}
          importError={importError}
        />
      ) : (
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: 'clamp(72px,10vh,104px) clamp(16px,4vw,40px) 56px',
        }}
      >
        <div style={{ marginBottom: 'clamp(20px,3vh,32px)' }}>
          <div className="fv-label">Bem-vindo, {user.name}</div>
          <h1
            className="fv-page-title"
            style={{
              margin: '6px 0 4px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(28px,4.5vw,44px)',
              color: 'var(--ink)',
              textShadow: '0 0 30px var(--bloom)',
            }}
          >
            Seus Heróis
          </h1>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 15 }}>
            Escolha um personagem para jogar ou forje uma nova lenda.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(14px,2vw,20px)',
          }}
        >
          {/* card criar novo */}
          <button
            onClick={() => { bump(1); navigate('/criar'); }}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
            style={{
              cursor: 'pointer',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              borderRadius: 16,
              border: '1px dashed ' + hexA(t.gold, 0.5),
              background: 'linear-gradient(160deg, var(--panel), var(--panel2))',
              boxShadow: 'inset 0 0 30px ' + hexA(t.gold, 0.06),
              transition: 'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .3s',
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid var(--gold)',
                color: 'var(--gold)',
                fontSize: 28,
                fontFamily: 'var(--font-display)',
                boxShadow: '0 0 24px var(--bloom)',
              }}
            >
              +
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--gold)' }}>
              Novo Personagem
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Criação interativa em 7 capítulos</div>
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
                style={{
                  position: 'relative',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid var(--line)',
                  background: 'linear-gradient(160deg, var(--panel), var(--panel2))',
                  boxShadow: '0 16px 44px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05), inset 0 0 40px ' + hexA(cls.jewel, 0.08),
                  transition: 'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .3s',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* arte do herói ao fundo, esmaecendo para a esquerda (estilo seleção de personagem) */}
                <div
                  aria-hidden
                  className="fv-hero-card-art"
                  style={{ backgroundImage: `url("${heroAvatar(c)}")`, backgroundPosition: heroPortraitPosition(c) }}
                />
                <button
                  onClick={() => open(c)}
                  style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block', width: '100%', padding: 18, position: 'relative', zIndex: 1 }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: 64,
                        height: 64,
                        flex: 'none',
                        borderRadius: 999,
                        overflow: 'hidden',
                        border: '1px solid ' + race.jewel,
                        boxShadow: '0 0 24px var(--bloom)',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url("${heroAvatar(c)}")`,
                          ...heroFace(c),
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 19,
                          color: 'var(--ink)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 13, color: 'var(--acc)' }}>{shortSubtitle(c)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {[
                      { k: 'CA', v: d.ac },
                      { k: 'PV', v: `${c.hpCurrent}/${d.maxHp}` },
                      { k: 'PROF', v: `+${d.proficiency}` },
                    ].map((stat) => (
                      <div
                        key={stat.k}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '9px 4px',
                          borderRadius: 11,
                          background: 'rgba(6,8,12,.8)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {/* placa escura sobre a arte em qualquer modo: texto sempre claro */}
                        <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 16, color: '#f4f1ea' }}>
                          {stat.v}
                        </div>
                        <div style={{ fontSize: 9, letterSpacing: '.1em', color: '#ddd6c9', marginTop: 2 }}>
                          {stat.k}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    padding: '0 18px 16px',
                    justifyContent: 'flex-end',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <CardAction label="Duplicar" onClick={() => duplicateHero(c.id)} />
                  {/* exclui na hora; o aviso traz "Desfazer" */}
                  <CardAction label="Excluir" danger onClick={() => deleteHeroWithUndo(c.id)} />
                </div>
              </div>
            );
          })}
        </div>

        {mine.length === 0 && (
          <p style={{ marginTop: 24, color: 'var(--muted)', fontSize: 14 }}>
            Você ainda não tem heróis. Clique em <b style={{ color: 'var(--gold)' }}>Novo Personagem</b> para
            começar — ou importe um personagem salvo em JSON.
          </p>
        )}

        <div style={{ marginTop: 28, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => fileRef.current?.click()}>Importar personagem (JSON)</Button>
          {importError && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{importError}</span>}
        </div>
      </div>
      )}
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} style={{ display: 'none' }} />
    </Screen>
  );
}

function CardAction({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 11.5,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid ' + (danger ? 'rgba(255,80,40,.4)' : 'var(--line)'),
        color: danger ? 'var(--danger)' : 'var(--muted)',
        // fundo sólido: o card fica sobre a arte do herói (translúcido apagava o texto)
        background: 'var(--panel)',
        transition: '.2s',
      }}
    >
      {label}
    </button>
  );
}
