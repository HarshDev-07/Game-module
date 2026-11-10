/**
 * simulation.test.js — Unit tests for the simulation engine.
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Simulation } from '../src/engine/simulation.js';

// ── Helpers ──────────────────────────────────────────────────────
function makeLevel(overrides = {}) {
  return {
    id:             99,
    title:          'Test',
    concept:        'Test',
    description:    '',
    hint:           '',
    grid:           ['S....G'],
    startDirection: 'east',
    requireAllGems: false,
    maxSteps:       50,
    starterCode:    '',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('Simulation — basic movement', () => {
  it('starts at the S tile', () => {
    const sim = new Simulation(makeLevel({ grid: ['S....G'] }));
    expect(sim.row).toBe(0);
    expect(sim.col).toBe(0);
  });

  it('moveForward moves east', () => {
    const sim = new Simulation(makeLevel({ grid: ['S....G'] }));
    sim.moveForward();
    expect(sim.col).toBe(1);
    expect(sim.row).toBe(0);
  });

  it('moveForward accumulates position', () => {
    const sim = new Simulation(makeLevel({ grid: ['S....G'] }));
    sim.moveForward();
    sim.moveForward();
    expect(sim.col).toBe(2);
  });

  it('records a move action', () => {
    const sim = new Simulation(makeLevel({ grid: ['S....G'] }));
    sim.moveForward();
    expect(sim.actions).toHaveLength(1);
    expect(sim.actions[0].type).toBe('move');
  });
});

describe('Simulation — turning', () => {
  it('turnRight changes direction: east → south', () => {
    const sim = new Simulation(makeLevel());
    sim.turnRight();
    expect(sim.dir).toBe('south');
  });

  it('turnLeft changes direction: east → north', () => {
    const sim = new Simulation(makeLevel());
    sim.turnLeft();
    expect(sim.dir).toBe('north');
  });

  it('four right turns return to original direction', () => {
    const sim = new Simulation(makeLevel());
    for (let i = 0; i < 4; i++) sim.turnRight();
    expect(sim.dir).toBe('east');
  });

  it('records a turn action', () => {
    const sim = new Simulation(makeLevel());
    sim.turnRight();
    expect(sim.actions[0].type).toBe('turn');
    expect(sim.actions[0].dir).toBe('south');
  });
});

describe('Simulation — walls', () => {
  it('crashes into a wall', () => {
    const sim = new Simulation(makeLevel({ grid: ['S#.G'] }));
    expect(() => sim.moveForward()).toThrow(/wall/i);
    expect(sim.status).toBe('crashed');
    expect(sim.actions.at(-1).type).toBe('crash');
  });

  it('crashes off-grid', () => {
    const sim = new Simulation(makeLevel({ grid: ['S'], startDirection: 'west' }));
    expect(() => sim.moveForward()).toThrow(/off the grid/i);
    expect(sim.status).toBe('crashed');
  });
});

describe('Simulation — isPathClear', () => {
  it('returns true when ahead is floor', () => {
    const sim = new Simulation(makeLevel({ grid: ['S.G'] }));
    expect(sim.isPathClear()).toBe(true);
  });

  it('returns false when ahead is wall', () => {
    const sim = new Simulation(makeLevel({ grid: ['S#G'] }));
    expect(sim.isPathClear()).toBe(false);
  });

  it('returns false when at grid edge', () => {
    const sim = new Simulation(makeLevel({ grid: ['S'], startDirection: 'east' }));
    expect(sim.isPathClear()).toBe(false);
  });
});

describe('Simulation — gems', () => {
  it('detects gem under robot', () => {
    // Start ON a gem (level has gem at start position after S is removed — use *G layout)
    const sim = new Simulation(makeLevel({ grid: ['S*G'] }));
    // Move to gem tile
    sim.moveForward();
    expect(sim.onGem()).toBe(true);
  });

  it('collectGem removes gem', () => {
    const sim = new Simulation(makeLevel({ grid: ['S*G'] }));
    sim.moveForward();
    sim.collectGem();
    expect(sim.onGem()).toBe(false);
    expect(sim.gemsCollected).toBe(1);
  });

  it('collectGem on empty tile returns false', () => {
    const sim = new Simulation(makeLevel({ grid: ['S.G'] }));
    sim.moveForward();
    const result = sim.collectGem();
    expect(result).toBe(false);
    expect(sim.gemsCollected).toBe(0);
  });
});

describe('Simulation — goal', () => {
  it('atGoal returns true when on G', () => {
    const sim = new Simulation(makeLevel({ grid: ['SG'] }));
    sim.moveForward();
    expect(sim.atGoal()).toBe(true);
  });

  it('wins when reaching goal', () => {
    const sim = new Simulation(makeLevel({ grid: ['SG'] }));
    sim.moveForward();
    expect(sim.status).toBe('won');
    expect(sim.actions.at(-1).type).toBe('win');
  });

  it('does not win if gems required but not collected', () => {
    const sim = new Simulation(makeLevel({
      grid: ['S*G'],
      requireAllGems: true,
    }));
    sim.moveForward(); // move to gem tile, don't collect
    sim.moveForward(); // move to goal
    expect(sim.status).toBeNull(); // not won yet
    sim.finalize();
    expect(sim.status).toBe('idle'); // missed gems
  });

  it('wins when all gems collected before goal', () => {
    const sim = new Simulation(makeLevel({
      grid: ['S*G'],
      requireAllGems: true,
    }));
    sim.moveForward();
    sim.collectGem();
    sim.moveForward();
    expect(sim.status).toBe('won');
  });
});

describe('Simulation — step limit', () => {
  it('throws when maxSteps exceeded', () => {
    const sim = new Simulation(makeLevel({ grid: ['S.........G'], maxSteps: 3 }));
    sim.moveForward();
    sim.moveForward();
    sim.moveForward();
    expect(() => sim.moveForward()).toThrow(/step limit/i);
    expect(sim.status).toBe('stepLimit');
  });
});

describe('Simulation — multi-row grid', () => {
  it('north direction decreases row', () => {
    const sim = new Simulation(makeLevel({
      grid: ['..G', 'S..'],
      startDirection: 'north',
    }));
    expect(sim.row).toBe(1);
    sim.moveForward();
    expect(sim.row).toBe(0);
  });

  it('south direction increases row', () => {
    const sim = new Simulation(makeLevel({
      grid: ['S..', '..G'],
      startDirection: 'south',
    }));
    sim.moveForward();
    expect(sim.row).toBe(1);
  });
});
