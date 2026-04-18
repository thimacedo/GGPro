/**
 * clock.js — Motor do Cronômetro
 * Gerencia elapsed time, play/pause, e auto-detecta fim de período
 */

import state from '../state.js';
import { PERIODS, PERIOD_NAMES } from '../constants.js';

let _intervalId = null;

function startEngine() {
  if (_intervalId) return;
  _intervalId = setInterval(() => {
    const s = state.get();
    if (s.match.isPaused) return;
    if (['PRE', 'INTERVAL', 'FINISHED', 'PENALTIES'].includes(s.match.period)) return;

    const now = Date.now();
    const newElapsed = s.match.elapsed + (now - s.match.startedAt);

    state.set(prev => ({
      match: { ...prev.match, elapsed: newElapsed, startedAt: now }
    }));

    autoHalfTimeCheck(newElapsed);
  }, 200);
}

function autoHalfTimeCheck(elapsedMs) {
  const s = state.get();
  if (s.match.isPaused) return;
  const mins = Math.floor(elapsedMs / 60000);
  const maxMin = ['1T', '2T'].includes(s.match.period) ? s.rules.halfDuration
               : ['1ET', '2ET'].includes(s.match.period) ? 15
               : 999;
  if (mins >= maxMin && !['FINISHED', 'PENALTIES', 'INTERVAL', 'PRE'].includes(s.match.period)) {
    pause();
  }
}

// --- Public API ---

function togglePause() {
  const s = state.get();

  if (s.match.isPaused) {
    if (s.match.period === 'PRE')      { advancePeriod('1T'); return; }
    if (s.match.period === 'INTERVAL') { advancePeriod('2T'); return; }
    state.set(prev => ({
      match: { ...prev.match, isPaused: false, startedAt: Date.now() }
    }));
  } else {
    pause();
  }
}

function pause() {
  const s = state.get();
  const now = Date.now();
  const newElapsed = s.match.startedAt
    ? s.match.elapsed + (now - s.match.startedAt)
    : s.match.elapsed;
  state.set(prev => ({
    match: { ...prev.match, isPaused: true, startedAt: null, elapsed: newElapsed }
  }));
}

function advancePeriod(target) {
  const s = state.get();
  const currentIdx = PERIODS.indexOf(s.match.period);
  const nextPeriod = target || PERIODS[Math.min(currentIdx + 1, PERIODS.length - 1)];

  _addEvent({
    type: 'PERIOD_START',
    teamId: 'none',
    description: `▶️ ${PERIOD_NAMES[nextPeriod]}`
  });

  state.set(prev => ({
    match: {
      ...prev.match,
      period: nextPeriod,
      elapsed: 0,
      startedAt: Date.now(),
      isPaused: false
    }
  }));
}

function getMinute() {
  return Math.floor(state.get().match.elapsed / 60000);
}

function getFormatted() {
  const s = state.get();
  const totalSec = Math.floor(s.match.elapsed / 1000);
  const m   = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return { minutes: m, seconds: sec, display: `${m}:${sec}`, minute: parseInt(m) };
}

let _addEvent = () => {};
function _setAddEvent(fn) { _addEvent = fn; }

startEngine();

export default { togglePause, pause, advancePeriod, getMinute, getFormatted, _setAddEvent };
