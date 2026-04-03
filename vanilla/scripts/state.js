// Gerenciamento de Estado do Narrador Pro
// Substitui o useState/useEffect do React

import { DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM, STORAGE_KEY, PERIODS } from './constants.js';

class MatchState {
  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaultRules = { halfDuration: 45, maxSubstitutions: 5, penaltyKicks: 5, summary: '' };
    
    const baseState = {
      homeTeam: { ...DEFAULT_HOME_TEAM, coach: '' },
      awayTeam: { ...DEFAULT_AWAY_TEAM, coach: '' },
      events: [],
      startTime: null,
      timerStartedAt: null,
      timeElapsed: 0,
      isPaused: true,
      period: 'PRE_MATCH',
      competition: '',
      matchDate: new Date().toISOString().split('T')[0],
      stadium: '',
      referee: '',
      observations: '',
      penaltyScore: { home: 0, away: 0 },
      penaltySequence: [],
      penaltyStarter: 'home',
      rules: defaultRules
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.state = {
          ...baseState,
          ...parsed,
          events: parsed.events || [],
          homeTeam: { ...baseState.homeTeam, ...parsed.homeTeam },
          awayTeam: { ...baseState.awayTeam, ...parsed.awayTeam },
          penaltyScore: parsed.penaltyScore || { home: 0, away: 0 },
          penaltySequence: parsed.penaltySequence || [],
          rules: parsed.rules || defaultRules
        };
      } catch (e) {
        console.error("Erro ao carregar cache", e);
        this.state = baseState;
      }
    } else {
      this.state = baseState;
    }

    this.history = [];
    this.resetSignal = 0;
    this.listeners = [];
    this.lastToastEventId = null;
  }

  // Adicionar listener para mudanças de estado
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notificar todos os listeners
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Salvar estado no localStorage
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.notify();
  }

  // Obter estado atual
  getState() {
    return this.state;
  }

  // Atualizar estado
  setState(updater) {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    this.save();
  }

  // Salvar no histórico para undo
  saveToHistory() {
    this.history = [...this.history.slice(-10), JSON.parse(JSON.stringify(this.state))];
  }  // Formatar tipo de evento
  formatEventType(type) {
    const map = {
      'GOAL': 'GOL', 'YELLOW_CARD': 'AMARELO', 'RED_CARD': 'VERMELHO', 'SUBSTITUTION': 'SUBSTITUIÇÃO',
      'SHOT': 'FINALIZAÇÃO', 'FOUL': 'FALTA', 'CORNER': 'ESCANTEIO', 'PENALTY': 'PÊNALTI',
      'INJURY': 'CONTUSÃO', 'PERIOD_START': 'INÍCIO', 'PERIOD_END': 'FIM', 'START_TIMER': 'CRONÔMETRO',
      'VAR': 'VAR', 'PENALTY_SHOOTOUT': 'PÊNALTIS', 'INVALID': 'INVÁLIDO', 'OFFSIDE': 'IMPEDIMENTO',
      'SAVE': 'DEFESA', 'WOODWORK': 'NA TRAVE', 'ANSWER': 'RESPOSTA', 'CORRECTION': 'CORREÇÃO',
      'CONCUSSION_SUBSTITUTION': 'SUBST. CONCUSSÃO', 'GK_8_SECONDS': 'INFRAÇÃO 8S',
      'SET_GOALKEEPER': 'NOVO GOLEIRO', 'GENERIC': 'EVENTO', 'SHOOTOUT_GOAL': 'PÊNALTI (CONVERTIDO)',
      'SHOOTOUT_MISS': 'PÊNALTI (PERDIDO)'
    };
    return map[type] || type;
  }

  // Toggle play/pause
  handlePlayPauseToggle() {
    if (this.state.isPaused && (this.state.period === 'PRE_MATCH' || this.state.period === 'INTERVAL')) {
      this.resetSignal++;
    }

    const now = Date.now();
    let newTimeElapsed = this.state.timeElapsed;

    if (!this.state.isPaused && this.state.timerStartedAt) {
      newTimeElapsed += (now - this.state.timerStartedAt);
    }

    const newIsPaused = !this.state.isPaused;
    const newTimerStartedAt = newIsPaused ? null : now;

    if (this.state.isPaused) {
      if (this.state.period === 'PRE_MATCH') {
        this.setState({
          period: '1T',
          isPaused: false,
          timerStartedAt: now,
          timeElapsed: 0,
          events: [{
            id: Math.random().toString(36).substr(2, 9),
            type: 'PERIOD_START',
            teamId: 'none',
            minute: 0,
            timestamp: now,
            description: 'Início de Jogo (1º Tempo)',
            isAnnulled: false
          }, ...(this.state.events || [])]
        });
        return;
      }
      if (this.state.period === 'INTERVAL') {
        this.setState({
          period: '2T',
          isPaused: false,
          timerStartedAt: now,
          timeElapsed: 0,
          events: [{
            id: Math.random().toString(36).substr(2, 9),
            type: 'PERIOD_START',
            teamId: 'none',
            minute: 0,
            timestamp: now,
            description: 'Recomeço de Jogo (2º Tempo)',
            isAnnulled: false
          }, ...(this.state.events || [])]
        });
        return;
      }
      if (this.state.period === 'PENALTIES') {
        // No cronômetro em disputa de pênaltis
        return;
      }
    }

    this.setState({
      isPaused: newIsPaused,
      timerStartedAt: newTimerStartedAt,
      timeElapsed: newTimeElapsed
    });
  }

  // Adicionar evento
  addEvent(eventData) {
    this.saveToHistory();
    const now = Date.now();
    const currentMs = this.state.timeElapsed + (this.state.timerStartedAt ? now - this.state.timerStartedAt : 0);
    const currentMin = Math.floor(currentMs / 60000);

    const teamKey = eventData.teamId === 'home' ? 'homeTeam' : 'awayTeam';
    const team = { ...this.state[teamKey] };

    let finalDescription = eventData.description;

    // Enriquecimento de descrição
    if (eventData.playerId) {
      const p = team.players.find(pl => pl.id === eventData.playerId);
      if (p) {
        const typeLabel = this.formatEventType(eventData.type);
        const icon = eventData.type === 'GOAL' ? '⚽' :
          eventData.type === 'YELLOW_CARD' ? '🟨' :
          eventData.type === 'RED_CARD' ? '🟥' :
          eventData.type === 'FOUL' ? '🛑' :
          eventData.type === 'OFFSIDE' ? '🚩' :
          eventData.type === 'SUBSTITUTION' ? '🔄' : '•';

        if (!finalDescription || finalDescription.toLowerCase().includes('registre') || finalDescription.includes('Lance rápido')) {
          finalDescription = `${icon} ${typeLabel}: ${p.number} - ${p.name} (${team.shortName})`;
        }
      }
    }

    const newEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: eventData.type,
      teamId: eventData.teamId,
      playerId: eventData.playerId,
      relatedPlayerId: eventData.relatedPlayerId,
      description: finalDescription,
      minute: this.state.period === 'PENALTIES' ? 0 : currentMin,
      timestamp: now,
      isAnnulled: false,
      metadata: eventData.metadata || {}
    };

    let newState = { ...this.state };
    let extraEvent = null;

    // Lógica Específica de Substituição
    if (newEvent.type === 'SUBSTITUTION' || newEvent.type === 'CONCUSSION_SUBSTITUTION') {
      let players = [...team.players];
      const playerOut = newEvent.playerId ? players.find(p => p.id === newEvent.playerId) : null;
      let playerIn = newEvent.relatedPlayerId ? players.find(p => p.id === newEvent.relatedPlayerId) : null;

      // Validação de limites
      const normalSubs = this.state.events.filter(e => e.teamId === eventData.teamId && e.type === 'SUBSTITUTION' && !e.isAnnulled).length;
      if (newEvent.type === 'SUBSTITUTION' && normalSubs >= this.state.rules.maxSubstitutions) {
        throw new Error(`Limite de substituições (${this.state.rules.maxSubstitutions}) atingido para o ${team.name}.`);
      }

      if (!playerIn && eventData.manualSub) {
        const randomOffset = (Math.random() - 0.5) * 5;
        const newPlayer = {
          id: Math.random().toString(36).substr(2, 9),
          name: eventData.manualSub.name,
          fullName: eventData.manualSub.name,
          number: eventData.manualSub.number,
          teamId: eventData.teamId,
          isStarter: false,
          position: 'MF',
          events: [],
          x: 50 + randomOffset,
          y: 50 + randomOffset
        };
        players.push(newPlayer);
        playerIn = newPlayer;
        newEvent.relatedPlayerId = newPlayer.id;
      }

      const subTypeLabel = newEvent.type === 'CONCUSSION_SUBSTITUTION' ? '(Concussão)' : '';
      if (playerOut && playerIn) {
        finalDescription = `🔄 Sai ${playerOut.name} (#${playerOut.number}) Entra ${playerIn.name} (#${playerIn.number}) ${subTypeLabel}`;
      }
      newEvent.description = finalDescription;

      const updatedPlayers = players.map(p => {
        if (p.id === newEvent.playerId) return { ...p, isStarter: false, hasLeftGame: true, events: [...p.events, newEvent] };
        if (p.id === newEvent.relatedPlayerId) {
          return {
            ...p,
            isStarter: true,
            events: [...p.events, newEvent],
            x: playerOut ? playerOut.x : p.x,
            y: playerOut ? playerOut.y : p.y
          };
        }
        return p;
      });
      newState[teamKey] = { ...team, players: updatedPlayers };

    } else if (newEvent.type === 'GK_8_SECONDS') {
      extraEvent = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'CORNER',
        teamId: newEvent.teamId === 'home' ? 'away' : 'home',
        description: `🚩 Escanteio (Infração 8s GK): ${team.name}`,
        minute: currentMin,
        timestamp: Date.now() + 1,
        isAnnulled: false
      };
      const updatePlayersInTeam = (t) => ({
        ...t,
        players: t.players.map(p => p.id === newEvent.playerId ? { ...p, events: [...p.events, newEvent] } : p)
      });
      newState[teamKey] = updatePlayersInTeam(team);

    } else if (newEvent.type === 'SET_GOALKEEPER') {
      const updatePlayers = team.players.map(p => {
        if (p.id === newEvent.playerId) return { ...p, position: 'GK', events: [...p.events, newEvent] };
        if (p.isStarter && p.position === 'GK') return { ...p, position: 'MF' };
        return p;
      });
      newState[teamKey] = { ...team, players: updatedPlayers };

    } else if (newEvent.type === 'SHOOTOUT_GOAL' || newEvent.type === 'SHOOTOUT_MISS') {
      const isGoal = newEvent.type === 'SHOOTOUT_GOAL';
      newState.penaltyScore = {
        ...this.state.penaltyScore,
        [newEvent.teamId]: this.state.penaltyScore[newEvent.teamId] + (isGoal ? 1 : 0)
      };
      newState.penaltySequence = [...(this.state.penaltySequence || []), {
        teamId: newEvent.teamId,
        playerId: newEvent.playerId,
        isGoal: isGoal
      }];

    } else if (newEvent.playerId) {
      const tKey = newEvent.teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const teamToUpdate = { ...this.state[tKey] };

      const updatedPlayers = teamToUpdate.players.map(p => {
        if (p.id === newEvent.playerId) {
          let updatedEvents = [...p.events, newEvent];
          let hasLeftGame = p.hasLeftGame;

          if (newEvent.type === 'YELLOW_CARD') {
            const yellowCards = p.events.filter(e => e.type === 'YELLOW_CARD' && !e.isAnnulled).length;
            if (yellowCards >= 1) {
              extraEvent = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'RED_CARD',
                teamId: newEvent.teamId,
                playerId: p.id,
                description: `🟥 Expulsão (2º Amarelo): ${p.name}`,
                minute: currentMin,
                timestamp: Date.now() + 1,
                isAnnulled: false
              };
              updatedEvents.push(extraEvent);
              hasLeftGame = true;
              return { ...p, events: updatedEvents, hasLeftGame: true, isStarter: false };
            }
          } else if (newEvent.type === 'RED_CARD') {
            return { ...p, events: updatedEvents, hasLeftGame: true, isStarter: false };
          }
          return { ...p, events: updatedEvents, hasLeftGame };
        }
        return p;
      });

      newState[tKey] = { ...teamToUpdate, players: updatedPlayers };

      if (extraEvent) {
        newState.events = [extraEvent, newEvent, ...(this.state.events || [])];
        this.setState(newState);
        return;
      }
    }

    newState.events = [newEvent, ...(this.state.events || [])];
    this.setState(newState);
  }

  // Anular evento (VAR)
  annulEvent(eventId) {
    this.saveToHistory();
    const events = this.state.events.map(e => {
      if (e.id === eventId) return { ...e, isAnnulled: !e.isAnnulled };
      return e;
    });
    this.setState({ events });
  }

  // Avançar período
  advancePeriod(target) {
    const currentIdx = PERIODS.indexOf(this.state.period);
    const nextPeriod = target || PERIODS[Math.min(currentIdx + 1, PERIODS.length - 1)];
    this.resetSignal++;

    const periodEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'PERIOD_START',
      teamId: 'none',
      minute: 0,
      timestamp: Date.now(),
      description: `▶ Início de Fase: ${this.formatPeriodName(nextPeriod)}`,
      isAnnulled: false
    };

    this.setState({
      period: nextPeriod,
      timeElapsed: 0,
      timerStartedAt: null,
      isPaused: true,
      events: [periodEvent, ...(this.state.events || [])]
    });
  }

  formatPeriodName(p) {
    const map = {
      'PRE_MATCH': 'Pré-Jogo', '1T': '1º Tempo', 'INTERVAL': 'Intervalo',
      '2T': '2º Tempo', '1ET': '1º Tempo Extra', '2ET': '2º Tempo Extra',
      'PENALTIES': 'Pênaltis', 'FINISHED': 'Encerrado'
    };
    return map[p] || p;
  }

  // Resetar partida
  handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
      homeTeam: { ...DEFAULT_HOME_TEAM, coach: '' },
      awayTeam: { ...DEFAULT_AWAY_TEAM, coach: '' },
      events: [],
      startTime: null,
      timerStartedAt: null,
      timeElapsed: 0,
      isPaused: true,
      period: 'PRE_MATCH',
      competition: '',
      matchDate: new Date().toISOString().split('T')[0],
      stadium: '',
      referee: '',
      observations: '',
      penaltyScore: { home: 0, away: 0 },
      penaltySequence: [],
      penaltyStarter: 'home',
      rules: { halfDuration: 45, maxSubstitutions: 5, penaltyKicks: 5, summary: '' }
    };
    this.resetSignal++;
    this.history = [];
    this.save();
  }

  // Finalizar partida
  handleFinalizeMatch() {
    this.setState({
      period: 'FINISHED',
      isPaused: true,
      events: [{
        id: Math.random().toString(36).substr(2, 9),
        type: 'PERIOD_END',
        teamId: 'none',
        minute: Math.floor((this.state.timeElapsed + (this.state.timerStartedAt ? Date.now() - this.state.timerStartedAt : 0)) / 60000),
        timestamp: Date.now(),
        description: '🏁 Fim de Jogo Finalizado',
        isAnnulled: false
      }, ...(this.state.events || [])]
    });
  }

  // Desfazer (Undo)
  undo() {
    if (this.history.length > 0) {
      const lastState = this.history.pop();
      this.state = lastState;
      this.save();
      return true;
    }
    return false;
  }
}

// Instância singleton
const matchState = new MatchState();

export default matchState;