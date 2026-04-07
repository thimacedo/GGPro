// js/state.js - Gerenciamento de Estado Reativo v5.0
// Foco: Imutabilidade, Consistência de Eventos, Match Controller completo.

import { DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM, STORAGE_KEY, FORMATIONS } from './constants.js';

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
      isPenaltyShootoutActive: false,
      rules: defaultRules,
      // Pré-jogo
      matchDetails: { competition: '', referee: '', stadium: '', date: '', time: '', observations: '' },
      // Regras extraídas por IA
      extractedRules: null,
      // Banner OCR
      bannerData: null,
      // Técnico/comissão
      homeCoach: '',
      awayCoach: '',
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

  // --- formatEventType completo ---
  formatEventType(type) {
    const map = {
      'GOAL': 'GOL',
      'YELLOW_CARD': 'CARTÃO AMARELO',
      'RED_CARD': 'CARTÃO VERMELHO',
      'SUBSTITUTION': 'SUBSTITUIÇÃO',
      'SHOT': 'FINALIZAÇÃO',
      'FOUL': 'FALTA',
      'CORNER': 'ESCANTEIO',
      'PENALTY': 'PÊNALTI',
      'PENALTY_SHOOTOUT': 'PÊNALTI (DISPUTA)',
      'INJURY': 'CONTUSÃO',
      'PERIOD_START': 'INÍCIO DE PERÍODO',
      'PERIOD_END': 'FIM DE PERÍODO',
      'START_TIMER': 'CRONÔMETRO INICIADO',
      'VAR': 'VAR',
      'OFFSIDE': 'IMPEDIMENTO',
      'SAVE': 'DEFESA',
      'WOODWORK': 'NA TRAVE',
      'ANSWER': 'RESPOSTA',
      'CORRECTION': 'CORREÇÃO',
      'CONCUSSION_SUBSTITUTION': 'SUBST. CONCUSSÃO',
      'GK_8_SECONDS': 'INFRAÇÃO 8s GOLEIRO',
      'SET_GOALKEEPER': 'NOVO GOLEIRO',
      'GENERIC': 'EVENTO',
      'INVALID': 'INVÁLIDO'
    };
    return map[type] || type;
  }

  // --- Helpers de jogador ---
  findPlayer(teamId, playerId) {
    const team = teamId === 'home' ? this.state.homeTeam : this.state.awayTeam;
    return team.players?.find(p => p.id === playerId) || null;
  }

  getTeamShortName(teamId) {
    const team = teamId === 'home' ? this.state.homeTeam : this.state.awayTeam;
    return team.shortName || (teamId === 'home' ? 'MAN' : 'VIS');
  }

  generateEventDescription(type, teamId, player, relatedPlayer) {
    const short = this.getTeamShortName(teamId);
    const icons = {
      'GOAL': '⚽', 'YELLOW_CARD': '🟨', 'RED_CARD': '🟥',
      'SUBSTITUTION': '🔄', 'CONCUSSION_SUBSTITUTION': '🤕',
      'SHOT': '🎯', 'FOUL': '🛑', 'CORNER': '🚩',
      'PENALTY': '💥', 'PENALTY_SHOOTOUT': '🥅',
      'SAVE': '🧤', 'WOODWORK': '🪵', 'OFFSIDE': '📏',
      'INJURY': '🏥', 'GK_8_SECONDS': '⏱️', 'SET_GOALKEEPER': '🧤',
      'VAR': '📺'
    };
    const icon = icons[type] || '•';

    let desc = `${icon} `;
    if (player) {
      desc += `#${player.number} ${player.name}`;
    }
    desc += ` [${short}]`;

    if (type === 'SUBSTITUTION' && relatedPlayer) {
      desc += ` → Sai #${relatedPlayer.number} ${relatedPlayer.name}`;
    }
    if (type === 'SET_GOALKEEPER' && player) {
      desc += ` agora é Goleiro`;
    }
    if (type === 'GK_8_SECONDS') {
      desc = `⏱️ Violação 8s - Goleiro [${short}] → Escanteio`;
    }

    return desc;
  }

  // --- Detectar goleiro em campo ---
  checkTeamHasGoalkeeper(teamKey) {
    const team = this.state[teamKey];
    return team.players?.some(p => p.isStarter && !p.hasLeftGame && p.position === 'GK') || false;
  }

  // --- Detectar conflito de cores ---
  detectColorConflict() {
    const home = this.state.homeTeam.color;
    const away = this.state.awayTeam.color;
    if (!home || !away) return false;

    const simpleDist = (c1, c2) => {
      const r1 = parseInt(c1.slice(1,3),16), g1 = parseInt(c1.slice(3,5),16), b1 = parseInt(c1.slice(5,7),16);
      const r2 = parseInt(c2.slice(1,3),16), g2 = parseInt(c2.slice(3,5),16), b2 = parseInt(c2.slice(5,7),16);
      return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
    };

    return simpleDist(home, away) < 60;
  }

  // --- handlePlayPauseToggle ---
  handlePlayPauseToggle() {
    const now = Date.now();
    let newTimeElapsed = this.state.timeElapsed;

    if (!this.state.isPaused && this.state.timerStartedAt) {
      newTimeElapsed += (now - this.state.timerStartedAt);
    }

    const newIsPaused = !this.state.isPaused;
    const newTimerStartedAt = newIsPaused ? null : now;

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

  // --- addEvent com lógica completa do match controller ---
  addEvent(eventData) {
    this.saveToHistory();
    const now = Date.now();
    const currentMs = this.state.timeElapsed + (this.state.timerStartedAt ? now - this.state.timerStartedAt : 0);
    const currentMin = Math.floor(currentMs / 60000);

    const teamKey = eventData.teamId === 'home' ? 'homeTeam' : 'awayTeam';
    const player = this.findPlayer(eventData.teamId, eventData.playerId);
    const relatedPlayer = eventData.relatedPlayerId
      ? this.findPlayer(eventData.teamId, eventData.relatedPlayerId)
      : (eventData.relatedTeamId ? this.findPlayer(eventData.relatedTeamId, eventData.relatedPlayerId) : null);

    // Auto-generar descrição rica se não fornecida
    let description = eventData.description;
    if (!description) {
      description = this.generateEventDescription(eventData.type, eventData.teamId, player, relatedPlayer);
    }

    // --- AUTO 2º AMARELO = VERMELHO ---
    let isAutoRed = false;
    if (eventData.type === 'YELLOW_CARD' && player) {
      const yellows = (this.state.events || []).filter(e =>
        e.teamId === eventData.teamId &&
        e.playerId === eventData.playerId &&
        e.type === 'YELLOW_CARD' &&
        !e.isAnnulled
      ).length;
      if (yellows >= 1) {
        isAutoRed = true;
      }
    }

    // --- GK 8 SEGUNDOS ---
    if (eventData.type === 'GK_8_SECONDS') {
      this.saveToHistory();
      const gkEvent = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        type: 'GK_8_SECONDS',
        teamId: eventData.teamId,
        minute: this.state.period === 'PENALTIES' ? 0 : currentMin,
        timestamp: now,
        description: `⏱️ Violação 8s - Goleiro [${this.getTeamShortName(eventData.teamId)}] → Escanteio adversário`,
        isAnnulled: false
      };
      // Auto criar escanteio para o adversário
      const oppTeam = eventData.teamId === 'home' ? 'away' : 'home';
      const cornerEvent = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        type: 'CORNER',
        teamId: oppTeam,
        minute: this.state.period === 'PENALTIES' ? 0 : currentMin,
        timestamp: now,
        description: `🚩 Escanteio concedido por infração 8s [${this.getTeamShortName(oppTeam)}]`,
        isAnnulled: false
      };
      this.setState({
        events: [gkEvent, cornerEvent, ...(this.state.events || [])]
      });
      return;
    }

    // --- SET_GOALKEEPER ---
    if (eventData.type === 'SET_GOALKEEPER' && eventData.playerId) {
      const players = [...(this.state[teamKey].players || [])];
      const updatedPlayers = players.map(p =>
        p.id === eventData.playerId ? { ...p, position: 'GK' } : p
      );
      this.setState({
        [teamKey]: { ...this.state[teamKey], players: updatedPlayers },
        events: [{
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          type: 'SET_GOALKEEPER',
          teamId: eventData.teamId,
          playerId: eventData.playerId,
          minute: this.state.period === 'PENALTIES' ? 0 : currentMin,
          timestamp: now,
          description,
          isAnnulled: false
        }, ...(this.state.events || [])]
      });

      // Verificar se time original ficou sem goleiro
      const oppKey = teamKey === 'homeTeam' ? 'awayTeam' : 'homeTeam';
      if (!this.checkTeamHasGoalkeeper(oppKey)) {
        // Time adversário perdeu o goleiro - avisar via evento
        this.addEvent({
          type: 'GENERIC',
          teamId: eventData.teamId === 'home' ? 'away' : 'home',
          description: `⚠️ Atenção: Sem goleiro em campo!`
        });
      }
      return;
    }

    // --- SUBSTITUIÇÃO MANUAL (com criação de jogador novo) ---
    if (eventData.type === 'SUBSTITUTION' && eventData.isManual && eventData.newPlayerName) {
      const newPlayer = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        name: eventData.newPlayerName,
        number: eventData.newPlayerNumber || 0,
        position: eventData.newPlayerPosition || 'MF',
        isStarter: true,
        hasLeftGame: false
      };

      const players = [...(this.state[teamKey].players || [])];
      const updatedPlayers = players.map(p =>
        p.id === eventData.playerId ? { ...p, isStarter: false, hasLeftGame: true } : p
      );
      updatedPlayers.push(newPlayer);

      this.setState({
        [teamKey]: { ...this.state[teamKey], players: updatedPlayers },
        events: [{
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          type: 'SUBSTITUTION',
          teamId: eventData.teamId,
          playerId: newPlayer.id,
          relatedPlayerId: eventData.playerId,
          minute: this.state.period === 'PENALTIES' ? 0 : currentMin,
          timestamp: now,
          description,
          isAnnulled: false
        }, ...(this.state.events || [])]
      });
      return;
    }

    // --- SUBSTITUIÇÃO NORMAL ---
    if (eventData.type === 'SUBSTITUTION' && !eventData.isManual) {
      const players = [...(this.state[teamKey].players || [])];
      const updatedPlayers = players.map(p => {
        if (p.id === eventData.playerId) return { ...p, isStarter: false, hasLeftGame: true };
        if (p.id === eventData.relatedPlayerId) return { ...p, isStarter: true };
        return p;
      });
      this.setState({
        [teamKey]: { ...this.state[teamKey], players: updatedPlayers }
      });
    }

    // --- GOAL ---
    let newScore = { ...this.state.score };
    if (eventData.type === 'GOAL') {
      if (eventData.teamId === 'home') newScore.home++;
      else if (eventData.teamId === 'away') newScore.away++;
    }

    // --- Criar evento ---
    const newEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: eventData.type || 'GENERIC',
      teamId: eventData.teamId || 'none',
      playerId: eventData.playerId,
      relatedPlayerId: eventData.relatedPlayerId,
      description,
      minute: this.state.period === 'PENALTIES' ? 0 : currentMin,
      timestamp: now,
      isAnnulled: false
    };

    const newState = {
      ...this.state,
      events: [newEvent, ...(this.state.events || [])],
      score: newScore
    };

    this.setState(newState);

    // --- AUTO RED CARD após evento amarelo ---
    if (isAutoRed) {
      setTimeout(() => {
        this.addEvent({
          type: 'RED_CARD',
          teamId: eventData.teamId,
          playerId: eventData.playerId,
          description: `🟥 #${player.number} ${player.name} [${this.getTeamShortName(eventData.teamId)}] - 2º amarelo → Vermelho`
        });
      }, 100);
    }

    // --- GK WARNING ---
    if (eventData.type === 'SUBSTITUTION' || eventData.type === 'RED_CARD') {
      if (!this.checkTeamHasGoalkeeper(teamKey)) {
        setTimeout(() => {
          this.addEvent({
            type: 'GENERIC',
            teamId: eventData.teamId,
            description: `⚠️ Sem goleiro em campo! [${this.getTeamShortName(eventData.teamId)}]`
          });
        }, 200);
      }
    }
  }

  // --- ANULAR EVENTO ---
  annulEvent(eventId) {
    this.saveToHistory();
    const events = this.state.events.map(e =>
      e.id === eventId ? { ...e, isAnnulled: !e.isAnnulled } : e
    );

    // Se for gol anulado, corrigir placar
    const annulledEvent = events.find(e => e.id === eventId);
    let newScore = { ...this.state.score };
    if (annulledEvent && annulledEvent.type === 'GOAL' && !annulledEvent.isAnnulled) {
      if (annulledEvent.teamId === 'home') newScore.home = Math.max(0, newScore.home - 1);
      else if (annulledEvent.teamId === 'away') newScore.away = Math.max(0, newScore.away - 1);
    }

    const varEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: 'VAR',
      teamId: 'none',
      minute: Math.floor(this.state.timeElapsed / 60000),
      timestamp: Date.now(),
      description: `📺 VAR: Decisão Revisada`,
      isAnnulled: false
    };

    this.setState({ events: [varEvent, ...events], score: newScore });
  }

  // --- AVANÇAR PERÍODO ---
  advancePeriod(target) {
    const nextPeriod = target || this.getNextPeriod(this.state.period);

    const periodEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
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

  // --- PÊNALTIS ---
  registerPenalty(teamId, scored) {
    this.saveToHistory();
    const teamKey = teamId === 'home' ? 'home' : 'away';
    const oppKey = teamId === 'home' ? 'away' : 'home';

    let newPenaltyScore = { ...this.state.penaltyScore };
    if (scored) newPenaltyScore[teamKey]++;

    const shooter = this.state.penaltySequence?.length || 0;
    const penaltyShot = {
      team: teamKey,
      shooter,
      scored,
      number: this.state.penaltySequence?.filter(p => p.team === teamKey).length + 1
    };

    const newPenaltySequence = [...(this.state.penaltySequence || []), penaltyShot];

    const desc = scored
      ? `🥅 Pênnti convertido [${this.getTeamShortName(teamId)}]`
      : `🥅 Pênnti perdido [${this.getTeamShortName(teamId)}]`;

    const event = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: 'PENALTY_SHOOTOUT',
      teamId: teamId,
      minute: 0,
      timestamp: Date.now(),
      description: desc,
      isAnnulled: false
    };

    // Verificar se disputa acabou
    const homePenalties = newPenaltySequence.filter(p => p.team === 'home');
    const awayPenalties = newPenaltySequence.filter(p => p.team === 'away');
    const isFinished = this._checkPenaltyShootoutFinished(homePenalties, awayPenalties);

    this.setState({
      penaltyScore: newPenaltyScore,
      penaltySequence: newPenaltySequence,
      events: [event, ...(this.state.events || [])],
      isPenaltyShootoutActive: !isFinished
    });
  }

  _checkPenaltyShootoutFinished(homeShots, awayShots) {
    const maxKicks = this.state.rules?.penaltyKicks || 5;

    // Se um time já não pode alcançar o outro
    const homeScore = homeShots.filter(p => p.scored).length;
    const awayScore = awayShots.filter(p => p.scored).length;
    const homeRemaining = maxKicks - homeShots.length;
    const awayRemaining = maxKicks - awayShots.length;

    if (homeRemaining < 0 || awayRemaining < 0) return true;
    if (homeScore > awayScore + awayRemaining) return true;
    if (awayScore > homeScore + homeRemaining) return true;

    // Se completaram todas as cobranças
    if (homeShots.length >= maxKicks && awayShots.length >= maxKicks) {
      return homeScore !== awayScore; // empate = continua alternando
    }

    // Morte súbita: se ambos cobraram o mesmo número e há diferença
    if (homeShots.length === awayShots.length && homeShots.length > maxKicks) {
      return homeScore !== awayScore;
    }

    return false;
  }

  // --- ENCERRAR JOGO ---
  handleFinalizeMatch() {
    this.saveToHistory();
    const endEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: 'PERIOD_END',
      teamId: 'none',
      minute: 0,
      timestamp: Date.now(),
      description: '🏁 Fim de Jogo',
      isAnnulled: false
    };
    this.setState({
      period: 'FINISHED',
      isPaused: true,
      timerStartedAt: null,
      events: [endEvent, ...(this.state.events || [])]
    });
  }

  // --- RESET SEM RELOAD ---
  handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
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
      isPenaltyShootoutActive: false,
      rules: { halfDuration: 45, maxSubstitutions: 5, penaltyKicks: 5 },
      matchDetails: { competition: '', referee: '', stadium: '', date: '', time: '', observations: '' },
      extractedRules: null,
      bannerData: null,
      homeCoach: '',
      awayCoach: '',
    };
    this.history = [];
    this.save();
  }

  // --- UNDO ---
  undo() {
    if (this.history.length > 0) {
      this.state = this.history.pop();
      this.save();
      return true;
    }
    return false;
  }

  // --- SALVAR DETALHES DO JOGO ---
  saveMatchDetails(details) {
    this.setState({ matchDetails: { ...this.state.matchDetails, ...details } });
  }

  // --- SALVAR TÉCNICO ---
  saveCoach(teamId, coachName) {
    const key = teamId === 'home' ? 'homeCoach' : 'awayCoach';
    this.setState({ [key]: coachName });
  }

  // --- EXPORT JSON ---
  exportMatchData() {
    return JSON.stringify(this.state, null, 2);
  }

  // --- RELATÓRIO ESTRUTURADO ---
  generateStructuredReport() {
    const state = this.state;
    const events = (state.events || []).filter(e => !e.isAnnulled);

    const goals = events.filter(e => e.type === 'GOAL');
    const yellows = events.filter(e => e.type === 'YELLOW_CARD');
    const reds = events.filter(e => e.type === 'RED_CARD');
    const subs = events.filter(e => e.type === 'SUBSTITUTION');
    const others = events.filter(e => !['GOAL','YELLOW_CARD','RED_CARD','SUBSTITUTION','PERIOD_START','PERIOD_END','GENERIC'].includes(e.type));

    let report = `⚽ RELATÓRIO DA PARTIDA\n`;
    report += `${'═'.repeat(40)}\n\n`;
    report += `🏟 ${state.matchDetails.competition || 'Competição não informada'}\n`;
    report += `📍 ${state.matchDetails.stadium || 'Estádio não informado'}\n`;
    report += `📅 ${state.matchDetails.date || new Date().toLocaleDateString('pt-BR')}\n\n`;

    report += `${state.homeTeam.name.toUpperCase()} ${state.score.home} x ${state.score.away} ${state.awayTeam.name.toUpperCase()}\n\n`;

    if (goals.length > 0) {
      report += `⚽ GOLS:\n`;
      goals.forEach(g => { report += `  ${g.minute}' - ${g.description}\n`; });
      report += `\n`;
    }

    if (yellows.length > 0) {
      report += `🟨 CARTÕES AMARELOS:\n`;
      yellows.forEach(c => { report += `  ${c.minute}' - ${c.description}\n`; });
      report += `\n`;
    }

    if (reds.length > 0) {
      report += `🟥 CARTÕES VERMELHOS:\n`;
      reds.forEach(c => { report += `  ${c.minute}' - ${c.description}\n`; });
      report += `\n`;
    }

    if (subs.length > 0) {
      report += `🔄 SUBSTITUIÇÕES:\n`;
      subs.forEach(s => { report += `  ${s.minute}' - ${s.description}\n`; });
      report += `\n`;
    }

    if (others.length > 0) {
      report += `📋 OUTROS EVENTOS:\n`;
      others.forEach(o => { report += `  ${o.minute}' - ${o.description}\n`; });
    }

    return report;
  }
}

const matchState = new MatchState();
export default matchState;
