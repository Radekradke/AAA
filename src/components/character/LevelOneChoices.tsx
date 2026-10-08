import type { StepProps } from './stepTypes';
import { subclassesFor } from '@/data/subclasses';
import { clearSubclassChoices, creationChoices } from '@/engine/classChoices';
import { SUBCLASS_TITLE, subclassAtCreation } from '@/engine/creationSummary';
import { revalidateKit } from '@/engine/loadout';

/**
 * Escolhas do 1º nível feitas já na criação (antes ficavam pendentes na aba
 * Evoluir): subclasse de Clérigo/Feiticeiro/Bruxo, Estilo de Luta, Inimigo
 * Favorito, instrumentos do Bardo, ferramenta do Monge e do Anão…
 * `scope` separa o que aparece no Caminho (classe) e na Origem (raça).
 */
export function LevelOneChoices({ char, update, scope }: StepProps & { scope: 'class' | 'race' }) {
  const choices = creationChoices(char, scope);
  const subs = scope === 'class' && subclassAtCreation(char) ? subclassesFor(char.classId) : [];
  const sub = subs.find((s) => s.id === char.subclassId);
  if (!subs.length && !choices.length) return null;

  const pickSub = (id: string) =>
    update((c) => {
      if (c.subclassId === id) return;
      clearSubclassChoices(c);
      c.subclassId = id;
      // domínio sem armadura pesada/armas marciais: o kit volta ao que ele pode usar
      revalidateKit(c);
    });
  const toggle = (key: string, total: number, id: string) =>
    update((c) => {
      const cur = c.choices?.[key] ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : total === 1 ? [id] : [...cur, id].slice(-total);
      c.choices = { ...(c.choices ?? {}), [key]: next };
    });

  return (
    <>
      {subs.length > 0 && (
        <div className="fv-detail-sub fv-lv1">
          <div className="fv-facts-title">{SUBCLASS_TITLE[char.classId] ?? 'Subclasse'} · escolha do 1º nível</div>
          <div className="fv-pills" role="radiogroup" aria-label={SUBCLASS_TITLE[char.classId] ?? 'Subclasse'}>
            {subs.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={char.subclassId === s.id} title={s.desc} className={'fv-pill' + (char.subclassId === s.id ? ' is-on' : '')} onClick={() => pickSub(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <small className={'fv-langs-why' + (sub ? '' : ' is-due')}>
            {sub ? `${sub.desc} No 1º nível: ${(sub.features[1] ?? []).join(', ')}.` : 'Obrigatório: define poderes e magias já no 1º nível.'}
          </small>
        </div>
      )}
      {choices.map((c) => {
        const picked = c.options.filter((o) => c.chosen.includes(o.id));
        return (
          <div key={c.spec.storeKey} className="fv-detail-sub fv-lv1">
            <div className="fv-facts-title">
              {c.spec.label}
              {c.total > 1 ? ` · ${c.chosen.length} de ${c.total}` : ''}
            </div>
            <div className="fv-pills" role="group" aria-label={c.spec.label}>
              {c.options.map((o) => {
                const on = c.chosen.includes(o.id);
                return (
                  <button key={o.id} type="button" aria-pressed={on} title={o.desc} className={'fv-pill' + (on ? ' is-on' : '')} onClick={() => toggle(c.spec.storeKey, c.total, o.id)}>
                    {o.label}
                    {o.tag && <small>{o.tag}</small>}
                  </button>
                );
              })}
            </div>
            <small className={'fv-langs-why' + (c.missing ? ' is-due' : '')}>
              {c.total === 1 && picked[0] ? picked[0].desc : c.spec.hint ?? `Escolha ${c.total}.`}
            </small>
          </div>
        );
      })}
    </>
  );
}
