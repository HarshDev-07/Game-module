/**
 * progress.js — Save and load level progress using localStorage.
 */

const KEY = 'codebotquest_progress';

/** Load saved progress; returns a map of { [levelId]: { stars, code } } */
export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

/** Save a level completion */
export function saveCompletion(levelId, stars, code) {
  const progress = loadProgress();
  // Only upgrade stars, never downgrade
  const existing = progress[levelId];
  if (!existing || stars > (existing.stars ?? 0)) {
    progress[levelId] = { stars, code, completedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(progress));
  }
}

/** Save the user's current code for a level (auto-save) */
export function saveCode(levelId, code) {
  const progress = loadProgress();
  if (!progress[levelId]) progress[levelId] = {};
  progress[levelId].lastCode = code;
  localStorage.setItem(KEY, JSON.stringify(progress));
}

/** Load user's last saved code for a level */
export function loadCode(levelId, starterCode) {
  const progress = loadProgress();
  return progress[levelId]?.lastCode ?? starterCode;
}

/** Get the set of unlocked level IDs (level 1 always unlocked) */
export function getUnlockedIds(levels) {
  const progress = loadProgress();
  const unlocked = new Set([1]);
  for (const lvl of levels) {
    if (progress[lvl.id]) {
      // The next level is unlocked after this one is completed
      const next = levels.find(l => l.id === lvl.id + 1);
      if (next) unlocked.add(next.id);
    }
  }
  return unlocked;
}

/** Clear all progress (for debugging / reset) */
export function clearProgress() {
  localStorage.removeItem(KEY);
}
