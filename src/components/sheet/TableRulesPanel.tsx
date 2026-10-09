import type { Character } from '@/types/character';
import { DEFAULT_CAMPAIGN } from '@/types/character';
import { useCharacterStore } from '@/store/characterStore';
import { stacksInspiration } from '@/engine/inspiration';
import type { RuleKind } from '@/engine/tableRules';
import { RULE_KIND_LABEL, sheetRuleNotes } from '@/engine/tableRules';

/**
 * Regras desta ficha. A base é o D&D 5e 2014; o que é regra opcional do
 * próprio livro, adaptação da mesa, homebrew ou ajuste manual fica
 * separado e com nome — nada disso se passa por comportamento padrão.
 */
export function TableRulesPanel({ char }: { char: Character }) {
  const updateCampaign = useCharacterStore((s) => s.updateCampaign);
  const campaign = { ...DEFAULT_CAMPAIGN, ...char.campaign };
  const stacking = stacksInspiration(char);
  const notes = sheetRuleNotes(char);

  return (
    <section id="fv-regras" className="fv-panel fv-rules" aria-labelledby="fv-regras-t">
      <header className="fv-rules-head">
        <h3 id="fv-regras-t" className="fv-label">Regras desta ficha</h3>
        <span className="fv-rules-base">D&amp;D 5e 2014</span>
      </header>
      <p className="fv-rules-intro">A ficha segue o Livro do Jogador 2014. O que a mesa muda aparece aqui, com o nome do que é.</p>

      <div className="fv-rules-group">
        <h4>Opcionais do próprio livro</h4>
        <RuleToggle kind="opcional" label="Talentos" desc="Trocar um aumento de atributo por um talento ao subir de nível." on={campaign.allowFeats} onToggle={() => updateCampaign(char.id, { allowFeats: !campaign.allowFeats })} />
        <RuleToggle kind="opcional" label="Multiclasse" desc="Subir de nível em outra classe, com os pré-requisitos do livro." on={campaign.allowMulticlass} onToggle={() => updateCampaign(char.id, { allowMulticlass: !campaign.allowMulticlass })} />
      </div>

      <div className="fv-rules-group">
        <h4>Regras da mesa (fora do 2014)</h4>
        <RuleToggle
          kind="mesa"
          label="Inspiração acumulável"
          desc="No 2014 o personagem tem ou não tem inspiração. Ligado, acumula até 10 pontos. Desligar deixa 1."
          on={stacking}
          onToggle={() => updateCampaign(char.id, { stackingInspiration: !stacking })}
        />
      </div>

      <div className="fv-rules-group">
        <h4>Nesta ficha</h4>
        {notes.length ? (
          <ul className="fv-rules-notes">
            {notes.map((n) => (
              <li key={n.text}>
                <RuleTag kind={n.kind} />
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fv-rules-empty">Nada fora do livro: tudo como no 2014.</p>
        )}
      </div>
    </section>
  );
}

export function RuleTag({ kind }: { kind: RuleKind }) {
  return <span className={`fv-rule-tag is-${kind}`}>{RULE_KIND_LABEL[kind]}</span>;
}

function RuleToggle({ kind, label, desc, on, onToggle }: { kind: RuleKind; label: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="fv-rule-row">
      <span className="fv-rule-text">
        <span className="fv-rule-name">
          <b>{label}</b>
          <RuleTag kind={kind} />
        </span>
        <small>{desc}</small>
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className="fv-switch" onClick={onToggle}>
        <span />
      </button>
    </div>
  );
}
