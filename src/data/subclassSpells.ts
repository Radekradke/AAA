/**
 * Magias concedidas por subclasse — D&D 5e 2014 (Livro do Jogador).
 *
 * - Domínio (Clérigo), Juramento (Paladino) e Círculo da Terra (Druida):
 *   sempre preparadas, não contam no limite. Chave = nível de CLASSE.
 * - Patrono (Bruxo): lista expandida — entram nas opções que o bruxo pode
 *   aprender, mas não são concedidas. Chave = círculo da magia.
 */
export const DOMAIN_SPELLS: Record<string, Record<number, string[]>> = {
  knowledge: { 1: ['sp-comando', 'phb-identify'], 3: ['phb-augury', 'phb-suggestion'], 5: ['phb-nondetection', 'phb-speak-dead'], 7: ['phb-arcane-eye', 'phb-confusion'], 9: ['phb-legend-lore', 'phb-scrying'] },
  life: { 1: ['sp-bencao', 'sp-curar'], 3: ['sp-restauracao', 'sp-espiritual'], 5: ['phb-beacon-hope', 'sp-revigorar'], 7: ['phb-death-ward', 'phb-guardian-faith'], 9: ['sp-curargrupo', 'sp-revivificar'] },
  light: { 1: ['sp-flechacida', 'sp-fadas'], 3: ['phb-flaming-sphere', 'sp-calorabrasante'], 5: ['phb-daylight', 'sp-bolafogo'], 7: ['phb-guardian-faith', 'sp-muralha'], 9: ['sp-coluna', 'phb-scrying'] },
  nature: { 1: ['phb-animal-friendship', 'phb-speak-animals'], 3: ['phb-barkskin', 'phb-spike-growth'], 5: ['phb-plant-growth', 'phb-wind-wall'], 7: ['phb-dominate-beast', 'phb-grasping-vine'], 9: ['phb-insect-plague', 'phb-tree-stride'] },
  tempest: { 1: ['sp-nevoa', 'sp-ondatrov'], 3: ['phb-gust-wind', 'phb-shatter'], 5: ['phb-call-lightning', 'phb-sleet-storm'], 7: ['phb-control-water', 'sp-tempestade'], 9: ['phb-destructive-wave', 'phb-insect-plague'] },
  trickery: { 1: ['sp-enfeiticar', 'phb-disguise-self'], 3: ['sp-espelho', 'phb-pass-without-trace'], 5: ['phb-blink', 'sp-relampagosagrado'], 7: ['phb-dimension-door', 'phb-polymorph'], 9: ['sp-dominar', 'phb-modify-memory'] },
  war: { 1: ['phb-divine-favor', 'sp-escudofe'], 3: ['phb-magic-weapon', 'sp-espiritual'], 5: ['phb-crusaders-mantle', 'phb-spirit-guardians'], 7: ['sp-liberdade', 'phb-stoneskin'], 9: ['sp-coluna', 'phb-hold-monster'] },
};

export const OATH_SPELLS: Record<string, Record<number, string[]>> = {
  devotion: { 3: ['phb-prot-evil-good', 'phb-sanctuary'], 5: ['sp-restauracao', 'phb-zone-truth'], 9: ['phb-beacon-hope', 'sp-relampagosagrado'], 13: ['sp-liberdade', 'phb-guardian-faith'], 17: ['phb-commune', 'sp-coluna'] },
  ancients: { 3: ['phb-ensnaring-strike', 'phb-speak-animals'], 5: ['sp-passos', 'phb-moonbeam'], 9: ['phb-plant-growth', 'phb-protection-energy'], 13: ['sp-tempestade', 'phb-stoneskin'], 17: ['phb-commune-nature', 'phb-tree-stride'] },
  vengeance: { 3: ['sp-perdicao', 'phb-hunters-mark'], 5: ['sp-segurar', 'sp-passos'], 9: ['sp-hipnose', 'phb-protection-energy'], 13: ['sp-banir', 'phb-dimension-door'], 17: ['phb-hold-monster', 'phb-scrying'] },
};

/** Círculo da Terra: terreno escolhido → nível de druida → magias. */
export const LAND_SPELLS: Record<string, Record<number, string[]>> = {
  arctic: { 3: ['sp-segurar', 'phb-spike-growth'], 5: ['phb-sleet-storm', 'phb-slow'], 7: ['sp-liberdade', 'sp-tempestade'], 9: ['phb-commune-nature', 'sp-conemar'] },
  coast: { 3: ['sp-espelho', 'sp-passos'], 5: ['phb-water-breathing', 'phb-water-walk'], 7: ['phb-control-water', 'sp-liberdade'], 9: ['phb-conjure-elemental', 'phb-scrying'] },
  desert: { 3: ['phb-blur', 'phb-silence'], 5: ['phb-create-food', 'phb-protection-energy'], 7: ['phb-blight', 'phb-hallucinatory-terrain'], 9: ['phb-insect-plague', 'phb-wall-stone'] },
  forest: { 3: ['phb-barkskin', 'phb-spider-climb'], 5: ['phb-call-lightning', 'phb-plant-growth'], 7: ['phb-divination', 'sp-liberdade'], 9: ['phb-commune-nature', 'phb-tree-stride'] },
  grassland: { 3: ['sp-invisibilidade', 'phb-pass-without-trace'], 5: ['phb-daylight', 'sp-hipnose'], 7: ['phb-divination', 'sp-liberdade'], 9: ['phb-dream', 'phb-insect-plague'] },
  mountain: { 3: ['phb-spider-climb', 'phb-spike-growth'], 5: ['sp-relampago', 'phb-meld-stone'], 7: ['phb-stone-shape', 'phb-stoneskin'], 9: ['phb-passwall', 'phb-wall-stone'] },
  swamp: { 3: ['phb-darkness', 'sp-flechacidamelf'], 5: ['phb-water-walk', 'phb-stinking-cloud'], 7: ['sp-liberdade', 'phb-locate-creature'], 9: ['phb-insect-plague', 'phb-scrying'] },
  underdark: { 3: ['phb-spider-climb', 'sp-teiaaranha'], 5: ['phb-gaseous-form', 'phb-stinking-cloud'], 7: ['phb-greater-invisibility', 'phb-stone-shape'], 9: ['phb-cloudkill', 'phb-insect-plague'] },
};

/** Lista expandida do patrono: círculo → magias que o bruxo pode aprender. */
export const PATRON_SPELLS: Record<string, Record<number, string[]>> = {
  archfey: { 1: ['sp-fadas', 'sp-sono'], 2: ['phb-calm-emotions', 'phb-phantasmal-force'], 3: ['phb-blink', 'phb-plant-growth'], 4: ['phb-dominate-beast', 'phb-greater-invisibility'], 5: ['sp-dominar', 'phb-seeming'] },
  fiend: { 1: ['sp-flechacida', 'sp-comando'], 2: ['phb-blindness', 'sp-calorabrasante'], 3: ['sp-bolafogo', 'phb-stinking-cloud'], 4: ['phb-fire-shield', 'sp-muralha'], 5: ['sp-coluna', 'phb-hallow'] },
  oldone: { 1: ['phb-dissonant-whispers', 'phb-hideous-laughter'], 2: ['phb-detect-thoughts', 'phb-phantasmal-force'], 3: ['phb-clairvoyance', 'phb-sending'], 4: ['phb-dominate-beast', 'phb-black-tentacles'], 5: ['sp-dominar', 'phb-telekinesis'] },
};
