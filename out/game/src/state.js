// Emberlight — the state of one game.
//
// State owns the gold, the ember, the waves and the win/lose conditions,
// and knows nothing about drawing or input. The loop asks it to update
// the world a small step at a time; the HUD reads its numbers.
import { ECONOMY, TOTAL_WAVES } from './config.js';
import { Enemy } from './enemies.js';
import { buildWaveQueue } from './levels.js';

// What the Keeper is told after a leak: one line per creature, naming
// the fix instead of only the loss. The panel shows the latest one.
export const LEAK_ADVICE = {
  wisp: 'A Wisp slipped through — the towers near the door need more reach, or a second flame beside them.',
  shade: 'A Shade slipped through — slow, tough skin. Concentrate fire where the path bends.',
  brute: 'A Brute broke through — brutes need concentrated damage. Upgrade a tower near the bend, or add a Storm Spire.',
  wraith: 'A Wraith slipped past — wraiths heal as they walk. Focus them down before they leave the light.',
  moth: 'The Dread Moth reached the ember — it takes everything you have. Spend it all before the last horn.',
};

export const PHASES = {
  TITLE: 'title',
  BUILD: 'build', // between waves: place towers, then start the next wave
  WAVE: 'wave', // a wave is marching
  WON: 'won',
  LOST: 'lost',
};

export class GameState {
  constructor(rng, sounds) {
    this.rng = rng;
    this.sounds = sounds;
    this.phase = PHASES.TITLE;
    this.gold = ECONOMY.startGold;
    this.ember = ECONOMY.startEmber;
    this.maxEmber = ECONOMY.startEmber;
    this.wave = 0; // waves cleared so far
    this.score = 0;
    this.kills = 0;
    this.goldEarned = 0;
    this.leaked = 0;
    this.towers = []; // Tower objects on the board
    this.enemies = [];
    this.projectiles = [];
    this.effects = []; // hit flashes, chill rings, lightning bolts
    this.spawnQueue = [];
    this.spawnClock = 0;
    this.waveClock = 0; // seconds since the current wave started
    this.now = 0; // game clock, seconds; enemies read it for chills
    this.speed = 1; // 1x or 2x
    this.paused = false;
    this.waveBanner = null; // { text, until } shown centre-screen
    this.endReason = '';
    this.leaksByType = {}; // creature type -> how many reached the door
    this.advice = ''; // latest leak advice, shown in the side panel
    this.events = []; // kill/leak/wave events, drained by the loop for effects
  }

  get waveInProgress() {
    return this.phase === PHASES.WAVE;
  }

  get nextWaveNumber() {
    return this.wave + 1;
  }

  get waveComplete() {
    return this.spawnQueue.length === 0 && this.enemies.length === 0;
  }

  startGame() {
    this.phase = PHASES.BUILD;
    this.showBanner('Night 1 approaches — build your light', 2.4);
  }

  startWave() {
    if (this.phase !== PHASES.BUILD) return false;
    if (this.wave >= TOTAL_WAVES) return false;
    this.wave += 1;
    this.phase = PHASES.WAVE;
    this.spawnQueue = buildWaveQueue(this.wave);
    this.spawnClock = 0;
    this.waveClock = 0;
    const boss = this.wave === TOTAL_WAVES;
    this.showBanner(boss ? 'The Dread Moth comes…' : `Wave ${this.wave} of ${TOTAL_WAVES}`, 2.2);
    this.sounds.waveHorn();
    return true;
  }

  showBanner(text, seconds) {
    this.waveBanner = { text, until: this.now + seconds };
  }

  // One fixed step of the world. dt is real seconds; the caller applies
  // the speed multiplier before calling.
  update(dt) {
    if (this.paused) return;
    this.now += dt;
    this.waveClock += dt;
    if (this.waveBanner && this.now >= this.waveBanner.until) this.waveBanner = null;

    // Spawn the next creature when its time comes.
    if (this.phase === PHASES.WAVE && this.spawnQueue.length > 0) {
      this.spawnClock += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.spawnClock) {
        const { type } = this.spawnQueue.shift();
        this.enemies.push(new Enemy(type, this.wave));
      }
    }

    // Towers fire.
    for (const tower of this.towers) {
      tower.update(dt, this.enemies, this.projectiles, (t) => this.onTowerShot(t));
    }

    // Projectiles fly and land.
    for (const p of this.projectiles) p.update(dt, this.enemies, this.effects, this.now);
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // Creatures walk, heal, and reach the door.
    for (const enemy of this.enemies) enemy.update(dt, this.now);
    for (const enemy of this.enemies) {
      if (enemy.leaked) this.onLeak(enemy);
      else if (enemy.dead) this.onKill(enemy);
    }
    this.enemies = this.enemies.filter((e) => !e.dead && !e.leaked);

    // Transient hit effects fade.
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < 0.35);

    // A wave ends when nothing is left to spawn or fight.
    if (this.phase === PHASES.WAVE && this.waveComplete) {
      this.onWaveCleared();
    }
  }

  onTowerShot(tower) {
    if (tower.type === 'brazier') this.sounds.shootBrazier();
    else if (tower.type === 'lantern') this.sounds.shootLantern();
    else this.sounds.shootSpire();
  }

  onKill(enemy) {
    this.kills += 1;
    this.gold += enemy.reward;
    this.goldEarned += enemy.reward;
    this.score += 10 + enemy.reward;
    this.events.push({ kind: 'kill', x: enemy.x, y: enemy.y, reward: enemy.reward });
    this.sounds.kill();
    this.sounds.coin();
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
    }
  }

  // The loss screen says what actually broke, from the leaks counted,
  // so a Keeper who lost knows what to change next time.
  lossReason() {
    const brutes = this.leaksByType.brute || 0;
    const wraiths = this.leaksByType.wraith || 0;
    const shades = this.leaksByType.shade || 0;
    if (brutes > 0) {
      return `The ember went out. ${brutes} brute${brutes > 1 ? 's' : ''} broke through — they need concentrated damage: upgrade towers near the final bend, or add a Storm Spire.`;
    }
    if (wraiths > 0) {
      return `The ember went out. Wraiths slipped past and healed on the march — focus them with braziers before they leave the light.`;
    }
    if (shades > 0) {
      return `The ember went out. Shades wore the line down — slow them with a Frost Lantern and stack fire on the bends.`;
    }
    return 'The ember went out. The dark took the shore — build wider, upgrade sooner, and mind the bend.';
  }

  onWaveCleared() {
    const bonus = ECONOMY.waveClearBonus + ECONOMY.waveClearPerWave * this.wave;
    this.gold += bonus;
    this.goldEarned += bonus;
    this.score += 100 * this.wave;
    this.events.push({ kind: 'wave-clear', bonus });
    this.sounds.waveClear();
    if (this.wave >= TOTAL_WAVES) {
      this.phase = PHASES.WON;
      this.score += this.ember * 50;
      this.endReason = 'Dawn breaks over a shore still lit. The lighthouse stands.';
      this.sounds.win();
    } else {
      this.phase = PHASES.BUILD;
      this.showBanner(`Wave ${this.wave} cleared  ·  +${bonus} gold`, 2.2);
    }
  }

  // --- Building: the rules for spending gold on the board. ---

  towerAt(col, row) {
    return this.towers.find((t) => t.col === col && t.row === row) || null;
  }

  canAfford(cost) {
    return this.gold >= cost;
  }

  // Validate a build and spend the gold. The caller constructs the Tower
  // and puts it on the board; state only guards the rules and the purse.
  buildTower(type, col, row, def) {
    if (this.phase !== PHASES.BUILD && this.phase !== PHASES.WAVE) return false;
    if (this.towerAt(col, row)) return false;
    if (!this.canAfford(def.cost)) return false;
    this.gold -= def.cost;
    return true;
  }

  spend(amount) {
    if (!this.canAfford(amount)) return false;
    this.gold -= amount;
    return true;
  }

  refund(amount) {
    this.gold += amount;
  }
}
