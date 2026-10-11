import type { Character } from '@/types/character';
import { Panel, SectionLabel } from '@/components/ui/Panel';
import { LoreTooltip } from '@/components/ui/LoreTooltip';
import { choiceOptionLore, passiveLore } from '@/lib/lore';
import { getClass } from '@/data/classes';
import { getSubclass } from '@/data/subclasses';
import { featureInfo } from '@/data/featureInfo';
import { featuresGained } from '@/engine/levelUp';
import { choiceSummary, pendingChoices } from '@/engine/classChoices';

/**
 * Características de classe da ficha: tudo o que o herói ganhou, nível a
 * nível (com o que cada uma faz ao passar o mouse), e as escolhas feitas —
 * Metamagias, Estilos de Luta, Manobras…
 */
export function ClassFeaturesPanel({ char }: { char: Character }) {
  const levels = char.classLevels?.length ? char.classLevels : [{ classId: char.classId, level: char.level }];
  const choices = choiceSummary(char);
  const pending = pendingChoices(char).length;
  const sub = getSubclass(char.subclassId ?? undefined);

  return (
    <Panel>
      <SectionLabel right={sub ? <span style={{ fontSize: 12, color: 'var(--gold)' }}>{sub.label}</span> : undefined}>Características de Classe</SectionLabel>

      {choices.length > 0 && (
        <div className="fv-feat-choices">
          {choices.map((c) => (
            <div key={c.storeKey} className="fv-feat-choice">
              <span className="fv-feat-choice-label">{c.label}</span>
              <div className="fv-feat-chips">
                {c.options.map((o) => (
                  <LoreTooltip key={o.id} info={choiceOptionLore(o, c.label)}>
                    <span className="fv-chip fv-chip-gold" style={{ cursor: 'help' }}>{o.label}</span>
                  </LoreTooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {pending > 0 && (
        <div className="fv-spell-warn" style={{ marginTop: 10 }}>
          <b>Escolhas pendentes:</b> {pending} — resolva na aba Evoluir.
        </div>
      )}

      {levels.map((cl) => {
        const cls = getClass(cl.classId);
        const subId = cl.classId === char.classId ? char.subclassId : null;
        const rows = Array.from({ length: cl.level }, (_, i) => i + 1)
          .map((lv) => ({ lv, feats: featuresGained(cl.classId, lv, subId ?? null) }))
          .filter((r) => r.feats.length > 0);
        return (
          <div key={cl.classId} className="fv-feat-levels">
            {levels.length > 1 && <div className="fv-label" style={{ margin: '12px 0 6px' }}>{cls.label}</div>}
            {rows.map((r) => (
              <div key={r.lv} className="fv-feat-row">
                <span className="fv-feat-lv">{r.lv}</span>
                <div className="fv-feat-chips">
                  {r.feats.map((f) => {
                    const info = featureInfo(f);
                    return info ? (
                      <LoreTooltip key={f} info={passiveLore(f, `${cls.label} · nível ${r.lv}`, info, ['Característica'])}>
                        <span className="fv-chip" style={{ cursor: 'help', color: 'var(--ink)' }}>{f}</span>
                      </LoreTooltip>
                    ) : (
                      <span key={f} className="fv-chip" style={{ color: 'var(--ink)' }}>{f}</span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </Panel>
  );
}
