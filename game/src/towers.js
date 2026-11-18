// Emberlight — the three towers and what they shoot.
//
// A Tower stands on a plot, picks the creature furthest along the path
// inside its reach, and fires on a cooldown. Its level raises damage and
// range; the lantern chills, the spire's bolts leap to nearby creatures.
import { BLACKOUT_COLS, TIDES, TOWERS, ECONOMY } from './config.js';

export class Tower {
  constructor(type, col, row, mods = null) {
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
    // The Keeper's blessings, shared with the state: they shape what
    // this tower can do. A tower built before a blessing is chosen still
    // gains from it, because this is the same object, not a copy.
    this.mods = mods;
    // The Dread Moth's shadow can dim this tower for a while.
    this.dimUntil = 0; // game clock; dimmed while now < dimUntil
    this.dimFactor = 1;
    // The Tide Bell rings on this clock instead of firing.
    this.pulseClock = 0;
    // The tide over this wave, set by the state each step: it shapes
    // range in Ashfall and fire rate in a Blackout.
    this.tide = null;
    // The fire-rate multiplier the current tide leaves this tower with
    // (1 outside a Blackout, 0.9 inside it); the tests read it.
    this.tideRateMul = 1;
  }

  get damage() {
    return Math.round(this.def.damage * (1 + ECONOMY.upgradeDamageFactor * (this.level - 1)));
  }

  get range() {
    let range = this.def.range * (1 + ECONOMY.upgradeRangeFactor * (this.level - 1));
    // A Long Flame blessing stretches every brazier's reach.
    if (this.type === 'brazier' && this.mods) range += 15 * (this.mods.longFlame || 0);
    // The Dread Moth's shadow shrinks this tower's reach for a while.
    if (this.now !== undefined && this.now < this.dimUntil) range *= this.dimFactor;
    // Ashfall shrinks every tower's reach, bells included.
    if (this.tide === 'ashfall') range *= TIDES.ashfall.rangeFactor;
    return range;
  }

  // How long a lantern's chill holds, with the Rimeglass blessing.
  get slowSeconds() {
    return (this.def.slowSeconds || 0) + 0.5 * ((this.mods && this.mods.rimeglass) || 0);
  }

  // How much strength a spire's bolt keeps per leap, with the Forked
  // Conduit blessing; never more than nearly all of it.
  get chainFalloff() {
    return Math.min(0.9, (this.def.chainFalloff || 0) + 0.1 * ((this.mods && this.mods.forked) || 0));
  }

  get rate() {
    return this.def.rate;
  }

  // The first upgrade is deliberately cheaper than the later one, so a
  // Keeper who has built wide can afford to make one tower stronger
  // instead of only adding more level-one towers.
  get upgradeCost() {
    if (this.level >= ECONOMY.maxLevel) return null;
    const factor = this.level === 1 ? ECONOMY.upgradeCostFactorFirst : ECONOMY.upgradeCostFactor;
    return Math.round(this.def.cost * factor * this.level);
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

  update(dt, enemies, projectiles, onShoot, effects, now) {
    this.now = now;
    this.cooldown -= dt;
    this.flash = Math.max(0, this.flash - dt);
    // A Blackout over the middle columns slows the towers standing in
    // it: they fire a tenth slower, bells ring a tenth slower too.
    const inBlackout =
      this.tide === 'blackout' &&
      this.col >= BLACKOUT_COLS.from && this.col <= BLACKOUT_COLS.to;
    const rateMul = inBlackout ? TIDES.blackout.fireRateFactor : 1;
    this.tideRateMul = rateMul;
    if (this.type === 'bell') {
      this.ring(dt, enemies, effects, now, onShoot, rateMul);
      return;
    }
    const target = this.acquire(enemies);
    if (!target) return;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown > 0) return;
    this.cooldown = 1 / (this.rate * rateMul);
    this.flash = 0.09;
    projectiles.push(new Projectile(this, target));
    onShoot(this);
  }

  // The Tide Bell rings instead of firing: every creature in reach is
  // marked for a short while, and the next tower hit on each of them
  // lands much harder. The ring itself is an effect the renderer draws.
  ring(dt, enemies, effects, now, onShoot, rateMul = 1) {
    this.pulseClock -= dt;
    if (this.pulseClock > 0) return;
    this.pulseClock = this.def.pulseInterval / rateMul;
    let marked = 0;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.leaked) continue;
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d <= this.range) {
        enemy.markedUntil = now + this.def.markSeconds;
        enemy.markBonus = this.def.markBonus;
        marked += 1;
      }
    }
    if (marked > 0) {
      effects.push({ kind: 'pulse', x: this.x, y: this.y, range: this.range, color: this.def.color, t: 0 });
      onShoot(this);
    }
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
    // A Tide Bell's mark is spent by the next hit on the creature.
    let damage = tower.damage;
    if (target.isMarked(now)) {
      damage += target.markBonus;
      target.markedUntil = 0;
      effects.push({ kind: 'mark', x: target.x, y: target.y, color: '#ffd76a', t: 0 });
    }
    // Still Air: the first tower hit on a creature lands half as hard
    // again. The bonus rides on the tower's own damage, after upgrades
    // and before a spent mark, and it never inflates a spire's chain
    // jumps — the jumps are struck from the un-boosted damage.
    let stillAirBonus = 0;
    if (tower.tide === 'stillair' && !target.firstHitUsed) {
      stillAirBonus = Math.round(tower.damage * TIDES.stillair.firstHitBonus);
      target.firstHitUsed = true;
    }
    damage += stillAirBonus;
    target.takeDamage(damage);
    effects.push({ kind: 'hit', x: target.x, y: target.y, color: def.color, t: 0 });
    if (def.id === 'lantern') {
      target.chill(def.slowFactor, tower.slowSeconds, now);
      effects.push({ kind: 'chill', x: target.x, y: target.y, color: def.color, t: 0 });
    }
    if (def.id === 'spire') {
      // The bolt leaps to the nearest other creatures, weakening each jump.
      let from = target;
      let jumpDamage = damage - stillAirBonus;
      const jumped = new Set([target.id]);
      for (let jump = 0; jump < def.chainTargets; jump++) {
        jumpDamage = Math.round(jumpDamage * tower.chainFalloff);
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
        // A creature first struck by a chain jump gets its own
        // Still Air allowance on that jump.
        let jd = jumpDamage;
        if (tower.tide === 'stillair' && !nearest.firstHitUsed) {
          jd = Math.round(jd * (1 + TIDES.stillair.firstHitBonus));
          nearest.firstHitUsed = true;
        }
        nearest.takeDamage(jd);
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
