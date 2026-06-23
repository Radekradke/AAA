import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { useTilt } from '@/lib/useTilt';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { shortSubtitle, heroAvatar } from '@/lib/summary';
import { getClass } from '@/data/classes';
import { getRace } from '@/data/races';
import { deriveCharacter } from '@/engine/dndRules';
import type { Character } from '@/types/character';

export function CharacterSelect() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const bump = useUiStore((s) => s.bump);
  const t = useTheme();
  const tilt = useTilt();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const characters = useCharacterStore((s) => s.characters);
  const { setCurrent, deleteCharacter, duplicateCharacter, importCharacter } = useCharacterStore();

  const mine = useMemo(
    () =>
      characters
        .filter((c) => c.ownerId === user.id && !c.draft)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [characters, user.id],
  );

  const [confirmId, setConfirmId] = useState<string | null>(null);
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
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Screen
      scroll
      actions={
        <Button onClick={() => { logout(); navigate('/'); }} style={{ fontSize: 12.5 }}>
          Sair
        </Button>
      }
    >
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
            style={{
              margin: '6px 0 4px',
              fontFamily: "'Cinzel', serif",
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
                fontFamily: "'Cinzel', serif",
                boxShadow: '0 0 24px var(--bloom)',
              }}
            >
              +
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18, color: 'var(--gold)' }}>
              Novo Personagem
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Criação interativa em 7 capítulos</div>
          </button>

          {mine.map((c) => {
            const cls = getClass(c.classId);
            const race = getRace(c.raceId);
            const d = deriveCharacter(c);
            return (
              <div
                key={c.id}
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
                <button
                  onClick={() => open(c)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', padding: 18 }}
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
                          backgroundSize: 'cover',
                          backgroundPosition: '50% 22%',
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "'Cinzel', serif",
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
                          background: 'rgba(0,0,0,.26)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ fontFamily: "'Chakra Petch', monospace", fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                          {stat.v}
                        </div>
                        <div style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--muted)', marginTop: 2 }}>
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
                  }}
                >
                  <CardAction label="Duplicar" onClick={() => duplicateCharacter(c.id)} />
                  <CardAction
                    label={confirmId === c.id ? 'Confirmar?' : 'Excluir'}
                    danger
                    onClick={() => {
                      if (confirmId === c.id) {
                        deleteCharacter(c.id);
                        setConfirmId(null);
                      } else {
                        setConfirmId(c.id);
                      }
                    }}
                  />
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
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} style={{ display: 'none' }} />
          {importError && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{importError}</span>}
        </div>
      </div>
    </Screen>
  );
}

function CardAction({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize: 11.5,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid ' + (danger ? 'rgba(255,80,40,.4)' : 'var(--line)'),
        color: danger ? 'var(--danger)' : 'var(--muted)',
        background: 'rgba(0,0,0,.26)',
        transition: '.2s',
      }}
    >
      {label}
    </button>
  );
}
