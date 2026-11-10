/**
 * sound.js — Simple Web Audio API sound effects.
 *
 * All sounds are synthesised on the fly — no audio files required.
 */

let _ctx = null;
let _muted = false;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

function resume() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

export function isMuted() { return _muted; }

export function setMuted(v) {
  _muted = v;
  document.getElementById('btn-mute').textContent = v ? '🔇' : '🔊';
}

export function toggleMute() { setMuted(!_muted); }

/** Short beep */
function beep({ freq = 440, type = 'sine', duration = 0.12, gain = 0.3, delay = 0 } = {}) {
  if (_muted) return;
  resume();
  const ctx  = getCtx();
  const osc  = ctx.createOscillator();
  const vol  = ctx.createGain();
  osc.connect(vol);
  vol.connect(ctx.destination);
  osc.type      = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0, ctx.currentTime + delay);
  vol.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime  + delay + duration + 0.05);
}

export function playMove()    { beep({ freq: 320, duration: 0.07, gain: 0.15, type: 'triangle' }); }
export function playTurn()    { beep({ freq: 480, duration: 0.06, gain: 0.12, type: 'triangle' }); }
export function playCollect() {
  beep({ freq: 660, duration: 0.08, gain: 0.3, type: 'sine' });
  beep({ freq: 880, duration: 0.08, gain: 0.3, type: 'sine', delay: 0.09 });
}
export function playCrash()   {
  beep({ freq: 180, type: 'sawtooth', duration: 0.25, gain: 0.4 });
}
export function playWin() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((f, i) => beep({ freq: f, duration: 0.18, gain: 0.3, delay: i * 0.12 }));
}
export function playError()   { beep({ freq: 220, type: 'sawtooth', duration: 0.2, gain: 0.3 }); }
