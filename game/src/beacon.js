// Emberlight — the Beacon Flare.
//
// The lighthouse is not only a thing to defend: it is a weapon the
// Keeper can fire, once per wave, at a cell of their choosing. The
// 3x3 ground around that cell blazes for four seconds — 30 damage a
// second to every creature standing in it, and a 35% slow — for 2
// ember. The price is real: ember is the lighthouse's health, so a
// flare that saves nothing costs the game two leaks' worth of light.
// It needs at least 3 ember left to fire, so the Keeper can never
// burn the last light itself, and it can fire at most once a wave,
// so it is a decision, not a button to mash.
//
// The Beacon owns its own state (the burning zone, the once-per-wave
// flag, the running totals the bots and the tests read). The slow is
// applied through the enemy's own flare fields, so a lantern's chill
// (a stronger slow) still takes precedence and neither slow ever
// multiplies the other.
import { BEACON, BOARD } from './config.js';

const TICK = 0.1; // damage ticks, ten a second

export class Beacon {
  constructor() {
    this.usedThisWave = false;
    this.flare = null; // { col, row, until } while the ground blazes
    this.tickClock = 0;
    this.casts = 0; // casts this game
    this.damageDealt = 0; // damage the blaze has dealt this game
    this.kills = 0; // creatures whose last breath was the blaze
    this.emberSpent = 0;
  }

  resetWave() {
    this.usedThisWave = false;
    this.flare = null;
    this.tickClock = 0;
  }

  // The three gates: a wave must be running, the flare must not be
  // spent this wave, and the lighthouse must hold at least 3 ember.
  canFire(state) {
    return (
      state.phase === 'wave' &&
      !this.usedThisWave &&
      state.ember >= BEACON.minEmber
    );
  }

  // Aim at a board cell (clamped to the board) and light the blaze.
  // Returns false when any gate refuses; nothing is spent then.
  fire(state, col, row) {
    if (!this.canFire(state)) return false;
    col = Math.max(0, Math.min(BOARD.cols - 1, Math.round(col)));
    row = Math.max(0, Math.min(BOARD.rows - 1, Math.round(row)));
    state.ember -= BEACON.costEmber;
    this.emberSpent += BEACON.costEmber;
    this.usedThisWave = true;
    this.casts++;
    this.flare = {
      col,
      row,
      until: state.now + BEACON.duration,
    };
    this.tickClock = 0;
    return true;
  }

  // The 3x3 zone around the aimed cell, clipped to the board's edges.
  zoneCells() {
    if (!this.flare) return null;
    const { col, row } = this.flare;
    const r = BEACON.radiusCells;
    return {
      c0: Math.max(0, col - r),
      c1: Math.min(BOARD.cols - 1, col + r),
      r0: Math.max(0, row - r),
      r1: Math.min(BOARD.rows - 1, row + r),
    };
  }

  // Is a creature's cell inside the blazing zone right now?
  inZone(enemy) {
    if (!this.flare) return false;
    const z = this.zoneCells();
    return (
      enemy.col >= z.c0 && enemy.col <= z.c1 &&
      enemy.row >= z.r0 && enemy.row <= z.r1
    );
  }

  update(dt, state) {
    if (!this.flare) return;
    if (state.now >= this.flare.until) {
      this.flare = null;
      return;
    }
    this.tickClock += dt;
    while (this.tickClock >= TICK) {
      this.tickClock -= TICK;
      const dmg = BEACON.dps * TICK;
      for (const e of state.enemies) {
        if (e.dead) continue;
        if (!this.inZone(e)) continue;
        // The blaze holds creatures in the light a moment after they
        // step out: the slow lingers half a second past the zone.
        e.flareUntil = Math.max(e.flareUntil || 0, state.now + 0.5);
        const wasAlive = !e.dead;
        e.takeDamage(dmg);
        this.damageDealt += dmg;
        // The kill itself is paid once by the state's own dead-check
        // further down the step; the beacon only flags it as its own.
        if (wasAlive && e.dead) e.killedByFlare = true;
      }
    }
  }
}
