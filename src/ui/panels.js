/**
 * panels.js — UI panel helpers (messages, level info, modals, results).
 */

/** Show a message below the editor */
export function showMessage(text, type = 'info') {
  const box = document.getElementById('message-box');
  box.textContent = text;
  box.className   = type;          // 'info' | 'error' | 'success' | 'warn'
  box.classList.remove('hidden');
}

export function clearMessage() {
  const box = document.getElementById('message-box');
  box.classList.add('hidden');
  box.textContent = '';
  box.className   = 'hidden';
}

/** Update the level header */
export function setLevelHeader(level) {
  document.getElementById('level-title').textContent =
    `Level ${level.id} — ${level.title}`;
  document.getElementById('concept-badge').textContent = level.concept;
  document.getElementById('level-desc').textContent   = level.description;
}

/** Show / hide the hint box */
let _hintVisible = false;
export function setupHint(hintText) {
  const box = document.getElementById('hint-box');
  const btn = document.getElementById('btn-hint');
  _hintVisible = false;
  box.classList.add('hidden');
  box.textContent = `💡 ${hintText}`;

  btn.onclick = () => {
    _hintVisible = !_hintVisible;
    box.classList.toggle('hidden', !_hintVisible);
    btn.textContent = _hintVisible ? '🙈 Hide Hint' : '💡 Hint';
  };
}

/** Update the step counter in the toolbar */
export function setStepCounter(n) {
  document.getElementById('step-counter').textContent = `Steps: ${n}`;
}

/** Show the win/fail result overlay */
export function showResult({ won, title, message, stars, canGoNext }) {
  const overlay = document.getElementById('result-overlay');
  document.getElementById('result-emoji').textContent   = won ? '🎉' : '😬';
  document.getElementById('result-title').textContent   = title;
  document.getElementById('result-message').textContent = message;
  document.getElementById('result-stars').textContent   = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

  document.getElementById('btn-next').classList.toggle('hidden', !canGoNext);
  overlay.classList.remove('hidden');
}

export function hideResult() {
  document.getElementById('result-overlay').classList.add('hidden');
}

/** Populate the level select modal */
export function renderLevelModal(levels, currentId, unlockedIds, completedMap) {
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';

  for (const lvl of levels) {
    const card = document.createElement('div');
    card.className = 'level-card';
    const locked    = !unlockedIds.has(lvl.id);
    const completed = completedMap[lvl.id];
    if (locked)    card.classList.add('locked');
    if (completed) card.classList.add('completed');
    if (lvl.id === currentId) card.classList.add('current');

    card.innerHTML = `
      <div class="lc-num">${lvl.id}</div>
      <div class="lc-title">${lvl.title}</div>
      <div class="lc-concept">${lvl.concept}</div>
      <div class="lc-stars">${completed ? '⭐'.repeat(completed.stars ?? 1) : (locked ? '🔒' : '')}</div>
    `;

    if (!locked) card.addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.add('hidden');
      card.dispatchEvent(new CustomEvent('levelselect', { detail: lvl.id, bubbles: true }));
    });

    grid.appendChild(card);
  }
}

/** Open / close the level select modal */
export function setupLevelModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('btn-level-select').onclick = () => overlay.classList.remove('hidden');
  document.getElementById('modal-close').onclick      = () => overlay.classList.add('hidden');
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}
