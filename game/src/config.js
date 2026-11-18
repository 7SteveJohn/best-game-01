// Emberlight v5 — "Net the Night": the numbers that define the game.
//
// The lighthouse beam no longer damages anything. It catches the dark
// and carries it to the furnaces. One file holds every tunable value:
// the board, the beam, the net, the furnaces, the creatures, the eight
// watches, and the palette the whole scene is painted from.
export const BOARD = {
  cols: 15,
  rows: 9,
  cell: 64,
  width: 960, // cols * cell
  height: 576, // rows * cell
};

// The lighthouse lamp the beam pivots on, and the door the creatures
// walk toward. The lamp stands high on the tower; the door is at its
// foot, on the eastern edge.
export const LAMP = { x: 924, y: 326 };
export const DOOR = { x: 924, y: 440 };

// The three ember furnaces, arranged around the lighthouse at three
// different angles from the lamp, so each delivery is a different
// swing of the beam. A furnace only lights from its watch on: the
// Keeper learns the game one furnace at a time.
export const FURNACES = [
  { id: 'west', name: 'West Furnace', x: 500, y: 330, litFromWatch: 1 },
  { id: 'north', name: 'North Furnace', x: 620, y: 110, litFromWatch: 2 },
  { id: 'south', name: 'South Furnace', x: 620, y: 530, litFromWatch: 3 },
];
export const FURNACE_COOLDOWN = 6; // seconds a furnace needs after a burn
export const FURNACE_REACH = 480; // how far from the lamp a delivery can land
export const FURNACE_AIM_TOLERANCE = 0.07; // radians of slack past the cone edge

// The beam: it turns toward the pointer at a capped rate, so aiming
// answers at once without teleporting. It gathers only while the
// Keeper holds the button down.
export const BEAM = {
  turnRate: Math.PI, // radians per second: 180 degrees
  halfAngle: 0.192, // radians: an 11-degree half-angle, a 22-degree cone
  gatherTime: 0.25, // seconds a creature must stay in the cone to be caught
  length: 520, // pixels the visible cone reaches
  // Where a captured creature hangs, in pixels from the lamp along the
  // beam, by capture order. The moth hangs in the middle slot alone.
  slotDistances: [150, 205, 260, 315, 370],
};

// The net: what the beam can hold, and for how long. A creature that
// is caught stops walking; when it is freed or escapes, it goes back
// to where it was caught and carries on — catching never resets its
// journey, and never advances it either.
export const NET = {
  capacity: 5, // weight units the beam can carry at once
  escapeTime: 3.0, // seconds a captured creature struggles before breaking free
  wraithEscapeTime: 1.8, // wraiths are quicker to slip the light
  resistTime: 1.0, // seconds after an escape during which a creature cannot be caught again
};

export const ECONOMY = {
  startEmber: 12, // hits the ember can take before the light dies
  scorePerCreature: 100, // points for each creature burned in a furnace
  scorePerExtra: 25, // bonus for each additional creature in the same delivery
  mothSegmentBonus: 500, // points for breaking one of the Moth's shell segments
  winEmberBonus: 50, // points per ember left on a win
};

// The creatures that crawl out of the dark. They have no health now —
// nothing damages them. weight is what they cost the net; speed is
// pixels per second straight toward the lighthouse door; leak is how
// much ember one costs when it reaches it.
export const ENEMIES = {
  wisp: {
    id: 'wisp',
    name: 'Wisp',
    weight: 1,
    speed: 85, // crosses the sea in about 10 seconds
    leak: 1,
    radius: 10,
    color: '#ffe9a8',
    core: '#fff6d8',
  },
  shade: {
    id: 'shade',
    name: 'Shade',
    weight: 1,
    speed: 53, // about 16 seconds from the dark edge
    leak: 1,
    radius: 13,
    color: '#5a5f8a',
    core: '#8f96c9',
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    weight: 3,
    speed: 35, // about 24 seconds, but it costs 2 ember
    leak: 2,
    radius: 18,
    color: '#7a4a3a',
    core: '#c97b4a',
  },
  wraith: {
    id: 'wraith',
    name: 'Wraith',
    weight: 2,
    speed: 90, // the fastest thing on the sea
    leak: 1,
    radius: 11,
    color: '#bfe8e0',
    core: '#eafff8',
  },
  moth: {
    id: 'moth',
    name: 'Dread Moth',
    weight: 5, // fills the whole net by itself
    speed: 25, // slow, huge, and patient
    leak: 5,
    radius: 30,
    color: '#3d2b52',
    core: '#a86fd0',
  },
};

// Eight watches. Each entry lists how many of each creature arrive,
// in spawn order groups, and which directions they come from. The
// builder in levels.js turns it into a timed queue.
export const WATCHES = [
  { wisp: 8 },
  { wisp: 10, shade: 4 },
  { wisp: 8, shade: 6, brute: 2 },
  { wisp: 10, shade: 8, wraith: 2, brute: 2 },
  { shade: 12, wraith: 4, brute: 4 },
  { wisp: 14, shade: 10, wraith: 4, brute: 4 },
  { shade: 10, wraith: 8, brute: 6 },
  { moth: 1, wisp: 10, shade: 8, wraith: 4, brute: 4 },
];

export const TOTAL_WATCHES = WATCHES.length;

// Which stretches of the dark edge a watch arrives from. The first
// watch comes from one direction only, so the Keeper learns to catch
// before learning to choose.
export function directionsFor(watch) {
  if (watch === 1) return ['north'];
  if (watch === 2) return ['north', 'south'];
  return ['north', 'middle', 'south'];
}

// Spawn pacing: seconds between creatures in a watch. A watch's
// arrivals last about 24 seconds; the cleanup after is the Keeper's.
export function spawnGapFor(watch) {
  return Math.max(0.45, 0.85 - watch * 0.04);
}

// The ground values were lifted from the tower-defense version so the
// board keeps its structure when a screenshot is shrunk: the sea and
// the shore still read as different places in the dark.
export const PALETTE = {
  skyTop: '#070b1d',
  skyMid: '#0d1531',
  ground: '#17263a',
  groundAlt: '#142338',
  grassTuft: '#315344',
  path: '#5a4a3a',
  pathEdge: '#8a7358',
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
