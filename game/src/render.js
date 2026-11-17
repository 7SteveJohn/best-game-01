// Emberlight — everything the eye sees, drawn on one canvas.
//
// The night shore is painted once onto an offscreen layer (sky, moon,
// ground, path, grass). Each frame the renderer draws that layer, then
// the living things: the lighthouse beam, the flame, the towers, the
// creatures, the shots, the sparks, and the placement guides.
import { BOARD, PATH_CELLS, PALETTE } from './config.js';
import { cellCenter } from './levels.js';

export class Renderer {
  constructor(canvas, rng) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = rng;
    this.base = document.createElement('canvas');
    this.base.width = BOARD.width;
    this.base.height = BOARD.height;
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: rng.range(0, BOARD.width),
        y: rng.range(0, 150),
        r: rng.range(0.6, 1.8),
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.5, 2),
      });
    }
    this.paintBase();
  }

  // The static shore: gradient sky, moon, dark ground, the winding path
  // with edge stones, and tufts of grass. Painted once, reused forever.
  paintBase() {
    const ctx = this.base.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, BOARD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.45, PALETTE.skyMid);
    sky.addColorStop(0.46, PALETTE.ground);
    sky.addColorStop(1, PALETTE.groundAlt);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, BOARD.width, BOARD.height);

    // The moon, high over the sea-side of the board.
    const moonX = 830;
    const moonY = 62;
    const glow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 70);
    glow.addColorStop(0, 'rgba(244, 234, 208, 0.5)');
    glow.addColorStop(1, 'rgba(244, 234, 208, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 70, moonY - 70, 140, 140);
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(190, 175, 140, 0.5)';
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 4, 5, 0, Math.PI * 2);
    ctx.arc(moonX + 9, moonY + 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Grass tufts scattered on the buildable ground.
    for (let i = 0; i < 240; i++) {
      const x = this.rng.range(0, BOARD.width);
      const y = this.rng.range(150, BOARD.height);
      ctx.strokeStyle = PALETTE.grassTuft;
      ctx.globalAlpha = 0.5 + this.rng.float() * 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y - 6 - this.rng.float() * 4);
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + 4, y - 5 - this.rng.float() * 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The path: warm earth, edged with stones.
    for (const [col, row] of PATH_CELLS) {
      const x = col * BOARD.cell;
      const y = row * BOARD.cell;
      ctx.fillStyle = PALETTE.path;
      ctx.fillRect(x + 2, y + 2, BOARD.cell - 4, BOARD.cell - 4);
    }
    ctx.fillStyle = PALETTE.pathStone;
    for (const [col, row] of PATH_CELLS) {
      const x = col * BOARD.cell;
      const y = row * BOARD.cell;
      for (let i = 0; i < 3; i++) {
        const sx = x + this.rng.range(6, BOARD.cell - 6);
        const sy = y + this.rng.range(6, BOARD.cell - 6);
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + this.rng.float() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- The frame ---

  draw(state, particles, view) {
    const ctx = this.ctx;
    const now = state.now;
    ctx.save();
    const shake = particles.offset();
    ctx.translate(shake.x, shake.y);
    ctx.drawImage(this.base, 0, 0);

    // Twinkling stars over the sky.
    for (const star of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(now * star.speed + star.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawLighthouse(ctx, state, now);
    this.drawPlacementGuides(ctx, state, view);
    for (const tower of state.towers) this.drawTower(ctx, tower, now, state);
    for (const enemy of state.enemies) this.drawEnemy(ctx, enemy, now);
    this.drawProjectiles(ctx, state);
    this.drawEffects(ctx, state);
    this.drawParticles(ctx, particles);
    this.drawBanner(ctx, state);
    ctx.restore();
  }

  // The lighthouse: striped tower, lamp room, and a beam that sweeps the
  // shore. Its flame burns lower as the ember is spent.
  drawLighthouse(ctx, state, now) {
    const c = cellCenter(14, 6);
    const baseX = c.x - 4;
    const baseY = c.y + 28;
    // Beam: a slow sweeping cone from the lamp.
    const lampX = baseX;
    const lampY = baseY - 118;
    const beamAngle = -Math.PI / 2 + Math.sin(now * 0.35) * 0.9;
    ctx.save();
    ctx.translate(lampX, lampY);
    ctx.rotate(beamAngle);
    const beam = ctx.createLinearGradient(0, 0, 320, 0);
    beam.addColorStop(0, 'rgba(255, 233, 168, 0.28)');
    beam.addColorStop(1, 'rgba(255, 233, 168, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(320, -52);
    ctx.lineTo(320, 52);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Tower body with stripes.
    ctx.fillStyle = '#d8d2c2';
    ctx.fillRect(baseX - 16, baseY - 96, 32, 96);
    ctx.fillStyle = '#8a2f2f';
    ctx.fillRect(baseX - 16, baseY - 80, 32, 12);
    ctx.fillRect(baseX - 16, baseY - 52, 32, 12);
    ctx.fillRect(baseX - 16, baseY - 24, 32, 12);
    ctx.fillStyle = '#3a3f52';
    ctx.fillRect(baseX - 20, baseY - 100, 40, 8); // gallery
    ctx.fillStyle = '#2a2f42';
    ctx.fillRect(baseX - 11, baseY - 118, 22, 18); // lamp room
    // The lamp itself, pulsing with the ember.
    const emberFrac = state.maxEmber ? state.ember / state.maxEmber : 1;
    const lampGlow = ctx.createRadialGradient(lampX, lampY - 9, 2, lampX, lampY - 9, 30 + emberFrac * 14);
    lampGlow.addColorStop(0, 'rgba(255, 233, 168, 0.9)');
    lampGlow.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(lampX - 44, lampY - 53, 88, 88);
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.arc(lampX, lampY - 9, 5 + emberFrac * 2, 0, Math.PI * 2);
    ctx.fill();
    // The ember flame at the door.
    const flameH = 10 + emberFrac * 14 + Math.sin(now * 6) * 2;
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY - 4, 7, flameH / 2 + 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.emberCore;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY - 2, 3.5, flameH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ghost cell, range ring and the selected tower's reach.
  drawPlacementGuides(ctx, state, view) {
    const { hover, placeType, selected } = view;
    if (selected) {
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(selected.x, selected.y, selected.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 215, 106, 0.12)';
      ctx.fill();
    }
    if (hover && placeType && (state.phase === 'build' || state.phase === 'wave')) {
      const tower = state.towerAt(hover.col, hover.row);
      const ok = !tower && state.canAfford(view.placeDef.cost);
      const cx = hover.col * BOARD.cell;
      const cy = hover.row * BOARD.cell;
      ctx.fillStyle = ok ? 'rgba(125, 219, 138, 0.25)' : 'rgba(255, 90, 90, 0.25)';
      ctx.fillRect(cx + 2, cy + 2, BOARD.cell - 4, BOARD.cell - 4);
      ctx.strokeStyle = ok ? PALETTE.ok : PALETTE.danger;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 2, cy + 2, BOARD.cell - 4, BOARD.cell - 4);
      if (ok) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(cx + BOARD.cell / 2, cy + BOARD.cell / 2, view.placeDef.range, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawTower(ctx, tower, now, state) {
    const { x, y } = tower;
    const def = tower.def;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, tower.range * 0.55);
    glow.addColorStop(0, def.glow + '55');
    glow.addColorStop(1, def.glow + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(x - tower.range * 0.55, y - tower.range * 0.55, tower.range * 1.1, tower.range * 1.1);

    // Stone base.
    ctx.fillStyle = '#4a4f63';
    ctx.beginPath();
    ctx.arc(x, y + 4, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e3247';
    ctx.beginPath();
    ctx.arc(x, y + 4, 20, 0, Math.PI);
    ctx.fill();

    if (tower.type === 'brazier') {
      // Bowl and a flickering flame.
      ctx.fillStyle = '#6b5a49';
      ctx.beginPath();
      ctx.arc(x, y - 2, 13, 0, Math.PI);
      ctx.fill();
      const flick = 1 + Math.sin(now * 9 + tower.col) * 0.15;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(x, y - 10, 7 * flick, 11 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.ellipse(x, y - 7, 3.5, 6 * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (tower.type === 'lantern') {
      // A post with a hanging lantern that sways.
      ctx.strokeStyle = '#3a3f52';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y + 14);
      ctx.lineTo(x, y - 14);
      ctx.stroke();
      const sway = Math.sin(now * 1.4 + tower.row) * 3;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x + sway, y - 18, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eaf6ff';
      ctx.beginPath();
      ctx.arc(x + sway, y - 18, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Storm spire: a crystal that hums, drawn pointing at its target.
      ctx.save();
      ctx.translate(x, y - 6);
      ctx.rotate(tower.angle + Math.PI / 2);
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(9, 6);
      ctx.lineTo(0, 12);
      ctx.lineTo(-9, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#efe6ff';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(4, 4);
      ctx.lineTo(0, 8);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Muzzle flash when it fires.
    if (tower.flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(x + Math.cos(tower.angle) * 20, y + Math.sin(tower.angle) * 20, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Level pips under the tower.
    for (let i = 0; i < tower.level; i++) {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(x - 10 + i * 10, y + 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEnemy(ctx, enemy, now) {
    const { x, y } = enemy;
    const bob = Math.sin(now * 5 + enemy.wobble) * 2;
    const chilled = now < enemy.slowUntil;
    ctx.save();
    ctx.translate(x, y + bob * 0.4);

    if (enemy.type === 'wisp') {
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
      glow.addColorStop(0, 'rgba(255, 233, 168, 0.8)');
      glow.addColorStop(1, 'rgba(255, 233, 168, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-26, -26, 52, 52);
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.core;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'shade') {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.core;
      ctx.beginPath();
      ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'brute') {
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2a22';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = enemy.core;
      ctx.beginPath();
      ctx.arc(-6, -4, 3, 0, Math.PI * 2);
      ctx.arc(6, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'wraith') {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.quadraticCurveTo(enemy.radius, -4, enemy.radius * 0.7, enemy.radius * 0.6);
      ctx.quadraticCurveTo(enemy.radius * 0.3, enemy.radius + bob, 0, enemy.radius + bob);
      ctx.quadraticCurveTo(-enemy.radius * 0.3, enemy.radius + bob, -enemy.radius * 0.7, enemy.radius * 0.6);
      ctx.quadraticCurveTo(-enemy.radius, -4, 0, -enemy.radius);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a3f3a';
      ctx.beginPath();
      ctx.arc(-4, -3, 2, 0, Math.PI * 2);
      ctx.arc(4, -3, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Dread Moth: great wings that beat as it flies.
      const flap = Math.sin(now * 7) * 0.5;
      ctx.fillStyle = '#5b3a6e';
      ctx.save();
      ctx.rotate(-0.5 - flap * 0.4);
      ctx.beginPath();
      ctx.ellipse(-20, -8, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(0.5 + flap * 0.4);
      ctx.beginPath();
      ctx.ellipse(20, -8, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = enemy.core;
      ctx.beginPath();
      ctx.arc(-5, -6, 3, 0, Math.PI * 2);
      ctx.arc(5, -6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // A chill ring while slowed.
    if (chilled) {
      ctx.strokeStyle = 'rgba(127, 212, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Health bar, only when hurt.
    if (enemy.hp < enemy.maxHp) {
      const w = enemy.radius * 2 + 6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(x - w / 2, y - enemy.radius - 12, w, 5);
      ctx.fillStyle = enemy.hpFraction() > 0.5 ? '#7ddb8a' : enemy.hpFraction() > 0.25 ? '#ffd76a' : '#ff5a5a';
      ctx.fillRect(x - w / 2, y - enemy.radius - 12, w * enemy.hpFraction(), 5);
    }
  }

  drawProjectiles(ctx, state) {
    for (const p of state.projectiles) {
      const color = p.tower.def.color;
      ctx.strokeStyle = color + '88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (const point of p.trail) ctx.lineTo(point.x, point.y);
      ctx.stroke();
      const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 10);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.4, color);
      glow.addColorStop(1, color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEffects(ctx, state) {
    for (const e of state.effects) {
      const a = 1 - e.t / 0.35;
      if (e.kind === 'hit') {
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 4 + e.t * 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'chill') {
        ctx.strokeStyle = 'rgba(127, 212, 255, 0.9)';
        ctx.globalAlpha = a;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6 + e.t * 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'bolt') {
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const midX = (e.x1 + e.x2) / 2 + (Math.random() - 0.5) * 18;
        const midY = (e.y1 + e.y2) / 2 + (Math.random() - 0.5) * 18;
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(midX, midY);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  drawParticles(ctx, particles) {
    for (const p of particles.list) {
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const t of particles.texts) {
      ctx.globalAlpha = 1 - t.age / t.life;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  drawBanner(ctx, state) {
    if (!state.waveBanner) return;
    const { text, until } = state.waveBanner;
    const remain = until - state.now;
    const alpha = Math.min(1, remain / 0.5, (2.2 - remain) / 0.3 + 0.4);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 179, 71, 0.8)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(text, BOARD.width / 2, 92);
    ctx.restore();
  }
}
