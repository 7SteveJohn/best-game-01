// Emberlight — the game itself: boot, loop, HUD and the shop.
//
// main.js wires the pieces together. It owns no balance numbers and no
// drawing; it runs the loop, keeps the DOM honest about the state, and
// turns clicks into builds, upgrades and waves.
import { BOARD, TOWERS, TOWER_ORDER, TOTAL_WAVES, PALETTE } from './config.js';
import { Rng } from './random.js';
import { SoundBank } from './audio.js';
import { GameState, PHASES } from './state.js';
import { Tower } from './towers.js';
import { Particles } from './particles.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { isBuildable } from './levels.js';
import { stageShot } from './shots.js';
import { describeWave } from './levels.js';

const $ = (id) => document.getElementById(id);

export class Emberlight {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    const seed = Number(params.get('seed') || '0');
    this.rng = seed ? new Rng(seed) : new Rng((Date.now() ^ 0x9e3779b9) >>> 0);
    this.sounds = new SoundBank();
    this.state = new GameState(this.rng, this.sounds);
    this.particles = new Particles();
    this.canvas = $('game');
    this.canvas.width = BOARD.width;
    this.canvas.height = BOARD.height;
    this.renderer = new Renderer(this.canvas, this.rng);
    this.view = { hover: null, placeType: null, placeDef: null, selected: null };
    this.frozen = false;
    this.lastKills = 0;
    this.lastEmber = this.state.ember;
    this.lastGold = this.state.gold;
    this.buildShop();
    this.bindButtons();
    this.input = new Input(this.canvas, {
      onHover: (cell) => { this.view.hover = cell; },
      onCellClick: (col, row) => this.onCellClick(col, row),
      onPickType: (type) => this.pickType(type),
      onStartWave: () => this.onStartWave(),
      onTogglePause: () => this.onTogglePause(),
      onToggleSpeed: () => this.onToggleSpeed(),
      onToggleMute: () => this.onToggleMute(),
      onCancel: () => this.cancelSelection(),
      onRestartKey: () => this.onRestartKey(),
    });
    this.loop = this.loop.bind(this);
    this.lastTime = performance.now();
    this.shotStaged = stageShot(this, params);
    this.refreshHud();
    // A handle for automated play-tests (used by my own screenshot and
    // balance checks); the game never reads it itself.
    window.__ember = this;
    requestAnimationFrame(this.loop);
  }

  // --- Building ---

  autoBuild(type, col, row) {
    const def = TOWERS[type];
    if (!this.state.buildTower(type, col, row, def)) return false;
    this.state.towers.push(new Tower(type, col, row));
    return true;
  }

  pickType(type) {
    this.sounds.unlock();
    this.sounds.click();
    if (this.view.placeType === type) {
      this.view.placeType = null;
      this.view.placeDef = null;
    } else {
      this.view.placeType = type;
      this.view.placeDef = TOWERS[type];
      this.view.selected = null;
    }
    this.refreshShop();
    this.refreshSelected();
  }

  cancelSelection() {
    this.view.placeType = null;
    this.view.placeDef = null;
    this.view.selected = null;
    this.refreshShop();
    this.refreshSelected();
  }

  onCellClick(col, row) {
    this.sounds.unlock();
    const state = this.state;
    if (state.phase === PHASES.TITLE || state.phase === PHASES.WON || state.phase === PHASES.LOST) return;
    const tower = state.towerAt(col, row);
    if (tower) {
      this.view.selected = tower;
      this.view.placeType = null;
      this.view.placeDef = null;
      this.sounds.click();
      this.refreshShop();
      this.refreshSelected();
      return;
    }
    if (this.view.placeType) {
      if (!isBuildable(col, row)) return;
      const type = this.view.placeType;
      const def = TOWERS[type];
      if (!this.autoBuild(type, col, row)) return;
      this.sounds.build();
      const c = { x: col * BOARD.cell + BOARD.cell / 2, y: row * BOARD.cell + BOARD.cell / 2 };
      this.particles.burst(c.x, c.y, def.color, 14, 110);
      this.refreshHud();
      this.refreshShop();
      return;
    }
    this.view.selected = null;
    this.refreshSelected();
  }

  // --- Waves, pause, speed, sound ---

  onStartWave() {
    if (this.state.phase !== PHASES.BUILD) return;
    this.sounds.unlock();
    this.view.selected = null;
    this.refreshSelected();
    this.state.startWave();
    this.refreshHud();
  }

  onTogglePause() {
    const state = this.state;
    if (state.phase !== PHASES.BUILD && state.phase !== PHASES.WAVE) return;
    state.paused = !state.paused;
    this.sounds.click();
    this.refreshHud();
  }

  onToggleSpeed() {
    this.state.speed = this.state.speed === 1 ? 2 : 1;
    this.sounds.click();
    this.refreshHud();
  }

  onToggleMute() {
    this.sounds.unlock();
    this.sounds.setMuted(!this.sounds.muted);
    this.refreshHud();
  }

  onRestartKey() {
    if (this.state.phase === PHASES.WON || this.state.phase === PHASES.LOST) this.resetGame();
  }

  resetGame() {
    this.state = new GameState(this.rng, this.sounds);
    this.particles = new Particles();
    this.view = { hover: null, placeType: null, placeDef: null, selected: null };
    this.frozen = false;
    this.lastKills = 0;
    this.lastEmber = this.state.ember;
    this.lastGold = this.state.gold;
    $('end-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    this.refreshHud();
    this.refreshShop();
    this.refreshSelected();
  }

  // Begin a real game from the title screen: hide the overlay, then
  // let the state open the build phase.
  beginPlay() {
    $('title-screen').classList.add('hidden');
    this.state.startGame();
    this.refreshHud();
  }

  // --- The loop ---

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.frozen) {
      const state = this.state;
      if (state.phase === PHASES.WAVE || state.phase === PHASES.BUILD) {
        state.update(dt * state.speed);
        this.drainEvents();
      }
      this.particles.update(dt);
      // The lighthouse ember sheds sparks while the game is live.
      if ((state.phase === PHASES.BUILD || state.phase === PHASES.WAVE) && Math.random() < 0.35) {
        this.particles.emberDrift(14 * BOARD.cell + 28, 6 * BOARD.cell + 56);
      }
      if ((state.phase === PHASES.WON || state.phase === PHASES.LOST) && !this.endShown) {
        this.showEndScreen();
      }
    }
    this.renderer.draw(this.state, this.particles, this.view);
    this.refreshHud();
    requestAnimationFrame(this.loop);
  }

  // Run the world forward a fixed number of steps, for a screenshot.
  simulate(seconds) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      this.state.update(1 / 60);
      this.drainEvents();
      this.particles.update(1 / 60);
    }
  }

  // Turn the state's kill/leak/wave events into sparks and numbers.
  drainEvents() {
    const state = this.state;
    for (const event of state.events) {
      if (event.kind === 'kill') {
        this.particles.burst(event.x, event.y, '#ffd76a', 8, 80);
        this.particles.puff(event.x, event.y);
        this.particles.floatText(event.x, event.y - 14, `+${event.reward} gold`);
      } else if (event.kind === 'leak') {
        this.particles.addShake(9);
        this.particles.floatText(event.x, event.y - 20, `-${event.leak} ember`, '#ff5a5a');
        this.particles.burst(event.x, event.y, '#ff5a5a', 12, 120);
      } else if (event.kind === 'wave-clear') {
        this.particles.floatText(BOARD.width / 2, 130, `Wave cleared  ·  +${event.bonus} gold`, '#7ddb8a');
      }
    }
    state.events.length = 0;
    this.lastKills = state.kills;
    this.lastEmber = state.ember;
    this.lastGold = state.gold;
  }

  // --- The shop and the HUD ---

  buildShop() {
    const shop = $('shop');
    shop.innerHTML = '';
    for (const id of TOWER_ORDER) {
      const def = TOWERS[id];
      const card = document.createElement('button');
      card.className = 'shop-card';
      card.id = `shop-${id}`;
      card.innerHTML = `
        <span class="shop-key">${def.key}</span>
        <span class="shop-name" style="color:${def.color}">${def.name}</span>
        <span class="shop-cost">⬤ ${def.cost} gold</span>
        <span class="shop-blurb">${def.blurb}</span>
        <span class="shop-stats">DMG ${def.damage} · ${def.rate}/s · RNG ${def.range}</span>`;
      card.addEventListener('click', () => this.pickType(id));
      shop.appendChild(card);
    }
  }

  refreshShop() {
    for (const id of TOWER_ORDER) {
      const card = $(`shop-${id}`);
      if (!card) continue;
      card.classList.toggle('picked', this.view.placeType === id);
      card.classList.toggle('poor', !this.state.canAfford(TOWERS[id].cost));
    }
    const next = $('next-wave');
    if (next) {
      next.textContent = this.state.wave >= TOTAL_WAVES
        ? 'All waves faced.'
        : `Next: Wave ${this.state.nextWaveNumber} — ${describeWave(this.state.nextWaveNumber)}`;
    }
  }

  refreshSelected() {
    const panel = $('selected');
    const tower = this.view.selected;
    if (!tower) {
      panel.innerHTML = '<p class="hint">Click a tower on the board to upgrade or sell it. Click a plot with a tower picked to build.</p>';
      return;
    }
    const def = tower.def;
    const upgrade = tower.upgradeCost;
    panel.innerHTML = `
      <h3 style="color:${def.color}">${def.name} · Lv ${tower.level}</h3>
      <p class="hint">${def.detail}</p>
      <p>Damage ${tower.damage} · Range ${Math.round(tower.range)} · ${tower.rate}/s</p>
      <div class="row">
        <button id="btn-upgrade" ${upgrade === null || !this.state.canAfford(upgrade) ? 'disabled' : ''}>
          ${upgrade === null ? 'Max level' : `Upgrade · ${upgrade} gold`}
        </button>
        <button id="btn-sell">Sell · ${tower.sellValue} gold</button>
      </div>`;
    const upgradeBtn = $('btn-upgrade');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        const cost = tower.upgradeCost;
        if (cost === null || !this.state.spend(cost)) return;
        tower.upgrade();
        this.sounds.upgrade();
        this.particles.burst(tower.x, tower.y, def.color, 16, 130);
        this.refreshHud();
        this.refreshSelected();
      });
    }
    $('btn-sell').addEventListener('click', () => {
      this.state.refund(tower.sellValue);
      this.state.towers = this.state.towers.filter((t) => t !== tower);
      this.sounds.sell();
      this.particles.puff(tower.x, tower.y, '#9aa7c7', 10);
      this.view.selected = null;
      this.refreshHud();
      this.refreshSelected();
    });
  }

  refreshHud() {
    const state = this.state;
    $('gold').textContent = `${state.gold}`;
    $('gold').parentElement.classList.toggle('poor', state.gold < 50);
    $('wave').textContent = state.wave >= TOTAL_WAVES && state.phase !== PHASES.BUILD
      ? `${TOTAL_WAVES}/${TOTAL_WAVES}`
      : `${state.wave}/${TOTAL_WAVES}`;
    $('ember').textContent = `${state.ember}/${state.maxEmber}`;
    $('ember-bar').style.width = `${(state.ember / state.maxEmber) * 100}%`;
    $('score').textContent = `${state.score}`;
    $('kills').textContent = `${state.kills}`;
    const waveBtn = $('btn-wave');
    if (state.phase === PHASES.BUILD && state.wave < TOTAL_WAVES) {
      waveBtn.disabled = false;
      waveBtn.textContent = `Start Wave ${state.nextWaveNumber}  (Space)`;
    } else {
      waveBtn.disabled = true;
      waveBtn.textContent = state.phase === PHASES.WAVE ? `Wave ${state.wave} in progress…` : 'Start Wave';
    }
    $('btn-speed').textContent = state.speed === 1 ? 'Speed 1× (F)' : 'Speed 2× (F)';
    $('btn-pause').textContent = state.paused ? 'Resume (P)' : 'Pause (P)';
    $('btn-sound').textContent = this.sounds.muted ? 'Sound off (M)' : 'Sound on (M)';
    this.refreshShop();
  }

  bindButtons() {
    $('btn-wave').addEventListener('click', () => this.onStartWave());
    $('btn-speed').addEventListener('click', () => this.onToggleSpeed());
    $('btn-pause').addEventListener('click', () => this.onTogglePause());
    $('btn-sound').addEventListener('click', () => this.onToggleMute());
    $('btn-restart').addEventListener('click', () => this.resetGame());
    $('btn-start').addEventListener('click', () => {
      this.sounds.unlock();
      this.sounds.waveHorn();
      this.beginPlay();
    });
    $('btn-again').addEventListener('click', () => this.resetGame());
  }

  showEndScreen() {
    this.endShown = true;
    $('title-screen').classList.add('hidden');
    const state = this.state;
    const won = state.phase === PHASES.WON;
    $('end-title').textContent = won ? 'Dawn Breaks' : 'The Light Goes Out';
    $('end-title').style.color = won ? PALETTE.ember : '#ff5a5a';
    $('end-reason').textContent = state.endReason;
    $('end-stats').innerHTML = `
      <span><b>${state.wave}</b> waves faced</span>
      <span><b>${state.kills}</b> creatures burned</span>
      <span><b>${state.goldEarned}</b> gold earned</span>
      <span><b>${state.score}</b> score</span>
      <span><b>${state.ember}/${state.maxEmber}</b> ember left</span>`;
    $('btn-again').textContent = won ? 'Play Again (R)' : 'Try Again (R)';
    $('end-screen').classList.remove('hidden');
  }
}

new Emberlight();
