import { useSessionStore } from '@/store/sessionStore';
import { useStageStore } from '@/store/stageStore';
import { useMasterStore } from '../masterStore';
import type { Selection } from '../masterStore';
import { CombatantInspector } from './CombatantInspector';
import { HeroInspector } from './HeroInspector';
import { HandoutInspector, MarkerInspector, MonsterInspector, NpcInspector, SceneInspector } from './ContentInspectors';

/**
 * INSPETOR: muda conforme o que foi tocado (palco, iniciativa, bastidores).
 * Um peão leva ao que ele representa: combatente, herói ou NPC.
 */
export function ContextInspector() {
  const sel = useMasterStore((m) => m.selection);
  const select = useMasterStore((m) => m.select);
  const combatants = useSessionStore((s) => s.combatants);
  const tokens = useStageStore((s) => s.tokens);
  const resolved = resolve(sel, combatants, tokens);

  return (
    <div className="fv-inspector">
      <div className="fv-inspector-head">
        <span className="fv-label">Inspetor</span>
        {sel && (
          <button type="button" className="fv-bs-x" aria-label="Limpar seleção" onClick={() => select(null)}>
            ×
          </button>
        )}
      </div>
      <div className="fv-inspector-body">
        {!resolved && <p className="fv-bs-hint">Toque em alguém no palco, na iniciativa ou nos bastidores para ver os detalhes e agir.</p>}
        {resolved?.kind === 'combatant' && <CombatantInspector key={resolved.id} c={combatants.find((c) => c.id === resolved.id)!} />}
        {resolved?.kind === 'hero' && <HeroInspector key={resolved.sheetId} sheetId={resolved.sheetId} />}
        {resolved?.kind === 'npc' && <NpcInspector key={resolved.id} id={resolved.id} />}
        {resolved?.kind === 'handout' && <HandoutInspector key={resolved.id} id={resolved.id} />}
        {resolved?.kind === 'scene' && <SceneInspector key={resolved.id} id={resolved.id} />}
        {resolved?.kind === 'monster' && <MonsterInspector key={resolved.ref} monsterRef={resolved.ref} />}
        {resolved?.kind === 'token' && <MarkerInspector key={resolved.id} id={resolved.id} />}
      </div>
    </div>
  );
}

/** Peão → o que ele representa; combatente que saiu do encontro → nada. */
function resolve(sel: Selection | null, combatants: ReturnType<typeof useSessionStore.getState>['combatants'], tokens: ReturnType<typeof useStageStore.getState>['tokens']): Selection | null {
  if (!sel) return null;
  if (sel.kind === 'combatant') return combatants.some((c) => c.id === sel.id) ? sel : null;
  if (sel.kind !== 'token') return sel;
  const t = tokens.find((x) => x.id === sel.id);
  if (!t) return null;
  const comb =
    (t.combatantId && combatants.find((c) => c.id === t.combatantId)) ||
    (t.sheetId && combatants.find((c) => c.sheetId === t.sheetId)) ||
    null;
  if (comb) return { kind: 'combatant', id: comb.id };
  if (t.sheetId) return { kind: 'hero', sheetId: t.sheetId };
  if (t.npcId) return { kind: 'npc', id: t.npcId };
  if (t.monsterRef) return { kind: 'monster', ref: t.monsterRef };
  return sel;
}
