import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { mediaService, useMediaUrl } from '@/services/mediaService';
import { liveScene, useStageStore } from '@/store/stageStore';
import { gridFromColumns } from '@/engine/grid';
import { DEFAULT_GRID } from '@/types/stage';
import type { CutsceneBeat, GridConfig, Scene, SceneKind } from '@/types/stage';

const KINDS: { kind: SceneKind; title: string; hint: string }[] = [
  { kind: 'map', title: 'Mapa tático', hint: 'Grade de 1,5 m, peões e régua de movimento' },
  { kind: 'image', title: 'Ambiente', hint: 'Uma imagem para situar a mesa: cidade, taverna, paisagem' },
  { kind: 'cutscene', title: 'Cutscene', hint: 'Quadros com texto narrado, passando na tela de todos' },
];

/** Tamanho máximo por tipo (mapas pedem mais detalhe). */
const MAX_SIDE: Record<SceneKind, number> = { map: 3072, image: 1920, cutscene: 1920 };

/**
 * Biblioteca de cenas do mestre: prepara antes, põe no ar na hora.
 * Nada daqui aparece para os jogadores até ir ao ar.
 */
export function SceneLibrary({ campaignId, onShow }: { campaignId: string; onShow: () => void }) {
  const st = useStageStore();
  const live = liveScene(st);
  const [editing, setEditing] = useState<Scene | { kind: SceneKind } | null>(null);

  return (
    <section className="fv-panel fv-live-card fv-scenes">
      <div className="fv-label">Nova cena</div>
      <div className="fv-scene-kinds">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" className={`fv-scene-kind is-${k.kind}`} onClick={() => setEditing({ kind: k.kind })} disabled={st.missing}>
            <b>{k.title}</b>
            <small>{k.hint}</small>
          </button>
        ))}
      </div>
      {st.missing && <p className="fv-npc-alert">Rode supabase/palco.sql no Supabase para liberar as cenas.</p>}

      <div className="fv-label" style={{ marginTop: 18 }}>Suas cenas · {st.scenes.length}</div>
      {!st.scenes.length && <p className="fv-live-hint">Nenhuma cena ainda. Dica: suba o mapa da próxima luta e uma imagem de abertura antes da sessão.</p>}
      <div className="fv-scene-list">
        {st.scenes.map((s) => (
          <article key={s.id} className={'fv-scene-card' + (s.id === live?.id ? ' is-live' : '')}>
            <SceneThumb scene={s} />
            <div className="fv-scene-card-body">
              <b>{s.name}</b>
              <small>
                {KINDS.find((k) => k.kind === s.kind)?.title}
                {s.kind === 'cutscene' && ` · ${s.beats.length} quadro(s)`}
                {s.id === live?.id ? ' · no ar' : s.revealed ? ' · já mostrada' : ' · inédita'}
              </small>
              <div className="fv-scene-card-actions">
                {s.id === live?.id ? (
                  <button type="button" className="fv-btn-ghost" disabled={st.busy} onClick={() => void st.goLive(null)}>Tirar do ar</button>
                ) : (
                  <button type="button" className="fv-btn-gold" disabled={st.busy} onClick={() => void st.goLive(s.id).then(onShow)}>Pôr no ar</button>
                )}
                <button type="button" className="fv-btn-ghost" onClick={() => { st.viewScene(s.id); onShow(); }}>{s.kind === 'map' ? 'Preparar peões' : 'Ver'}</button>
                <button type="button" className="fv-btn-ghost" onClick={() => setEditing(s)}>Editar</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <SceneEditor
          campaignId={campaignId}
          scene={'id' in editing ? editing : null}
          kind={editing.kind}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function SceneThumb({ scene }: { scene: Scene }) {
  const path = scene.imagePath ?? scene.beats.find((b) => b.path)?.path ?? null;
  const { url } = useMediaUrl(path);
  return (
    <div className={`fv-scene-thumb is-${scene.kind}`} style={url ? { backgroundImage: `url("${url}")` } : undefined} aria-hidden>
      {!url && (scene.kind === 'map' ? '#' : scene.kind === 'cutscene' ? '▶' : '◐')}
    </div>
  );
}

function SceneEditor({ campaignId, scene, kind, onClose }: { campaignId: string; scene: Scene | null; kind: SceneKind; onClose: () => void }) {
  const st = useStageStore();
  const [name, setName] = useState(scene?.name ?? '');
  const [imagePath, setImagePath] = useState<string | null>(scene?.imagePath ?? null);
  const [grid, setGrid] = useState<GridConfig>(scene?.grid ?? DEFAULT_GRID);
  const [beats, setBeats] = useState<CutsceneBeat[]>(scene?.beats.length ? scene.beats : [{ path: null, text: '' }]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const uploaded = useMemo(() => new Set<string>(), []);

  const upload = async (file: File | undefined, key: string): Promise<string | null> => {
    if (!file) return null;
    setUploading(key);
    setErr(null);
    try {
      const { path } = await mediaService.upload(campaignId, file, MAX_SIDE[kind]);
      uploaded.add(path);
      if (!name.trim()) setName(file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 60));
      return path;
    } catch (e) {
      setErr((e as Error).message);
      return null;
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!name.trim()) return setErr('Dê um nome à cena.');
    if (kind === 'cutscene' && !beats.some((b) => b.path || b.text.trim())) return setErr('A cutscene precisa de pelo menos um quadro com imagem ou texto.');
    setSaving(true);
    const saved = await st.saveScene({
      id: scene?.id,
      kind,
      name,
      imagePath: kind === 'cutscene' ? null : imagePath,
      grid,
      beats: kind === 'cutscene' ? beats.filter((b) => b.path || b.text.trim()) : [],
      sort: scene?.sort ?? st.scenes.length,
    });
    setSaving(false);
    if (!saved) return setErr(useStageStore.getState().error ?? 'Não deu para salvar.');
    // imagens trocadas: limpa as antigas do Storage
    const keep = new Set([imagePath, ...beats.map((b) => b.path)]);
    const old = [scene?.imagePath, ...(scene?.beats.map((b) => b.path) ?? [])].filter((p) => p && !keep.has(p));
    void mediaService.remove(old);
    onClose();
  };

  const remove = async () => {
    if (!scene || !window.confirm(`Apagar a cena "${scene.name}"? Peões e imagens dela vão junto.`)) return;
    await st.removeScene(scene);
    void mediaService.remove([scene.imagePath, ...scene.beats.map((b) => b.path)]);
    onClose();
  };

  const close = () => {
    // enviou imagem e desistiu: não deixa lixo no Storage
    const kept = new Set([scene?.imagePath, ...(scene?.beats.map((b) => b.path) ?? [])]);
    void mediaService.remove([...uploaded].filter((p) => !kept.has(p)));
    onClose();
  };

  const title = scene ? `Editar ${scene.name}` : KINDS.find((k) => k.kind === kind)!.title;

  return (
    <Modal
      title={title}
      icon="crest"
      onClose={close}
      maxWidth={760}
      footer={
        <div className="fv-npc-editor-foot">
          {scene && <button type="button" className="fv-btn-ghost is-danger" onClick={() => void remove()}>Apagar</button>}
          {err && <span className="fv-npc-editor-err" role="alert">{err}</span>}
          <button type="button" className="fv-btn-gold" disabled={saving || !!uploading} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar cena'}</button>
        </div>
      }
    >
      <div className="fv-scene-editor">
        <input className="fv-input" placeholder="Nome (ex.: Cripta do Barão)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />

        {kind !== 'cutscene' && (
          <>
            <label className="fv-scene-upload">
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const p = await upload(e.target.files?.[0], 'main'); if (p) setImagePath(p); e.target.value = ''; }} />
              {uploading === 'main' ? 'Enviando e comprimindo…' : imagePath ? 'Trocar imagem' : kind === 'map' ? '+ Enviar mapa (PNG, JPG ou WebP)' : '+ Enviar imagem'}
            </label>
            {kind === 'map' && !imagePath && (
              <div className="fv-scene-blank">
                <span>Sem imagem? Use um tabuleiro em branco:</span>
                <label>Colunas <input className="fv-input" inputMode="numeric" value={grid.cols ?? 30} onChange={(e) => setGrid({ ...grid, cols: clamp(parseInt(e.target.value) || 30, 5, 80) })} /></label>
                <label>Linhas <input className="fv-input" inputMode="numeric" value={grid.rows ?? 20} onChange={(e) => setGrid({ ...grid, rows: clamp(parseInt(e.target.value) || 20, 5, 80) })} /></label>
              </div>
            )}
            {kind === 'map' && imagePath && <GridCalibrator path={imagePath} grid={grid} onChange={setGrid} />}
            {kind === 'image' && imagePath && <ScenePreview path={imagePath} />}
          </>
        )}

        {kind === 'cutscene' && (
          <div className="fv-beats">
            {beats.map((b, i) => (
              <div key={i} className="fv-beat">
                <div className="fv-beat-n">{i + 1}</div>
                <label className="fv-beat-img">
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const p = await upload(e.target.files?.[0], `b${i}`); if (p) setBeats((bs) => bs.map((x, j) => (j === i ? { ...x, path: p } : x))); e.target.value = ''; }} />
                  <BeatImage path={b.path} busy={uploading === `b${i}`} />
                </label>
                <textarea className="fv-input" rows={3} placeholder="Narração deste quadro (aparece letra por letra)…" value={b.text} maxLength={600} onChange={(e) => setBeats((bs) => bs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <div className="fv-beat-tools">
                  <button type="button" disabled={i === 0} onClick={() => setBeats((bs) => swap(bs, i, i - 1))} aria-label="Subir quadro">↑</button>
                  <button type="button" disabled={i === beats.length - 1} onClick={() => setBeats((bs) => swap(bs, i, i + 1))} aria-label="Descer quadro">↓</button>
                  <button type="button" disabled={beats.length === 1} onClick={() => setBeats((bs) => bs.filter((_, j) => j !== i))} aria-label="Apagar quadro">×</button>
                </div>
              </div>
            ))}
            {beats.length < 20 && (
              <button type="button" className="fv-btn-ghost" onClick={() => setBeats((bs) => [...bs, { path: null, text: '' }])}>+ Quadro</button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
function swap<T>(list: T[], a: number, b: number): T[] {
  const out = [...list];
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

function BeatImage({ path, busy }: { path: string | null; busy: boolean }) {
  const { url } = useMediaUrl(path);
  return (
    <span className="fv-beat-thumb" style={url ? { backgroundImage: `url("${url}")` } : undefined}>
      {busy ? 'Enviando…' : url ? '' : '+ Imagem'}
    </span>
  );
}

function ScenePreview({ path }: { path: string }) {
  const { url } = useMediaUrl(path);
  return url ? <img className="fv-scene-preview" src={url} alt="" /> : <div className="fv-map-loading">Carregando…</div>;
}

/**
 * Calibra a grade em cima do mapa: "quantos quadrados na largura" resolve
 * quase sempre; ajuste fino de tamanho e deslocamento para mapas com margem.
 */
function GridCalibrator({ path, grid, onChange }: { path: string; grid: GridConfig; onChange: (g: GridConfig) => void }) {
  const { url } = useMediaUrl(path);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [cols, setCols] = useState('');
  useEffect(() => {
    if (nat && !cols) setCols(String(Math.round((nat.w / grid.size) * 10) / 10));
  }, [nat]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fv-calib">
      <div className="fv-calib-view">
        {url ? <img src={url} alt="" onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} /> : <div className="fv-map-loading">Carregando…</div>}
        {nat && (
          <svg viewBox={`0 0 ${nat.w} ${nat.h}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <pattern id="calib" x={grid.ox} y={grid.oy} width={grid.size} height={grid.size} patternUnits="userSpaceOnUse">
                <path d={`M ${grid.size} 0 L 0 0 0 ${grid.size}`} fill="none" stroke="#ffd34d" strokeWidth={Math.max(1.5, nat.w / 900)} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#calib)" />
          </svg>
        )}
      </div>
      <div className="fv-calib-controls">
        <label>
          Quadrados na largura
          <input
            className="fv-input"
            inputMode="decimal"
            value={cols}
            onChange={(e) => {
              setCols(e.target.value);
              const n = parseFloat(e.target.value.replace(',', '.'));
              if (nat && n >= 2 && n <= 200) onChange(gridFromColumns(nat.w, n, grid));
            }}
          />
        </label>
        <label>
          Casa (px) <output>{grid.size.toFixed(1)}</output>
          <input type="range" min={10} max={nat ? Math.max(40, Math.round(nat.w / 4)) : 300} step={0.5} value={grid.size} onChange={(e) => onChange({ ...grid, size: Number(e.target.value) })} />
        </label>
        <label>
          Ajuste ↔
          <input type="range" min={0} max={grid.size} step={0.5} value={grid.ox} onChange={(e) => onChange({ ...grid, ox: Number(e.target.value) })} />
        </label>
        <label>
          Ajuste ↕
          <input type="range" min={0} max={grid.size} step={0.5} value={grid.oy} onChange={(e) => onChange({ ...grid, oy: Number(e.target.value) })} />
        </label>
        <label className="fv-bestiary-check">
          <input type="checkbox" checked={grid.show} onChange={(e) => onChange({ ...grid, show: e.target.checked })} /> Desenhar a grade (desligue se o mapa já tem quadriculado)
        </label>
        <p className="fv-live-hint">Conte os quadrados de uma borda à outra do mapa e digite acima; depois alinhe com os ajustes até as linhas amarelas baterem com o desenho. Cada casa vale 1,5 m.</p>
      </div>
    </div>
  );
}
