// Emberlight v5 — the lighthouse beam.
//
// The beam is the player's only tool. It pivots on the lamp and turns
// toward the pointer at a capped rate, so aiming answers at once
// without teleporting. While the Keeper holds the button down it
// gathers: a creature that stays inside the cone for a quarter of a
// second is caught and hangs in the beam until it is delivered to a
// furnace or breaks free.
import { BEAM, LAMP, NET } from './config.js';

// Smallest signed angle from `from` to `to`, in (-PI, PI].
export function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export class Beam {
  constructor() {
    this.angle = Math.PI; // pointing west, out to sea
    this.targetAngle = Math.PI;
    this.gathering = false; // the Keeper is holding the button down
    this.caught = []; // Enemy objects hanging in the beam, in capture order
  }

  // Where the beam is pointing, in world pixels.
  get origin() {
    return LAMP;
  }

  // Point the beam at a world position; it turns toward it at the
  // capped rate on the next updates, it does not snap.
  aimAt(x, y) {
    this.targetAngle = Math.atan2(y - LAMP.y, x - LAMP.x);
  }

  // The angle the beam is pointing right now, for the renderer.
  get aimAngle() {
    return this.angle;
  }

  // Weight the net is carrying right now.
  get load() {
    return this.caught.reduce((sum, e) => sum + e.weight, 0);
  }

  get full() {
    return this.load >= NET.capacity;
  }

  // True while the cone covers the point (x, y).
  covers(x, y) {
    const dx = x - LAMP.x;
    const dy = y - LAMP.y;
    const dist = Math.hypot(dx, dy);
    if (dist > BEAM.length) return false;
    return Math.abs(angleDelta(this.angle, Math.atan2(dy, dx))) <= BEAM.halfAngle;
  }

  // Where a caught creature hangs, in world pixels: a fixed slot along
  // the beam, with a slight wobble so the struggle reads.
  slotPosition(slot, now, wobblePhase) {
    const dist = BEAM.slotDistances[Math.min(slot, BEAM.slotDistances.length - 1)];
    const wob = Math.sin(now * 6 + wobblePhase) * 4;
    return {
      x: LAMP.x + Math.cos(this.angle) * dist,
      y: LAMP.y + Math.sin(this.angle) * dist + wob,
    };
  }

  // Turn toward the target angle, at most the capped rate, and gather
  // whatever has stayed in the cone long enough. Called once per fixed
  // step by the state.
  update(dt, now, enemies, onCatch) {
    const delta = angleDelta(this.angle, this.targetAngle);
    const maxTurn = BEAM.turnRate * dt;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, delta));
    if (!this.gathering) return;
    for (const enemy of enemies) {
      if (!enemy.isFree(now)) continue;
      if (this.full) break;
      if (!this.covers(enemy.x, enemy.y)) {
        enemy.inConeTime = 0;
        continue;
      }
      enemy.inConeTime += dt;
      if (enemy.inConeTime >= BEAM.gatherTime) {
        const slot = this.caught.length;
        enemy.catch(slot, now);
        this.caught.push(enemy);
        if (onCatch) onCatch(enemy);
      }
    }
  }

  // Drop the catch: the creatures go back to where they were caught
  // and carry on. The caller decides whether a furnace takes them
  // first; this only empties the beam.
  drop() {
    const caught = this.caught;
    this.caught = [];
    return caught;
  }

  reset() {
    this.angle = Math.PI;
    this.targetAngle = Math.PI;
    this.gathering = false;
    this.caught = [];
  }
}
