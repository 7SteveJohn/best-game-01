// Emberlight — sparks, smoke, floating numbers and screen shake.
//
// Everything here is transient: a particle is born, lives a fraction of
// a second, and is gone. The game keeps one list of them and one list of
// floating texts (gold earned, damage dealt), plus a shake value the
// renderer reads when the ember is hit.
export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    this.shake = 0;
  }

  addShake(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  // A burst of glowing sparks at a point, in a colour.
  burst(x, y, color, count = 10, speed = 90) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 20,
        life: 0.35 + Math.random() * 0.35,
        age: 0,
        size: 2 + Math.random() * 3,
        color,
        gravity: 160,
      });
    }
  }

  // A slow puff of smoke, for a creature fading out.
  puff(x, y, color = '#8f96c9', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = 18 + Math.random() * 30;
      this.list.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 12,
        life: 0.6 + Math.random() * 0.4,
        age: 0,
        size: 5 + Math.random() * 7,
        color,
        gravity: -30,
      });
    }
  }

  // Amber embers that drift up from the lighthouse flame, always.
  emberDrift(x, y) {
    this.list.push({
      x: x + (Math.random() - 0.5) * 14,
      y,
      vx: (Math.random() - 0.5) * 12,
      vy: -28 - Math.random() * 26,
      life: 0.9 + Math.random() * 0.7,
      age: 0,
      size: 1.5 + Math.random() * 2,
      color: Math.random() < 0.5 ? '#ffb347' : '#ffe9a8',
      gravity: -12,
    });
  }

  // Text that rises and fades: "+6 gold", "-1 ember".
  floatText(x, y, text, color = '#ffd76a') {
    this.texts.push({ x, y, text, color, age: 0, life: 1.1 });
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 26);
    for (const p of this.list) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);
    for (const t of this.texts) {
      t.age += dt;
      t.y -= 26 * dt;
    }
    this.texts = this.texts.filter((t) => t.age < t.life);
  }

  // How far the canvas should be offset this frame, for the shake.
  offset() {
    if (this.shake <= 0.2) return { x: 0, y: 0 };
    const s = this.shake;
    return {
      x: (Math.random() - 0.5) * s,
      y: (Math.random() - 0.5) * s,
    };
  }
}
