/**
 * confetti.js — Lightweight confetti effect using a canvas overlay.
 */

const canvas  = document.getElementById('confetti-canvas');
const ctx2d   = canvas.getContext('2d');
let particles = [];
let _animId   = null;

const COLORS = ['#7c6af7','#4ee5c4','#f7c56a','#f7716a','#6af77e','#ffffff'];

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function createParticle() {
  return {
    x:    Math.random() * canvas.width,
    y:    -10,
    vx:   (Math.random() - 0.5) * 4,
    vy:   Math.random() * 4 + 2,
    rot:  Math.random() * Math.PI * 2,
    vrot: (Math.random() - 0.5) * 0.2,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    life: 1,
  };
}

export function launchConfetti(count = 120) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => particles.push(createParticle()), Math.random() * 800);
  }
  if (!_animId) tick();
}

function tick() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    p.x   += p.vx;
    p.y   += p.vy;
    p.rot += p.vrot;
    p.vy  += 0.08;    // gravity
    p.life -= 0.008;
    if (p.life < 0) continue;

    ctx2d.save();
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot);
    ctx2d.globalAlpha = Math.max(p.life, 0);
    ctx2d.fillStyle   = p.color;
    ctx2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx2d.restore();
  }

  particles = particles.filter(p => p.life > 0 && p.y < canvas.height + 20);

  if (particles.length > 0) {
    _animId = requestAnimationFrame(tick);
  } else {
    _animId = null;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function stopConfetti() {
  if (_animId) cancelAnimationFrame(_animId);
  _animId = null;
  particles = [];
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
}
