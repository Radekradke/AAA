import { describe, expect, it } from 'vitest';
import { createDraftCharacter, finalizeCharacter } from '../characterBuilder';
import { BG_TOOL_KEY, backgroundTools } from '../originChoices';
import { clearClassChoices } from '../classChoices';
import { backgroundFacts } from '../creationSummary';

/** "Um tipo de ferramenta de artesão / instrumento / jogo" do antecedente (PHB 2014). */
describe('ferramenta à escolha do antecedente', () => {
  it('Herói do Povo: o padrão é Ferreiro; escolher Cozinheiro troca a proficiência e o item', () => {
    const c = createDraftCharacter({ ownerId: 't', name: 'X' });
    c.backgroundId = 'folk-hero';
    expect(backgroundTools(c)).toEqual(['smiths-tools', 'vehicles-land']);
    c.choices = { [BG_TOOL_KEY]: ['cooks-utensils'] };
    expect(backgroundTools(c)).toEqual(['cooks-utensils', 'vehicles-land']);
    expect(backgroundFacts(c).find((f) => f.label === 'Ferramentas')?.value).toContain('Utensílios de Cozinheiro');
    const done = finalizeCharacter(c);
    expect(done.toolProfs?.map((t) => t.id)).toContain('cooks-utensils');
    expect(done.toolProfs?.map((t) => t.id)).not.toContain('smiths-tools');
    expect(done.inventory.some((i) => i.itemId === 'g-tool-cook')).toBe(true);
  });

  it('Soldado: o jogo escolhido vira proficiência e item (no lugar dos dados de osso)', () => {
    const c = createDraftCharacter({ ownerId: 't', name: 'X' });
    c.backgroundId = 'soldier';
    c.choices = { [BG_TOOL_KEY]: ['card-set'] };
    const done = finalizeCharacter(c);
    expect(done.toolProfs?.map((t) => t.id)).toContain('card-set');
    expect(done.inventory.some((i) => i.itemId === 'g-game-cards')).toBe(true);
    expect(done.inventory.some((i) => i.itemId === 'g-game-dice')).toBe(false);
  });

  it('Artista: o instrumento escolhido entra na mochila', () => {
    const c = createDraftCharacter({ ownerId: 't', name: 'X' });
    c.backgroundId = 'entertainer';
    c.choices = { [BG_TOOL_KEY]: ['viol'] };
    const done = finalizeCharacter(c);
    expect(done.toolProfs?.map((t) => t.id)).toContain('viol');
    expect(done.inventory.some((i) => i.itemId === 'g-inst-viol')).toBe(true);
  });

  it('trocar de classe não apaga a escolha do antecedente', () => {
    const c = createDraftCharacter({ ownerId: 't', name: 'X' });
    c.choices = { [BG_TOOL_KEY]: ['card-set'], 'fighter.fightingStyle': ['defense'] };
    clearClassChoices(c);
    expect(c.choices).toEqual({ [BG_TOOL_KEY]: ['card-set'] });
  });

  it('antecedente sem escolha ignora o que sobrou', () => {
    const c = createDraftCharacter({ ownerId: 't', name: 'X' });
    c.backgroundId = 'urchin';
    c.choices = { [BG_TOOL_KEY]: ['card-set'] };
    expect(backgroundTools(c)).toEqual(['disguise-kit', 'thieves-tools']);
  });
});
