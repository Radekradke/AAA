import { Modal } from '@/components/ui/Modal';
import { useTheme } from '@/lib/useTheme';
import { hexA } from '@/lib/color';
import { SUPPORT, isConfigured } from '@/lib/support';

/** Convite discreto para apoiar o projeto (Apoia.se e GitHub Sponsors). */
export function SupportModal({ onClose }: { onClose: () => void }) {
  const t = useTheme();

  const links = [
    { key: 'apoiase', url: SUPPORT.apoiase, label: 'Apoiar no Apoia.se', desc: 'Apoio mensal recorrente', color: t.gold, icon: '❤' },
    { key: 'gh', url: SUPPORT.githubSponsors, label: 'GitHub Sponsors', desc: 'Patrocinar pelo GitHub', color: t.acc, icon: '✦' },
  ].filter((l) => isConfigured(l.url));

  return (
    <Modal title="Apoie a Ficha Viva" icon="spark" onClose={onClose} maxWidth={460}>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted)' }}>
        A Ficha Viva é gratuita e feita com carinho. Se ela deixou suas mesas mais bonitas,
        um apoio ajuda a manter o projeto vivo, pagar a hospedagem e trazer novidades. Qualquer
        valor faz diferença — obrigado! ♥
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((l) => (
          <a
            key={l.key}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
              padding: '14px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid ' + hexA(l.color, 0.5), background: hexA(l.color, 0.08),
              transition: '.2s',
            }}
          >
            <span style={{ fontSize: 20, color: l.color }}>{l.icon}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{l.label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{l.desc}</span>
            </span>
            <span style={{ color: l.color, fontSize: 18 }}>→</span>
          </a>
        ))}
        {links.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '10px 0' }}>
            Links de apoio ainda não configurados — edite <b style={{ color: 'var(--ink)' }}>src/lib/support.ts</b>.
          </div>
        )}
      </div>

      <p style={{ margin: '16px 0 0', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        Apoiar é totalmente opcional — o app continua 100% gratuito.
      </p>
    </Modal>
  );
}
