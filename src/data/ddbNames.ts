/**
 * Nomes em inglês do D&D Beyond → ids da Ficha Viva. Só o que o app tem;
 * o resto vira homebrew ou aviso na importação (src/engine/ddbImport.ts).
 * As magias com id "phb-/xge-/tce-" são achadas pelo nome em inglês sem
 * tabela (o id já é o nome em inglês); aqui ficam só as antigas "sp-".
 */

/** Chave de comparação: minúsculas, sem acento, apóstrofo e pontuação. */
export const enKey = (s: string) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const SPELL_EN: Record<string, string> = Object.fromEntries(
  ([
    ['Fire Bolt', 'sp-firebolt'], ['Ray of Frost', 'sp-raygelo'], ['Eldritch Blast', 'sp-eldritch'], ['Mage Hand', 'sp-maosmagicas'],
    ['Light', 'sp-luz'], ['Guidance', 'sp-orientacao'], ['Prestidigitation', 'sp-prestidigitacao'], ['Sacred Flame', 'sp-chama'],
    ['Chill Touch', 'sp-toquegelido'], ['Vicious Mockery', 'sp-zombaria'], ['Acid Splash', 'sp-acidoespirito'], ['Minor Illusion', 'sp-ilusao'],
    ['Spare the Dying', 'sp-estabilizar'], ['Produce Flame', 'sp-produzirchama'], ['Magic Missile', 'sp-misseis'], ['Shield', 'sp-escudo'],
    ['Mage Armor', 'sp-armaduraarcana'], ['Cure Wounds', 'sp-curar'], ['Healing Word', 'sp-palavracura'], ['Bless', 'sp-bencao'],
    ['Bane', 'sp-perdicao'], ['Burning Hands', 'sp-flechacida'], ['Sleep', 'sp-sono'], ['Faerie Fire', 'sp-fadas'],
    ['Thunderwave', 'sp-ondatrov'], ['Detect Magic', 'sp-detectar'], ['Charm Person', 'sp-enfeiticar'], ['Command', 'sp-comando'],
    ['Hellish Rebuke', 'sp-repreensao'], ['Fog Cloud', 'sp-nevoa'], ['Shield of Faith', 'sp-escudofe'], ['Heroism', 'sp-heroismo'],
    ['Create or Destroy Water', 'sp-criaragua'], ['Jump', 'sp-saltar'], ['Mirror Image', 'sp-espelho'], ['Invisibility', 'sp-invisibilidade'],
    ['Lesser Restoration', 'sp-restauracao'], ['Ray of Enfeeblement', 'sp-aterrorizar'], ['Misty Step', 'sp-passos'], ['Hold Person', 'sp-segurar'],
    ["Melf's Acid Arrow", 'sp-flechacidamelf'], ['Acid Arrow', 'sp-flechacidamelf'], ['Spiritual Weapon', 'sp-espiritual'], ['Enlarge/Reduce', 'sp-aumentar'],
    ['Scorching Ray', 'sp-calorabrasante'], ['Web', 'sp-teiaaranha'], ['Fireball', 'sp-bolafogo'], ['Lightning Bolt', 'sp-relampago'],
    ['Fly', 'sp-voo'], ['Counterspell', 'sp-contramagia'], ['Revivify', 'sp-revigorar'], ['Dispel Magic', 'sp-relampagosagrado'],
    ['Mass Healing Word', 'sp-palavracoragem'], ['Fear', 'sp-medo'], ['Haste', 'sp-hipnose'], ['Wall of Fire', 'sp-muralha'],
    ['Banishment', 'sp-banir'], ['Ice Storm', 'sp-tempestade'], ['Freedom of Movement', 'sp-liberdade'], ['Cone of Cold', 'sp-conemar'],
    ['Flame Strike', 'sp-coluna'], ['Raise Dead', 'sp-revivificar'], ['Dominate Person', 'sp-dominar'], ['Disintegrate', 'sp-desintegrar'],
    ['Mass Cure Wounds', 'sp-curargrupo'], ['Teleport', 'sp-teletransporte'], ['Power Word Stun', 'sp-palavrapoder'], ['Wish', 'sp-desejo'],
    ['Meteor Swarm', 'sp-meteoro'],
  ] as const).map(([en, id]) => [enKey(en), id]),
);

/** Raça (fullName do D&D Beyond) → raça e sub-raça. */
export const RACE_EN: Record<string, { raceId: string; subraceId?: string; variantHuman?: boolean }> = Object.fromEntries(
  ([
    ['Human', { raceId: 'human' }], ['Variant Human', { raceId: 'human', variantHuman: true }], ['Human Variant', { raceId: 'human', variantHuman: true }],
    ['High Elf', { raceId: 'elf', subraceId: 'high-elf' }], ['Wood Elf', { raceId: 'elf', subraceId: 'wood-elf' }],
    ['Drow', { raceId: 'elf', subraceId: 'drow' }], ['Dark Elf', { raceId: 'elf', subraceId: 'drow' }], ['Elf', { raceId: 'elf' }],
    ['Hill Dwarf', { raceId: 'dwarf', subraceId: 'hill-dwarf' }], ['Mountain Dwarf', { raceId: 'dwarf', subraceId: 'mountain-dwarf' }], ['Dwarf', { raceId: 'dwarf' }],
    ['Lightfoot Halfling', { raceId: 'halfling', subraceId: 'lightfoot' }], ['Lightfoot', { raceId: 'halfling', subraceId: 'lightfoot' }],
    ['Stout Halfling', { raceId: 'halfling', subraceId: 'stout' }], ['Stout', { raceId: 'halfling', subraceId: 'stout' }], ['Halfling', { raceId: 'halfling' }],
    ['Half-Elf', { raceId: 'half-elf' }], ['Half-Orc', { raceId: 'half-orc' }],
    ['Forest Gnome', { raceId: 'gnome', subraceId: 'forest-gnome' }], ['Rock Gnome', { raceId: 'gnome', subraceId: 'rock-gnome' }], ['Gnome', { raceId: 'gnome' }],
    ['Tiefling', { raceId: 'tiefling' }], ['Dragonborn', { raceId: 'dragonborn' }],
  ] as const).map(([en, v]) => [enKey(en), v]),
);

/** Ancestralidade dracônica (cor) → sub-raça do Draconato. */
export const DRAGON_EN: Record<string, string> = {
  black: 'dragon-black', blue: 'dragon-blue', brass: 'dragon-brass', bronze: 'dragon-bronze', copper: 'dragon-copper',
  gold: 'dragon-gold', green: 'dragon-green', red: 'dragon-red', silver: 'dragon-silver', white: 'dragon-white',
};

export const SUBCLASS_EN: Record<string, string> = Object.fromEntries(
  ([
    ['Path of the Berserker', 'berserker'], ['Path of the Totem Warrior', 'totem'], ['College of Lore', 'lore'], ['College of Valor', 'valor'],
    ['Life Domain', 'life'], ['Light Domain', 'light'], ['War Domain', 'war'], ['Knowledge Domain', 'knowledge'], ['Nature Domain', 'nature'],
    ['Tempest Domain', 'tempest'], ['Trickery Domain', 'trickery'], ['Circle of the Land', 'land'], ['Circle of the Moon', 'moon'],
    ['Champion', 'champion'], ['Battle Master', 'battlemaster'], ['Eldritch Knight', 'eldritch'], ['Way of the Open Hand', 'openhand'],
    ['Way of Shadow', 'shadow'], ['Way of the Four Elements', 'elements'], ['Oath of Devotion', 'devotion'], ['Oath of the Ancients', 'ancients'],
    ['Oath of Vengeance', 'vengeance'], ['Hunter', 'hunter'], ['Beast Master', 'beastmaster'], ['Thief', 'thief'], ['Assassin', 'assassin'],
    ['Arcane Trickster', 'trickster'], ['Draconic Bloodline', 'draconic'], ['Wild Magic', 'wild'], ['The Archfey', 'archfey'], ['Archfey', 'archfey'],
    ['The Fiend', 'fiend'], ['Fiend', 'fiend'], ['The Great Old One', 'oldone'], ['Great Old One', 'oldone'],
    ['School of Evocation', 'evocation'], ['School of Abjuration', 'abjuration'], ['School of Divination', 'divination'],
    ['School of Conjuration', 'conjuration'], ['School of Enchantment', 'enchantment'], ['School of Illusion', 'illusion'],
    ['School of Necromancy', 'necromancy'], ['School of Transmutation', 'transmutation'],
  ] as const).map(([en, id]) => [enKey(en), id]),
);

/** Talentos cujo id não é o nome em inglês. */
export const FEAT_EN: Record<string, string> = Object.fromEntries(
  ([['Great Weapon Master', 'gwm'], ['Tavern Brawler', 'tavern'], ['War Caster', 'warcaster']] as const).map(([en, id]) => [enKey(en), id]),
);

export const LANGUAGE_EN: Record<string, string> = {
  common: 'Comum', dwarvish: 'Anão', elvish: 'Élfico', giant: 'Gigante', gnomish: 'Gnômico', goblin: 'Goblin', halfling: 'Halfling', orc: 'Orc',
  abyssal: 'Abissal', celestial: 'Celestial', draconic: 'Dracônico', 'deep speech': 'Dialeto Subterrâneo', infernal: 'Infernal',
  primordial: 'Primordial', sylvan: 'Silvestre', undercommon: 'Subcomum', "thieves cant": 'Gíria de Ladrão', druidic: 'Druídico',
};

/** Escola de magia (inglês → português, como no app). */
export const SCHOOL_EN: Record<string, string> = {
  abjuration: 'Abjuração', conjuration: 'Conjuração', divination: 'Adivinhação', enchantment: 'Encantamento',
  evocation: 'Evocação', illusion: 'Ilusão', necromancy: 'Necromancia', transmutation: 'Transmutação',
};

/** Armaduras cujo id não é o nome em inglês colado. */
export const ARMOR_EN: Record<string, string> = { studdedleather: 'a-studded', scalemail: 'a-scale', shield: 's-shield' };
