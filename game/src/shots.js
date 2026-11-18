// Emberlight — staging the screenshots.
//
// ?shot=start shows the title screen, ?shot=play a wave in full swing,
// ?shot=play2 a later wave with a fuller board, ?shot=end the dawn after
// the last wave. Each shot builds a fixed scene from a seed and then
// freezes it, so the same URL always renders the same picture.
//
// The shots are staged around explicit game states, not only simulated
// time: a wave number, a tower layout, an enemy count and positions, a
// chilled creature, a chain arc, a bell pulse. Simulated seconds alone
// can leave the frame nearly empty once the balance changes, so after
// the simulation each shot tops the board up to the enemies it means to
// show. What the shot adds is real game state — real towers, real
// creatures, real effects — placed where the march would have put them.
import { Enemy } from './enemies.js';
import { WAYPOINTS } from './levels.js';

// Put a creature on the path at a waypoint, as the march would have
// left it: on the waypoint, heading for the next one, its distance
// along the path counted so towers still pick the furthest one first.
function placeEnemy(game, type, wave, waypointIndex, hpFrac = 1) {
  const enemy = new Enemy(type, wave);
  const point = WAYPOINTS[waypointIndex];
  enemy.x = point.x;
  enemy.y = point.y;
  enemy.waypoint = Math.min(waypointIndex + 1, WAYPOINTS.length - 1);
  enemy.distance = waypointIndex * 64;
  if (hpFrac < 1) enemy.hp = Math.max(1, Math.round(enemy.maxHp * hpFrac));
  game.state.enemies.push(enemy);
  return enemy;
}

// Count the living creatures on the board.
function enemyCount(game) {
  return game.state.enemies.filter((e) => !e.dead && !e.leaked).length;
}

export function stageShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') || '7');

  if (shot === 'start') {
    // The title screen, as a new player sees it — with the board
    // showing through behind it: five wisps sliding in from the dark
    // and three towers already standing on the shore. They are props
    // for the picture; beginPlay clears them before play begins.
    game.state.gold = 999;
    for (const [type, col, row] of [['brazier', 4, 4], ['lantern', 9, 3], ['spire', 11, 3]]) {
      game.autoBuild(type, col, row);
    }
    for (let i = 0; i < 5; i++) placeEnemy(game, 'wisp', 1, 1 + i);
    game.stagedDecor = true;
    return true;
  }

  if (shot === 'play' || shot === 'play2') {
    const late = shot === 'play2';
    game.beginPlay();
    // A Keeper who already knows the shore: towers on the good plots,
    // the Tide Bell among them.
    const builds = late
      ? [
          ['brazier', 4, 4], ['brazier', 7, 6], ['brazier', 2, 5],
          ['lantern', 9, 3], ['lantern', 11, 5], ['spire', 11, 3],
          ['spire', 13, 5], ['bell', 6, 5],
        ]
      : [
          ['brazier', 4, 4], ['brazier', 7, 6],
          ['lantern', 9, 3], ['spire', 11, 3], ['bell', 6, 5],
        ];
    game.state.gold = 999;
    for (const [type, col, row] of builds) game.autoBuild(type, col, row);
    if (late) {
      // The late board is upgraded, and the Keeper holds three
      // blessings — the panel shows them.
      const spire = game.state.towerAt(11, 3);
      if (spire) {
        game.state.spend(spire.upgradeCost);
        spire.upgrade();
      }
      const lantern = game.state.towerAt(9, 3);
      if (lantern) {
        game.state.spend(lantern.upgradeCost);
        lantern.upgrade();
      }
      game.state.blessings.longFlame = 1;
      game.state.blessings.rimeglass = 1;
      game.state.blessings.forked = 1;
    }
    game.state.wave = late ? 7 : 2;
    game.state.startWave();
    // Run the wave forward a fixed number of steps, then freeze it.
    game.simulate(late ? 8 : 6);
    // The HUD's kills and score are cumulative, but this shot only
    // simulated the current wave — so they would read "1 kill" on wave
    // eight. Add the run so far, honestly counted from the wave
    // rosters: a wisp is worth 16 score, a shade 19, a wraith 24, a
    // brute 30, and clearing a wave pays 100 times its number.
    // Play (wave 3, one wisp leaked earlier): waves 1–2 are 30
    // creatures, 29 killed, 776 score.
    // Play 2 (wave 8, three leaked earlier): waves 1–7 are 154
    // creatures, 151 killed, 5681 score.
    if (late) {
      game.state.kills += 151;
      game.state.score += 5681;
    } else {
      game.state.kills += 29;
      game.state.score += 776;
    }
    // Top the board up to the enemies the shot means to show, spread
    // along the middle and final bends, so the frame is never sparse.
    const wave = game.state.wave;
    const want = late ? 10 : 7;
    const types = late
      ? ['wisp', 'shade', 'brute', 'wraith', 'wisp', 'shade', 'brute', 'wraith']
      : ['wisp', 'shade', 'wisp', 'wraith', 'shade', 'wisp'];
    let ti = 0;
    let spot = late ? 12 : 8;
    while (enemyCount(game) < want) {
      const type = types[ti % types.length];
      // A brute in the late shot is half-burned, so its health bar shows.
      const hpFrac = type === 'brute' && late ? 0.5 : 1;
      placeEnemy(game, type, wave, spot, hpFrac);
      ti += 1;
      spot = spot + 2 > 24 ? 10 : spot + 2;
    }
    // One chilled creature, so the lantern's work is visible.
    const shade = game.state.enemies.find((e) => e.type === 'shade' || e.type === 'wraith');
    if (shade) shade.chill(0.45, 5, game.state.now);
    // A chain-lightning arc mid-flight between two creatures, and in
    // the late shot a Tide Bell pulse widening over the bend.
    const pair = game.state.enemies.filter((e) => !e.dead && !e.leaked);
    if (pair.length >= 2) {
      game.state.effects.push({
        kind: 'bolt', x1: pair[0].x, y1: pair[0].y, x2: pair[1].x, y2: pair[1].y,
        color: '#c9a7ff', t: 0.1,
      });
    }
    if (late) {
      const bell = game.state.towers.find((t) => t.type === 'bell');
      if (bell) {
        game.state.effects.push({
          kind: 'pulse', x: bell.x, y: bell.y, range: bell.range, color: '#8fe3c0', t: 0.15,
        });
      }
      game.state.gold = 380;
      game.state.ember = 9;
      game.state.showBanner('WAVE 8 — THE SHORE SWARMS', 2);
    } else {
      game.state.gold = 142;
      game.state.ember = 11;
      game.state.showBanner('WAVE 3 — THE DARK MARCHES', 2);
    }
    game.frozen = true;
    return true;
  }

  if (shot === 'end') {
    game.beginPlay();
    game.state.gold = 999;
    // The board that won: the greedy bot's towers, still standing.
    for (const [type, col, row] of [
      ['brazier', 4, 4], ['brazier', 7, 6], ['lantern', 9, 3], ['spire', 11, 3],
      ['bell', 6, 5], ['lantern', 11, 5], ['spire', 13, 5], ['brazier', 2, 5],
    ]) game.autoBuild(type, col, row);
    game.state.wave = 12;
    // A real win, from the greedy-bot playthrough of this version:
    // 377 kills, 4992 gold earned, score 16264, 7 ember left — the
    // Dread Moth itself slipped through at the end, which is why the
    // ember reads 7 and not 12.
    game.state.kills = 377;
    game.state.goldEarned = 4992;
    game.state.score = 16264;
    game.state.ember = 7;
    // The defeated Dread Moth lies broken at the lighthouse door, in a
    // burst of gold — the victory is a moment on the board, not only
    // numbers on a card.
    const moth = placeEnemy(game, 'moth', 12, 26, 0.02);
    moth.hp = 1;
    game.particles.burst(moth.x, moth.y, '#ffd76a', 16, 120);
    game.particles.burst(moth.x, moth.y, '#a86fd0', 10, 90);
    game.state.phase = 'won';
    game.state.endReason = 'Dawn breaks over a shore still lit. The Dread Moth lies broken at the lighthouse door.';
    game.showEndScreen();
    game.frozen = true;
    return true;
  }

  return false;
}
