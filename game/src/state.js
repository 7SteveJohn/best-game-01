// Emberlight v5 — the state of one game.
//
// State owns the ember, the watches and the win/lose conditions, the
// beam and the net, the furnaces and the Dread Moth's shell. It knows
// nothing about drawing or input. The loop asks it to update the world
// a small step at a time; the HUD reads its numbers.
import { BEAM, ECONOMY, FURNACES, FURNACE_COOLDOWN, FURNACE_REACH, FURNACE_AIM_TOLERANCE, NET, TOTAL_WATCHES } from './config.js';
import { Enemy } from './enemies.js';
import { buildWatchQueue } from './levels.js';
import { Beam, angleDelta } from './beam.js';

// What the Keeper is told after a leak: one line per creature, naming
// the fix instead of only the loss. The panel shows the latest one.
export const LEAK_ADVICE = {
  wisp: 'A Wisp slipped through — it crosses the sea in 10 seconds. Catch it early, out by the dark edge.',
  shade: 'A Shade slipped through — slow and steady. Sweep the beam wide and gather it before it nears the door.',
  brute: 'A Brute broke through — it takes three of the net. Catch it alone and burn it before it gets close.',
  wraith: 'A Wraith slipped past — fast, and it breaks free in under two seconds. Deliver it the moment you catch it.',
  moth: 'The Dread Moth reached the ember — five ember gone. Catch it whole and carry it to a furnace with a shell left to break.',
};

export const PHASES = {
  TITLE: 'title',
  BUILD: 'build', // between watches: breathe, read the next watch, start it
  WATCH: 'watch', // a watch is arriving
  WON: 'won',
  LOST: 'lost',
};

export class GameState {
  constructor(rng, sounds) {
    this.rng = rng;
    this.sounds = sounds;
    this.phase = PHASES.TITLE;
    this.ember = ECONOMY.startEmber;
    this.maxEmber = ECONOMY.startEmber;
    this.watch = 0; // watches cleared so far
    this.score = 0;
    this.kills = 0; // creatures burned in furnaces
    this.deliveries = 0;
    this.leaked = 0;
    this.enemies = [];
    this.effects = []; // catch flashes, burn bursts, escape puffs
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.watchClock = 0; // seconds since the current watch started
    this.now = 0; // game clock, seconds
    this.speed = 1; // 1x or 2x
    this.paused = false;
    this.watchBanner = null; // { text, until } shown centre-screen
    this.endReason = '';
    this.leaksByType = {}; // creature type -> how many reached the door
    this.advice = ''; // latest leak advice, shown in the side panel
    this.events = []; // catch/deliver/escape/leak/watch events, drained by the loop
    // The beam and the net — the Keeper's only tool.
    this.beam = new Beam();
    // The furnaces: lit (by watch), cooling until a clock time, and
    // whether they still hold a shell segment of the Dread Moth.
    this.furnaces = FURNACES.map((f) => ({
      ...f,
      coolingUntil: 0,
      shard: 'intact', // the Moth's shell: 'intact' or 'broken'
    }));
    // The Dread Moth's shell: three segments, one per furnace. The
    // moth is defeated only when all three are broken.
    this.mothSegmentsBroken = 0;
    this.moth = null; // the living Moth, while it is on the sea
  }

  get watchInProgress() {
    return this.phase === PHASES.WATCH;
  }

  get nextWatchNumber() {
    return this.watch + 1;
  }

  // The furnaces lit for the next watch, so the Keeper can plan.
  nextFurnaces() {
    return this.furnaces.filter((f) => f.litFromWatch <= this.nextWatchNumber);
  }

  get watchComplete() {
    return this.spawnQueue.length === 0 && this.enemies.length === 0;
  }

  // A furnace is lit for this watch, cooled down, and within the
  // beam's reach from the lamp.
  furnaceReady(furnace) {
    return furnace.litFromWatch <= this.watch
      && this.now >= furnace.coolingUntil;
  }

  // The furnace the beam is pointing at, if any is lit, ready and
  // inside the cone (with a little slack past its edge).
  furnaceUnderBeam() {
    for (const furnace of this.furnaces) {
      if (!this.furnaceReady(furnace)) continue;
      const dx = furnace.x - this.beam.origin.x;
      const dy = furnace.y - this.beam.origin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > FURNACE_REACH) continue;
      const diff = Math.abs(angleDelta(this.beam.angle, Math.atan2(dy, dx)));
      if (diff <= BEAM.halfAngle + FURNACE_AIM_TOLERANCE) return furnace;
    }
    return null;
  }

  startGame() {
    this.phase = PHASES.BUILD;
    this.showBanner('Night 1 approaches — ready the beam', 2.4);
  }

  startWatch() {
    if (this.phase !== PHASES.BUILD) return false;
    if (this.watch >= TOTAL_WATCHES) return false;
    this.watch += 1;
    this.phase = PHASES.WATCH;
    this.spawnQueue = buildWatchQueue(this.watch, this.rng);
    this.spawnClock = 0;
    this.watchClock = 0;
    const boss = this.watch === TOTAL_WATCHES;
    this.showBanner(boss ? 'The Dread Moth comes…' : `Watch ${this.watch} of ${TOTAL_WATCHES} — the dark stirs`, 2.2);
    this.sounds.waveHorn();
    return true;
  }

  showBanner(text, seconds) {
    this.watchBanner = { text, until: this.now + seconds };
  }

  // One fixed step of the world. dt is real seconds; the caller applies
  // the speed multiplier before calling.
  update(dt) {
    if (this.paused) return;
    this.now += dt;
    this.watchClock += dt;
    if (this.watchBanner && this.now >= this.watchBanner.until) this.watchBanner = null;

    // Spawn the next creature when its time comes.
    if (this.phase === PHASES.WATCH && this.spawnQueue.length > 0) {
      this.spawnClock += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.spawnClock) {
        const { type, x, y } = this.spawnQueue.shift();
        const enemy = new Enemy(type, this.watch, { x, y });
        this.enemies.push(enemy);
        if (type === 'moth') this.moth = enemy;
      }
    }

    // The beam turns toward the pointer and gathers what it covers.
    this.beam.update(dt, this.now, this.enemies, (enemy) => {
      this.events.push({ kind: 'catch', x: enemy.x, y: enemy.y, type: enemy.type });
      this.effects.push({ kind: 'catch', x: enemy.x, y: enemy.y, color: '#ffe9a8', t: 0 });
      this.sounds.catch();
    });

    // Caught creatures struggle: when their escape time runs out they
    // break free where they were caught and carry on.
    for (const enemy of [...this.beam.caught]) {
      if (enemy.state === 'caught' && this.now >= enemy.caughtUntil) {
        this.beam.caught = this.beam.caught.filter((e) => e !== enemy);
        enemy.release(this.now);
        this.events.push({ kind: 'escape', x: enemy.x, y: enemy.y, type: enemy.type });
        this.sounds.escape();
      }
    }

    // Creatures walk, and reach the door.
    for (const enemy of this.enemies) enemy.update(dt, this.now);
    for (const enemy of this.enemies) {
      if (enemy.leaked) this.onLeak(enemy);
    }
    this.enemies = this.enemies.filter((e) => !e.dead && !e.leaked && !e.burned);

    // Transient hit effects fade.
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < 0.4);

    // A watch ends when nothing is left to spawn, catch or fight —
    // and, on the last watch, when the Moth's shell is broken.
    if (this.phase === PHASES.WATCH && this.watchComplete) {
      if (this.watch === TOTAL_WATCHES && this.mothSegmentsBroken < 3) return;
      this.onWatchCleared();
    }
  }

  // Deliver the catch: the Keeper let go of the button. If the beam
  // is over a lit, ready furnace, the catch burns there; otherwise the
  // creatures are freed where they were caught.
  deliver() {
    const caught = this.beam.drop();
    if (caught.length === 0) return null;
    const furnace = this.furnaceUnderBeam();
    if (!furnace) {
      for (const enemy of caught) enemy.release(this.now);
      return { burned: 0, freed: caught.length, furnace: null };
    }
    // The Dread Moth: only a furnace whose shell segment is still
    // intact can break it. A delivery to a spent furnace sends the
    // Moth back to the sea, unharmed.
    const moth = caught.find((e) => e.type === 'moth');
    if (moth && furnace.shard !== 'intact') {
      // The furnace burned, so it still needs to cool — but the Moth
      // is not broken by a spent furnace.
      furnace.coolingUntil = this.now + FURNACE_COOLDOWN;
      for (const enemy of caught) {
        if (enemy === moth) {
          enemy.release(this.now);
          this.sendMothBack(moth);
        } else {
          enemy.burned = true;
          this.onBurn(enemy, furnace);
        }
      }
      this.events.push({ kind: 'moth-refused', x: furnace.x, y: furnace.y });
      return { burned: caught.length - 1, freed: 1, furnace, mothRefused: true };
    }
    furnace.coolingUntil = this.now + FURNACE_COOLDOWN;
    let points = 0;
    for (const enemy of caught) {
      if (enemy === moth) continue; // the Moth is handled below
      enemy.burned = true;
      this.onBurn(enemy, furnace);
      points += ECONOMY.scorePerCreature;
    }
    points += ECONOMY.scorePerExtra * (caught.length - 1);
    if (moth) {
      furnace.shard = 'broken';
      this.mothSegmentsBroken += 1;
      points += ECONOMY.scorePerCreature + ECONOMY.mothSegmentBonus;
      if (this.mothSegmentsBroken >= 3) {
        // The third shell breaks: the Moth burns at last.
        moth.burned = true;
        this.onBurn(moth, furnace);
        this.moth = null;
        this.showBanner('The Dread Moth breaks', 2.4);
      } else {
        // The first two shells break but the Moth lives: back to the
        // dark edge, to be caught again.
        moth.release(this.now);
        this.sendMothBack(moth);
        this.showBanner(`A shell breaks — ${3 - this.mothSegmentsBroken} left`, 2.2);
      }
    }
    this.score += points;
    this.deliveries += 1;
    this.events.push({ kind: 'deliver', x: furnace.x, y: furnace.y, count: caught.length, points });
    this.sounds.deliver();
    return { burned: caught.length, freed: 0, furnace, points };
  }

  // The Moth goes back to the dark edge to come again.
  sendMothBack(moth) {
    const directions = ['north', 'middle', 'south'];
    const dir = directions[Math.floor(this.rng.float() * directions.length)];
    const ranges = { north: [60, 200], middle: [200, 400], south: [400, 540] };
    const range = ranges[dir];
    moth.x = 30 + this.rng.float() * 60;
    moth.y = range[0] + this.rng.float() * (range[1] - range[0]);
    moth.distanceToDoor = Math.hypot(924 - moth.x, 440 - moth.y);
  }

  onBurn(enemy, furnace) {
    this.kills += 1;
    this.events.push({ kind: 'burn', x: furnace.x, y: furnace.y, type: enemy.type });
    this.effects.push({ kind: 'burn', x: furnace.x, y: furnace.y, color: '#ff8a24', t: 0 });
  }

  onLeak(enemy) {
    this.leaked += 1;
    this.leaksByType[enemy.type] = (this.leaksByType[enemy.type] || 0) + 1;
    this.advice = LEAK_ADVICE[enemy.type] || '';
    this.ember -= enemy.leak;
    this.events.push({ kind: 'leak', x: enemy.x, y: enemy.y, leak: enemy.leak });
    this.sounds.leak();
    if (this.ember <= 0) {
      this.ember = 0;
      this.phase = PHASES.LOST;
      this.endReason = this.lossReason();
      this.sounds.lose();
      return;
    }
    if (enemy.type === 'moth') {
      // The Moth does not die at the door: it spends five ember and
      // goes back to the sea to come again.
      enemy.leaked = false;
      this.sendMothBack(enemy);
      this.showBanner('The Dread Moth reached the ember — and turns back to the dark', 2.4);
      return;
    }
  }

  // The loss screen says what actually broke, from the leaks counted,
  // so a Keeper who lost knows what to change next time.
  lossReason() {
    const brutes = this.leaksByType.brute || 0;
    const wraiths = this.leaksByType.wraith || 0;
    const wisps = this.leaksByType.wisp || 0;
    if (brutes > 0) {
      return `The ember went out. ${brutes} brute${brutes > 1 ? 's' : ''} broke through — a brute takes three of the net. Catch it alone and burn it before it gets close.`;
    }
    if (wraiths > 0) {
      return 'The ember went out. Wraiths slipped past — they break free in under two seconds. Deliver the moment you catch one.';
    }
    if (wisps > 0) {
      return 'The ember went out. Wisps crossed the sea in ten seconds — catch them out by the dark edge, not at the door.';
    }
    return 'The ember went out. The dark took the shore — catch earlier, deliver faster, and mind the furnaces cooling.';
  }

  onWatchCleared() {
    this.score += 100 * this.watch;
    this.events.push({ kind: 'watch-clear' });
    this.sounds.waveClear();
    if (this.watch >= TOTAL_WATCHES) {
      this.phase = PHASES.WON;
      this.score += this.ember * ECONOMY.winEmberBonus;
      this.endReason = 'Dawn breaks over a shore still lit. The Dread Moth lies broken over the last furnace.';
      this.sounds.win();
    } else {
      this.phase = PHASES.BUILD;
      this.showBanner(`Watch ${this.watch} cleared`, 2.2);
    }
  }
}
