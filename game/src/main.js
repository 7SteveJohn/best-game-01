// Emberlight v5 — the game itself: boot, loop, HUD and the beam.
//
// main.js wires the pieces together. It owns no balance numbers and no
// drawing; it runs the loop, keeps the DOM honest about the state, and
// turns the mouse into the beam: move to aim, hold to gather, let go
// over a furnace to burn what you caught.
import { BOARD, FURNACES, NET, TOTAL_WATCHES, PALETTE } from './config.js';
import { Rng } from './random.js';
import { SoundBank } from './audio.js';
import { GameState, PHASES } from './state.js';
import { Particles } from './particles.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { stageShot } from './shots.js';
import { describeWatch } from './levels.js';

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
    this.view = { hover: null };
    this.frozen = false;
    this.lastKills = 0;
    this.lastEmber = this.state.ember;
    this.bindButtons();
    this.input = new Input(this.canvas, {
      onAim: (point) => { this.view.hover = point; if (point) this.state.beam.aimAt(point.x, point.y); },
      onGatherStart: () => this.onGatherStart(),
      onGatherEnd: () => this.onGatherEnd(),
      onStartWatch: () => this.onStartWatch(),
      onTogglePause: () => this.onTogglePause(),
      onToggleSpeed: () => this.onToggleSpeed(),
      onToggleMute: () => this.onToggleMute(),
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

  // --- The beam: aim, gather, deliver ---

  // Bots and play-tests aim the beam at a world point.
  aimAt(x, y) {
    this.state.beam.aimAt(x, y);
    this.view.hover = { x, y };
  }

  // Bots and play-tests hold or release the gather button.
  setGathering(on) {
    if (on) this.onGatherStart();
    else this.onGatherEnd();
  }

  onGatherStart() {
    const state = this.state;
    if (state.phase !== PHASES.WATCH) return;
    this.sounds.unlock();
    state.beam.gathering = true;
  }

  onGatherEnd() {
    const state = this.state;
    if (!state.beam.gathering) return;
    state.beam.gathering = false;
    if (state.phase !== PHASES.WATCH) return;
    const result = state.deliver();
    if (!result) return;
    if (result.furnace) {
      const f = result.furnace;
      this.particles.burst(f.x, f.y, '#ff8a24', 26, 180);
      this.particles.burst(f.x, f.y, '#ffd76a', 18, 120);
      this.particles.addShake(5);
      if (result.points) {
        this.particles.floatText(f.x, f.y - 34, `+${result.points} score`, '#ffd76a');
      }
      if (result.mothRefused) {
        this.particles.floatText(f.x, f.y - 54, 'That furnace already broke a shell', '#ff8a8a');
      }
    } else if (result.freed > 0) {
      this.particles.floatText(BOARD.width / 2, 130, 'Let go — the catch slipped free', '#9aa7c7');
    }
    this.refreshHud();
  }

  // --- Watches, pause, speed, sound ---

  onStartWatch() {
    if (this.state.phase !== PHASES.BUILD) return;
    this.sounds.unlock();
    this.state.startWatch();
    this.refreshHud();
  }

  onTogglePause() {
    const state = this.state;
    if (state.phase !== PHASES.BUILD && state.phase !== PHASES.WATCH) return;
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
    this.view = { hover: null };
    this.frozen = false;
    this.stagedDecor = false;
    this.lastKills = 0;
    this.lastEmber = this.state.ember;
    this.endShown = false;
    $('end-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    this.refreshHud();
  }

  // Begin a real game from the title screen: hide the overlay, then
  // let the state open the build phase. A staged title shot decorates
  // the board with creatures in the beam; they are props, not a head
  // start, so they are cleared here before play begins.
  beginPlay() {
    if (this.stagedDecor) {
      this.state.enemies = [];
      this.state.beam.caught = [];
      this.stagedDecor = false;
    }
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
      if (state.phase === PHASES.WATCH || state.phase === PHASES.BUILD) {
        state.update(dt * state.speed);
        this.drainEvents();
      }
      this.particles.update(dt);
      // The lighthouse ember sheds sparks while the game is live.
      if ((state.phase === PHASES.BUILD || state.phase === PHASES.WATCH) && Math.random() < 0.35) {
        this.particles.emberDrift(BOARD.width - 36, 440);
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

  // Turn the state's catch/deliver/escape/leak/watch events into
  // sparks and numbers.
  drainEvents() {
    const state = this.state;
    for (const event of state.events) {
      if (event.kind === 'catch') {
        this.particles.burst(event.x, event.y, '#ffe9a8', 6, 70);
      } else if (event.kind === 'burn') {
        this.particles.burst(event.x, event.y, '#ff8a24', 8, 90);
      } else if (event.kind === 'escape') {
        this.particles.puff(event.x, event.y, '#8f96c9', 6);
        this.particles.floatText(event.x, event.y - 18, 'broke free', '#9aa7c7');
      } else if (event.kind === 'leak') {
        this.particles.addShake(9);
        this.particles.floatText(event.x, event.y - 20, `-${event.leak} ember`, '#ff5a5a');
        this.particles.burst(event.x, event.y, '#ff5a5a', 12, 120);
      } else if (event.kind === 'watch-clear') {
        this.particles.floatText(BOARD.width / 2, 130, `Watch ${state.watch} cleared`, '#7ddb8a');
      } else if (event.kind === 'deliver') {
        this.particles.burst(event.x, event.y, '#ffd76a', 14, 110);
      }
    }
    state.events.length = 0;
    this.lastKills = state.kills;
    this.lastEmber = state.ember;
  }

  // --- The HUD ---

  // What the Keeper is told before the next watch: what is coming, and
  // which furnace lights up. During a watch it is the latest leak
  // advice, or a nudge about the catch in hand.
  currentAdvice() {
    const state = this.state;
    if (state.phase === PHASES.WATCH) {
      if (state.beam.caught.length > 0 && state.spawnQueue.length === 0) {
        return 'The sea is empty — deliver your catch to a lit furnace, or let it go.';
      }
      return state.advice || '';
    }
    if (state.phase === PHASES.BUILD) {
      const next = state.nextWatchNumber;
      if (next > TOTAL_WATCHES) return '';
      const furnaces = state.nextFurnaces().map((f) => f.name).join(', ');
      const lighting = FURNACES.filter((f) => f.litFromWatch === next);
      const lightNote = lighting.length ? ` The ${lighting[0].name} lights up.` : '';
      return `Watch ${next} brings ${describeWatch(next)}.${lightNote} Furnaces lit: ${furnaces}.`;
    }
    return '';
  }

  refreshHud() {
    const state = this.state;
    $('watch').textContent = state.watch >= TOTAL_WATCHES && state.phase !== PHASES.BUILD
      ? `${TOTAL_WATCHES}/${TOTAL_WATCHES}`
      : `${state.watch}/${TOTAL_WATCHES}`;
    $('ember').textContent = `${state.ember}/${state.maxEmber}`;
    $('ember-bar').style.width = `${(state.ember / state.maxEmber) * 100}%`;
    $('score').textContent = `${state.score}`;
    $('kills').textContent = `${state.kills}`;
    const net = $('net');
    if (net) {
      net.textContent = `${state.beam.load}/${NET.capacity}`;
      net.parentElement.classList.toggle('poor', state.beam.load >= NET.capacity);
    }
    const netBar = $('net-bar');
    if (netBar) netBar.style.width = `${(state.beam.load / NET.capacity) * 100}%`;
    const waveBtn = $('btn-wave');
    if (state.phase === PHASES.BUILD && state.watch < TOTAL_WATCHES) {
      waveBtn.disabled = false;
      waveBtn.textContent = `Start Watch ${state.nextWatchNumber}  (Space)`;
    } else {
      waveBtn.disabled = true;
      waveBtn.textContent = state.phase === PHASES.WATCH ? `Watch ${state.watch} in progress…` : 'Start Watch';
    }
    $('btn-speed').textContent = state.speed === 1 ? 'Speed 1× (F)' : 'Speed 2× (F)';
    $('btn-pause').textContent = state.paused ? 'Resume (P)' : 'Pause (P)';
    $('btn-sound').textContent = this.sounds.muted ? 'Sound off (M)' : 'Sound on (M)';
    this.refreshPanel();
  }

  // The side panel: the furnaces and what they are doing, the next
  // watch, and the advice line.
  refreshPanel() {
    const state = this.state;
    const furnaces = $('furnaces');
    if (furnaces) {
      furnaces.innerHTML = state.furnaces.map((f) => {
        const lit = f.litFromWatch <= Math.max(state.watch, 1);
        const cooling = state.now < f.coolingUntil;
        const coolLeft = cooling ? Math.ceil(f.coolingUntil - state.now) : 0;
        const shard = f.shard === 'intact' ? '🐚 shell unbroken' : '🐚 shell broken';
        const status = !lit
          ? `lights in Watch ${f.litFromWatch}`
          : cooling ? `cooling… ${coolLeft}s` : 'ready';
        return `<li><b style="color:#ffb347">${f.name}</b> — ${status} · ${shard}</li>`;
      }).join('');
    }
    const next = $('next-watch');
    if (next) {
      if (state.watch >= TOTAL_WATCHES) {
        next.textContent = 'All watches faced.';
      } else {
        next.textContent = `Next: Watch ${state.nextWatchNumber} — ${describeWatch(state.nextWatchNumber)}`;
      }
    }
    const advice = $('advice');
    if (advice) advice.textContent = this.currentAdvice();
    const note = $('net-note');
    if (note) {
      const load = state.beam.load;
      note.textContent = load === 0
        ? 'Hold the mouse button to gather the dark into the beam. Let go over a lit furnace to burn it.'
        : load >= NET.capacity
          ? 'The net is full — swing to a furnace and let go, before they break free.'
          : `Carrying ${load} of ${NET.capacity} — gather more, or deliver before they struggle loose.`;
    }
  }

  bindButtons() {
    $('btn-wave').addEventListener('click', () => this.onStartWatch());
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
      <span><b>${state.watch}</b> watches faced</span>
      <span><b>${state.kills}</b> creatures burned</span>
      <span><b>${state.deliveries}</b> deliveries</span>
      <span><b>${state.score}</b> score</span>
      <span><b>${state.ember}/${state.maxEmber}</b> ember left</span>
      <span><b>${state.mothSegmentsBroken}/3</b> moth shells broken</span>`;
    $('btn-again').textContent = won ? 'Play Again (R)' : 'Try Again (R)';
    $('end-screen').classList.remove('hidden');
  }
}

new Emberlight();
