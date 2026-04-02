import { INITIAL_MATCH_STATE } from './constants.js';

class StateManager {
  constructor(initialState) {
    this.state = JSON.parse(JSON.stringify(initialState));
    this.listeners = [];
    this.history = []; // Pilha de estados para desfazer/VAR
    this._loadBackup();
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    if (typeof updates === 'function') {
      this.state = updates(this.state);
    } else {
      this.state = { ...this.state, ...updates };
    }
    this._persist();
    this._notify();
  }

  saveToHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    if (this.history.length > 20) this.history.shift();
  }

  undo() {
    if (this.history.length > 0) {
      this.state = this.history.pop();
      this._persist();
      this._notify();
      return true;
    }
    return false;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    // Execute immediately to set initial state in component
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  _notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  _persist() {
    localStorage.setItem('MATCH_STATE_BACKUP', JSON.stringify(this.state));
  }

  _loadBackup() {
    const backup = localStorage.getItem('MATCH_STATE_BACKUP');
    if (backup) {
      try {
        const loaded = JSON.parse(backup);
        this.state = { ...this.state, ...loaded };
      } catch (e) {
        console.error('Failed to load backup', e);
      }
    }
  }

  reset() {
    localStorage.removeItem('MATCH_STATE_BACKUP');
    this.history = [];
    this.state = JSON.parse(JSON.stringify(INITIAL_MATCH_STATE));
    this._notify();
  }
}

export const store = new StateManager(INITIAL_MATCH_STATE);
export default store;
