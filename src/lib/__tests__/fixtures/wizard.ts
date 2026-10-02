import { ensureCharacterV2 } from '@/engine/levelUp';
import type { Character } from '@/types/character';
import raw from '../../../../e2e/fixtures/wizard.json';

/** A mesma maga dos testes de ponta a ponta, já migrada para o formato atual. */
export const WIZARD_FIXTURE: Character = ensureCharacterV2((raw as unknown as Character[])[0]);
