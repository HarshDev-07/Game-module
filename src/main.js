/**
 * main.js — App entry point.
 *
 * Wires together: Three.js scene, CodeMirror editor, Web Worker execution,
 * animation playback, level progression, sound, and confetti.
 */

import './style.css';

import * as THREE from 'three';
import { createScene }  from './game/scene.js';
import { World, gridToWorld } from './game/world.js';
import { Robot }        from './game/robot.js';
import { Animator }     from './game/animator.js';
import { initEditor, getCode, setCode } from './ui/editor.js';
import {
  showMessage, clearMessage, setLevelHeader, setupHint,
  setStepCounter, showResult, hideResult,
  renderLevelModal, setupLevelModal
} from './ui/panels.js';
import {
  loadProgress, saveCompletion, saveCode, loadCode, getUnlockedIds
} from './ui/progress.js';
import { LEVELS } from './levels/index.js';
import {
  toggleMute, setMuted, playMove, playTurn, playCollect,
  playCrash, playWin, playError
} from './ui/sound.js';
import { launchConfetti, stopConfetti } from './ui/confetti.js';

// ── App state ────────────────────────────────────────────────────
let currentLevel  = LEVELS[0];
let animator      = null;
let worker        = null;
let isRunning     = false;

// ── Three.js setup ───────────────────────────────────────────────
const canvas = document.getElementById('three-canvas');
const { scene, controls } = createScene(canvas);
const world  = new World(scene);
const robot  = new Robot(scene);

// Idle animation
let _clock = 0;
let _lastT = performance.now();
function idleLoop() {
  requestAnimationFrame(idleLoop);
  const now = performance.now();
  _clock += (now - _lastT) / 1000;
  _lastT = now;
  world.animateGems(_clock);
  robot.idle(_clock);
}
idleLoop();

// ── Load a level ─────────────────────────────────────────────────
async function loadLevel(level) {
  currentLevel = level;

  // Reset state
  stopConfetti();
  hideResult();
  clearMessage();
  setStepCounter(0);
  setLevelHeader(level);
  setupHint(level.hint);

  // Parse grid for dimensions
  const rows = level.grid.length;
  const cols = level.grid[0].length;

  // Build 3D world
  world.load(level);

  // Place robot at start
  robot.place(
    getStartPos(level.grid).row,
    getStartPos(level.grid).col,
    level.startDirection,
    rows, cols
  );

  // Camera target: centre of the grid
  const { x: cx, z: cz } = gridToWorld(
    (rows - 1) / 2, (cols - 1) / 2, rows, cols
  );
  controls.target.set(cx, 0, cz);

  // Load saved or starter code
  const code = loadCode(level.id, level.starterCode);
  setCode(code);

  // Re-render level modal to reflect current level
  refreshModal();
}

function getStartPos(grid) {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf('S');
    if (c !== -1) return { row: r, col: c };
  }
  return { row: 0, col: 0 };
}

// ── Run button ───────────────────────────────────────────────────
document.getElementById('btn-run').addEventListener('click', runCode);
document.getElementById('btn-reset').addEventListener('click', resetLevel);

async function runCode() {
  if (isRunning) return;

  const code = getCode();
  saveCode(currentLevel.id, code);  // auto-save

  clearMessage();
  stopConfetti();
  hideResult();
  setStepCounter(0);

  // Reset robot visually
  const rows = currentLevel.grid.length;
  const cols = currentLevel.grid[0].length;
  const sp   = getStartPos(currentLevel.grid);
  robot.place(sp.row, sp.col, currentLevel.startDirection, rows, cols);
  world.load(currentLevel); // re-builds world with fresh gems

  isRunning = true;
  setRunningUI(true);

  // ── Spawn worker ─────────────────────────────────────────────
  if (worker) { worker.terminate(); worker = null; }

  let workerURL;
  try {
    workerURL = new URL('./engine/worker.js', import.meta.url);
  } catch {
    workerURL = '/src/engine/worker.js';
  }

  worker = new Worker(workerURL, { type: 'module' });

  // Safety timeout — terminate after 2 s (infinite loop protection)
  const timeout = setTimeout(() => {
    if (worker) {
      worker.terminate();
      worker = null;
      isRunning = false;
      setRunningUI(false);
      showMessage('⏱ Your code ran too long. Check for an infinite loop!', 'error');
      playError();
    }
  }, 2000);

  worker.onmessage = async (e) => {
    clearTimeout(timeout);
    worker.terminate();
    worker = null;

    const { actions, result } = e.data;

    // ── Animate actions ─────────────────────────────────────────
    const anim = new Animator(robot, world, {
      onStep: (n) => setStepCounter(n),
      onWin:  handleWin,
      onCrash: handleCrash,
      onIdle:  handleIdle,
    });
    anim.setGrid(currentLevel.grid.length, currentLevel.grid[0].length);
    animator = anim;

    // Hook sounds into animation events
    const soundActions = actions.map(a => ({
      ...a,
      _originalType: a.type,
    }));

    // Play the animation
    await anim.play(actions);

    // If result was error (syntax/runtime before any action)
    if (result.status === 'error') {
      showMessage(result.errorMessage ?? 'Something went wrong in your code.', 'error');
      playError();
      isRunning = false;
      setRunningUI(false);
    }
  };

  worker.onerror = (err) => {
    clearTimeout(timeout);
    worker?.terminate();
    worker = null;
    isRunning = false;
    setRunningUI(false);
    const msg = err.message ?? 'Unknown error';
    showMessage(`Error in your code:\n${msg}\n\nCheck for typos or missing brackets.`, 'error');
    playError();
  };

  worker.postMessage({ code, level: currentLevel });
}

// ── Outcome handlers ─────────────────────────────────────────────
function handleWin() {
  isRunning = false;
  setRunningUI(false);
  playWin();
  launchConfetti();

  const progress   = loadProgress();
  const steps      = parseInt(document.getElementById('step-counter').textContent.replace('Steps: ', '')) || 0;
  const stars      = calcStars(steps, currentLevel);
  const nextLevel  = LEVELS.find(l => l.id === currentLevel.id + 1);

  saveCompletion(currentLevel.id, stars, getCode());
  refreshModal();

  showResult({
    won:        true,
    title:      '🎉 Level Complete!',
    message:    `You reached the goal in ${steps} steps. ${nextLevel ? 'Ready for the next challenge?' : "You've completed all levels!"}`,
    stars,
    canGoNext:  !!nextLevel,
  });

  document.getElementById('btn-next').onclick = () => {
    hideResult();
    stopConfetti();
    if (nextLevel) loadLevel(nextLevel);
  };
}

function handleCrash(reason) {
  isRunning = false;
  setRunningUI(false);
  playCrash();

  const friendlyReason = reason
    ? `Your robot ${reason}.`
    : 'Your robot crashed!';

  showMessage(`💥 ${friendlyReason}\n\nEdit your code and try again.`, 'error');

  showResult({
    won:       false,
    title:     '💥 Oops!',
    message:   friendlyReason,
    stars:     0,
    canGoNext: false,
  });
}

function handleIdle() {
  isRunning = false;
  setRunningUI(false);

  const progress = loadProgress();
  const hasGems  = currentLevel.requireAllGems;
  const result   = loadProgress()[currentLevel.id];
  
  showMessage(
    hasGems
      ? "🤔 The robot stopped but didn't collect all gems and reach the goal. Keep trying!"
      : "🤔 The robot stopped but didn't reach the goal. Add more code!",
    'warn'
  );
}

function resetLevel() {
  if (worker) { worker.terminate(); worker = null; }
  if (animator) animator.stop();
  isRunning = false;
  setRunningUI(false);
  loadLevel(currentLevel);
}

// ── Star rating ──────────────────────────────────────────────────
function calcStars(steps, level) {
  const max = level.maxSteps;
  if (steps <= max * 0.25) return 3;
  if (steps <= max * 0.55) return 2;
  return 1;
}

// ── UI state helpers ─────────────────────────────────────────────
function setRunningUI(running) {
  document.getElementById('btn-run').disabled   = running;
  document.getElementById('btn-reset').disabled = running;
  document.getElementById('btn-run').textContent = running ? '⏳ Running…' : '▶ Run';
}

// ── Level select ─────────────────────────────────────────────────
setupLevelModal();

document.getElementById('level-grid').addEventListener('levelselect', (e) => {
  const id  = e.detail;
  const lvl = LEVELS.find(l => l.id === id);
  if (lvl) loadLevel(lvl);
});

function refreshModal() {
  const progress   = loadProgress();
  const unlocked   = getUnlockedIds(LEVELS);
  renderLevelModal(LEVELS, currentLevel.id, unlocked, progress);
}

// ── Mute button ──────────────────────────────────────────────────
document.getElementById('btn-mute').addEventListener('click', toggleMute);

// ── Result overlay retry ─────────────────────────────────────────
document.getElementById('btn-retry').addEventListener('click', () => {
  hideResult();
  stopConfetti();
  resetLevel();
});

// ── Keyboard shortcut: Ctrl+Enter → Run ─────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runCode();
  }
});

// ── Boot ─────────────────────────────────────────────────────────
loadLevel(LEVELS[0]);
refreshModal();
