// Emberlight v5 — the dark edge and the eight watches.
//
// levels.js turns a watch's roster into a timed spawn queue, and holds
// the geometry the rest of the game shares: where creatures enter,
// where the furnaces stand, and what the next watch holds.
import { BOARD, WATCHES, directionsFor, spawnGapFor } from './config.js';

// Pixel centre of a grid cell.
export function cellCenter(col, row) {
  return {
    x: col * BOARD.cell + BOARD.cell / 2,
    y: row * BOARD.cell + BOARD.cell / 2,
  };
}

// The stretches of the dark edge creatures come from, as y ranges
// along the western side of the board.
export const DIRECTION_RANGES = {
  north: { y0: 60, y1: 200 },
  middle: { y0: 200, y1: 400 },
  south: { y0: 400, y1: 540 },
};

// A spawn point on the dark edge, in one of the watch's directions.
export function spawnPoint(rng, directions) {
  const dir = directions[Math.floor(rng.float() * directions.length)];
  const range = DIRECTION_RANGES[dir];
  return {
    x: 30 + rng.float() * 60,
    y: range.y0 + rng.float() * (range.y1 - range.y0),
  };
}

// Build one watch's spawn queue: a list of { type, at, x, y } where
// `at` is the seconds after the watch starts when the creature steps
// out of the dark. The roster is shuffled into mixed groups so no
// watch is one long line of the same creature; the boss, when present,
// always arrives in the middle of the watch, alone.
export function buildWatchQueue(watchNumber, rng) {
  const roster = WATCHES[watchNumber - 1];
  const directions = directionsFor(watchNumber);
  const gap = spawnGapFor(watchNumber);
  const queue = [];
  const groups = [];
  for (const [type, count] of Object.entries(roster)) {
    if (type === 'moth') continue;
    groups.push({ type, count });
  }
  // Interleave the groups round-robin so the arrivals mix creature types.
  let at = 0.5;
  let remaining = groups.reduce((sum, g) => sum + g.count, 0);
  let gi = 0;
  while (remaining > 0) {
    const group = groups[gi % groups.length];
    if (group.count > 0) {
      const point = spawnPoint(rng, directions);
      queue.push({ type: group.type, at, x: point.x, y: point.y });
      group.count -= 1;
      remaining -= 1;
      at += gap;
    }
    gi += 1;
  }
  // The Dread Moth arrives alone, halfway through the last watch.
  if (roster.moth) {
    const point = spawnPoint(rng, directions);
    queue.push({ type: 'moth', at: 12, x: point.x, y: point.y });
  }
  return queue;
}

// What the next watch holds, for the panel's preview line.
export function describeWatch(watchNumber) {
  const roster = WATCHES[watchNumber - 1];
  if (!roster) return '—';
  const names = { wisp: 'Wisps', shade: 'Shades', brute: 'Brutes', wraith: 'Wraiths', moth: 'Dread Moth' };
  return Object.entries(roster)
    .map(([type, count]) => `${count} ${names[type]}`)
    .join(' · ');
}
