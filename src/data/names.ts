/**
 * Bancos de nomes temáticos por raça e sexo, com sobrenomes/epítetos.
 * Estrutura simples e expansível — adicione novos nomes à vontade.
 */

interface NamePool {
  masc: string[];
  fem: string[];
  surnames: string[];
}

const GENERIC: NamePool = {
  masc: ['Aldric', 'Bran', 'Caelum', 'Dorian', 'Eron', 'Garrik', 'Joran', 'Kael', 'Soren', 'Varic'],
  fem: ['Aelis', 'Bria', 'Cyra', 'Elora', 'Iria', 'Lyra', 'Mira', 'Nessa', 'Sariel', 'Vesna'],
  surnames: ['da Pedra Negra', 'Coração de Aço', 'Andarilho', 'do Vale', 'Punho de Ferro', 'Olho de Águia'],
};

const NAMES: Record<string, NamePool> = {
  human: {
    masc: ['Aldric', 'Bernard', 'Cassian', 'Edric', 'Gareth', 'Lucan', 'Roland', 'Tobias', 'Valen', 'Wilhelm'],
    fem: ['Adela', 'Beatriz', 'Cecília', 'Elena', 'Isolde', 'Mariana', 'Rosalind', 'Selene', 'Vivian', 'Yara'],
    surnames: ['de Pedravale', 'Coração Valente', 'do Porto Salgado', 'Mão Firme', 'das Colinas', 'o Justo'],
  },
  dwarf: {
    masc: ['Thorgrim', 'Balin', 'Durin', 'Gimbur', 'Harbek', 'Morgran', 'Norbeck', 'Ruric', 'Thrain', 'Vondal'],
    fem: ['Audhild', 'Brunhild', 'Dagna', 'Eldeth', 'Gunnloda', 'Helja', 'Kathra', 'Riswynn', 'Torgga', 'Vistra'],
    surnames: ['Pé-de-Ferro', 'Barba-de-Fogo', 'Forjamartelo', 'Quebra-Rochas', 'Escudo-Profundo', 'Veia-de-Ouro'],
  },
  elf: {
    masc: ['Aelar', 'Caelynn', 'Erevan', 'Fivin', 'Heian', 'Laucian', 'Quarion', 'Rolen', 'Thamior', 'Varis'],
    fem: ['Adrie', 'Birel', 'Caelynn', 'Enna', 'Faeral', 'Ielenia', 'Lia', 'Naivara', 'Quelenna', 'Sariel'],
    surnames: ['Folha-Prateada', 'Canto-da-Lua', 'Vento-Sussurrante', 'da Floresta Eterna', 'Estrela-da-Alva', 'Brisa-Élfica'],
  },
  halfling: {
    masc: ['Alton', 'Cade', 'Eldon', 'Finnan', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Roscoe', 'Wellby'],
    fem: ['Andry', 'Bree', 'Callie', 'Euphemia', 'Jillian', 'Lavinia', 'Nedda', 'Portia', 'Seraphina', 'Verna'],
    surnames: ['Pé-Leve', 'Boa-Barriga', 'Colina-Verde', 'Cava-Fundo', 'Bom-Tonel', 'Sortudo'],
  },
  'half-elf': {
    masc: ['Aramil', 'Berrian', 'Daeron', 'Halian', 'Ivellios', 'Mindartis', 'Riardon', 'Soveliss', 'Theren', 'Vanan'],
    fem: ['Adrie', 'Bethrynna', 'Drusilia', 'Felosial', 'Jelenneth', 'Meriele', 'Quillathe', 'Shava', 'Theirastra', 'Yatheira'],
    surnames: ['de Dois Mundos', 'Sangue-Misto', 'Andarilho', 'Sem-Raízes', 'Coração-Livre', 'do Crepúsculo'],
  },
  'half-orc': {
    masc: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Krusk', 'Mhurren', 'Ront', 'Thokk', 'Zsar'],
    fem: ['Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Ovak', 'Sutha', 'Vola', 'Volen', 'Yevelda'],
    surnames: ['Quebra-Crânios', 'Punho-Brutal', 'Cicatriz', 'o Indomável', 'Sangue-Selvagem', 'Mata-Gigantes'],
  },
  gnome: {
    masc: ['Boddynock', 'Dimble', 'Fonkin', 'Gerbo', 'Jebeddo', 'Namfoodle', 'Roondar', 'Seebo', 'Warryn', 'Zook'],
    fem: ['Bimpnottin', 'Caramip', 'Duvamil', 'Ellyjobell', 'Loopmottin', 'Mardnab', 'Nissa', 'Roywyn', 'Shamil', 'Waywocket'],
    surnames: ['Engenhoca', 'Roda-Veloz', 'Mola-Solta', 'Fagulha', 'Tique-Taque', 'Pólvora-Fina'],
  },
  tiefling: {
    masc: ['Akmenos', 'Barakas', 'Damakos', 'Iados', 'Kairon', 'Leucis', 'Mordai', 'Pelaios', 'Skamos', 'Therai'],
    fem: ['Akta', 'Bryseis', 'Damaia', 'Ea', 'Kallista', 'Lerissa', 'Nemeia', 'Orianna', 'Rieta', 'Seraphina'],
    surnames: ['Sombra-Carmesim', 'Filho do Pacto', 'Marca-Infernal', 'Coração-de-Brasa', 'o Renegado', 'Chama-Negra'],
  },
  dragonborn: {
    masc: ['Arjhan', 'Balasar', 'Donaar', 'Ghesh', 'Kriv', 'Medrash', 'Nadarr', 'Rhogar', 'Torinn', 'Pandjed'],
    fem: ['Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Kava', 'Nala', 'Perra', 'Sora', 'Thava'],
    surnames: ['Garra-de-Fogo', 'Linhagem-Dourada', 'Sopro-Tempestade', 'Escama-de-Bronze', 'da Estirpe Antiga', 'Asa-Negra'],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Gera um nome temático para a raça/sexo, às vezes com sobrenome/epíteto. */
export function randomName(raceId: string, gender: 'masc' | 'fem'): string {
  const pool = NAMES[raceId] ?? GENERIC;
  const first = pick(gender === 'fem' ? pool.fem : pool.masc);
  // ~60% de chance de receber um sobrenome/epíteto
  if (Math.random() < 0.6) return `${first} ${pick(pool.surnames)}`;
  return first;
}

/** Idade plausível por raça (faixas amplas, em anos). */
export function randomAge(raceId: string): string {
  const ranges: Record<string, [number, number]> = {
    human: [18, 70],
    dwarf: [40, 350],
    elf: [100, 700],
    halfling: [20, 120],
    'half-elf': [20, 160],
    'half-orc': [16, 60],
    gnome: [40, 400],
    tiefling: [18, 90],
    dragonborn: [15, 80],
  };
  const [min, max] = ranges[raceId] ?? [18, 80];
  const age = min + Math.floor(Math.random() * (max - min));
  return `${age} anos`;
}
