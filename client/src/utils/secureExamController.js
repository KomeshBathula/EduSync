/**
 * SecureExamController — Client-side exam integrity enforcement.
 *
 * This module manages all browser-level security measures during quiz attempts:
 * - Text selection prevention
 * - Right-click blocking
 * - Copy/Cut/Paste interception
 * - Dev tools shortcut detection
 * - Tab switch / window blur detection
 * - Visibility change detection
 * - Screenshot key detection (best effort)
 * - Fullscreen enforcement
 *
 * Usage:
 *   const controller = createSecureExamController({ onViolation, onAutoSubmit });
 *   controller.activate();
 *   // ... quiz in progress ...
 *   controller.deactivate();
 */

const VIOLATION_TYPES = {
  TAB_SWITCH: 'TAB_SWITCH',
  WINDOW_BLUR: 'WINDOW_BLUR',
  COPY_ATTEMPT: 'COPY_ATTEMPT',
  PASTE_ATTEMPT: 'PASTE_ATTEMPT',
  RIGHT_CLICK: 'RIGHT_CLICK',
  DEVTOOLS_ATTEMPT: 'DEVTOOLS_ATTEMPT',
  SCREENSHOT_KEY: 'SCREENSHOT_KEY',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
};

// Suspicious key combos (cross-platform)
const BLOCKED_COMBOS = [
  { ctrl: true, shift: false, key: 'c' },  // Ctrl+C
  { ctrl: true, shift: false, key: 'v' },  // Ctrl+V
  { ctrl: true, shift: false, key: 'x' },  // Ctrl+X
  { ctrl: true, shift: true, key: 'i' },   // Ctrl+Shift+I (DevTools)
  { ctrl: true, shift: true, key: 'c' },   // Ctrl+Shift+C (Inspect)
  { ctrl: true, shift: true, key: 'j' },   // Ctrl+Shift+J (Console)
  { ctrl: true, shift: false, key: 'u' },  // Ctrl+U (View Source)
  { ctrl: true, shift: false, key: 's' },  // Ctrl+S (Save)
  { ctrl: true, shift: false, key: 'p' },  // Ctrl+P (Print)
];

const META_COMBOS = [
  // Mac screenshot combos
  { meta: true, shift: true, key: '3' },   // Cmd+Shift+3
  { meta: true, shift: true, key: '4' },   // Cmd+Shift+4
  { meta: true, shift: true, key: '5' },   // Cmd+Shift+5
];

/**
 * Create a new secure exam controller instance.
 *
 * @param {Object} options
 * @param {Function} options.onViolation — Called with (violationType, metadata) on each violation
 * @param {Function} options.onForceSubmit — Called when strict mode triggers immediate termination
 * @param {boolean}  options.strictMode   — If true, first violation = immediate termination
 * @param {number}   options.threshold   — Violation threshold from server config (normal mode only)
 */
export const createSecureExamController = ({ onViolation, onForceSubmit, strictMode = false, threshold = 3 }) => {
  let active = false;
  let violationCount = 0;
  let handlers = [];
  let originalUserSelect = '';
  let isFullscreen = false;
  let fullscreenRequested = false;
  let lockdownActive = false;

  // ── Internal: report violation ──────────────────────────────────
  const reportViolation = (type, metadata = {}) => {
    if (!active || lockdownActive) return;

    violationCount += 1;

    // STRICT MODE: Lock immediately on first violation
    if (strictMode) {
      lockdownActive = true;
      if (onForceSubmit) {
        onForceSubmit(type, { ...metadata, violationCount });
      }
      return;
    }

    // NORMAL MODE: Report to server
    onViolation(type, { ...metadata, localCount: violationCount });
  };

  // ── Visibility Change Handler ───────────────────────────────────
  const handleVisibilityChange = () => {
    if (document.hidden) {
      reportViolation(VIOLATION_TYPES.TAB_SWITCH, { state: 'hidden' });
    }
  };

  // ── Window Blur Handler ─────────────────────────────────────────
  const handleBlur = () => {
    reportViolation(VIOLATION_TYPES.WINDOW_BLUR);
  };

  // ── Copy/Cut/Paste Handlers ─────────────────────────────────────
  const handleCopy = (e) => {
    e.preventDefault();
    reportViolation(VIOLATION_TYPES.COPY_ATTEMPT);
  };

  const handleCut = (e) => {
    e.preventDefault();
    reportViolation(VIOLATION_TYPES.COPY_ATTEMPT, { subType: 'cut' });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    reportViolation(VIOLATION_TYPES.PASTE_ATTEMPT);
  };

  // ── Context Menu Handler ────────────────────────────────────────
  const handleContextMenu = (e) => {
    e.preventDefault();
    reportViolation(VIOLATION_TYPES.RIGHT_CLICK);
  };

  // ── Keyboard Handler ───────────────────────────────────────────
  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();

    // F12 — DevTools
    if (key === 'f12') {
      e.preventDefault();
      reportViolation(VIOLATION_TYPES.DEVTOOLS_ATTEMPT, { key: 'F12' });
      return;
    }

    // PrintScreen
    if (key === 'printscreen' || e.code === 'PrintScreen') {
      e.preventDefault();
      // Best effort: clear clipboard
      try {
        navigator.clipboard.writeText('').catch(() => {});
      } catch (_) {}
      reportViolation(VIOLATION_TYPES.SCREENSHOT_KEY, { key: 'PrintScreen' });
      return;
    }

    // Check blocked Ctrl combos
    if (e.ctrlKey || e.metaKey) {
      const combos = e.metaKey ? [...BLOCKED_COMBOS, ...META_COMBOS] : BLOCKED_COMBOS;
      for (const combo of combos) {
        const ctrlMatch = combo.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const metaMatch = combo.meta ? e.metaKey : true;
        const shiftMatch = combo.shift === e.shiftKey;
        if (ctrlMatch && metaMatch && shiftMatch && key === combo.key) {
          e.preventDefault();

          // Categorize
          if (['c', 'x'].includes(key) && !e.shiftKey) {
            reportViolation(VIOLATION_TYPES.COPY_ATTEMPT, { combo: `Ctrl+${key.toUpperCase()}` });
          } else if (key === 'v' && !e.shiftKey) {
            reportViolation(VIOLATION_TYPES.PASTE_ATTEMPT, { combo: 'Ctrl+V' });
          } else if (['i', 'j'].includes(key) && e.shiftKey) {
            reportViolation(VIOLATION_TYPES.DEVTOOLS_ATTEMPT, { combo: `Ctrl+Shift+${key.toUpperCase()}` });
          } else if (['3', '4', '5'].includes(key) && e.shiftKey && e.metaKey) {
            // Mac screenshot
            try { navigator.clipboard.writeText('').catch(() => {}); } catch (_) {}
            reportViolation(VIOLATION_TYPES.SCREENSHOT_KEY, { combo: `Cmd+Shift+${key}` });
          } else {
            reportViolation(VIOLATION_TYPES.DEVTOOLS_ATTEMPT, { combo: `Ctrl+${e.shiftKey ? 'Shift+' : ''}${key.toUpperCase()}` });
          }
          return;
        }
      }
    }
  };

  // ── Drag Prevention ─────────────────────────────────────────────
  const handleDragStart = (e) => {
    e.preventDefault();
  };

  const handleSelectStart = (e) => {
    e.preventDefault();
  };

  // ── Fullscreen Change Handler ───────────────────────────────────
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && fullscreenRequested && active) {
      isFullscreen = false;
      reportViolation(VIOLATION_TYPES.FULLSCREEN_EXIT);
    } else {
      isFullscreen = !!document.fullscreenElement;
    }
  };

  // ── Activate Secure Mode ────────────────────────────────────────
  const activate = () => {
    if (active) return;
    active = true;
    violationCount = 0;

    // Save and disable text selection
    originalUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.msUserSelect = 'none';

    // Register all event listeners
    const register = (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      handlers.push({ target, event, handler, options });
    };

    register(document, 'visibilitychange', handleVisibilityChange);
    register(window, 'blur', handleBlur);
    register(document, 'copy', handleCopy);
    register(document, 'cut', handleCut);
    register(document, 'paste', handlePaste);
    register(document, 'contextmenu', handleContextMenu);
    register(document, 'keydown', handleKeyDown, { capture: true });
    register(document, 'dragstart', handleDragStart);
    register(document, 'selectstart', handleSelectStart);
    register(document, 'fullscreenchange', handleFullscreenChange);
    register(document, 'webkitfullscreenchange', handleFullscreenChange);
  };

  // ── Request Fullscreen ──────────────────────────────────────────
  const requestFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      isFullscreen = true;
      fullscreenRequested = true;
    } catch (err) {
      console.warn('Fullscreen request denied:', err.message);
      fullscreenRequested = false;
    }
  };

  // ── Exit Fullscreen ─────────────────────────────────────────────
  const exitFullscreen = async () => {
    fullscreenRequested = false;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (_) {}
    isFullscreen = false;
  };

  // ── Deactivate Secure Mode ──────────────────────────────────────
  const deactivate = () => {
    if (!active) return;
    active = false;

    // Restore text selection
    document.body.style.userSelect = originalUserSelect;
    document.body.style.webkitUserSelect = '';
    document.body.style.msUserSelect = '';

    // Remove all listeners
    handlers.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options);
    });
    handlers = [];

    // Exit fullscreen
    exitFullscreen();
  };

  // ── Public API ──────────────────────────────────────────────────
  return {
    activate,
    deactivate,
    requestFullscreen,
    exitFullscreen,
    getViolationCount: () => violationCount,
    isActive: () => active,
    isLockedDown: () => lockdownActive,
    VIOLATION_TYPES,
  };
};

export { VIOLATION_TYPES };
export default createSecureExamController;
