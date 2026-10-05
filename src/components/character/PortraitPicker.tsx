import { useEffect, useRef, useState } from 'react';
import { processPortraitFile } from '@/lib/portrait';
import { Icon } from '@/components/ui/Icon';

interface PortraitPickerProps {
  /** Retrato atual enviado pelo jogador (se houver). */
  portrait?: string | null;
  onChange: (dataUrl: string | null) => void;
  /** 'chip' (sobre o retrato grande) ou 'badge' (bolinha sobre o avatar redondo da ficha). */
  variant?: 'chip' | 'badge';
  /** Tamanho máximo da imagem salva (itens usam menor que retratos). */
  max?: { w: number; h: number };
  /** Rótulos do botão (padrão: arte do personagem). */
  labels?: { add: string; change: string };
}

/**
 * "Sua arte": o jogador envia a imagem do próprio personagem. Ela é reduzida,
 * tem o fundo branco liso recortado (quando houver) e fica salva na ficha.
 */
export function PortraitPicker({ portrait, onChange, variant = 'chip', max, labels }: PortraitPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), msg.error ? 5000 : 2600);
    return () => window.clearTimeout(t);
  }, [msg]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await processPortraitFile(file, max ? { max } : {});
      onChange(r.dataUrl);
      setMsg({ text: r.cutout ? 'Arte aplicada · fundo recortado' : 'Arte aplicada' });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Não foi possível usar essa imagem.', error: true });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const open = () => input.current?.click();
  const label = busy ? 'Processando…' : portrait ? labels?.change ?? 'Trocar arte' : labels?.add ?? 'Sua arte';

  return (
    <div className={'fv-portrait-picker is-' + variant}>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {variant === 'badge' ? (
        <>
          <button type="button" className="fv-portrait-badge" onClick={open} disabled={busy} aria-label={portrait ? labels?.change ?? 'Trocar a arte do personagem' : labels?.add ?? 'Enviar a arte do personagem'} title={portrait ? labels?.change ?? 'Trocar arte' : labels?.add ?? 'Enviar sua arte'}>
            <Icon name="image" size={14} />
          </button>
          {portrait && !busy && (
            <button type="button" className="fv-portrait-badge is-remove" onClick={() => onChange(null)} aria-label="Voltar à arte padrão" title="Voltar à arte padrão">
              <Icon name="close" size={11} />
            </button>
          )}
        </>
      ) : (
        <>
          <button type="button" className="fv-portrait-btn" onClick={open} disabled={busy} title="Envie a arte do seu personagem (PNG, JPG ou WebP)">
            <Icon name="image" size={15} />
            {label}
          </button>
          {portrait && !busy && (
            <button type="button" className="fv-portrait-btn is-icon" onClick={() => onChange(null)} aria-label="Voltar à arte padrão" title="Voltar à arte padrão">
              <Icon name="close" size={13} />
            </button>
          )}
        </>
      )}
      {msg && (
        <span className={'fv-portrait-msg' + (msg.error ? ' is-error' : '')} role={msg.error ? 'alert' : 'status'}>
          {msg.text}
        </span>
      )}
    </div>
  );
}
