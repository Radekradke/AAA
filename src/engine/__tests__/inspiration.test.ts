import { beforeEach, describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { inspirationCount, inspirationMax, setInspirationCount, stacksInspiration, INSPIRATION_MAX } from '../inspiration';
import { rollCheck } from '../dice';
import { useCharacterStore } from '@/store/characterStore';
import { useUiStore } from '@/store/uiStore';
import { consumeArmedInspiration } from '@/components/dice/useDiceRoller';

function makeChar() {
  return finalizeCharacter(createDraftCharacter({ ownerId: 't', name: 'Teste', classId: 'fighter', raceId: 'human' }));
}

describe('pontos de inspiração', () => {
  it('ficha antiga: booleano vira 0 ou 1 ponto', () => {
    expect(inspirationCount({ inspiration: true })).toBe(1);
    expect(inspirationCount({ inspiration: false })).toBe(0);
    // já acumulava antes da opção existir: continua acumulando
    expect(inspirationCount({ inspiration: false, inspirationPoints: 3 })).toBe(3);
  });

  it('regra 2014 por padrão: tem ou não tem (não acumula)', () => {
    const c = makeChar();
    expect(stacksInspiration(c)).toBe(false);
    expect(inspirationMax(c)).toBe(1);
    setInspirationCount(c, 5);
    expect(c.inspirationPoints).toBe(1);
    expect(c.inspiration).toBe(true);
  });

  it('regra da mesa: acumula até 10', () => {
    const c = makeChar();
    c.campaign = { ...c.campaign, stackingInspiration: true };
    setInspirationCount(c, 99);
    expect(c.inspirationPoints).toBe(INSPIRATION_MAX);
    expect(c.inspiration).toBe(true);
    setInspirationCount(c, -4);
    expect(c.inspirationPoints).toBe(0);
    expect(c.inspiration).toBe(false);
  });

  it('ficha que já acumulava grava a opção ao mexer: não "desliga" ao cair para 1', () => {
    const c = makeChar();
    c.inspirationPoints = 3;
    setInspirationCount(c, 1);
    expect(c.campaign.stackingInspiration).toBe(true);
    setInspirationCount(c, 4);
    expect(c.inspirationPoints).toBe(4);
  });
});

describe('usar inspiração na jogatina', () => {
  let id: string;
  beforeEach(() => {
    const c = makeChar();
    id = c.id;
    useCharacterStore.setState({ characters: [c] });
    useUiStore.setState({ rollMode: 'normal', inspirationArmed: false, armedCharId: null, activeCharId: id });
  });
  const points = () => inspirationCount(useCharacterStore.getState().characters[0]);

  it('regra 2014: ganhar de novo não passa de 1', () => {
    useCharacterStore.getState().gainInspiration(id);
    useCharacterStore.getState().gainInspiration(id);
    expect(points()).toBe(1);
  });

  it('com a regra da mesa, ganhar acumula; desligar a regra deixa 1', () => {
    useCharacterStore.getState().updateCampaign(id, { stackingInspiration: true });
    useCharacterStore.getState().gainInspiration(id);
    useCharacterStore.getState().gainInspiration(id);
    expect(points()).toBe(2);
    useCharacterStore.getState().updateCampaign(id, { stackingInspiration: false });
    expect(points()).toBe(1);
  });

  it('preparar dá vantagem; o ponto só sai quando o d20 rola', () => {
    useCharacterStore.getState().updateCampaign(id, { stackingInspiration: true });
    useCharacterStore.getState().setInspiration(id, 2);
    useUiStore.getState().armInspiration(id);
    expect(useUiStore.getState().rollMode).toBe('advantage');
    expect(points()).toBe(2); // ainda não gastou

    const r = consumeArmedInspiration(rollCheck('Atletismo', 3, { advantage: true }));
    expect(r.label).toBe('Atletismo · Inspiração');
    expect(r.rolls).toHaveLength(2);
    expect(points()).toBe(1);
    expect(useUiStore.getState().inspirationArmed).toBe(false);
    expect(useUiStore.getState().rollMode).toBe('normal'); // volta ao modo anterior

    // sem nada preparado, a próxima rolagem não mexe nos pontos
    const r2 = consumeArmedInspiration(rollCheck('Furtividade', 1));
    expect(r2.label).toBe('Furtividade');
    expect(points()).toBe(1);
  });

  it('vantagem anula desvantagem (PHB)', () => {
    useUiStore.setState({ rollMode: 'disadvantage' });
    useUiStore.getState().armInspiration(id);
    expect(useUiStore.getState().rollMode).toBe('normal');
    useUiStore.getState().disarmInspiration();
    expect(useUiStore.getState().rollMode).toBe('disadvantage');
  });

  it('cancelar ou trocar de ficha não gasta o ponto', () => {
    useCharacterStore.getState().setInspiration(id, 1);
    useUiStore.getState().armInspiration(id);
    useUiStore.getState().setActiveChar('outra-ficha');
    expect(useUiStore.getState().inspirationArmed).toBe(false);
    expect(points()).toBe(1);
  });
});
