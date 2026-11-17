// Emberlight — the numbers that define the game.
//
// One file holds every tunable value so the balance lives in one place:
// the board, the three towers, the five creatures, the twelve waves, and
// the palette the whole scene is painted from.
export const BOARD = {
  cols: 15,
  rows: 9,
  cell: 64,
  width: 960, // cols * cell
  height: 576, // rows * cell
};

// The winding shore path, as grid cells, from the western dark to the
// lighthouse door. Everything else is buildable ground.
export const PATH_CELLS = [
  [0, 4], [1, 4], [2, 4], [3, 4],
  [3, 5], [3, 6], [3, 7],
  [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
  [8, 6], [8, 5], [8, 4], [8, 3], [8, 2],
  [9, 2], [10, 2], [11, 2], [12, 2],
  [12, 3], [12, 4], [12, 5], [12, 6],
  [13, 6], [14, 6],
];

// The lighthouse stands at the end of the path, on the eastern edge.
export const LIGHTHOUSE_CELL = { col: 14, row: 6 };

export const ECONOMY = {
  startGold: 160,
  startEmber: 12, // hits the ember can take before the light dies
  sellRefund: 0.7,
  waveClearBonus: 20,
  waveClearPerWave: 4,
  upgradeCostFactor: 0.6, // of the tower's base cost, per level, for later upgrades
  upgradeCostFactorFirst: 0.5, // of the tower's base cost, for the first upgrade
  upgradeDamageFactor: 0.35, // +35% damage per level
  upgradeRangeFactor: 0.1, // +10% range per level
  maxLevel: 3,
};

// The three towers the Keeper can build. damage is per shot, rate is shots
// per second, range and projectile speed are in pixels.
export const TOWERS = {
  brazier: {
    id: 'brazier',
    name: 'Ember Brazier',
    key: '1',
    cost: 50,
    damage: 11,
    rate: 2.4,
    range: 112,
    projectileSpeed: 400,
    color: '#ffb347',
    glow: '#ff7a1a',
    glowInner: '#ff7a1a99',
    glowOuter: '#ff7a1a22',
    blurb: 'Cheap and quick. A hungry little flame.',
    detail: 'Fast shots, short reach. Best in numbers.',
  },
  lantern: {
    id: 'lantern',
    name: 'Frost Lantern',
    key: '2',
    cost: 75,
    damage: 6,
    rate: 1.1,
    range: 132,
    projectileSpeed: 340,
    slowFactor: 0.45, // multiplies enemy speed while chilled
    slowSeconds: 1.8,
    color: '#7fd4ff',
    glow: '#2f7fd0',
    glowInner: '#2f9fe066',
    glowOuter: '#2f9fe018',
    blurb: 'Cold light that holds the dark still.',
    detail: 'Chills what it hits, halving its speed.',
  },
  spire: {
    id: 'spire',
    name: 'Storm Spire',
    key: '3',
    cost: 110,
    damage: 40,
    rate: 0.55,
    range: 172,
    projectileSpeed: 560,
    chainTargets: 2, // extra creatures the bolt jumps to
    chainFalloff: 0.65, // damage kept per jump
    color: '#c9a7ff',
    glow: '#7b4dff',
    glowInner: '#8b6cff66',
    glowOuter: '#7b4dff18',
    blurb: 'A crystal that calls the storm down.',
    detail: 'Slow, heavy bolts that leap between foes.',
  },
};

export const TOWER_ORDER = ['brazier', 'lantern', 'spire'];

// The creatures that crawl out of the dark. hp scales with the wave;
// speed is pixels per second; leak is how much ember a creature costs
// when it reaches the lighthouse.
export const ENEMIES = {
  wisp: {
    id: 'wisp',
    name: 'Wisp',
    hp: 30,
    speed: 56,
    reward: 6,
    leak: 1,
    radius: 10,
    color: '#ffe9a8',
    core: '#fff6d8',
  },
  shade: {
    id: 'shade',
    name: 'Shade',
    hp: 78,
    speed: 41,
    reward: 9,
    leak: 1,
    radius: 13,
    color: '#5a5f8a',
    core: '#8f96c9',
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    hp: 240,
    speed: 27,
    reward: 20,
    leak: 2,
    radius: 18,
    color: '#7a4a3a',
    core: '#c97b4a',
  },
  wraith: {
    id: 'wraith',
    name: 'Wraith',
    hp: 60,
    speed: 76,
    reward: 14,
    leak: 1,
    radius: 11,
    color: '#bfe8e0',
    core: '#eafff8',
    regen: 2.5, // hit points regained per second
  },
  moth: {
    id: 'moth',
    name: 'Dread Moth',
    hp: 2400,
    speed: 20,
    reward: 150,
    leak: 5,
    radius: 30,
    color: '#3d2b52',
    core: '#a86fd0',
  },
};

// How a creature's health grows as the waves deepen. The curve is
// gentle early, so a new Keeper learns the ropes, and steep late: a
// wave-12 board must be strong to hold the shore.
export function enemyHpFor(type, wave) {
  const base = ENEMIES[type].hp;
  return Math.round(base * (1 + 0.14 * (wave - 1) + 0.015 * (wave - 1) * (wave - 1)));
}

// Twelve waves. Each entry lists how many of each creature march, in
// spawn order groups; the builder in levels.js turns it into a queue.
export const WAVES = [
  { wisp: 12 },
  { wisp: 14, shade: 4 },
  { wisp: 10, shade: 8 },
  { wisp: 14, shade: 8, wraith: 4 },
  { shade: 12, wraith: 6, brute: 2 },
  { wisp: 18, shade: 10, brute: 4 },
  { shade: 14, wraith: 10, brute: 4 },
  { wisp: 20, brute: 8, wraith: 8 },
  { shade: 18, brute: 8, wraith: 12 },
  { brute: 14, wraith: 14, shade: 10 },
  { brute: 14, wraith: 18, shade: 14, wisp: 20 },
  { moth: 1, brute: 10, wraith: 12 },
];

export const TOTAL_WAVES = WAVES.length;

// Spawn pacing: seconds between creatures in a wave, shrinking as the
// waves deepen so later marches feel like a flood. The first two waves
// spawn faster than before, so the opening screen is visibly populated;
// from wave 3 on the pacing is the first version's, which the balance
// was tuned against.
export function spawnGapFor(wave) {
  if (wave === 1) return 0.65;
  if (wave === 2) return 0.62;
  return Math.max(0.35, 0.9 - wave * 0.045);
}

// The night palette. Warm amber is the light; cold blue-teal is the dark.
// The ground values were lifted from the first version so the board
// keeps its structure when a screenshot is shrunk: the path and the
// build ground still read as different places in the dark.
export const PALETTE = {
  skyTop: '#070b1d',
  skyMid: '#0d1531',
  ground: '#17263a',
  groundAlt: '#142338',
  grassTuft: '#315344',
  path: '#514235',
  pathEdge: '#79634d',
  pathStone: '#92785c',
  moon: '#f4ead0',
  star: '#dfe8ff',
  ember: '#ffb347',
  emberCore: '#ffe9a8',
  hudPanel: 'rgba(10, 16, 34, 0.88)',
  hudBorder: '#2a3a5f',
  text: '#e8ecf7',
  textDim: '#9aa7c7',
  gold: '#ffd76a',
  danger: '#ff5a5a',
  ok: '#7ddb8a',
};
