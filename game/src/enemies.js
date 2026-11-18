// Emberlight v5 — the creatures that crawl out of the dark.
//
// An Enemy walks straight from the dark edge toward the lighthouse
// door. It has no health: nothing damages it. It can be caught in the
// beam, carried, and burned in a furnace — or it can break free and
// carry on from where it was caught. When it reaches the door it
// spends itself against the ember and is gone.
import { BOARD, DOOR, ENEMIES, NET } from './config.js';

let nextId = 1;

export class Enemy {
  constructor(type, watch, at = null) {
    const def = ENEMIES[type];
    this.id = nextId++;
    this.type = type;
    this.name = def.name;
    this.weight = def.weight;
    this.speed = def.speed;
    this.leak = def.leak;
    this.radius = def.radius;
    this.color = def.color;
    this.core = def.core;
    // Where it starts: the dark edge, unless the caller places it —
    // the Dread Moth's return trips and the screenshot staging do.
    if (at) {
      this.x = at.x;
      this.y = at.y;
    } else {
      this.x = 30 + Math.random() * 60;
      this.y = 60 + Math.random() * 480;
    }
    // How far it still has to walk, in a straight line to the door.
    this.distanceToDoor = Math.hypot(DOOR.x - this.x, DOOR.y - this.y);
    // Capture state: 'free' walks, 'caught' hangs in the beam,
    // 'resistant' just escaped and cannot be caught again yet.
    this.state = 'free';
    this.inConeTime = 0; // seconds spent inside the beam while gathering
    this.caughtAt = null; // { x, y } where it was caught — it returns there
    this.caughtUntil = 0; // game clock; it breaks free when now passes this
    this.resistUntil = 0; // game clock; it cannot be caught while now is under this
    this.slot = -1; // which slot of the beam it hangs in, while caught
    // The Dread Moth alone has shell segments: one per furnace. A
    // furnace whose segment is broken cannot break another.
    this.mothPhase = 0;
    this.dead = false;
    this.leaked = false;
    this.burned = false; // destroyed in a furnace
    this.wobble = Math.random() * Math.PI * 2; // per-creature animation phase
  }

  isFree(now) {
    return this.state === 'free' && now >= this.resistUntil;
  }

  isCaught() {
    return this.state === 'caught';
  }

  // Catch it: it stops walking and hangs in the beam at its slot,
  // struggling until its escape time runs out.
  catch(slot, now) {
    this.state = 'caught';
    this.slot = slot;
    this.caughtAt = { x: this.x, y: this.y };
    const escape = this.type === 'wraith' ? NET.wraithEscapeTime : NET.escapeTime;
    this.caughtUntil = now + escape;
    this.inConeTime = 0;
  }

  // Free it where it was caught: its journey is not reset, and not
  // advanced either. It walks on from there, briefly uncatchable.
  release(now) {
    if (this.caughtAt) {
      this.x = this.caughtAt.x;
      this.y = this.caughtAt.y;
    }
    this.state = 'free';
    this.slot = -1;
    this.caughtAt = null;
    this.resistUntil = now + NET.resistTime;
    this.inConeTime = 0;
  }

  update(dt, now) {
    if (this.dead || this.leaked || this.burned) return;
    if (this.state === 'caught') return; // held still in the light
    const dx = DOOR.x - this.x;
    const dy = DOOR.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= this.speed * dt) {
      this.x = DOOR.x;
      this.y = DOOR.y;
      this.leaked = true;
      return;
    }
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
    this.distanceToDoor = Math.hypot(DOOR.x - this.x, DOOR.y - this.y);
  }

  // Which board cell the creature is standing in right now (the
  // screenshots read this, not raw pixels).
  get col() {
    return Math.floor(this.x / BOARD.cell);
  }

  get row() {
    return Math.floor(this.y / BOARD.cell);
  }

  // Fraction of its escape time still left, for the little ring that
  // shows how close a caught creature is to breaking free.
  escapeFraction(now) {
    if (this.state !== 'caught') return 0;
    const total = this.type === 'wraith' ? NET.wraithEscapeTime : NET.escapeTime;
    return Math.max(0, (this.caughtUntil - now) / total);
  }
}
