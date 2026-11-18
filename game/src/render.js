// Emberlight — everything the eye sees, drawn on one canvas.
//
// The night shore is painted once onto an offscreen layer (sky, moon,
// ground, path, grass). Each frame the renderer draws that layer, then
// the living things: the lighthouse beam, the flame, the towers, the
// creatures, the shots, the sparks, and the placement guides.
import { BEACON, BLACKOUT_COLS, BOARD, PATH_CELLS, PALETTE } from './config.js';
import { cellCenter, isBuildable } from './levels.js';

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

    // Broad pools of moonlight on the empty ground, so the middle of
    // the board is not one flat dark field. They are painted under the
    // path, and stay faint enough that the night mood holds.
    const pools = [
      { x: 480, y: 104, r: 165 },
      { x: 352, y: 288, r: 150 },
      { x: 672, y: 256, r: 140 },
      { x: 208, y: 480, r: 130 },
      { x: 848, y: 480, r: 130 },
    ];
    for (const pool of pools) {
      const wash = ctx.createRadialGradient(pool.x, pool.y, 8, pool.x, pool.y, pool.r);
      wash.addColorStop(0, 'rgba(150, 180, 205, 0.11)');
      wash.addColorStop(1, 'rgba(150, 180, 205, 0)');
      ctx.fillStyle = wash;
      ctx.fillRect(pool.x - pool.r, pool.y - pool.r, pool.r * 2, pool.r * 2);
    }

    // A soft dotted marker on every buildable plot, so the empty centre
    // reads as ground waiting for towers rather than nothing at all.
    ctx.fillStyle = 'rgba(130, 155, 150, 0.13)';
    for (let row = 0; row < BOARD.rows; row++) {
      for (let col = 0; col < BOARD.cols; col++) {
        if (!isBuildable(col, row)) continue;
        const c = cellCenter(col, row);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A few rocks on the shore, for a landmark or two in the open ground.
    for (let i = 0; i < 12; i++) {
      const col = Math.floor(this.rng.range(0, BOARD.cols));
      const row = Math.floor(this.rng.range(0, BOARD.rows));
      if (!isBuildable(col, row)) continue;
      const c = cellCenter(col, row);
      const rx = c.x + this.rng.range(-16, 16);
      const ry = c.y + this.rng.range(-14, 14);
      const rr = 5 + this.rng.float() * 6;
      ctx.fillStyle = '#232f47';
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150, 170, 200, 0.25)';
      ctx.beginPath();
      ctx.arc(rx - rr * 0.25, ry - rr * 0.3, rr * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Landmarks, so the open middle reads as a shore and not an empty
    // field: standing stones in the northern grass, a beached boat on
    // the south-west sand, and tide pools catching the moon near the
    // door. They sit on the base layer, under the towers.
    const stones = [
      { x: 6 * BOARD.cell + 32, y: 1 * BOARD.cell + 30 },
      { x: 7 * BOARD.cell + 20, y: 1 * BOARD.cell + 18 },
      { x: 7 * BOARD.cell + 44, y: 0 * BOARD.cell + 34 },
    ];
    for (const s of stones) {
      ctx.fillStyle = '#39415c';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 9, 22, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(180, 195, 220, 0.35)';
      ctx.beginPath();
      ctx.ellipse(s.x - 3, s.y - 8, 4, 10, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    // A beached boat, hull up, on the south-west sand.
    const boatX = 1 * BOARD.cell + 32;
    const boatY = 7 * BOARD.cell + 40;
    ctx.fillStyle = '#4d3a28';
    ctx.beginPath();
    ctx.ellipse(boatX, boatY, 26, 9, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b5138';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boatX - 18, boatY - 6);
    ctx.lineTo(boatX + 18, boatY - 6);
    ctx.stroke();
    // Tide pools: still water catching the moon, near the door.
    for (const pool of [
      { x: 12 * BOARD.cell + 32, y: 0 * BOARD.cell + 26 },
      { x: 13 * BOARD.cell + 16, y: 1 * BOARD.cell + 40 },
    ]) {
      const wash = ctx.createRadialGradient(pool.x, pool.y, 2, pool.x, pool.y, 26);
      wash.addColorStop(0, 'rgba(120, 180, 200, 0.35)');
      wash.addColorStop(1, 'rgba(120, 180, 200, 0)');
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.ellipse(pool.x, pool.y, 26, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

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
      ctx.strokeStyle = PALETTE.pathEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, BOARD.cell - 6, BOARD.cell - 6);
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

    this.drawTide(ctx, state, now);
    this.drawFlareGround(ctx, state, now);
    this.drawLighthouse(ctx, state, now);
    this.drawPlacementGuides(ctx, state, view);
    for (const tower of state.towers) this.drawTower(ctx, tower, now, state);
    for (const enemy of state.enemies) this.drawEnemy(ctx, enemy, now, state);
    this.drawProjectiles(ctx, state);
    this.drawFlareBeam(ctx, state, now);
    this.drawEffects(ctx, state);
    this.drawParticles(ctx, particles);
    this.drawBanner(ctx, state);
    ctx.restore();
  }

  // The tide's whole-board treatment, over the base and under the
  // living things: ash drifting down in Ashfall, a dark cloud with a
  // gold outline over the middle columns in a Blackout, a still bright
  // shimmer in Still Air. Only while a wave is running.
  drawTide(ctx, state, now) {
    const tide = state.tide;
    if (!tide || state.phase !== 'wave') return;
    if (tide === 'ashfall') {
      ctx.fillStyle = 'rgba(200, 190, 175, 0.55)';
      for (let i = 0; i < 46; i++) {
        const x = (i * 137 + now * 14) % BOARD.width;
        const y = (i * 89 + now * 34) % BOARD.height;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (tide === 'blackout') {
      const x0 = BLACKOUT_COLS.from * BOARD.cell;
      const x1 = (BLACKOUT_COLS.to + 1) * BOARD.cell;
      ctx.fillStyle = 'rgba(5, 7, 15, 0.38)';
      ctx.fillRect(x0, 0, x1 - x0, BOARD.height);
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(x0 + 2, 2, x1 - x0 - 4, BOARD.height - 4);
      ctx.setLineDash([]);
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 215, 106, 0.8)';
      ctx.fillText('BLACKOUT', (x0 + x1) / 2, 18);
    } else if (tide === 'stillair') {
      ctx.fillStyle = 'rgba(255, 240, 200, 0.05)';
      ctx.fillRect(0, 0, BOARD.width, BOARD.height);
      for (let i = 0; i < 14; i++) {
        const x = (i * 211 + now * 8) % BOARD.width;
        const y = 60 + ((i * 67) % 440);
        ctx.globalAlpha = 0.2 + 0.3 * Math.abs(Math.sin(now * 1.2 + i));
        ctx.fillStyle = 'rgba(255, 240, 200, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // The Beacon Flare's blazing ground: orange, flickering, brighter at
  // the centre, with a gold edge so the 3x3 zone reads at a glance.
  drawFlareGround(ctx, state, now) {
    const beacon = state.beacon;
    if (!beacon.flare) return;
    const z = beacon.zoneCells();
    const x0 = z.c0 * BOARD.cell;
    const y0 = z.r0 * BOARD.cell;
    const w = (z.c1 - z.c0 + 1) * BOARD.cell;
    const h = (z.r1 - z.r0 + 1) * BOARD.cell;
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;
    const flick = 0.75 + Math.sin(now * 11) * 0.1 + Math.sin(now * 23) * 0.05;
    const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(w, h) * 0.75);
    glow.addColorStop(0, `rgba(255, 138, 36, ${0.55 * flick})`);
    glow.addColorStop(0.6, `rgba(255, 179, 71, ${0.3 * flick})`);
    glow.addColorStop(1, 'rgba(255, 138, 36, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x0 - 30, y0 - 30, w + 60, h + 60);
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4);
  }

  // The beam from the lighthouse lamp to the blaze, drawn over the
  // towers and creatures so the shot reads as the lighthouse firing.
  drawFlareBeam(ctx, state, now) {
    const beacon = state.beacon;
    if (!beacon.flare) return;
    const z = beacon.zoneCells();
    const cx = ((z.c0 + z.c1) / 2 + 0.5) * BOARD.cell;
    const cy = ((z.r0 + z.r1) / 2 + 0.5) * BOARD.cell;
    const lamp = cellCenter(14, 6);
    const lampX = lamp.x - 4;
    const lampY = lamp.y + 28 - 118;
    const angle = Math.atan2(cy - lampY, cx - lampX);
    const dist = Math.hypot(cx - lampX, cy - lampY);
    ctx.save();
    ctx.translate(lampX, lampY);
    ctx.rotate(angle);
    const beam = ctx.createLinearGradient(0, 0, dist, 0);
    beam.addColorStop(0, 'rgba(255, 233, 168, 0.5)');
    beam.addColorStop(1, 'rgba(255, 179, 71, 0.25)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(dist, -34);
    ctx.lineTo(dist, 34);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
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
    const beam = ctx.createLinearGradient(0, 0, 380, 0);
    beam.addColorStop(0, 'rgba(255, 233, 168, 0.38)');
    beam.addColorStop(1, 'rgba(255, 233, 168, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(380, -64);
    ctx.lineTo(380, 64);
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
    // Aiming the Beacon: the 3x3 patch the flare will set alight, with
    // its price, so the click is a decision made with open eyes.
    if (view.beaconArmed && hover && state.phase === 'wave') {
      const r = BEACON.radiusCells;
      const c0 = Math.max(0, hover.col - r);
      const c1 = Math.min(BOARD.cols - 1, hover.col + r);
      const r0 = Math.max(0, hover.row - r);
      const r1 = Math.min(BOARD.rows - 1, hover.row + r);
      ctx.fillStyle = 'rgba(255, 138, 36, 0.3)';
      ctx.fillRect(c0 * BOARD.cell + 2, r0 * BOARD.cell + 2, (c1 - c0 + 1) * BOARD.cell - 4, (r1 - r0 + 1) * BOARD.cell - 4);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2;
      ctx.strokeRect(c0 * BOARD.cell + 2, r0 * BOARD.cell + 2, (c1 - c0 + 1) * BOARD.cell - 4, (r1 - r0 + 1) * BOARD.cell - 4);
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd76a';
      const labelY = Math.max(14, r0 * BOARD.cell - 6);
      ctx.fillText('Beacon Flare · 2 ember', (c0 + c1 + 1) * BOARD.cell / 2, labelY);
    }
  }

  drawTower(ctx, tower, now, state) {
    const { x, y } = tower;
    const def = tower.def;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, tower.range * 0.55);
    glow.addColorStop(0, def.glowInner);
    glow.addColorStop(1, def.glowOuter);
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
    } else if (tower.type === 'bell') {
      // Tide Bell: a post with a hanging bell that swings as it rings.
      ctx.strokeStyle = '#3a3f52';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y + 14);
      ctx.lineTo(x, y - 12);
      ctx.stroke();
      const swing = Math.sin(now * 2.2 + tower.col) * 2;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(x + swing - 9, y - 8);
      ctx.lineTo(x + swing + 9, y - 8);
      ctx.lineTo(x + swing + 5, y - 20);
      ctx.lineTo(x + swing - 5, y - 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eafff5';
      ctx.beginPath();
      ctx.arc(x + swing, y - 6, 2.5, 0, Math.PI * 2);
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

  drawEnemy(ctx, enemy, now, state) {
    const { x, y } = enemy;
    const bob = Math.sin(now * 5 + enemy.wobble) * 2;
    const chilled = now < enemy.slowUntil;
    const inFlare = state && state.beacon ? state.beacon.inZone(enemy) : false;
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
    // An orange ring while the creature stands in the Beacon's blaze.
    if (inFlare) {
      ctx.strokeStyle = 'rgba(255, 138, 36, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    // A Tide Bell's mark: a gold diamond over the creature, so the
    // player can see which foe the next hit will land harder on.
    if (enemy.isMarked(now)) {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius - 14);
      ctx.lineTo(5, -enemy.radius - 8);
      ctx.lineTo(0, -enemy.radius - 2);
      ctx.lineTo(-5, -enemy.radius - 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.7)';
      ctx.lineWidth = 1.5;
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
      } else if (e.kind === 'pulse') {
        // A Tide Bell's ring, widening as it fades.
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = a * 0.8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 10 + (1 - a) * (e.range || 150), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'mark') {
        // The gold burst when a mark is spent by a hit.
        ctx.fillStyle = '#ffd76a';
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 4 + (1 - a) * 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'split') {
        // The Dread Moth splitting: a purple burst where the wisps are born.
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8 + (1 - a) * 46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'shadow') {
        // The Moth's shadow falling: a dark ring closing in.
        ctx.strokeStyle = 'rgba(61, 43, 82, 0.9)';
        ctx.globalAlpha = a;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 90 - (1 - a) * 50, 0, Math.PI * 2);
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
