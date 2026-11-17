// Emberlight — the three towers and what they shoot.
//
// A Tower stands on a plot, picks the creature furthest along the path
// inside its reach, and fires on a cooldown. Its level raises damage and
// range; the lantern chills, the spire's bolts leap to nearby creatures.
import { TOWERS, ECONOMY } from './config.js';

export class Tower {
  constructor(type, col, row) {
    const def = TOWERS[type];
    this.type = type;
    this.def = def;
    this.col = col;
    this.row = row;
    this.x = col * 64 + 32;
    this.y = row * 64 + 32;
    this.level = 1;
    this.invested = def.cost; // gold sunk into it, for the sell refund
    this.cooldown = 0;
    this.angle = -Math.PI / 2; // where its flame points
    this.flash = 0; // muzzle-flash timer, for the render
  }

  get damage() {
    return Math.round(this.def.damage * (1 + ECONOMY.upgradeDamageFactor * (this.level - 1)));
  }

  get range() {
    return this.def.range * (1 + ECONOMY.upgradeRangeFactor * (this.level - 1));
  }

  get rate() {
    return this.def.rate;
  }

  get upgradeCost() {
    if (this.level >= ECONOMY.maxLevel) return null;
    return Math.round(this.def.cost * ECONOMY.upgradeCostFactor * this.level);
  }

  get sellValue() {
    return Math.round(this.invested * ECONOMY.sellRefund);
  }

  upgrade() {
    const cost = this.upgradeCost;
    if (cost === null) return false;
    this.invested += cost;
    this.level += 1;
    return true;
  }

  // The creature furthest along the path within reach, or null.
  acquire(enemies) {
    let best = null;
    let bestDistance = -1;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.leaked) continue;
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d <= this.range && enemy.distance > bestDistance) {
        best = enemy;
        bestDistance = enemy.distance;
      }
    }
    return best;
  }

  update(dt, enemies, projectiles, onShoot) {
    this.cooldown -= dt;
    this.flash = Math.max(0, this.flash - dt);
    const target = this.acquire(enemies);
    if (!target) return;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown > 0) return;
    this.cooldown = 1 / this.rate;
    this.flash = 0.09;
    projectiles.push(new Projectile(this, target));
    onShoot(this);
  }
}

// A glowing shot flying at one creature. Lantern shots chill on arrival;
// spire bolts leap to nearby creatures when they land.
export class Projectile {
  constructor(tower, target) {
    this.tower = tower;
    this.target = target;
    this.x = tower.x + Math.cos(tower.angle) * 18;
    this.y = tower.y + Math.sin(tower.angle) * 18;
    this.speed = tower.def.projectileSpeed;
    this.dead = false;
    this.trail = [];
  }

  update(dt, enemies, effects, now) {
    if (this.dead) return;
    const target = this.target;
    if (!target || target.dead || target.leaked) {
      this.dead = true;
      return;
    }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    if (dist <= step + target.radius) {
      this.hit(target, enemies, effects, now);
      this.dead = true;
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  hit(target, enemies, effects, now) {
    const tower = this.tower;
    const def = tower.def;
    target.takeDamage(tower.damage);
    effects.push({ kind: 'hit', x: target.x, y: target.y, color: def.color, t: 0 });
    if (def.id === 'lantern') {
      target.chill(def.slowFactor, def.slowSeconds, now);
      effects.push({ kind: 'chill', x: target.x, y: target.y, color: def.color, t: 0 });
    }
    if (def.id === 'spire') {
      // The bolt leaps to the nearest other creatures, weakening each jump.
      let from = target;
      let damage = tower.damage;
      const jumped = new Set([target.id]);
      for (let jump = 0; jump < def.chainTargets; jump++) {
        damage = Math.round(damage * def.chainFalloff);
        let nearest = null;
        let nearestDist = 130;
        for (const enemy of enemies) {
          if (enemy.dead || enemy.leaked || jumped.has(enemy.id)) continue;
          const d = Math.hypot(enemy.x - from.x, enemy.y - from.y);
          if (d < nearestDist) {
            nearest = enemy;
            nearestDist = d;
          }
        }
        if (!nearest) break;
        nearest.takeDamage(damage);
        effects.push({
          kind: 'bolt', x1: from.x, y1: from.y, x2: nearest.x, y2: nearest.y,
          color: def.color, t: 0,
        });
        jumped.add(nearest.id);
        from = nearest;
      }
    }
  }
}
