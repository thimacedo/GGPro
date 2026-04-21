// js/state.js - v7.1 STABLE CORE
// Gerenciador de Estado Centralizado com Suporte a Testes Unitários

import { DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM, STORAGE_KEY, FORMATIONS } from './constants.js';

class MatchState {
  constructor() {
    this.listeners = [];
    this.history = [];
    this.init();
  }

  init() {
    let saved = null;
    try {
      if (typeof localStorage !== 'undefined') {
        saved = localStorage.getItem(STORAGE_KEY);
      }
    } catch (e) { console.warn('Acesso ao localStorage negado.'); }

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
      isPenaltyShootoutActive: false,
      possession: { home: 50, away: 50 },
      lastAction: null,
      matchDetails: { competition: '', referee: '', stadium: '', date: '', time: '', observations: '' },
      rules: { ...defaultRules },
      matchHistory: []
    };

    if (saved) {
      try {
        this.state = { ...baseState, ...JSON.parse(saved) };
      } catch (e) {
        this.state = baseState;
      }
    } else {
      this.state = baseState;
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  notify() {
    this.listeners.forEach(listener => {
      try { listener(this.state); } catch(e) { console.error('Erro no listener:', e); }
    });
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch (e) {}
    this.notify();
  }

  getState() { return this.state; }

  setState(updater) {
    this.saveToHistory();
    const nextState = typeof updater === 'function' ? updater(this.state) : { ...this.state, ...updater };
    this.state = nextState;
    this.save();
  }

  saveToHistory() {
    this.history.push(JSON.stringify(this.state));
    if (this.history.length > 50) this.history.shift();
  }

  handleUndo() {
    if (this.history.length === 0) return;
    const last = this.history.pop();
    this.state = JSON.parse(last);
    this.save();
  }

  // --- ENGINE DE EVENTOS ---
  addEvent(eventData) {
    this.saveToHistory();
    
    const event = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      minute: Math.floor(this.state.timeElapsed / 60000),
      isAnnulled: false,
      ...eventData
    };

    const newEvents = [event, ...(this.state.events || [])];
    let newScore = { ...this.state.score };

    if (event.type === 'GOAL') {
      if (event.teamId === 'home') newScore.home++;
      else if (event.teamId === 'away') newScore.away++;
    }

    this.state = { ...this.state, events: newEvents, score: newScore, lastAction: event.type };
    
    // Processar regras automáticas sem setTimeout (para testabilidade)
    this.processAutoRules(event);
    
    this.save();
  }

  processAutoRules(event) {
    // 1. Regra de Expulsão por 2º Amarelo
    if (event.type === 'YELLOW_CARD' && event.playerId) {
      const playerEvents = this.state.events.filter(e => e.playerId === event.playerId && e.type === 'YELLOW_CARD' && !e.isAnnulled);
      if (playerEvents.length === 2) {
        this.addEvent({
          type: 'RED_CARD',
          teamId: event.teamId,
          playerId: event.playerId,
          description: `🟥 Expulsão automática (2º Amarelo)`
        });
      }
    }
  }

  // --- AUXILIARES ---
  getTeamShortName(teamId) {
    if (teamId === 'home') return this.state.homeTeam.shortName || 'CAS';
    if (teamId === 'away') return this.state.awayTeam.shortName || 'VIS';
    return '';
  }

  findPlayer(playerId) {
    const allPlayers = [...(this.state.homeTeam.players || []), ...(this.state.awayTeam.players || [])];
    return allPlayers.find(p => p.id === playerId);
  }

  // --- PERÍODOS ---
  advancePeriod(target) {
    const nextPeriod = target || this.getNextSequencePeriod(this.state.period);
    const event = {
      type: 'PERIOD_START',
      teamId: 'none',
      description: this.formatPeriodName(nextPeriod)
    };
    this.setState({
      period: nextPeriod,
      timeElapsed: 0,
      timerStartedAt: this.state.isPaused ? null : Date.now()
    });
    this.addEvent(event);
  }

  getNextSequencePeriod(current) {
    const sequence = ['PRE_MATCH', '1T', 'INTERVAL', '2T', '1ET', '2ET', 'PENALTIES', 'FINISHED'];
    const idx = sequence.indexOf(current);
    return sequence[Math.min(idx + 1, sequence.length - 1)];
  }

  formatPeriodName(p) {
    const map = {
      'PRE_MATCH': 'Pré-Jogo', '1T': '1º Tempo', 'INTERVAL': 'Intervalo',
      '2T': '2º Tempo', '1ET': '1ª Prorrogação', '2ET': '2ª Prorrogação',
      'PENALTIES': 'Pênaltis', 'FINISHED': 'Finalizado'
    };
    return map[p] || p;
  }

  handleReset() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.init();
    this.notify();
  }
}

const matchState = new MatchState();
export default matchState;
