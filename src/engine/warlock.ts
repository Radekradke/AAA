import type { Character } from '@/types/character';
import { characterResources } from './classResources';
import { levelIn } from './damageExtras';
import { warlockSlots } from './progression';

/**
 * Bruxo (PHB 2014) na mesa: Magia de Pacto, Mestre Místico e o que cada
 * patrono liga (Corruptor, Arquifada, Grande Antigo). A ficha usa isto no
 * painel do Bruxo (Combate), nas resistências e nas imunidades.
 */
export interface WarlockState {
  level: number;
  /** CD das magias: 8 + prof + CAR. */
  dc: number;
  patron: 'fiend' | 'archfey' | 'oldone' | null;
  /** Espaços de pacto: círculo e quantos. */
  pactCircle: number;
  pactMax: number;
  pactUsed: number;
  /** Bênção do Tinhoso (Corruptor 1º): PV temporários = CAR + nível (mín. 1). */
  blessingTemp: number | null;
  /** Resiliência Infernal (Corruptor 10º): tipo de dano escolhido. */
  resilience: string | null;
  /** Usos restantes dos recursos de patrono (0 quando não tem). */
  left: Record<'darkLuck' | 'hurlHell' | 'feyPresence' | 'mistyEscape' | 'darkDelirium' | 'entropicWard' | 'eldritchMaster', number>;
}

/** Tipos que a Resiliência Infernal pode escolher (não mágico/prata não entram). */
export const FIEND_RESILIENCE_TYPES = ['ácido', 'contundente', 'cortante', 'elétrico', 'fogo', 'frio', 'necrótico', 'perfurante', 'psíquico', 'radiante', 'trovejante', 'veneno'];

export function warlockState(char: Character, prof: number, chaMod: number): WarlockState | null {
  const level = levelIn(char, 'warlock');
  if (!level) return null;
  const sub = char.subclassId;
  const patron = sub === 'fiend' || sub === 'archfey' || sub === 'oldone' ? sub : null;
  const res = Object.fromEntries(characterResources(char).map((r) => [r.id, r]));
  const left = (id: string) => (res[id] ? Math.min(res[id].max, char.combat?.resources?.[id] ?? res[id].max) : 0);
  const [circle, max] = Object.entries(warlockSlots(level)).map(([c, n]) => [Number(c), n] as const)[0] ?? [0, 0];
  const used = Math.min(max, char.combat?.spellSlots?.[circle]?.used ?? 0);
  return {
    level,
    dc: 8 + prof + chaMod,
    patron,
    pactCircle: circle,
    pactMax: max,
    pactUsed: used,
    blessingTemp: patron === 'fiend' ? Math.max(1, chaMod + level) : null,
    resilience: patron === 'fiend' && level >= 10 ? char.choices?.['warlock.fiendResilience']?.[0] ?? null : null,
    left: {
      darkLuck: left('darkLuck'),
      hurlHell: left('hurlHell'),
      feyPresence: left('feyPresence'),
      mistyEscape: left('mistyEscape'),
      darkDelirium: left('darkDelirium'),
      entropicWard: left('entropicWard'),
      eldritchMaster: left('eldritchMaster'),
    },
  };
}
