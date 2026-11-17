// Emberlight — the shore path and the twelve waves.
//
// levels.js turns the grid cells in config.js into pixel waypoints the
// creatures walk, and turns each wave's roster into a timed spawn queue.
import { BOARD, PATH_CELLS, WAVES, spawnGapFor } from './config.js';

// Pixel centre of a grid cell.
export function cellCenter(col, row) {
  return {
    x: col * BOARD.cell + BOARD.cell / 2,
    y: row * BOARD.cell + BOARD.cell / 2,
  };
}

// The waypoints in walk order, as pixel positions. Creatures enter just
// off the western edge so the first one slides in from the dark.
export const WAYPOINTS = (() => {
  const points = [{ x: -BOARD.cell / 2, y: 4 * BOARD.cell + BOARD.cell / 2 }];
  for (const [col, row] of PATH_CELLS) points.push(cellCenter(col, row));
  // One last step east, through the lighthouse door.
  points.push({ x: BOARD.width + BOARD.cell / 2, y: 6 * BOARD.cell + BOARD.cell / 2 });
  return points;
})();

// A fast lookup: "col,row" -> true for every path cell.
export const PATH_SET = new Set(PATH_CELLS.map(([c, r]) => `${c},${r}`));

export function isPathCell(col, row) {
  return PATH_SET.has(`${col},${row}`);
}

export function isBuildable(col, row) {
  if (col < 0 || col >= BOARD.cols || row < 0 || row >= BOARD.rows) return false;
  if (isPathCell(col, row)) return false;
  // The lighthouse plot itself is not for building on.
  if (col === 14 && row === 6) return false;
  return true;
}

// Build one wave's spawn queue: a list of { type, at } where `at` is the
// seconds after the wave starts when the creature steps onto the path.
// The roster is shuffled into mixed groups so no wave is one long line
// of the same creature; the boss, when present, always marches last.
export function buildWaveQueue(waveNumber) {
  const roster = WAVES[waveNumber - 1];
  const gap = spawnGapFor(waveNumber);
  const queue = [];
  const groups = [];
  for (const [type, count] of Object.entries(roster)) {
    if (type === 'moth') continue;
    groups.push({ type, count });
  }
  // Interleave the groups round-robin so the march mixes creature types.
  let at = 0.5;
  let remaining = groups.reduce((sum, g) => sum + g.count, 0);
  let gi = 0;
  while (remaining > 0) {
    const group = groups[gi % groups.length];
    if (group.count > 0) {
      queue.push({ type: group.type, at });
      group.count -= 1;
      remaining -= 1;
      at += gap;
    }
    gi += 1;
  }
  // The Dread Moth enters alone, after the rest, with a long pause.
  if (roster.moth) {
    queue.push({ type: 'moth', at: at + 2.5 });
  }
  return queue;
}

// What the next wave holds, for the panel's preview line.
export function describeWave(waveNumber) {
  const roster = WAVES[waveNumber - 1];
  if (!roster) return '—';
  const names = { wisp: 'Wisps', shade: 'Shades', brute: 'Brutes', wraith: 'Wraiths', moth: 'Dread Moth' };
  return Object.entries(roster)
    .map(([type, count]) => `${count} ${names[type]}`)
    .join(' · ');
}
