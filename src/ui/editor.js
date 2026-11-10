/**
 * editor.js — CodeMirror 6 setup.
 *
 * Falls back gracefully to a plain <textarea> if CodeMirror fails to load.
 */

let _view = null;
let _fallbackTextarea = null;

export async function initEditor(containerEl, initialCode = '') {
  try {
    const { EditorView, basicSetup } = await import('codemirror');
    const { javascript }             = await import('@codemirror/lang-javascript');
    const { oneDark }                = await import('@codemirror/theme-one-dark');
    const { keymap }                 = await import('@codemirror/view');
    const { indentWithTab }          = await import('@codemirror/commands');

    _view = new EditorView({
      doc: initialCode,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
      ],
      parent: containerEl,
    });

    // Stretch editor to fill the container
    _view.dom.style.height = '100%';
    _view.dom.style.overflow = 'auto';
    return _view;

  } catch (err) {
    console.warn('CodeMirror failed to load, using fallback textarea:', err);
    _fallbackTextarea = document.createElement('textarea');
    _fallbackTextarea.value = initialCode;
    _fallbackTextarea.style.cssText = `
      width:100%; height:100%; background:#12141f; color:#e8eaf6;
      border:none; resize:none; padding:12px; font-size:14px;
      font-family:'Cascadia Code','Fira Code','Consolas',monospace;
      outline:none; line-height:1.5;
    `;
    containerEl.appendChild(_fallbackTextarea);
    return _fallbackTextarea;
  }
}

export function getCode() {
  if (_view) return _view.state.doc.toString();
  if (_fallbackTextarea) return _fallbackTextarea.value;
  return '';
}

export function setCode(code) {
  if (_view) {
    _view.dispatch({
      changes: { from: 0, to: _view.state.doc.length, insert: code }
    });
  } else if (_fallbackTextarea) {
    _fallbackTextarea.value = code;
  }
}

export function focusEditor() {
  if (_view) _view.focus();
  else _fallbackTextarea?.focus();
}
