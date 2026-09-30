import { useEffect, useMemo, useState } from 'react';
import { zipSync } from 'fflate';
import { useNavigate } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { CLASSES } from '@/data/classes';
import { artKeyFromFileName } from '@/lib/heroArtName';
import { heroArtKeys, heroFaces } from '@/lib/summary';

/** Tamanho dos retratos oficiais (3:4), igual aos que já estão no app. */
const OUT_W = 768;
const OUT_H = 1024;
const QUALITY = 0.86;

interface Item {
  id: string;
  file: File;
  key: string | null;
  url: string | null;
  blob: Blob | null;
  face: [number, number];
  error?: string;
}

function kb(n: number): string {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

/** Reduz e recorta para 3:4 (centralizado, puxando para o topo, onde fica o rosto) e salva em WebP. */
async function toPortrait(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(OUT_W / bmp.width, OUT_H / bmp.height);
  const w = bmp.width * scale;
  const h = bmp.height * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (OUT_W - w) / 2, Math.min(0, (OUT_H - h) * 0.25), w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', QUALITY));
  if (!blob) throw new Error('Este navegador não gera WebP — tente no Chrome ou Edge.');
  return blob;
}

const GENDERS = [
  { id: 'masc', label: 'Masculino' },
  { id: 'fem', label: 'Feminino' },
];

/**
 * Oficina de Retratos: as artes originais costumam passar do limite de 25 MB
 * do upload pelo site do GitHub. Aqui elas viram WebP de ~100–300 KB com o
 * nome certo, prontas para soltar em src/assets/herois.
 */
export function PortraitWorkshop() {
  const nav = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const existing = useMemo(() => heroArtKeys(), []);

  useEffect(() => () => items.forEach((it) => it.url && URL.revokeObjectURL(it.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    for (const file of list) {
      const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      const key = artKeyFromFileName(file.name);
      setItems((cur) => [...cur, { id, file, key, url: null, blob: null, face: key ? heroFaces()[key] ?? [42, 17] : [42, 17] }]);
      try {
        const blob = await toPortrait(file);
        const url = URL.createObjectURL(blob);
        setItems((cur) => cur.map((it) => (it.id === id ? { ...it, blob, url } : it)));
      } catch (e) {
        setItems((cur) => cur.map((it) => (it.id === id ? { ...it, error: (e as Error).message } : it)));
      }
    }
  };

  const setKey = (id: string, classId: string, gender: string) =>
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, key: classId ? `${classId}-${gender}` : null } : it)));

  const ready = items.filter((it) => it.blob && it.key);
  const dupKeys = new Set(ready.map((it) => it.key).filter((k, i, a) => a.indexOf(k) !== i));

  const download = async () => {
    const files: Record<string, Uint8Array> = {};
    const faces = { ...heroFaces() };
    for (const it of ready) {
      files[`${it.key}.webp`] = new Uint8Array(await it.blob!.arrayBuffer());
      faces[it.key!] = it.face;
    }
    files['rostos.json'] = new TextEncoder().encode(
      '{\n' + Object.entries(faces).map(([k, v]) => `  "${k}": [${v[0]}, ${v[1]}]`).join(',\n') + '\n}\n',
    );
    const zip = zipSync(files, { level: 0 });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
    a.download = 'retratos-ficha-viva.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  return (
    <Screen scroll actions={<Button onClick={() => nav('/personagens')} style={{ fontSize: 12.5 }}>Heróis</Button>}>
      <div className="fv-workshop">
        <Panel>
          <SectionLabel>Oficina de Retratos</SectionLabel>
          <p className="fv-workshop-text">
            O site do GitHub não aceita arquivos acima de 25 MB. Solte aqui as artes originais (PNG/JPG de qualquer tamanho): elas saem em
            WebP 768×1024, com ~100–300 KB, e o nome certo para cada classe. Nada é enviado para a internet: tudo acontece no seu navegador.
          </p>
          <ol className="fv-workshop-steps">
            <li>Arraste as imagens. Se o nome for tipo <code>Monge masculino.png</code> ou <code>wizard-fem.png</code>, a classe é reconhecida sozinha; senão, escolha abaixo.</li>
            <li>Clique no rosto de cada retrato (é para onde o avatar redondo aponta).</li>
            <li>Baixe o .zip, descompacte e, no GitHub, abra a pasta <code>src/assets/herois</code> → <b>Add file → Upload files</b> → arraste os <code>.webp</code> e o <code>rostos.json</code> → <b>Commit</b>.</li>
          </ol>
        </Panel>

        <Panel>
          <SectionLabel>Situação dos retratos</SectionLabel>
          <div className="fv-workshop-status">
            {CLASSES.map((c) => (
              <div key={c.id} className="fv-workshop-class">
                <b>{c.label}</b>
                {GENDERS.map((g) => {
                  const k = `${c.id}-${g.id}`;
                  const pending = ready.some((it) => it.key === k);
                  return (
                    <span key={g.id} className={'fv-workshop-slot' + (existing[k] ? ' is-ok' : pending ? ' is-new' : '')}>
                      {existing[k] ? <img src={existing[k]} alt="" /> : null}
                      {g.id === 'masc' ? 'M' : 'F'} {existing[k] ? '✔' : pending ? 'novo' : 'falta'}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </Panel>

        <label
          className={'fv-workshop-drop' + (drag ? ' is-drag' : '')}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void addFiles(e.dataTransfer.files);
          }}
        >
          <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} />
          <b>Solte as imagens aqui</b>
          <span>ou toque para escolher · PNG, JPG ou WebP, qualquer tamanho</span>
        </label>

        {items.length > 0 && (
          <div className="fv-workshop-grid">
            {items.map((it) => {
              const [cls, gen] = (it.key ?? '-').split('-');
              return (
                <Panel key={it.id} className="fv-workshop-item">
                  <div
                    className="fv-workshop-preview"
                    onClick={(e) => {
                      const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const face: [number, number] = [Math.round(((e.clientX - r.left) / r.width) * 100), Math.round(((e.clientY - r.top) / r.height) * 100)];
                      setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, face } : x)));
                    }}
                    title="Clique no rosto"
                  >
                    {it.url ? <img src={it.url} alt="" /> : <span className="fv-workshop-wait">{it.error ?? 'Convertendo…'}</span>}
                    {it.url && <i className="fv-workshop-face" style={{ left: `${it.face[0]}%`, top: `${it.face[1]}%` }} />}
                  </div>
                  <div className="fv-workshop-meta">
                    <small title={it.file.name}>{it.file.name}</small>
                    <small>
                      {kb(it.file.size)} → <b>{it.blob ? kb(it.blob.size) : '…'}</b>
                    </small>
                    <div className="fv-workshop-selects">
                      <select className="fv-input" value={cls === '' ? '' : cls} onChange={(e) => setKey(it.id, e.target.value, gen || 'masc')}>
                        <option value="">Classe…</option>
                        {CLASSES.map((c) => (
                          <option key={c.id} value={c.id} style={{ color: '#111' }}>{c.label}</option>
                        ))}
                      </select>
                      <select className="fv-input" value={gen || 'masc'} onChange={(e) => setKey(it.id, cls, e.target.value)} disabled={!it.key}>
                        {GENDERS.map((g) => (
                          <option key={g.id} value={g.id} style={{ color: '#111' }}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    {it.key && existing[it.key] && <small className="fv-workshop-warn">Substitui o retrato atual.</small>}
                    {it.key && dupKeys.has(it.key) && <small className="fv-workshop-warn">Duas imagens para o mesmo retrato.</small>}
                    <button type="button" className="fv-btn-ghost" onClick={() => setItems((cur) => cur.filter((x) => x.id !== it.id))}>
                      Remover
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="fv-workshop-actions">
            <button type="button" className="fv-btn-gold" disabled={!ready.length || dupKeys.size > 0} onClick={() => void download()}>
              Baixar {ready.length} retrato{ready.length === 1 ? '' : 's'} (.zip)
            </button>
            <span>{items.length - ready.length > 0 ? `${items.length - ready.length} sem classe definida ou ainda convertendo.` : 'Tudo pronto.'}</span>
          </div>
        )}
      </div>
    </Screen>
  );
}
