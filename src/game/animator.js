/**
 * animator.js — Plays back the action list produced by the simulation.
 *
 * Actions are played sequentially with smooth tweening.
 * Uses GSAP-style manual lerp so we don't need an extra dependency.
 */

import * as THREE from 'three';
import { gridToWorld, TILE } from './world.js';

/** Direction → Y-rotation (must match robot.js) */
const DIR_ROT = {
  north: Math.PI,
  east:  -Math.PI / 2,
  south: 0,
  west:  Math.PI / 2,
};

/** Smooth easing (ease in-out quad) */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** Lerp between a and b */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Short-path angle lerp (handles ±π wrap) */
function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI)  diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

export class Animator {
  /**
   * @param {Robot}  robot
   * @param {World}  world
   * @param {Object} callbacks  — { onWin, onCrash, onIdle, onStep }
   */
  constructor(robot, world, callbacks = {}) {
    this.robot     = robot;
    this.world     = world;
    this.callbacks = callbacks;
    this._running  = false;
    this._actions  = [];
    this._rows     = 1;
    this._cols     = 1;
  }

  /** Set the grid dimensions so we can convert row/col → world coords */
  setGrid(rows, cols) { this._rows = rows; this._cols = cols; }

  /** Start playing an action list */
  async play(actions, { stepMs = 380 } = {}) {
    this._running = true;
    this._actions = [...actions];

    for (const action of this._actions) {
      if (!this._running) break;

      this.callbacks.onStep?.(action.step ?? 0);

      switch (action.type) {
        case 'move':
          await this._animateMove(action, stepMs);
          break;
        case 'turn':
          await this._animateTurn(action, stepMs * 0.65);
          break;
        case 'collect':
          await this._animateCollect(action, stepMs);
          break;
        case 'collectFail':
          await this._animateCollectFail(stepMs * 0.5);
          break;
        case 'crash':
          await this._animateCrash(stepMs);
          break;
        case 'win':
          await this._animateWin();
          break;
        default:
          break;
      }
    }

    this._running = false;
    // Notify result
    const last = this._actions.at(-1);
    if (last?.type === 'win') {
      this.callbacks.onWin?.();
    } else if (last?.type === 'crash') {
      this.callbacks.onCrash?.(last.reason);
    } else {
      this.callbacks.onIdle?.();
    }
  }

  /** Stop playback mid-animation */
  stop() { this._running = false; }

  /* ───────────────────────── TWEENS ─────────────────────────── */

  _tween(durationMs, updateFn) {
    return new Promise(resolve => {
      const start = performance.now();
      const tick  = (now) => {
        const raw = (now - start) / durationMs;
        const t   = easeInOut(Math.min(raw, 1));
        updateFn(t);
        if (raw < 1 && this._running) requestAnimationFrame(tick);
        else { updateFn(1); resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }

  async _animateMove(action, ms) {
    const target  = gridToWorld(action.row, action.col, this._rows, this._cols);
    const startX  = this.robot.group.position.x;
    const startZ  = this.robot.group.position.z;
    const startY  = this.robot.group.position.y;

    await this._tween(ms, (t) => {
      this.robot.group.position.x = lerp(startX, target.x, t);
      this.robot.group.position.z = lerp(startZ, target.z, t);
      // Small arc
      this.robot.group.position.y = startY + Math.sin(t * Math.PI) * 0.1;
    });
    this.robot.group.position.y = startY;
  }

  async _animateTurn(action, ms) {
    const target  = DIR_ROT[action.dir] ?? 0;
    const startY  = this.robot.group.rotation.y;

    await this._tween(ms, (t) => {
      this.robot.group.rotation.y = lerpAngle(startY, target, t);
    });
    this.robot.group.rotation.y = target;
  }

  async _animateCollect(action, ms) {
    // Pop the gem up and fade out
    const gemEntry = this.world.getGemAt(action.row, action.col);

    const hopP = this.robot.hop(ms / 1000 * 0.6);
    if (gemEntry) {
      const mesh = gemEntry.mesh;
      const startY = mesh.position.y;
      await this._tween(ms * 0.8, (t) => {
        mesh.position.y = startY + t * 0.5;
        mesh.scale.setScalar(1 - t);
        mesh.material.opacity = 1 - t;
        mesh.material.transparent = true;
      });
      mesh.visible = false;
      mesh.userData.alive = false;
    }
    await hopP;
  }

  async _animateCollectFail(ms) {
    await this.robot.shake(ms / 1000);
  }

  async _animateCrash(ms) {
    await this.robot.shake(ms / 1000 * 1.3);
    // Red flash on robot
    this.robot.group.traverse(obj => {
      if (obj.isMesh && obj.material?.color) {
        const orig = obj.material.color.clone();
        obj.material.color.set(0xff4444);
        setTimeout(() => obj.material.color.copy(orig), 400);
      }
    });
  }

  async _animateWin() {
    await this.robot.hop(0.4);
    await this.robot.hop(0.3);
  }
}
