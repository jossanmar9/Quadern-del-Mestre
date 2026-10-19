/*
 * Quadern del Mestre — dades del joc (regles de la 5a edició, SRD 5.2.1).
 * Els textos van en valencià i es tradueixen amb t() (vegeu i18n.js).
 * Llicència GPL-3.0 o posterior.
 */
const L = s => s;   // marca un text per a traduir-lo més tard amb t()

const ABIL = [['str', L('FOR'), L('Força')], ['dex', L('DES'), L('Destresa')], ['con', L('CON'), L('Constitució')],
  ['int', L('INT'), L('Intel·ligència')], ['wis', L('SAV'), L('Saviesa')], ['cha', L('CAR'), L('Carisma')]];

const SKILLS = [['acro', L('Acrobàcies'), 'dex'], ['anim', L('Tracte amb animals'), 'wis'], ['arca', L('Arcans'), 'int'],
  ['atle', L('Atletisme'), 'str'], ['enga', L('Engany'), 'cha'], ['hist', L('Història'), 'int'], ['insi', L('Perspicàcia'), 'wis'],
  ['inti', L('Intimidació'), 'cha'], ['inve', L('Investigació'), 'int'], ['medi', L('Medicina'), 'wis'], ['natu', L('Natura'), 'int'],
  ['perc', L('Percepció'), 'wis'], ['perf', L('Interpretació'), 'cha'], ['pers', L('Persuasió'), 'cha'], ['reli', L('Religió'), 'int'],
  ['slei', L('Joc de mans'), 'dex'], ['stea', L('Sigil'), 'dex'], ['surv', L('Supervivència'), 'wis']];

// Estats (id del SRD → nom)
const CONDS = [['blinded', L('Cec')], ['charmed', L('Encisat')], ['deafened', L('Sord')], ['exhaustion', L('Esgotament')],
  ['frightened', L('Espantat')], ['grappled', L('Agafat')], ['incapacitated', L('Incapacitat')], ['invisible', L('Invisible')],
  ['paralyzed', L('Paralitzat')], ['petrified', L('Petrificat')], ['poisoned', L('Enverinat')], ['prone', L('Tombat')],
  ['restrained', L('Immobilitzat')], ['stunned', L('Atordit')], ['unconscious', L('Inconscient')]];
const EXTRA_CONDS = [['conc', L('Concentració')], ['bless', L('Beneït')], ['hidden', L('Amagat')], ['dodge', L('Esquivant')]];

// Classes del SRD 5.2.1: id, nom, dau de golpe, característica de conjurs, tipus de conjurador
const CLASSES = [['barbarian', L('Bàrbar'), 12, '', ''], ['bard', L('Bard'), 8, 'cha', 'full'], ['cleric', L('Clergue'), 8, 'wis', 'full'],
  ['druid', L('Druida'), 8, 'wis', 'full'], ['fighter', L('Guerrer'), 10, '', ''], ['monk', L('Monjo'), 8, '', ''],
  ['paladin', L('Paladí'), 10, 'cha', 'half'], ['ranger', L('Explorador'), 10, 'wis', 'half'], ['rogue', L('Murri'), 8, '', ''],
  ['sorcerer', L('Bruixot'), 6, 'cha', 'full'], ['warlock', L('Fetiller'), 8, 'cha', 'pact'], ['wizard', L('Mag'), 6, 'int', 'full']];
const SPECIES = [['dragonborn', L('Dracònid')], ['dwarf', L('Nan')], ['elf', L('Elf')], ['gnome', L('Gnom')], ['goliath', L('Goliat')],
  ['halfling', L('Mitjà')], ['human', L('Humà')], ['orc', L('Orc')], ['tiefling', L('Tiefling')]];
const BACKGROUNDS = [['acolyte', L('Acòlit')], ['criminal', L('Criminal')], ['sage', L('Erudit')], ['soldier', L('Soldat')]];
const ALIGN = [L('Legal bo'), L('Neutral bo'), L('Caòtic bo'), L('Legal neutral'), L('Neutral'), L('Caòtic neutral'), L('Legal malvat'), L('Neutral malvat'), L('Caòtic malvat')];
const COINS = [['cp', L('pc')], ['sp', L('pp')], ['ep', L('pe')], ['gp', L('po')], ['pp', L('ppt')]];
const COIN_NAMES = {cp: L('peces de coure'), sp: L('peces de plata'), ep: L('peces d\'electre'), gp: L('peces d\'or'), pp: L('peces de platí')};

// Espais de conjur per nivell de personatge
const SLOTS_FULL = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
const SLOTS_HALF = [[], [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1],
  [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];
// Fetiller: [espais, nivell dels espais]
const SLOTS_PACT = [[0, 0], [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5], [3, 5], [3, 5], [3, 5], [3, 5],
  [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];

const XP_LEVELS = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const profBonus = lv => 2 + Math.floor((Math.max(1, lv) - 1) / 4);

// Pressupost de PX per personatge segons el nivell i la dificultat (baixa, moderada, alta)
const XP_BUDGET = [null, [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100], [600, 1000, 1400],
  [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100], [1900, 2900, 4100], [2200, 3700, 4700],
  [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800], [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200],
  [5500, 10700, 17200], [6400, 13200, 22000]];
const CR_XP = {'0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900,
  '8': 3900, '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000, '17': 18000,
  '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000, '26': 90000,
  '27': 105000, '28': 120000, '29': 135000, '30': 155000};
const crNum = cr => cr === '1/8' ? .125 : cr === '1/4' ? .25 : cr === '1/2' ? .5 : +cr;

const CREATURE_TYPES = {Aberration: L('Aberració'), Beast: L('Bèstia'), Celestial: L('Celestial'), Construct: L('Constructe'),
  Dragon: L('Drac'), Elemental: L('Elemental'), Fey: L('Feèric'), Fiend: L('Diable'), Giant: L('Gegant'), Humanoid: L('Humanoide'),
  Monstrosity: L('Monstruositat'), Ooze: L('Llim'), Plant: L('Planta'), Undead: L('No-mort')};
const SPELL_SCHOOLS = {Abjuration: L('Abjuració'), Conjuration: L('Conjuració'), Divination: L('Endevinació'), Enchantment: L('Encantament'),
  Evocation: L('Evocació'), Illusion: L('Il·lusió'), Necromancy: L('Nigromància'), Transmutation: L('Transmutació')};
const RARITIES = {Common: L('Comú'), Uncommon: L('Poc comú'), Rare: L('Rar'), 'Very Rare': L('Molt rar'), Legendary: L('Llegendari'), Artifact: L('Artefacte')};

// Terrenys de l'editor de mapes: id, nom, variable de color
const TERRAINS = [['floor', L('Terra'), '--t-floor'], ['stone', L('Pedra'), '--t-stone'], ['wood', L('Fusta'), '--t-wood'],
  ['grass', L('Herba'), '--t-grass'], ['sand', L('Arena'), '--t-sand'], ['water', L('Aigua'), '--t-water'], ['deep', L('Aigua fonda'), '--t-deep'],
  ['mud', L('Fang'), '--t-mud'], ['snow', L('Neu'), '--t-snow'], ['lava', L('Lava'), '--t-lava'], ['rock', L('Roca'), '--t-wall'],
  ['tree', L('Arbres'), '--t-tree'], ['pit', L('Avenc'), '--t-void']];
const WALL_TYPES = [['wall', L('Paret')], ['door', L('Porta')], ['open', L('Porta oberta')], ['secret', L('Porta secreta')], ['window', L('Finestra')]];
const TOKEN_COLORS = ['#8C2A1C', '#2B4A6B', '#3E6A36', '#A27419', '#5B3A7A', '#1F6F6B', '#7A4A2A', '#444444', '#C0573E', '#6F7F2F'];

// Generadors
const NAMES = {
  human: {m: ['Arnau', 'Bernat', 'Guillem', 'Jaume', 'Pere', 'Ramon', 'Tomàs', 'Vicent', 'Marc', 'Enric', 'Joan', 'Ferran', 'Hug', 'Miquel'],
    f: ['Aina', 'Blanca', 'Caterina', 'Elionor', 'Isabel', 'Joana', 'Margarida', 'Maria', 'Sança', 'Violant', 'Teresa', 'Agnès', 'Brígida', 'Constança'],
    s: ['de Morella', 'Ferrer', 'Vidal', 'Puig', 'Serra', 'Mascarell', 'de Llíria', 'Soler', 'Sentís', 'Bonet', 'Alcover', 'Montaner']},
  elf: {m: ['Aelar', 'Erevan', 'Ivellios', 'Thamior', 'Sylvar', 'Lucan', 'Riardon', 'Varis', 'Adran', 'Galinndan'],
    f: ['Adrie', 'Birel', 'Enna', 'Keyleth', 'Lia', 'Naivara', 'Sariel', 'Shava', 'Thia', 'Valanthe'],
    s: ['Amakiir', 'Galanodel', 'Holimion', 'Liadon', 'Meliamne', 'Naïlo', 'Siannodel', 'Xiloscient']},
  dwarf: {m: ['Adrik', 'Baern', 'Brottor', 'Dain', 'Eberk', 'Harbek', 'Morgran', 'Rurik', 'Thorin', 'Vondal'],
    f: ['Amber', 'Bardryn', 'Dagnal', 'Eldeth', 'Gunnloda', 'Hlin', 'Kathra', 'Riswynn', 'Torbera', 'Vistra'],
    s: ['Barba-de-ferro', 'Martell-roig', 'Pedrafonda', 'Forjaclara', 'Puny-de-roca', 'Escut-d\'or']},
  halfling: {m: ['Alton', 'Cade', 'Eldon', 'Garret', 'Lyle', 'Milo', 'Osborn', 'Roscoe', 'Wellby', 'Perrin'],
    f: ['Andry', 'Bree', 'Callie', 'Cora', 'Kithri', 'Lavinia', 'Merla', 'Nedda', 'Seraphina', 'Verna'],
    s: ['Bon-barril', 'Peu-lleuger', 'Fulla-de-te', 'Turó-verd', 'Pa-de-mel', 'Rierol']},
  orc: {m: ['Dench', 'Feng', 'Gell', 'Henk', 'Holg', 'Krusk', 'Ront', 'Shump', 'Thokk', 'Grosh'],
    f: ['Baggi', 'Emen', 'Engong', 'Kansif', 'Myev', 'Neega', 'Ovak', 'Sutha', 'Vola', 'Yevelda'],
    s: ['Ullal-trencat', 'Puny-de-ferro', 'Crit-de-guerra', 'Os-de-llop']},
  tiefling: {m: ['Akmenos', 'Barakas', 'Damakos', 'Ekemon', 'Kairon', 'Leucis', 'Mordai', 'Skamos'],
    f: ['Akta', 'Bryseis', 'Criella', 'Kallista', 'Lerissa', 'Makaria', 'Nemeia', 'Orianna'],
    s: ['Esperança', 'Cançó', 'Desig', 'Temença', 'Glòria', 'Silenci']},
};
const NPC_TRAITS = [L('Parla molt a poc a poc i pensa abans de cada paraula.'), L('Riu de les seues pròpies bromes abans d\'acabar-les.'),
  L('No mira mai als ulls.'), L('Col·lecciona una cosa estranya i en parla sempre.'), L('Desconfia de qualsevol que porte armes.'),
  L('És extremadament educat, fins i tot quan amenaça.'), L('Té un tic nerviós quan menteix.'), L('Deu diners a algú perillós.'),
  L('Busca un familiar desaparegut.'), L('Està convençut que el persegueixen.'), L('Cita refranys a tota hora, i sovint malament.'),
  L('Vol deixar el seu ofici i viure aventures.'), L('És molt religiós i beneeix tot el que veu.'), L('Té una cicatriu de la qual no vol parlar.'),
  L('Sempre està menjant alguna cosa.'), L('Exagera tot el que conta.'), L('Odia la màgia i ho diu en veu alta.'), L('És sorprenentment savi per a la seua edat.'),
  L('Fa tractes amb qualsevol si hi ha guany.'), L('Té por de la foscor.')];
const NPC_JOBS = [L('taverner'), L('ferrer'), L('guàrdia de la ciutat'), L('sacerdot'), L('mercader'), L('pagès'), L('caçador'), L('lladre'),
  L('bard ambulant'), L('herbolària'), L('escrivà'), L('capità de barca'), L('mercenari'), L('noble arruïnat'), L('pescadora'), L('mag aprenent')];
const TAVERN_A = [L('El Drac'), L('La Gerra'), L('El Gall'), L('La Lluna'), L('El Corb'), L('La Rosa'), L('El Barril'), L('La Destral'),
  L('El Cérvol'), L('La Sirena'), L('El Rei'), L('La Llanterna')];
const TAVERN_B = [L('Daurat'), L('Borratxo'), L('Adormit'), L('Coix'), L('d\'Argent'), L('Fumejant'), L('Rialler'), L('Trencat'),
  L('Vermell'), L('Cansat'), L('Salvatge'), L('Perdut')];
const TRINKETS = [L('Una clau de bronze que no obri cap pany conegut'), L('Un mapa a mig fer d\'unes muntanyes'), L('Un anell amb una inicial gravada'),
  L('Una carta segellada amb cera negra'), L('Un dau de sis cares que sempre trau un 6'), L('Una ploma que no es banya mai'),
  L('Un medalló amb el retrat d\'una desconeguda'), L('Una pedra que sempre està calenta'), L('Un llibret de poemes en una llengua estranya'),
  L('Una dent de drac menuda'), L('Una brúixola que apunta cap a l\'est'), L('Una moneda d\'un regne desaparegut')];
// Botí aleatori segons el VD: [dau de monedes, multiplicador, moneda, probabilitat d'objecte màgic, raresa]
const LOOT_TIERS = [[0, '4', '3d6', 1, 'sp', .05, ['Common']], [5, '10', '2d6', 10, 'gp', .15, ['Common', 'Uncommon']],
  [11, '16', '4d6', 100, 'gp', .3, ['Uncommon', 'Rare']], [17, '30', '6d6', 1000, 'gp', .5, ['Rare', 'Very Rare', 'Legendary']]];
