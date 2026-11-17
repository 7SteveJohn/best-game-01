// Emberlight — the creatures that crawl out of the dark.
//
// An Enemy walks the waypoint path, takes damage, can be chilled, and
// heals a little if it is a wraith. When it reaches the lighthouse door
// it spends itself against the ember and is gone.
import { ENEMIES, enemyHpFor } from './config.js';
import { WAYPOINTS } from './levels.js';

let nextId = 1;

export class Enemy {
  constructor(type, wave) {
    const def = ENEMIES[type];
    this.id = nextId++;
    this.type = type;
    this.name = def.name;
    this.maxHp = enemyHpFor(type, wave);
    this.hp = this.maxHp;
    this.speed = def.speed;
    this.reward = def.reward;
    this.leak = def.leak;
    this.radius = def.radius;
    this.color = def.color;
    this.core = def.core;
    this.regen = def.regen || 0;
    this.x = WAYPOINTS[0].x;
    this.y = WAYPOINTS[0].y;
    this.waypoint = 1; // next waypoint to walk toward
    this.slowUntil = 0; // game clock; chilled while now < slowUntil
    this.slowFactor = 1;
    this.dead = false;
    this.leaked = false;
    this.wobble = Math.random() * Math.PI * 2; // per-creature animation phase
    this.distance = 0; // how far along the path it has walked
  }

  // Current speed, chilled or not.
  currentSpeed(now) {
    return now < this.slowUntil ? this.speed * this.slowFactor : this.speed;
  }

  chill(factor, seconds, now) {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowUntil = Math.max(this.slowUntil, now + seconds);
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.dead = true;
  }

  update(dt, now) {
    if (this.dead || this.leaked) return;
    if (this.regen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    }
    if (this.slowUntil && now >= this.slowUntil) this.slowFactor = 1;
    const speed = this.currentSpeed(now);
    let move = speed * dt;
    while (move > 0 && !this.leaked) {
      const target = WAYPOINTS[this.waypoint];
      if (!target) {
        this.leaked = true;
        break;
      }
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= move) {
        this.x = target.x;
        this.y = target.y;
        this.distance += dist;
        move -= dist;
        this.waypoint += 1;
        if (this.waypoint >= WAYPOINTS.length) this.leaked = true;
      } else {
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
        this.distance += move;
        move = 0;
      }
    }
  }

  // Fraction of health left, for the little bar above the creature.
  hpFraction() {
    return Math.max(0, this.hp / this.maxHp);
  }
}
