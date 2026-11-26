import { useState } from 'react';

export function NpcVitalsForm({ ac, hp, label, onSave }: {
  ac?: number | null;
  hp?: number | null;
  label: string;
  onSave: (ac: number | null, hp: number | null) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <form className="fv-quick-form" onSubmit={async (e) => {
      e.preventDefault();
      const fields = new FormData(e.currentTarget);
      const number = (name: string) => {
        const value = fields.get(name);
        return value ? Number(value) : null;
      };
      setBusy(true);
      try {
        await onSave(number('ac'), number('hp'));
      } finally {
        setBusy(false);
      }
    }}>
      <div className="fv-quick-grid">
        <label>CA <input className="fv-input" name="ac" type="number" min={0} max={999} defaultValue={ac ?? ''} /></label>
        <label>PV máximos <input className="fv-input" name="hp" type="number" min={1} max={9999} defaultValue={hp ?? ''} /></label>
      </div>
      <button type="submit" className="fv-btn-ghost fv-bs-mini" disabled={busy}>{label}</button>
    </form>
  );
}
