// Emberlight v5 — everything the eye sees, drawn on one canvas.
//
// The night sea is painted once onto an offscreen layer (sky, moon,
// dark water, the shore by the lighthouse, islets for the furnaces).
// Each frame the renderer draws that layer, then the living things:
// the Keeper's beam, the furnaces, the creatures in the dark and in
// the light, the sparks, and the banner.
import { BEAM, BOARD, FURNACES, LAMP, PALETTE } from './config.js';

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

  // The static sea: gradient sky, moon, dark water with wave strokes,
  // the sandy shore by the lighthouse, and a rocky islet under each
  // furnace. Painted once, reused forever.
  paintBase() {
    const ctx = this.base.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, BOARD.height);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.45, PALETTE.skyMid);
    sky.addColorStop(0.46, '#0d1a2e');
    sky.addColorStop(1, '#12233a');
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

    // Broad pools of moonlight on the water, so the middle of the
    // board is not one flat dark field.
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

    // Wave strokes across the sea: thin arcs, faint, so the water
    // reads as moving even when it is still.
    ctx.strokeStyle = 'rgba(140, 180, 210, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 46; i++) {
      const x = this.rng.range(20, BOARD.width - 120);
      const y = this.rng.range(170, BOARD.height - 20);
      const w = 18 + this.rng.float() * 30;
      ctx.beginPath();
      ctx.arc(x, y, w, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    // The shore: a sandy crescent around the lighthouse foot, on the
    // eastern edge.
    ctx.fillStyle = '#3a3226';
    ctx.beginPath();
    ctx.ellipse(930, 440, 120, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a4030';
    ctx.beginPath();
    ctx.ellipse(930, 440, 96, 122, 0, 0, Math.PI * 2);
    ctx.fill();

    // A rocky islet under each furnace, so the furnaces stand on
    // something in the sea.
    for (const f of FURNACES) {
      ctx.fillStyle = '#232f47';
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 16, 44, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150, 170, 200, 0.2)';
      ctx.beginPath();
      ctx.ellipse(f.x - 8, f.y + 12, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Landmarks, so the open middle reads as a shore and not an empty
    // field: standing stones in the northern water, a beached boat on
    // the south-west sand, and tide pools catching the moon near the door.
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

    // A few rocks on the shore, for a landmark or two in the open ground.
    for (let i = 0; i < 12; i++) {
      const col = Math.floor(this.rng.range(0, BOARD.cols));
      const row = Math.floor(this.rng.range(0, BOARD.rows));
      const x = col * BOARD.cell + BOARD.cell / 2 + this.rng.range(-16, 16);
      const y = row * BOARD.cell + BOARD.cell / 2 + this.rng.range(-14, 14);
      if (x < 700 || y < 150) continue; // keep the sea open
      const rr = 5 + this.rng.float() * 6;
      ctx.fillStyle = '#232f47';
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150, 170, 200, 0.25)';
      ctx.beginPath();
      ctx.arc(x - rr * 0.25, y - rr * 0.3, rr * 0.45, 0, Math.PI * 2);
      ctx.fill();
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

    this.drawBeam(ctx, state, now);
    this.drawFurnaces(ctx, state, now);
    this.drawLighthouse(ctx, state, now);
    for (const enemy of state.enemies) this.drawEnemy(ctx, enemy, now, state);
    this.drawAimGuide(ctx, state, view);
    this.drawEffects(ctx, state);
    this.drawParticles(ctx, particles);
    this.drawBanner(ctx, state);
    ctx.restore();
  }

  // The Keeper's beam: a wedge of light from the lamp, bright while
  // gathering, faint while only aiming. The cone is the whole game —
  // it must read at a glance, at thumbnail scale.
  drawBeam(ctx, state, now) {
    const beam = state.beam;
    const gathering = beam.gathering;
    const angle = beam.angle;
    const half = BEAM.halfAngle;
    ctx.save();
    ctx.translate(LAMP.x, LAMP.y);
    ctx.rotate(angle);
    const len = BEAM.length;
    const alpha = gathering ? 0.5 : 0.26;
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, `rgba(255, 233, 168, ${alpha})`);
    grad.addColorStop(0.7, `rgba(255, 213, 120, ${alpha * 0.6})`);
    grad.addColorStop(1, 'rgba(255, 213, 120, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, -half, half);
    ctx.closePath();
    ctx.fill();
    // A bright core line down the middle of the cone, and a gold edge
    // while gathering, so the cone's edges read.
    ctx.strokeStyle = gathering ? 'rgba(255, 233, 168, 0.75)' : 'rgba(255, 233, 168, 0.3)';
    ctx.lineWidth = gathering ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    if (gathering) {
      ctx.strokeStyle = 'rgba(255, 215, 106, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(-half) * len, Math.sin(-half) * len);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(half) * len, Math.sin(half) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // The furnaces: stone mouths with fire. Lit and ready burns bright;
  // cooling is dim embers with a ring counting down; unlit is dark
  // stone. A gold shell marks a furnace that still holds one of the
  // Moth's shell segments; a broken shell is grey.
  drawFurnaces(ctx, state, now) {
    for (const furnace of state.furnaces) {
      const { x, y } = furnace;
      const lit = furnace.litFromWatch <= Math.max(state.watch, 1);
      const cooling = state.now < furnace.coolingUntil;
      const coolFrac = cooling
        ? (furnace.coolingUntil - state.now) / 6
        : 0;
      // Stone mouth.
      ctx.fillStyle = '#4a4f63';
      ctx.beginPath();
      ctx.moveTo(x - 22, y + 14);
      ctx.lineTo(x - 14, y - 16);
      ctx.lineTo(x + 14, y - 16);
      ctx.lineTo(x + 22, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2e3247';
      ctx.beginPath();
      ctx.ellipse(x, y + 14, 22, 6, 0, 0, Math.PI);
      ctx.fill();
      // The fire inside.
      if (lit && !cooling) {
        const flick = 1 + Math.sin(now * 9 + x) * 0.18;
        const glow = ctx.createRadialGradient(x, y - 4, 2, x, y - 4, 30);
        glow.addColorStop(0, 'rgba(255, 179, 71, 0.8)');
        glow.addColorStop(1, 'rgba(255, 138, 36, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - 30, y - 34, 60, 60);
        ctx.fillStyle = '#ff8a24';
        ctx.beginPath();
        ctx.ellipse(x, y - 6, 9 * flick, 13 * flick, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.ellipse(x, y - 3, 4.5, 7 * flick, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (lit && cooling) {
        ctx.fillStyle = 'rgba(255, 138, 36, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x, y - 4, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // A ring counting the cooldown down.
        ctx.strokeStyle = 'rgba(255, 215, 106, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 4, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - coolFrac));
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1a2033';
        ctx.beginPath();
        ctx.ellipse(x, y - 4, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // The Moth's shell: gold while the furnace can still break one.
      ctx.fillStyle = furnace.shard === 'intact' ? '#a86fd0' : '#4a4a5a';
      ctx.beginPath();
      ctx.arc(x + 18, y - 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = furnace.shard === 'intact' ? '#e0b3ff' : '#6a6a7a';
      ctx.beginPath();
      ctx.arc(x + 18, y - 22, 2, 0, Math.PI * 2);
      ctx.fill();
      // A gold ring while the beam is over a ready furnace, so the
      // Keeper can see where a delivery will land.
      if (lit && !cooling && state.furnaceUnderBeam() === furnace) {
        ctx.strokeStyle = 'rgba(255, 215, 106, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 2, 32, 0, Math.PI * 2);
        ctx.stroke();
      }
      // The furnace's name, small, under its mouth.
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(232, 236, 247, 0.75)';
      ctx.fillText(furnace.name, x, y + 32);
    }
  }

  // The lighthouse: striped tower, lamp room, and a flame that burns
  // lower as the ember is spent. The sweeping ambient beam is gone —
  // the Keeper's beam is the light now.
  drawLighthouse(ctx, state, now) {
    const c = { x: 928, y: 416 };
    const baseX = c.x - 4;
    const baseY = c.y + 28;
    const lampX = baseX;
    const lampY = baseY - 118;
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

  drawEnemy(ctx, enemy, now, state) {
    // A caught creature hangs in the beam at its slot, struggling;
    // anything else walks where it stands.
    let x = enemy.x;
    let y = enemy.y;
    if (enemy.isCaught()) {
      const pos = state.beam.slotPosition(enemy.slot, now, enemy.wobble);
      x = pos.x;
      y = pos.y;
    }
    const bob = Math.sin(now * 5 + enemy.wobble) * 2;
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
      // The Moth's shell: one pip per segment still unbroken.
      const left = 3 - state.mothSegmentsBroken;
      for (let i = 0; i < left; i++) {
        ctx.fillStyle = '#a86fd0';
        ctx.beginPath();
        ctx.arc(-10 + i * 10, -enemy.radius - 12, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A caught creature struggles: a gold ring counting its escape
    // time down, and a tether back to the lamp.
    if (enemy.isCaught()) {
      const frac = enemy.escapeFraction(now);
      ctx.strokeStyle = frac > 0.5 ? 'rgba(255, 215, 106, 0.9)' : 'rgba(255, 90, 90, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
    }
    // Just escaped: a faint grey ring while it cannot be caught again.
    if (enemy.state === 'free' && now < enemy.resistUntil) {
      ctx.strokeStyle = 'rgba(154, 167, 199, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // A faint line from the lamp toward the pointer, so the Keeper can
  // see where the beam is turning before it gets there.
  drawAimGuide(ctx, state, view) {
    const hover = view.hover;
    if (!hover || (state.phase !== 'watch' && state.phase !== 'build')) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(LAMP.x, LAMP.y);
    ctx.lineTo(hover.x, hover.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.6)';
    ctx.beginPath();
    ctx.arc(hover.x, hover.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawEffects(ctx, state) {
    for (const e of state.effects) {
      const a = 1 - e.t / 0.4;
      if (e.kind === 'burn' || e.kind === 'catch') {
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6 + (1 - a) * 30, 0, Math.PI * 2);
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
    if (!state.watchBanner) return;
    const { text, until } = state.watchBanner;
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
