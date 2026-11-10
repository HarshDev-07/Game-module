/**
 * worker.js — Web Worker that runs student code safely.
 *
 * Message IN:  { code: string, level: Object }
 * Message OUT: { actions: [], result: { status, steps, gemsCollected, totalGems, crashReason } }
 *              OR { error: string }
 */

import { Simulation } from './simulation.js';

self.onmessage = function (e) {
  const { code, level } = e.data;

  const sim = new Simulation(level);

  // Build the robot API available to student code
  const api = {
    moveForward:  () => sim.moveForward(),
    turnLeft:     () => sim.turnLeft(),
    turnRight:    () => sim.turnRight(),
    collectGem:   () => sim.collectGem(),
    isPathClear:  () => sim.isPathClear(),
    onGem:        () => sim.onGem(),
    atGoal:       () => sim.atGoal(),
  };

  try {
    // Build a function from student code with API in scope
    // We use destructuring in the param list to bring all API fns into scope
    const params = Object.keys(api);
    const args   = Object.values(api);

    const fn = new Function(...params, code);
    fn(...args);

    sim.finalize();
  } catch (err) {
    // Crashes and step-limit errors are recorded in sim.actions already.
    // Syntax / runtime errors from student code need to be surfaced clearly.
    if (!sim.status || sim.status === 'idle') {
      sim.status = 'error';
      const result = sim.getResult();
      result.status = 'error';
      result.errorMessage = formatError(err, code);
      self.postMessage({ actions: result.actions, result });
      return;
    }
  }

  self.postMessage({ actions: sim.actions, result: sim.getResult() });
};

/** Format an error into a friendly student-facing message */
function formatError(err, code) {
  const msg = err.message ?? String(err);

  // SyntaxError with line info
  if (err instanceof SyntaxError) {
    return `Syntax Error: ${msg}\n\nCheck for missing brackets, parentheses, or semicolons.`;
  }

  // ReferenceError — undefined variable or function
  if (err instanceof ReferenceError) {
    return `Reference Error: ${msg}\n\nMake sure you spelled the function or variable name correctly.`;
  }

  // TypeError
  if (err instanceof TypeError) {
    return `Type Error: ${msg}\n\nCheck that you are calling functions correctly.`;
  }

  // Our simulation errors — already user-friendly
  return msg;
}
