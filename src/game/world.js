/**
 * world.js — Builds the 3D grid from a level JSON object.
 *
 * Grid coordinate → Three.js world coordinate mapping:
 *   col → x,  row → -z  (so the grid lies in the XZ plane)
 *   The grid is centred at the origin.
 */

import * as THREE from 'three';
import { COLORS, TILE } from './scene.js';

export { TILE }; // re-export so animator.js can import from world.js

/** Convert grid (row,col) to world (x, z), centred */
export function gridToWorld(row, col, rows, cols) {
  const x = (col - (cols - 1) / 2) * TILE;
  const z = (row - (rows - 1) / 2) * TILE;
  return { x, z };
}

export class World {
  constructor(scene) {
    this.scene  = scene;
    this.group  = new THREE.Group();
    scene.add(this.group);

    this.gemMeshes  = []; // { row, col, mesh }
    this.goalMesh   = null;
    this.rows = 0;
    this.cols = 0;

    // Reusable materials (created once, shared)
    this._mats = {
      floor:    new THREE.MeshLambertMaterial({ color: COLORS.floor }),
      wall:     new THREE.MeshLambertMaterial({ color: COLORS.wall }),
      wallTop:  new THREE.MeshLambertMaterial({ color: COLORS.wallTop }),
      gem:      new THREE.MeshPhongMaterial({ color: COLORS.gem, emissive: COLORS.gemGlow, emissiveIntensity: 0.4, shininess: 120 }),
      goal:     new THREE.MeshPhongMaterial({ color: COLORS.goal, emissive: COLORS.goalGlow, emissiveIntensity: 0.3 }),
      goalLine: new THREE.LineBasicMaterial({ color: COLORS.goalGlow }),
    };
  }

  /** Build the entire world from a level JSON */
  load(level) {
    // Clear previous level
    this.clear();

    const grid = level.grid.map(row => row.split(''));
    this.rows = grid.length;
    this.cols = grid[0].length;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = grid[r][c];
        if (tile === '#') continue; // skip wall base (wall will cover it)

        const { x, z } = gridToWorld(r, c, this.rows, this.cols);

        // ── Floor tile ────────────────────────────────────────
        const floorGeo  = new THREE.BoxGeometry(TILE * 0.98, 0.1, TILE * 0.98);
        const floorMesh = new THREE.Mesh(floorGeo, this._mats.floor);
        floorMesh.position.set(x, -0.05, z);
        floorMesh.receiveShadow = true;
        this.group.add(floorMesh);

        // ── Tile border lines ─────────────────────────────────
        const borderGeo  = new THREE.EdgesGeometry(floorGeo);
        const borderLine = new THREE.LineSegments(
          borderGeo,
          new THREE.LineBasicMaterial({ color: COLORS.floorLine, transparent: true, opacity: 0.4 })
        );
        borderLine.position.copy(floorMesh.position);
        this.group.add(borderLine);

        // ── Goal tile ─────────────────────────────────────────
        if (tile === 'G') {
          const goalGeo  = new THREE.BoxGeometry(TILE * 0.9, 0.12, TILE * 0.9);
          const goalMesh = new THREE.Mesh(goalGeo, this._mats.goal);
          goalMesh.position.set(x, 0.01, z);
          goalMesh.receiveShadow = true;
          this.group.add(goalMesh);

          // Pulsing ring decoration
          const ringGeo  = new THREE.TorusGeometry(TILE * 0.4, 0.04, 8, 32);
          const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: COLORS.goalGlow }));
          ringMesh.rotation.x = -Math.PI / 2;
          ringMesh.position.set(x, 0.08, z);
          ringMesh.userData.isGoalRing = true;
          this.group.add(ringMesh);

          this.goalMesh = { mesh: goalMesh, ring: ringMesh, row: r, col: c };
        }

        // ── Gem ───────────────────────────────────────────────
        if (tile === '*') {
          const gemGeo  = new THREE.OctahedronGeometry(TILE * 0.22, 0);
          const gem     = new THREE.Mesh(gemGeo, this._mats.gem.clone());
          gem.position.set(x, 0.4, z);
          gem.castShadow = true;
          gem.userData   = { row: r, col: c, alive: true };
          this.group.add(gem);
          this.gemMeshes.push({ row: r, col: c, mesh: gem });
        }
      }

      // ── Wall tiles ─────────────────────────────────────────
      for (let c = 0; c < this.cols; c++) {
        if (grid[r][c] !== '#') continue;
        const { x, z } = gridToWorld(r, c, this.rows, this.cols);

        const wallH  = 0.9;
        const wallGeo = new THREE.BoxGeometry(TILE * 0.98, wallH, TILE * 0.98);
        const wallMat = [
          this._mats.wall, this._mats.wall,
          this._mats.wallTop,
          this._mats.wall, this._mats.wall, this._mats.wall,
        ];
        const wall  = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(x, wallH / 2 - 0.05, z);
        wall.castShadow    = true;
        wall.receiveShadow = true;
        this.group.add(wall);
      }
    }
  }

  /** Find gem mesh by grid position */
  getGemAt(row, col) {
    return this.gemMeshes.find(g => g.row === row && g.col === col && g.mesh.userData.alive);
  }

  /** Animate gems (floating + rotating) — call from render loop or animator */
  animateGems(t) {
    for (const { mesh } of this.gemMeshes) {
      if (!mesh.userData.alive) continue;
      const { row, col } = mesh.userData;
      const { x, z } = gridToWorld(row, col, this.rows, this.cols);
      mesh.position.y    = 0.4 + Math.sin(t * 2 + (row + col) * 0.8) * 0.08;
      mesh.rotation.y   += 0.02;
    }
    // Pulse goal ring
    if (this.goalMesh) {
      const s = 0.9 + Math.sin(t * 2.5) * 0.1;
      this.goalMesh.ring.scale.set(s, s, s);
    }
  }

  /** Remove all meshes */
  clear() {
    while (this.group.children.length) {
      const obj = this.group.children[0];
      obj.geometry?.dispose();
      this.group.remove(obj);
    }
    this.gemMeshes = [];
    this.goalMesh  = null;
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
  }
}
