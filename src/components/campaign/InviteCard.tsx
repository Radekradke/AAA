import { useEffect, useMemo, useState } from 'react';
import { confirmAction, toast } from '@/store/feedbackStore';
import { formatCode } from '@/lib/inviteCode';
import type { InviteLink } from '@/types/models';

interface Props {
  invite: InviteLink;
  campaignName: string;
  onNewCode: () => Promise<void>;
}

/** Link curto: com código vira /sala/K7Q4-2MXP (dá para digitar); sem código, o token. */
export function inviteUrl(inv: InviteLink): string {
  return `${window.location.origin}/sala/${inv.code ? formatCode(inv.code) : inv.token}`;
}

/**
 * Convite da mesa (mestre): código curto para ditar na mesa, link para
 * mandar no grupo e QR code para apontar a câmera — sem precisar do link.
 */
export function InviteCard({ invite, campaignName, onNewCode }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [busy, setBusy] = useState(false);
  const url = inviteUrl(invite);
  const code = invite.code ? formatCode(invite.code) : null;

  const copy = async (what: 'code' | 'link') => {
    const text = what === 'code' && code ? code : url;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      window.prompt('Copie:', text);
    }
  };

  const share = async () => {
    const text = code ? `Entre na mesa "${campaignName}" no Ficha Viva com o código ${code}` : `Entre na mesa "${campaignName}" no Ficha Viva`;
    try {
      await navigator.share({ title: 'Convite — Ficha Viva', text, url });
    } catch {
      /* cancelou o compartilhamento */
    }
  };

  const renew = async () => {
    const ok = await confirmAction({
      title: 'Gerar um código novo?',
      message: 'O código e o QR atuais param de funcionar. Quem já está na mesa continua nela.',
      confirmLabel: 'Gerar novo',
    });
    if (!ok) return;
    setBusy(true);
    await onNewCode().catch((e: Error) => toast(e.message, { tone: 'danger' }));
    setBusy(false);
    toast('Código novo pronto — o antigo não vale mais.', { tone: 'ok' });
  };

  return (
    <section className="fv-panel fv-invite" aria-labelledby="fv-invite-title">
      <div className="fv-invite-main">
        <div className="fv-invite-text">
          <h2 id="fv-invite-title" className="fv-label">Convite — chame os jogadores</h2>
          {code ? (
            <>
              <p className="fv-invite-code" aria-label={`Código ${code.split('').join(' ')}`}>
                {code}
              </p>
              <p className="fv-invite-hint">
                Na tela <b>Mesas</b>, o jogador toca em <b>Entrar com código</b> — ou aponta a câmera para o QR.
              </p>
            </>
          ) : (
            <>
              <p className="fv-invite-link">{url}</p>
              <p className="fv-invite-hint">Para ter código curto e QR, rode <code>supabase/recursos_extras.sql</code> no Supabase.</p>
            </>
          )}
        </div>
        <div className="fv-invite-actions">
          {code && (
            <button type="button" className="fv-btn-gold" onClick={() => void copy('code')}>
              {copied === 'code' ? '✓ Copiado' : 'Copiar código'}
            </button>
          )}
          <button type="button" className={code ? 'fv-btn-ghost' : 'fv-btn-gold'} onClick={() => void copy('link')}>
            {copied === 'link' ? '✓ Copiado' : 'Copiar link'}
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button type="button" className="fv-btn-ghost" onClick={() => void share()}>
              Compartilhar
            </button>
          )}
          <button type="button" className="fv-btn-ghost" aria-expanded={qrOpen} aria-controls="fv-invite-qr" onClick={() => setQrOpen((v) => !v)}>
            {qrOpen ? 'Esconder QR' : 'Mostrar QR'}
          </button>
        </div>
      </div>
      {qrOpen && (
        <div className="fv-invite-qr" id="fv-invite-qr">
          <QrCode text={url} label={`QR code do convite para ${campaignName}`} fileName={`convite-${slug(campaignName)}`} />
          {code && (
            <button type="button" className="fv-textlink" disabled={busy} onClick={() => void renew()}>
              {busy ? 'Gerando…' : 'Gerar novo código (invalida o atual)'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mesa';
}

type Matrix = boolean[][];

/** QR code desenhado em SVG (nítido em qualquer tela); a biblioteca só baixa quando abre. */
function QrCode({ text, label, fileName }: { text: string; label: string; fileName: string }) {
  const [m, setM] = useState<Matrix | null>(null);
  useEffect(() => {
    let alive = true;
    void import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      const out: Matrix = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
      if (alive) setM(out);
    });
    return () => {
      alive = false;
    };
  }, [text]);

  const path = useMemo(() => {
    if (!m) return '';
    let d = '';
    m.forEach((row, r) => row.forEach((on, c) => on && (d += `M${c + 4} ${r + 4}h1v1h-1z`)));
    return d;
  }, [m]);

  const download = () => {
    if (!m) return;
    const cell = 12, size = (m.length + 8) * cell;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    m.forEach((row, r) => row.forEach((on, c) => on && ctx.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell)));
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `${fileName}.png`;
    a.click();
  };

  if (!m) return <div className="fv-qr is-loading" role="status">Gerando QR…</div>;
  const n = m.length + 8; // 4 módulos de margem de cada lado (zona de silêncio)
  return (
    <div className="fv-qr-wrap">
      {/* sempre preto no branco: é o que as câmeras leem melhor, em qualquer tema */}
      <svg className="fv-qr" viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <rect width={n} height={n} fill="#fff" />
        <path d={path} fill="#000" />
      </svg>
      <button type="button" className="fv-btn-ghost" onClick={download}>
        Baixar imagem do QR
      </button>
    </div>
  );
}
