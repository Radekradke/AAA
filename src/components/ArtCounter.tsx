import { useMemo, useState } from 'react';
import { artInventory, artTotals, pct } from '@/lib/artInventory';
import type { ArtCategory } from '@/lib/artInventory';
import { toast } from '@/store/feedbackStore';

/**
 * Contador de artes (Configurações → Avançado): quanto já tem arte em cada
 * pasta e o que falta, contado direto dos arquivos do build.
 */
export default function ArtCounter() {
  const cats = useMemo(() => artInventory(), []);
  const all = artTotals(cats);
  return (
    <div className="fv-artcount">
      <p className="fv-artcount-total">
        <b>{all.have}</b> de {all.total} artes · <b>{pct(all.have, all.total)}%</b>
      </p>
      <ul className="fv-artcount-list">
        {cats.map((c) => (
          <CategoryRow key={c.key} c={c} />
        ))}
      </ul>
    </div>
  );
}

function Bar({ have, total }: { have: number; total: number }) {
  const p = pct(have, total);
  return (
    <span className={'fv-artcount-bar' + (have === total ? ' is-full' : '')} role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${p}%`}>
      <i style={{ width: `${p}%` }} />
    </span>
  );
}

function CategoryRow({ c }: { c: ArtCategory }) {
  const [open, setOpen] = useState(false);
  const missing = c.groups.flatMap((g) => g.missing);
  const copy = () => {
    const text = missing.map((m) => `${m.id}\t${m.name}`).join('\n');
    navigator.clipboard?.writeText(text).then(
      () => toast(`${missing.length} ids copiados (${c.label}).`, { tone: 'ok' }),
      () => toast('Não deu para copiar neste navegador.', { tone: 'danger' }),
    );
  };
  return (
    <li className={'fv-artcount-cat' + (open ? ' is-open' : '')}>
      <button type="button" className="fv-artcount-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="fv-artcount-name">{c.label}</span>
        <Bar have={c.have} total={c.total} />
        <span className="fv-artcount-num">
          {c.have}/{c.total}
          {c.have === c.total ? ' ✓' : ''}
        </span>
      </button>
      {open && (
        <div className="fv-artcount-body">
          <p className="fv-artcount-where">
            Pasta <code>{c.folder}</code> · guia <code>{c.guide}</code>
          </p>
          <ul className="fv-artcount-groups">
            {c.groups.map((g) => (
              <li key={g.label}>
                <span>{g.label}</span>
                <Bar have={g.have} total={g.total} />
                <span className="fv-artcount-num">
                  {g.have}/{g.total}
                </span>
              </li>
            ))}
          </ul>
          {missing.length > 0 ? (
            <details className="fv-artcount-missing">
              <summary>
                Faltam {missing.length} <button type="button" onClick={(e) => (e.preventDefault(), copy())}>Copiar ids</button>
              </summary>
              <ul>
                {missing.map((m) => (
                  <li key={m.id}>
                    <code>{m.id}</code> {m.name}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="fv-artcount-done">Tudo com arte.</p>
          )}
        </div>
      )}
    </li>
  );
}
