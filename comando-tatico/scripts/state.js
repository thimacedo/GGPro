/**
 * state.js — Core: State Reativo Redux-like
 * Persistência em localStorage, undo stack (30 itens), subscribers
 */

import { FORMATIONS } from './constants.js';

const STORAGE_KEY = 'comando_tatico_v1';
const MAX_HISTORY = 30;

function generateSquad(teamId) {
  const roster = [
    { n: 1,  role: 'GOL', pos: 'GK'  },
    { n: 2,  role: 'LE',  pos: 'RB'  },
    { n: 3,  role: 'ZAG', pos: 'CB'  },
    { n: 4,  role: 'ZAG', pos: 'CB'  },
    { n: 5,  role: 'LD',  pos: 'LB'  },
    { n: 6,  role: 'VOL', pos: 'CDM' },
    { n: 7,  role: 'MEI', pos: 'CM'  },
    { n: 8,  role: 'MEI', pos: 'CM'  },
    { n: 9,  role: 'VOL', pos: 'CDM' },
    { n: 10, role: 'ATA', pos: 'ST'  },
    { n: 11, role: 'ATA', pos: 'ST'  }
  ];

  const formation = FORMATIONS['4-4-2'].positions;
  return roster.map((p, i) => ({
    id:       `${teamId}_${p.n}`,
    number:   p.n,
    name:     `${p.role} ${p.n}`,
    pos:      p.pos,
    role:     p.role,
    isStarter: true,
    hasLeft:  false,
    x:        formation[i]?.x ?? 50,
    y:        formation[i]?.y ?? 50,
    stats:    { goals: 0, assists: 0, yellows: 0, reds: 0, fouls: 0, shots: 0, saves: 0 }
  }));
}

function defaults() {
  return {
    homeTeam: {
      name: 'Time Casa', short: 'CAS', color: '#3b82f6',
      players: generateSquad('home'), formation: '4-4-2'
    },
    awayTeam: {
      name: 'Time Visitante', short: 'VIS', color: '#ef4444',
      players: generateSquad('away'), formation: '4-4-2'
    },
    match: {
      period:      'PRE',
      score:       { home: 0, away: 0 },
      penaltyScore:{ home: 0, away: 0 },
      penaltySequence: [],
      events:      [],
      elapsed:     0,
      startedAt:   null,
      isPaused:    true
    },
    tactic: {
      instruction: null,
      marking:     'zonal',
      pressing:    50
    },
    rules: {
      halfDuration: 45,
      maxSubs:      5,
      penaltyKicks: 5
    },
    details: {
      competition: '', referee: '', stadium: '', date: '', observations: ''
    }
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

class MatchState {
  constructor() {
    this._state   = load();
    this._history = [];
    this._listeners = [];
  }

  // --- Public API ---

  get()          { return this._state; }
  subscribe(fn)  { this._listeners.push(fn); return () => { this._listeners = this._listeners.filter(l => l !== fn); }; }

  set(updater) {
    this._state = typeof updater === 'function'
      ? updater(this._state)
      : { ...this._state, ...updater };
    this._persist();
  }

  pushHistory() {
    this._history.push(structuredClone(this._state));
    if (this._history.length > MAX_HISTORY) this._history.shift();
  }

  undo() {
    if (!this._history.length) return false;
    this._state = this._history.pop();
    this._persist();
    return true;
  }

  reset() {
    this._state = defaults();
    this._history = [];
    this._persist();
  }

  exportJSON() {
    return JSON.stringify(this._state, null, 2);
  }

  // --- Internals ---

  _persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    this._listeners.forEach(fn => fn(this._state));
  }
}

const state = new MatchState();
export default state;
