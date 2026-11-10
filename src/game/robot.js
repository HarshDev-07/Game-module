/**
 * robot.js — Robot mesh and helpers.
 *
 * The robot is built entirely from primitive boxes and spheres.
 * No model files needed.
 */

import * as THREE from 'three';
import { COLORS, TILE } from './scene.js';
import { gridToWorld } from './world.js';
/** Direction → Y-rotation (radians).  East = default facing (+x). */
const DIR_ROT = {
  north: Math.PI,
  east:  -Math.PI / 2,
  south: 0,
  west:  Math.PI / 2,
};

export class Robot {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene  = scene;
    this.group  = new THREE.Group();
    scene.add(this.group);

    this._buildMesh();
    this.rows = 1;
    this.cols = 1;
  }

  _buildMesh() {
    const bodyMat  = new THREE.MeshPhongMaterial({ color: COLORS.robot,     shininess: 60 });
    const headMat  = new THREE.MeshPhongMaterial({ color: COLORS.robotHead, shininess: 80 });
    const eyeMat   = new THREE.MeshBasicMaterial({ color: COLORS.robotEye });
    const accentMat= new THREE.MeshBasicMaterial({ color: COLORS.accent2 ?? 0x4ee5c4 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.34), bodyMat);
    body.position.y = 0.22;
    body.castShadow = true;
    this.group.add(body);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.26), headMat);
    head.position.y = 0.56;
    head.castShadow = true;
    this.group.add(head);
    this._head = head;

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.075, 0.56, 0.135);
    eyeR.position.set( 0.075, 0.56, 0.135);
    this.group.add(eyeL, eyeR);
    this._eyes = [eyeL, eyeR];

    // Antenna
    const antGeo  = new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6);
    const antenna = new THREE.Mesh(antGeo, headMat);
    antenna.position.y = 0.76;
    this.group.add(antenna);

    const tipGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const tip    = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: COLORS.gemGlow }));
    tip.position.y = 0.845;
    this.group.add(tip);
    this._antennaTip = tip;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.11, 0.18, 0.11);
    const legMat = new THREE.MeshPhongMaterial({ color: 0x4a3fa0 });
    const legL = new THREE.Mesh(legGeo, legMat);
    const legR = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.14, 0.09, 0);
    legR.position.set( 0.14, 0.09, 0);
    this.group.add(legL, legR);
    this._legs = [legL, legR];

    // Chest accent
    const chestGeo = new THREE.BoxGeometry(0.18, 0.1, 0.02);
    const chest    = new THREE.Mesh(chestGeo, accentMat);
    chest.position.set(0, 0.22, 0.175);
    this.group.add(chest);

    // Shadow plane under robot
    const shadowGeo = new THREE.CircleGeometry(0.3, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
    const shadow    = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    this.group.add(shadow);
  }

  /** Place robot at grid (row, col) facing dir, using grid dimensions */
  place(row, col, dir, rows, cols) {
    this.rows = rows;
    this.cols = cols;
    const { x, z } = gridToWorld(row, col, rows, cols);
    this.group.position.set(x, 0, z);
    this.group.rotation.y = DIR_ROT[dir] ?? 0;
  }

  /** Instantly set world position (used by animator) */
  setPosition(x, z) {
    this.group.position.set(x, this.group.position.y, z);
  }

  /** Instantly set Y-rotation */
  setRotation(y) {
    this.group.rotation.y = y;
  }

  /** Animate (bobbing, blinking antenna) — call each frame */
  idle(t) {
    // Gentle bob
    this.group.position.y = Math.sin(t * 2.2) * 0.025;
    // Antenna glow pulse
    if (this._antennaTip) {
      const s = 0.9 + Math.sin(t * 4) * 0.1;
      this._antennaTip.scale.setScalar(s);
    }
    // Leg swing (subtle)
    if (this._legs) {
      this._legs[0].rotation.x =  Math.sin(t * 2.2) * 0.1;
      this._legs[1].rotation.x = -Math.sin(t * 2.2) * 0.1;
    }
  }

  /** Trigger a quick "collect" hop animation (returns a promise) */
  hop(duration = 0.3) {
    return new Promise(resolve => {
      const start  = performance.now();
      const baseY  = this.group.position.y;
      const height = 0.35;

      const tick = (now) => {
        const t  = Math.min((now - start) / (duration * 1000), 1);
        const y  = Math.sin(t * Math.PI) * height;
        this.group.position.y = baseY + y;
        if (t < 1) requestAnimationFrame(tick);
        else { this.group.position.y = baseY; resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }

  /** Trigger a "crash" shake */
  shake(duration = 0.5) {
    return new Promise(resolve => {
      const start = performance.now();
      const origX = this.group.position.x;

      const tick = (now) => {
        const t = Math.min((now - start) / (duration * 1000), 1);
        this.group.position.x = origX + Math.sin(t * Math.PI * 8) * 0.08 * (1 - t);
        if (t < 1) requestAnimationFrame(tick);
        else { this.group.position.x = origX; resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(obj => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
  }
}
