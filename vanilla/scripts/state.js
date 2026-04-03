// state.js - Gerenciamento de Estado Reativo (Rebranded)
// Foco: Imutabilidade, Tipagem Estrita e Consistência de Eventos.

import { DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM, STORAGE_KEY, PERIODS } from './constants.js';

class MatchState {
  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaultRules = { halfDuration: 45, maxSubstitutions: 5, penaltyKicks: 5 };
    
    const baseState = {
      homeTeam: { ...DEFAULT_HOME_TEAM },
      awayTeam: { ...DEFAULT_AWAY_TEAM },
      events: [],
      timerStartedAt: null,
      timeElapsed: 0,
      isPaused: true,
      period: 'PRE_MATCH',
      score: { home: 0, away: 0 },
      penaltyScore: { home: 0, away: 0 },
      penaltySequence: [],
      penaltyStarter: 'home',
      rules: defaultRules
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.state = { ...baseState, ...parsed };
      } catch (e) {
        console.error("Erro ao carregar estado salvo", e);
        this.state = baseState;
      }
    } else {
      this.state = baseState;
    }

    this.history = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.notify();
  }

  getState() { return this.state; }

  setState(updater) {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    this.save();
  }

  saveToHistory() {
    this.history = [...this.history.slice(-30), JSON.parse(JSON.stringify(this.state))];
  }

  formatEventType(type) {
    const map = {
      'GOAL': 'GOL', 'YELLOW_CARD': 'AMARELO', 'RED_CARD': 'VERMELHO', 
      'SUBSTITUTION': 'SUBSTITUIÇÃO', 'SHOT': 'FINALIZAÇÃO', 'FOUL': 'FALTA',
      'PERIOD_START': 'INÍCIO', 'PERIOD_END': 'FIM', 'VAR': 'VAR', 'OFFSIDE': 'IMPEDIMENTO',
      'GENERIC': 'EVENTO'
    };
    return map[type] || type;
  }

  handlePlayPauseToggle() {
    const now = Date.now();
    let newTimeElapsed = this.state.timeElapsed;

    if (!this.state.isPaused && this.state.timerStartedAt) {
      newTimeElapsed += (now - this.state.timerStartedAt);
    }

    const newIsPaused = !this.state.isPaused;
    const newTimerStartedAt = newIsPaused ? null : now;

    // Transição automática de estados ao dar play
    if (this.state.isPaused) {
      if (this.state.period === 'PRE_MATCH') {
        this.advancePeriod('1T');
        return;
      }
      if (this.state.period === 'INTERVAL') {
        this.advancePeriod('2T');
        return;
      }
    }

    this.setState({
      isPaused: newIsPaused,
      timerStartedAt: newTimerStartedAt,
      timeElapsed: newTimeElapsed
    });
  }

  addEvent(eventData) {
    this.saveToHistory();
    const now = Date.now();
    const currentMs = this.state.timeElapsed + (this.state.timerStartedAt ? now - this.state.timerStartedAt : 0);
    const currentMin = Math.floor(currentMs / 60000);

    const newEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: eventData.type || 'GENERIC',
      teamId: eventData.teamId || 'none',
      playerId: eventData.playerId,
      description: eventData.description,
      minute: this.state.period === 'PENALTIES' ? 0 : currentMin,
      timestamp: now,
      isAnnulled: false
    };

    let newState = { ...this.state };
    
    // Lógica de Goleiro em Substituições e Cartões
    if (newEvent.type === 'SUBSTITUTION') {
      const teamKey = newEvent.teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const players = [...this.state[teamKey].players];
      const updatedPlayers = players.map(p => {
        if (p.id === newEvent.playerId) return { ...p, isStarter: false, hasLeftGame: true };
        if (p.id === eventData.relatedPlayerId) return { ...p, isStarter: true };
        return p;
      });
      newState[teamKey] = { ...this.state[teamKey], players: updatedPlayers };
    }

    newState.events = [newEvent, ...(this.state.events || [])];
    this.setState(newState);
  }

  annulEvent(eventId) {
    this.saveToHistory();
    const events = this.state.events.map(e => 
      e.id === eventId ? { ...e, isAnnulled: !e.isAnnulled } : e
    );

    const varEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'VAR',
      teamId: 'none',
      minute: Math.floor(this.state.timeElapsed / 60000),
      timestamp: Date.now(),
      description: `📺 VAR: Decisão Revisada`,
      isAnnulled: false
    };

    this.setState({ events: [varEvent, ...events] });
  }

  advancePeriod(target) {
    const nextPeriod = target || this.getNextPeriod(this.state.period);
    
    const periodEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'PERIOD_START',
      teamId: 'none',
      minute: 0,
      timestamp: Date.now(),
      description: this.formatPeriodName(nextPeriod),
      isAnnulled: false
    };

    this.setState({
      period: nextPeriod,
      timeElapsed: 0,
      timerStartedAt: this.state.isPaused ? null : Date.now(),
      events: [periodEvent, ...(this.state.events || [])]
    });
  }

  getNextPeriod(current) {
    const sequence = ['PRE_MATCH', '1T', 'INTERVAL', '2T', '1ET', '2ET', 'PENALTIES', 'FINISHED'];
    const idx = sequence.indexOf(current);
    return sequence[Math.min(idx + 1, sequence.length - 1)];
  }

  formatPeriodName(p) {
    const map = {
      'PRE_MATCH': 'Pré-Jogo', '1T': 'Início 1º Tempo', 'INTERVAL': 'Intervalo',
      '2T': 'Recomeço 2º Tempo', '1ET': 'Início Prorrogação', '2ET': 'Fim Prorrogação',
      'PENALTIES': 'Disputa de Pênaltis', 'FINISHED': 'Fim de Jogo'
    };
    return map[p] || p;
  }

  handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  undo() {
    if (this.history.length > 0) {
      this.state = this.history.pop();
      this.save();
      return true;
    }
    return false;
  }
}

const matchState = new MatchState();
export default matchState;