/**
 * simulation.js — Pure grid/robot logic (no Three.js).
 *
 * The simulation runs entirely in a Web Worker. It records every API call
 * as an action object so the main thread can replay the animation later.
 */

/** Cardinal directions and helpers */
const DIRS = ['north', 'east', 'south', 'west'];
const DELTA = {
  north: { row: -1, col: 0 },
  east:  { row: 0,  col: 1  },
  south: { row: 1,  col: 0  },
  west:  { row: 0,  col: -1 },
};

export class Simulation {
  /**
   * @param {Object} level  — parsed level JSON
   */
  constructor(level) {
    this.level    = level;
    this.maxSteps = level.maxSteps ?? 200;
    this.steps    = 0;
    this.actions  = [];

    // Parse grid string array into a 2-D array of tile types
    this.grid = level.grid.map(row => row.split(''));
    this.rows = this.grid.length;
    this.cols = this.grid[0].length;

    // Find start position and strip 'S' from grid (it becomes floor)
    this.startRow = 0; this.startCol = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 'S') {
          this.startRow = r; this.startCol = c;
          this.grid[r][c] = '.'; // floor under robot
        }
      }
    }

    // Runtime state
    this.row  = this.startRow;
    this.col  = this.startCol;
    this.dir  = level.startDirection ?? 'east';
    this.gemsCollected = 0;

    // Count total gems in the grid
    this.totalGems = 0;
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell === '*') this.totalGems++;
      }
    }

    // Live gem tracking (mutable copy)
    this.gems = this.grid.map(row => [...row]);

    // Status — set to non-null when game ends
    this.status = null; // 'won' | 'crashed' | 'stepLimit'
    this.crashReason = '';
  }

  /* ───────────────────────── HELPERS ───────────────────────── */

  _ahead() {
    const d = DELTA[this.dir];
    return { row: this.row + d.row, col: this.col + d.col };
  }

  _inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  _tileAt(r, c) {
    return this.gems[r]?.[c] ?? '#'; // out-of-bounds treated as wall
  }

  _countStep() {
    this.steps++;
    if (this.steps > this.maxSteps) {
      this.status = 'stepLimit';
      throw new Error(`Step limit (${this.maxSteps}) exceeded`);
    }
  }

  _checkAlreadyDone() {
    if (this.status) {
      throw new Error('The robot has already stopped. No more commands.');
    }
  }

  /* ───────────────────────── ROBOT API ─────────────────────── */

  moveForward() {
    this._checkAlreadyDone();
    this._countStep();

    const { row: nr, col: nc } = this._ahead();

    if (!this._inBounds(nr, nc)) {
      this.status = 'crashed';
      this.crashReason = `walked off the grid at step ${this.steps} (direction: ${this.dir})`;
      this.actions.push({ type: 'crash', reason: this.crashReason, step: this.steps });
      throw new Error(`Your robot walked off the grid at step ${this.steps}!`);
    }

    const tile = this._tileAt(nr, nc);
    if (tile === '#') {
      this.status = 'crashed';
      this.crashReason = `hit a wall at step ${this.steps}`;
      this.actions.push({ type: 'crash', reason: this.crashReason, step: this.steps });
      throw new Error(`Your robot hit a wall at step ${this.steps}! (tried to move ${this.dir})`);
    }

    this.row = nr;
    this.col = nc;
    this.actions.push({ type: 'move', row: this.row, col: this.col, step: this.steps });

    // Auto-check win after moving
    this._checkWin();
  }

  turnLeft() {
    this._checkAlreadyDone();
    this._countStep();
    const idx = DIRS.indexOf(this.dir);
    this.dir = DIRS[(idx + 3) % 4]; // -1 mod 4
    this.actions.push({ type: 'turn', dir: this.dir, step: this.steps });
  }

  turnRight() {
    this._checkAlreadyDone();
    this._countStep();
    const idx = DIRS.indexOf(this.dir);
    this.dir = DIRS[(idx + 1) % 4];
    this.actions.push({ type: 'turn', dir: this.dir, step: this.steps });
  }

  collectGem() {
    this._checkAlreadyDone();
    this._countStep();

    if (this.gems[this.row][this.col] !== '*') {
      // Not on a gem — push a failed collect action (shake)
      this.actions.push({ type: 'collectFail', row: this.row, col: this.col, step: this.steps });
      return false;
    }

    this.gems[this.row][this.col] = '.'; // remove gem
    this.gemsCollected++;
    this.actions.push({ type: 'collect', row: this.row, col: this.col, gemIndex: this.gemsCollected, step: this.steps });
    return true;
  }

  isPathClear() {
    const { row: nr, col: nc } = this._ahead();
    if (!this._inBounds(nr, nc)) return false;
    const tile = this._tileAt(nr, nc);
    return tile !== '#';
  }

  onGem() {
    return this.gems[this.row][this.col] === '*';
  }

  atGoal() {
    return this.grid[this.row][this.col] === 'G';
  }

  /* ───────────────────────── WIN CHECK ─────────────────────── */

  _checkWin() {
    if (!this.atGoal()) return;
    if (this.level.requireAllGems && this.gemsCollected < this.totalGems) return;

    this.status = 'won';
    this.actions.push({ type: 'win', step: this.steps, gemsCollected: this.gemsCollected });
  }

  /* Explicit call for when student code finishes normally */
  finalize() {
    if (this.status) return; // already ended

    // Check if on goal
    if (this.atGoal()) {
      if (!this.level.requireAllGems || this.gemsCollected >= this.totalGems) {
        this.status = 'won';
        this.actions.push({ type: 'win', step: this.steps, gemsCollected: this.gemsCollected });
        return;
      }
    }

    // Not on goal — idle finish
    this.status = 'idle';
  }

  getResult() {
    return {
      status:         this.status ?? 'idle',
      actions:        this.actions,
      steps:          this.steps,
      gemsCollected:  this.gemsCollected,
      totalGems:      this.totalGems,
      crashReason:    this.crashReason,
    };
  }
}
