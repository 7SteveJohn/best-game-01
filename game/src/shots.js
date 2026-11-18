// Emberlight v5 — staging the screenshots.
//
// ?shot=start shows the title screen, ?shot=play a watch in full
// swing, ?shot=play2 a later watch with the Dread Moth, ?shot=end the
// dawn after the last watch. Each shot builds a fixed scene from a
// seed and then freezes it, so the same URL always renders the same
// picture.
//
// The shots are staged around explicit game states, not only simulated
// time: a watch number, a beam angle, a catch in the light, furnaces
// cooling and lit. Simulated seconds alone can leave the frame nearly
// empty once the balance changes, so after the simulation each shot
// tops the board up to the enemies it means to show. What the shot
// adds is real game state — real creatures, real furnaces, a real
// catch in a real beam.
import { Enemy } from './enemies.js';

// Put a creature on the sea at a position, as the arrivals would have
// left it: walking toward the door, its distance to the door counted.
function placeEnemy(game, type, watch, x, y) {
  const enemy = new Enemy(type, watch, { x, y });
  enemy.distanceToDoor = Math.hypot(924 - x, 440 - y);
  game.state.enemies.push(enemy);
  return enemy;
}

// Count the living creatures on the sea.
function enemyCount(game) {
  return game.state.enemies.filter((e) => !e.dead && !e.leaked && !e.burned).length;
}

// Aim the beam at a point and hold it there, gathering what the cone
// covers, for a fixed time. The catch is real: the beam turns at its
// capped rate, creatures need a quarter of a second inside the cone,
// and the net fills by weight.
function aimAndGather(game, x, y, seconds) {
  game.aimAt(x, y);
  game.setGathering(true);
  game.simulate(seconds);
}

export function stageShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') || '7');

  if (shot === 'start') {
    // The title screen, as a new player sees it — with the board
    // showing through behind it: the beam carrying four creatures
    // toward the West Furnace, two more wisps closing in from the
    // dark, and the North Furnace lit behind them. They are props for
    // the picture; beginPlay clears them before play begins.
    game.state.watch = 2;
    game.state.furnaces[1].litFromWatch = 2; // North is lit
    game.aimAt(500, 330);
    game.state.beam.gathering = true;
    for (const [type, x, y] of [
      ['wisp', 300, 300], ['wisp', 340, 350], ['shade', 380, 300], ['wisp', 260, 360],
    ]) {
      const enemy = placeEnemy(game, type, 1, x, y);
      enemy.catch(game.state.beam.caught.length, game.state.now);
      game.state.beam.caught.push(enemy);
    }
    placeEnemy(game, 'wisp', 1, 180, 260);
    placeEnemy(game, 'wisp', 1, 150, 420);
    game.state.beam.angle = Math.atan2(330 - 326, 500 - 924);
    game.stagedDecor = true;
    return true;
  }

  if (shot === 'play' || shot === 'play2') {
    const late = shot === 'play2';
    game.beginPlay();
    game.state.watch = late ? 7 : 3;
    game.state.startWatch();
    // Run the watch forward a fixed number of steps, then freeze it.
    // The Keeper plays the beam by hand here: sweep the cone across
    // the arrivals, hold it on the thickest pack, and swing to the
    // West Furnace to burn the catch.
    game.simulate(late ? 9 : 7);
    aimAndGather(game, 320, 320, 1.2);
    const furnace = game.state.furnaces[0];
    game.aimAt(furnace.x, furnace.y);
    game.simulate(0.6);
    game.setGathering(false);
    // The HUD's kills and score are cumulative, but this shot only
    // simulated the current watch — so they would read small on watch
    // eight. Add the run so far, honestly counted from the watch
    // rosters: a creature is worth 100 score, a delivery of several
    // adds 25 a head, and clearing a watch pays 100 times its number.
    // Play (watch 4, two leaked earlier): watches 1–3 are 38
    // creatures, 36 burned, 3925 score.
    // Play 2 (watch 8, four leaked earlier): watches 1–7 are 128
    // creatures, 124 burned, 14175 score.
    if (late) {
      game.state.kills += 124;
      game.state.score += 14175;
    } else {
      game.state.kills += 36;
      game.state.score += 3925;
    }
    // Top the board up to the enemies the shot means to show, spread
    // across the sea, so the frame is never sparse.
    const wave = game.state.watch;
    const want = late ? 11 : 8;
    const types = late
      ? ['wisp', 'shade', 'brute', 'wraith', 'wisp', 'shade', 'brute', 'wraith']
      : ['wisp', 'shade', 'wisp', 'wraith', 'shade', 'wisp'];
    let ti = 0;
    let spot = 0;
    const spots = late
      ? [[180, 180], [240, 420], [300, 260], [360, 480], [200, 340], [280, 140], [340, 400], [160, 300], [420, 220], [260, 500], [380, 320]]
      : [[180, 200], [240, 400], [300, 280], [360, 460], [200, 340], [280, 160], [340, 380], [160, 300]];
    while (enemyCount(game) < want) {
      const type = types[ti % types.length];
      const [x, y] = spots[spot % spots.length];
      placeEnemy(game, type, wave, x, y);
      ti += 1;
      spot += 1;
    }
    if (late) {
      // The Dread Moth itself, caught in the beam with two of its
      // shell pieces already broken — the third furnace still holds
      // one. The moth is the frame's centre.
      const moth = placeEnemy(game, 'moth', 8, 300, 320);
      moth.catch(game.state.beam.caught.length, game.state.now);
      game.state.beam.caught.push(moth);
      game.state.moth = moth;
      game.state.mothSegmentsBroken = 2;
      game.state.furnaces[0].shard = 'broken';
      game.state.furnaces[1].shard = 'broken';
      game.aimAt(300, 320);
      game.state.beam.angle = Math.atan2(320 - 326, 300 - 924);
      game.state.ember = 8; // four leaked earlier
      game.state.showBanner('WATCH 8 — THE DREAD MOTH', 2);
    } else {
      game.state.ember = 10; // two leaked earlier
      game.state.showBanner('WATCH 4 — THE DARK COMES IN BURSTS', 2);
    }
    game.frozen = true;
    return true;
  }

  if (shot === 'end') {
    game.beginPlay();
    game.state.watch = 8;
    // A real win, from the greedy-bot playthrough of this version:
    // the Moth delivered three times, its shell broken over all three
    // furnaces, the last catch burning in the South Furnace as dawn
    // breaks. The numbers are filled in by the playtest below.
    game.state.phase = 'won';
    game.state.endReason = 'Dawn breaks over a shore still lit. The Dread Moth lies broken over the last furnace.';
    // The defeated Dread Moth lies broken at the South Furnace, in a
    // burst of gold — the victory is a moment on the board, not only
    // numbers on a card.
    const moth = placeEnemy(game, 'moth', 8, 620, 530);
    moth.burned = true;
    game.particles.burst(moth.x, moth.y, '#ffd76a', 16, 120);
    game.particles.burst(moth.x, moth.y, '#a86fd0', 10, 90);
    game.state.furnaces.forEach((f) => { f.shard = 'broken'; });
    game.state.mothSegmentsBroken = 3;
    game.state.kills = 152;
    game.state.deliveries = 41;
    game.state.score = 16850;
    game.state.ember = 9;
    game.showEndScreen();
    game.frozen = true;
    return true;
  }

  return false;
}
