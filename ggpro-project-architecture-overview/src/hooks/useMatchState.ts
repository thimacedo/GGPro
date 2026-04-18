import { useState, useCallback, useRef, useEffect } from 'react';
import type { MatchState, MatchEvent, Player, Team, Period, EventType, PenaltyKick, SavedMatch, QuickNote } from '../types';

const STORAGE_KEY = 'narrador_pro_v6_state';
const HISTORY_KEY = 'narrador_pro_v6_history';

const createDefaultState = (): MatchState => ({
  homeTeam: {
    id: 'home', name: 'Time Casa', shortName: 'CAS',
    color: '#3b82f6', secondaryColor: '#1e40af',
    players: [], formation: '4-4-2',
  },
  awayTeam: {
    id: 'away', name: 'Time Visitante', shortName: 'VIS',
    color: '#ef4444', secondaryColor: '#991b1b',
    players: [], formation: '4-4-2',
  },
  events: [], timerStartedAt: null, timeElapsed: 0, isPaused: true,
  period: 'PRE_MATCH', score: { home: 0, away: 0 },
  penaltyScore: { home: 0, away: 0 }, penaltySequence: [], penaltyStarter: 'home',
  isPenaltyShootoutActive: false,
  rules: { halfDuration: 45, maxSubstitutions: 5, penaltyKicks: 5 },
  matchDetails: { competition: '', referee: '', stadium: '', date: '', time: '', observations: '' },
  homeCoach: '', awayCoach: '', possession: [], addedTime: { '1T': 0, '2T': 0 },
  quickNotes: [],
  highlightedPlayers: [],
});

const loadState = (): MatchState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...createDefaultState(), ...JSON.parse(saved) };
  } catch (e) { console.error('Error loading state:', e); }
  return createDefaultState();
};

const saveState = (state: MatchState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error('Error saving state:', e); }
};

const genId = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const EVENT_ICONS: Record<string, string> = {
  GOAL: '⚽', YELLOW_CARD: '🟨', RED_CARD: '🟥', SUBSTITUTION: '🔄',
  SHOT: '🎯', FOUL: '🛑', CORNER: '🚩', PENALTY: '💥',
  PENALTY_SHOOTOUT: '🥅', SAVE: '🧤', WOODWORK: '🪵', OFFSIDE: '📏',
  INJURY: '🏥', VAR: '📺', GK_8_SECONDS: '⏱️', SET_GOALKEEPER: '🧤',
  VAR_GOAL_CONFIRMED: '✅', VAR_GOAL_ANNULLED: '❌', VAR_PENALTY_AWARDED: '💥',
  VAR_PENALTY_CANCELLED: '❌', VAR_RED_AWARDED: '🟥', VAR_RED_CANCELLED: '✅',
  VAR_IDENTITY_CORRECTION: '🔄',
};

const EVENT_LABELS: Record<string, string> = {
  GOAL: 'GOL', YELLOW_CARD: 'AMARELO', RED_CARD: 'VERMELHO',
  SUBSTITUTION: 'SUBSTITUIÇÃO', SHOT: 'FINALIZAÇÃO', FOUL: 'FALTA',
  CORNER: 'ESCANTEIO', PENALTY: 'PÊNALTI', PENALTY_SHOOTOUT: 'PÊNALTIS',
  INJURY: 'CONTUSÃO', OFFSIDE: 'IMPEDIMENTO', SAVE: 'DEFESA',
  WOODWORK: 'NA TRAVE', VAR: 'VAR', CONCUSSION_SUBSTITUTION: 'SUBST. CONCUSSÃO',
  GK_8_SECONDS: 'INFRAÇÃO 8S', SET_GOALKEEPER: 'NOVO GOLEIRO', GENERIC: 'EVENTO',
  VAR_GOAL_CONFIRMED: 'VAR: GOL CONFIRMADO', VAR_GOAL_ANNULLED: 'VAR: GOL ANULADO',
  VAR_PENALTY_AWARDED: 'VAR: PÊNALTI', VAR_PENALTY_CANCELLED: 'VAR: PÊNALTI CANCELADO',
  VAR_RED_AWARDED: 'VAR: VERMELHO', VAR_RED_CANCELLED: 'VAR: VERMELHO CANCELADO',
  VAR_IDENTITY_CORRECTION: 'VAR: IDENTIDADE CORRIGIDA',
};

export function useMatchState() {
  const [state, setState] = useState<MatchState>(loadState);
  const historyRef = useRef<MatchState[]>([]);

  useEffect(() => { saveState(state); }, [state]);

  const saveToHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-30), JSON.parse(JSON.stringify(state))];
  }, [state]);

  const undo = useCallback(() => {
    if (historyRef.current.length > 0) {
      const prev = historyRef.current[historyRef.current.length - 1];
      historyRef.current = historyRef.current.slice(0, -1);
      setState(prev);
    }
  }, []);

  const updateState = useCallback((updater: Partial<MatchState> | ((prev: MatchState) => MatchState)) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  const updateCoach = useCallback((side: 'home' | 'away', name: string) => {
    setState(prev => side === 'home' ? { ...prev, homeCoach: name } : { ...prev, awayCoach: name });
  }, []);

  const getCurrentMinute = useCallback((): number => {
    const now = Date.now();
    const currentMs = state.timeElapsed + (state.timerStartedAt ? now - state.timerStartedAt : 0);
    return Math.floor(currentMs / 60000);
  }, [state.timeElapsed, state.timerStartedAt]);

  const adjustTimer = useCallback((deltaSeconds: number) => {
    setState(prev => ({
      ...prev,
      timeElapsed: Math.max(0, prev.timeElapsed + deltaSeconds * 1000),
    }));
  }, []);

  const togglePlayPause = useCallback(() => {
    setState(prev => {
      const now = Date.now();
      let newTimeElapsed = prev.timeElapsed;
      if (!prev.isPaused && prev.timerStartedAt) {
        newTimeElapsed += now - prev.timerStartedAt;
      }
      const newIsPaused = !prev.isPaused;
      const newTimerStartedAt = newIsPaused ? null : now;

      let newPeriod = prev.period;
      if (prev.isPaused) {
        if (prev.period === 'PRE_MATCH') {
          newPeriod = '1T';
          const event: MatchEvent = {
            id: genId(), type: 'PERIOD_START', teamId: null,
            minute: 0, timestamp: now, description: '🏟️ Início do 1º Tempo', isAnnulled: false, period: '1T',
          };
          return { ...prev, period: newPeriod, isPaused: false, timerStartedAt: now, timeElapsed: 0, events: [...prev.events, event], possession: [{ teamId: 'home', timestamp: now }] };
        }
        if (prev.period === 'INTERVAL') {
          newPeriod = '2T';
          const event: MatchEvent = {
            id: genId(), type: 'PERIOD_START', teamId: null,
            minute: 45, timestamp: now, description: '🏟️ Início do 2º Tempo', isAnnulled: false, period: '2T',
          };
          return { ...prev, period: newPeriod, isPaused: false, timerStartedAt: now, timeElapsed: 0, events: [...prev.events, event] };
        }
      }

      return { ...prev, isPaused: newIsPaused, timerStartedAt: newTimerStartedAt, timeElapsed: newTimeElapsed, period: newPeriod };
    });
  }, []);

  const advancePeriod = useCallback((targetPeriod?: Period) => {
    setState(prev => {
      const now = Date.now();
      let newTimeElapsed = prev.timeElapsed;
      if (!prev.isPaused && prev.timerStartedAt) {
        newTimeElapsed += now - prev.timerStartedAt;
      }

      const periodOrder: Period[] = ['PRE_MATCH', '1T', 'INTERVAL', '2T', 'PENALTIES', 'FINISHED'];
      const currentIdx = periodOrder.indexOf(prev.period);
      const nextPeriod = targetPeriod ?? periodOrder[currentIdx + 1] ?? 'FINISHED';

      const periodNames: Record<string, string> = {
        '1T': '1º Tempo', 'INTERVAL': 'Intervalo', '2T': '2º Tempo',
        'PENALTIES': 'Pênaltis', 'FINISHED': 'Fim de Jogo',
      };

      const event: MatchEvent = {
        id: genId(), type: 'PERIOD_END', teamId: null,
        minute: Math.floor(newTimeElapsed / 60000), timestamp: now,
        description: `🏁 Fim do ${periodNames[prev.period] || prev.period}`,
        isAnnulled: false, period: prev.period,
      };

      const startEvent: MatchEvent | null = nextPeriod === '2T' || nextPeriod === '1T' ? {
        id: genId(), type: 'PERIOD_START', teamId: null,
        minute: 0, timestamp: now,
        description: `🏟️ Início do ${periodNames[nextPeriod] || nextPeriod}`,
        isAnnulled: false, period: nextPeriod,
      } : null;

      return {
        ...prev, period: nextPeriod, isPaused: true, timerStartedAt: null,
        timeElapsed: nextPeriod === 'INTERVAL' ? 0 : newTimeElapsed,
        events: [...prev.events, event, ...(startEvent ? [startEvent] : [])],
        isPenaltyShootoutActive: nextPeriod === 'PENALTIES',
      };
    });
  }, []);

  const addEvent = useCallback((eventData: {
    type: EventType; teamId: 'home' | 'away'; playerId?: string;
    relatedPlayerId?: string; description?: string;
  }) => {
    setState(prev => {
      const now = Date.now();
      const currentMs = prev.timeElapsed + (prev.timerStartedAt ? now - prev.timerStartedAt : 0);
      const currentMin = Math.floor(currentMs / 60000);

      const teamKey = eventData.teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const team = prev[teamKey];
      const player = team.players.find(p => p.id === eventData.playerId);
      const relatedPlayer = eventData.relatedPlayerId ? team.players.find(p => p.id === eventData.relatedPlayerId) : null;

      const short = team.shortName;
      const icon = EVENT_ICONS[eventData.type] || '•';
      let description = eventData.description || '';
      if (!description) {
        description = `${icon} `;
        if (player) description += `#${player.number} ${player.name}`;
        description += ` [${short}]`;
        if (eventData.type === 'SUBSTITUTION' && relatedPlayer) {
          description += ` → Sai #${relatedPlayer.number} ${relatedPlayer.name}`;
        }
      }

      let actualType = eventData.type;
      if (eventData.type === 'YELLOW_CARD' && player) {
        const yellows = prev.events.filter(e =>
          e.teamId === eventData.teamId && e.playerId === eventData.playerId && e.type === 'YELLOW_CARD' && !e.isAnnulled
        ).length;
        if (yellows >= 1) {
          actualType = 'RED_CARD';
          description = `🟥 2º Amarelo → Vermelho! #${player.number} ${player.name} [${short}]`;
        }
      }

      const event: MatchEvent = {
        id: genId(), type: actualType, teamId: eventData.teamId,
        playerId: eventData.playerId, relatedPlayerId: eventData.relatedPlayerId,
        minute: prev.period === 'PENALTIES' ? 0 : currentMin,
        timestamp: now, description, isAnnulled: false, period: prev.period,
      };

      const newEvents = [...prev.events, event];
      const newScore = { ...prev.score };
      if (actualType === 'GOAL' && !event.isAnnulled) {
        if (eventData.teamId === 'home') newScore.home++;
        else newScore.away++;
      }

      let newHomeTeam = prev.homeTeam;
      let newAwayTeam = prev.awayTeam;
      if (eventData.type === 'SUBSTITUTION' && eventData.playerId && eventData.relatedPlayerId) {
        const updateFn = (team: Team) => ({
          ...team,
          players: team.players.map(p => {
            if (p.id === eventData.relatedPlayerId) return { ...p, hasLeftGame: true };
            if (p.id === eventData.playerId) return { ...p, isStarter: true };
            return p;
          }),
        });
        if (eventData.teamId === 'home') newHomeTeam = updateFn(prev.homeTeam);
        else newAwayTeam = updateFn(prev.awayTeam);
      }

      return { ...prev, events: newEvents, score: newScore, homeTeam: newHomeTeam, awayTeam: newAwayTeam };
    });
  }, []);

  const annulEvent = useCallback((eventId: string) => {
    setState(prev => {
      const event = prev.events.find(e => e.id === eventId);
      if (!event || event.isAnnulled) return prev;
      const newEvents = prev.events.map(e => e.id === eventId ? { ...e, isAnnulled: true } : e);
      const newScore = { ...prev.score };
      if (event.type === 'GOAL') {
        if (event.teamId === 'home') newScore.home = Math.max(0, newScore.home - 1);
        else newScore.away = Math.max(0, newScore.away - 1);
      }
      return { ...prev, events: newEvents, score: newScore };
    });
  }, []);

  // VAR Review - can modify previous events
  const varReview = useCallback((decision: {
    type: 'GOAL_CONFIRMED' | 'GOAL_ANNULLED' | 'PENALTY_AWARDED' | 'PENALTY_CANCELLED' | 'RED_AWARDED' | 'RED_CANCELLED' | 'IDENTITY_CORRECTION';
    targetEventId?: string;
    teamId?: 'home' | 'away';
    correctPlayerId?: string;
    reason?: string;
  }) => {
    setState(prev => {
      const now = Date.now();
      const currentMs = prev.timeElapsed + (prev.timerStartedAt ? now - prev.timerStartedAt : 0);
      const currentMin = Math.floor(currentMs / 60000);
      
      let newEvents = [...prev.events];
      let newScore = { ...prev.score };
      let varDescription = '';
      let varEventType: EventType = 'VAR';

      switch (decision.type) {
        case 'GOAL_CONFIRMED': {
          const targetEvent = decision.targetEventId ? prev.events.find(e => e.id === decision.targetEventId) : null;
          if (!targetEvent) return prev;
          varDescription = `✅ VAR: Gol de #${targetEvent.playerId ? getPlayerNumber(prev, targetEvent.teamId as 'home' | 'away', targetEvent.playerId) : '?'} confirmado`;
          varEventType = 'VAR_GOAL_CONFIRMED';
          break;
        }
        
        case 'GOAL_ANNULLED': {
          const targetEvent = decision.targetEventId ? prev.events.find(e => e.id === decision.targetEventId) : null;
          if (!targetEvent || targetEvent.isAnnulled) return prev;
          newEvents = newEvents.map(e => e.id === decision.targetEventId ? { ...e, isAnnulled: true } : e);
          if (targetEvent.teamId === 'home') newScore.home = Math.max(0, newScore.home - 1);
          else newScore.away = Math.max(0, newScore.away - 1);
          varDescription = `❌ VAR: Gol ANULADO (${decision.reason || 'revisão'})`;
          varEventType = 'VAR_GOAL_ANNULLED';
          break;
        }
        
        case 'PENALTY_AWARDED': {
          const teamId = decision.teamId || 'home';
          const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
          const team = prev[teamKey];
          varDescription = `✅ VAR: PÊNALTI marcado para ${team.shortName}`;
          varEventType = 'VAR_PENALTY_AWARDED';
          // Also add a PENALTY event
          const penaltyEvent: MatchEvent = {
            id: genId(), type: 'PENALTY', teamId,
            minute: currentMin, timestamp: now,
            description: `💥 Pênalti marcado para ${team.shortName} (VAR)`,
            isAnnulled: false, period: prev.period,
          };
          newEvents = [...newEvents, penaltyEvent];
          break;
        }
        
        case 'PENALTY_CANCELLED': {
          const targetEvent = decision.targetEventId ? prev.events.find(e => e.id === decision.targetEventId) : null;
          if (!targetEvent || targetEvent.type !== 'PENALTY') return prev;
          newEvents = newEvents.map(e => e.id === decision.targetEventId ? { ...e, isAnnulled: true } : e);
          varDescription = `❌ VAR: Pênalti CANCELADO`;
          varEventType = 'VAR_PENALTY_CANCELLED';
          break;
        }
        
        case 'RED_AWARDED': {
          // This is for VAR to give a red card for an incident not seen by referee
          const teamId = decision.teamId || 'home';
          const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
          const team = prev[teamKey];
          const player = decision.correctPlayerId ? team.players.find(p => p.id === decision.correctPlayerId) : null;
          varDescription = `🟥 VAR: Cartão VERMELHO para ${player ? `#${player.number} ${player.name}` : 'jogador'} [${team.shortName}]`;
          varEventType = 'VAR_RED_AWARDED';
          // Also add a RED_CARD event
          const redEvent: MatchEvent = {
            id: genId(), type: 'RED_CARD', teamId,
            playerId: decision.correctPlayerId,
            minute: currentMin, timestamp: now,
            description: varDescription,
            isAnnulled: false, period: prev.period,
          };
          newEvents = [...newEvents, redEvent];
          break;
        }
        
        case 'RED_CANCELLED': {
          const targetEvent = decision.targetEventId ? prev.events.find(e => e.id === decision.targetEventId) : null;
          if (!targetEvent || targetEvent.type !== 'RED_CARD') return prev;
          newEvents = newEvents.map(e => e.id === decision.targetEventId ? { ...e, isAnnulled: true } : e);
          varDescription = `✅ VAR: Cartão vermelho CANCELADO`;
          varEventType = 'VAR_RED_CANCELLED';
          break;
        }
        
        case 'IDENTITY_CORRECTION': {
          const targetEvent = decision.targetEventId ? prev.events.find(e => e.id === decision.targetEventId) : null;
          if (!targetEvent || !decision.correctPlayerId) return prev;
          const teamId = targetEvent.teamId as 'home' | 'away';
          const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
          const team = prev[teamKey];
          const correctPlayer = team.players.find(p => p.id === decision.correctPlayerId);
          if (!correctPlayer) return prev;
          
          // Update the event with correct player
          newEvents = newEvents.map(e => e.id === decision.targetEventId ? { 
            ...e, 
            playerId: decision.correctPlayerId,
            description: `${EVENT_ICONS[e.type] || '•'} #${correctPlayer.number} ${correctPlayer.name} [${team.shortName}]`
          } : e);
          
          varDescription = `🔄 VAR: Identidade corrigida → #${correctPlayer.number} ${correctPlayer.name}`;
          varEventType = 'VAR_IDENTITY_CORRECTION';
          break;
        }
      }

      // Add VAR review event
      const varEvent: MatchEvent = {
        id: genId(),
        type: varEventType,
        teamId: decision.teamId || null,
        minute: currentMin,
        timestamp: now,
        description: varDescription,
        isAnnulled: false,
        period: prev.period,
      };

      return { ...prev, events: [...newEvents, varEvent], score: newScore };
    });
  }, []);

  // Helper function to get player number
  const getPlayerNumber = (state: MatchState, teamId: 'home' | 'away', playerId: string): string => {
    const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
    const player = state[teamKey].players.find(p => p.id === playerId);
    return player ? `${player.number}` : '?';
  };

  const addPenaltyKick = useCallback((teamId: 'home' | 'away', scored: boolean) => {
    setState(prev => {
      const kick: PenaltyKick = { teamId, scored };
      const newSequence = [...prev.penaltySequence, kick];
      const newPenaltyScore = { ...prev.penaltyScore };
      if (scored) newPenaltyScore[teamId]++;
      return { ...prev, penaltySequence: newSequence, penaltyScore: newPenaltyScore };
    });
  }, []);

  const updateTeam = useCallback((teamId: 'home' | 'away', updates: Partial<Team>) => {
    setState(prev => {
      const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      return { ...prev, [key]: { ...prev[key], ...updates } };
    });
  }, []);

  const updateMatchDetails = useCallback((updates: Partial<MatchState['matchDetails']>) => {
    setState(prev => ({ ...prev, matchDetails: { ...prev.matchDetails, ...updates } }));
  }, []);

  const addPlayer = useCallback((teamId: 'home' | 'away', player: Omit<Player, 'id'>) => {
    setState(prev => {
      const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const newPlayer: Player = { ...player, id: genId() };
      return { ...prev, [key]: { ...prev[key], players: [...prev[key].players, newPlayer] } };
    });
  }, []);

  const removePlayer = useCallback((teamId: 'home' | 'away', playerId: string) => {
    setState(prev => {
      const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      return { ...prev, [key]: { ...prev[key], players: prev[key].players.filter(p => p.id !== playerId) } };
    });
  }, []);

  const updatePlayer = useCallback((teamId: 'home' | 'away', playerId: string, updates: Partial<Player>) => {
    setState(prev => {
      const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
      return { ...prev, [key]: { ...prev[key], players: prev[key].players.map(p => p.id === playerId ? { ...p, ...updates } : p) } };
    });
  }, []);

  const resetMatch = useCallback(() => { setState(createDefaultState()); }, []);

  const importFromOCR = useCallback((data: {
    homeTeamName: string; awayTeamName: string;
    homePlayers: Omit<Player, 'id'>[]; awayPlayers: Omit<Player, 'id'>[];
    competition: string; category: string; stadium: string; referee: string;
    date: string; time: string; homeCoach: string; awayCoach: string;
  }) => {
    setState(prev => {
      const genPlayerId = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      return {
        ...prev,
        homeTeam: {
          ...prev.homeTeam,
          name: data.homeTeamName || prev.homeTeam.name,
          shortName: data.homeTeamName ? data.homeTeamName.substring(0, 3).toUpperCase() : prev.homeTeam.shortName,
          players: data.homePlayers.length > 0 ? data.homePlayers.map(p => ({ ...p, id: genPlayerId() })) : prev.homeTeam.players,
        },
        awayTeam: {
          ...prev.awayTeam,
          name: data.awayTeamName || prev.awayTeam.name,
          shortName: data.awayTeamName ? data.awayTeamName.substring(0, 3).toUpperCase() : prev.awayTeam.shortName,
          players: data.awayPlayers.length > 0 ? data.awayPlayers.map(p => ({ ...p, id: genPlayerId() })) : prev.awayTeam.players,
        },
        matchDetails: {
          ...prev.matchDetails,
          competition: data.competition || prev.matchDetails.competition,
          stadium: data.stadium || prev.matchDetails.stadium,
          referee: data.referee || prev.matchDetails.referee,
          date: data.date || prev.matchDetails.date,
          time: data.time || prev.matchDetails.time,
          observations: data.category ? `Categoria: ${data.category}` : prev.matchDetails.observations,
        },
        homeCoach: data.homeCoach || prev.homeCoach,
        awayCoach: data.awayCoach || prev.awayCoach,
      };
    });
  }, []);

  const togglePossession = useCallback((teamId: 'home' | 'away') => {
    setState(prev => ({ ...prev, possession: [...prev.possession, { teamId, timestamp: Date.now() }] }));
  }, []);

  const getPossessionPercent = useCallback((): { home: number; away: number } => {
    const entries = state.possession;
    if (entries.length < 2) return { home: 50, away: 50 };
    let homeMs = 0, awayMs = 0;
    const now = Date.now();
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const nextTimestamp = i < entries.length - 1 ? entries[i + 1].timestamp : now;
      const duration = nextTimestamp - entry.timestamp;
      if (entry.teamId === 'home') homeMs += duration; else awayMs += duration;
    }
    const total = homeMs + awayMs || 1;
    return { home: Math.round((homeMs / total) * 100), away: Math.round((awayMs / total) * 100) };
  }, [state.possession]);

  const setAddedTime = useCallback((period: '1T' | '2T', minutes: number) => {
    setState(prev => ({ ...prev, addedTime: { ...prev.addedTime, [period]: Math.max(0, minutes) } }));
  }, []);

  const getDisplayTime = useCallback((): string => {
    if (state.period === 'PRE_MATCH') return '00:00';
    if (state.period === 'FINISHED') return `${String(Math.floor(state.timeElapsed / 60000)).padStart(2, '0')}:00`;
    const now = Date.now();
    const currentMs = state.timeElapsed + (!state.isPaused && state.timerStartedAt ? now - state.timerStartedAt : 0);
    const totalSec = Math.floor(currentMs / 1000);
    return `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;
  }, [state.timeElapsed, state.timerStartedAt, state.isPaused, state.period]);

  const getFootballMinute = useCallback((): string => {
    if (state.period === 'PRE_MATCH') return "0'";
    if (state.period === 'FINISHED') return `${Math.floor(state.timeElapsed / 60000)}'`;
    if (state.period === 'INTERVAL') return "45'";
    const now = Date.now();
    const currentMs = state.timeElapsed + (!state.isPaused && state.timerStartedAt ? now - state.timerStartedAt : 0);
    const totalMin = Math.floor(currentMs / 60000);
    if (state.period === '1T') {
      const added = state.addedTime['1T'];
      if (totalMin > 45 && added > 0) return `45+${totalMin - 45}'`;
      if (totalMin > 45) return `45+${totalMin - 45}'`;
      return `${Math.min(totalMin, 45)}'`;
    }
    if (state.period === '2T') {
      const displayMin = 45 + totalMin;
      const added = state.addedTime['2T'];
      if (displayMin > 90 && added > 0) return `90+${displayMin - 90}'`;
      if (displayMin > 90) return `90+${displayMin - 90}'`;
      return `${Math.min(displayMin, 90)}'`;
    }
    if (state.period === 'PENALTIES') return 'PÊN';
    return `${totalMin}'`;
  }, [state.timeElapsed, state.timerStartedAt, state.isPaused, state.period, state.addedTime]);

  const getTeamGoalCount = useCallback((teamId: 'home' | 'away'): number => {
    return state.events.filter(e => e.teamId === teamId && e.type === 'GOAL' && !e.isAnnulled).length;
  }, [state.events]);

  const getTeamStats = useCallback((teamId: 'home' | 'away') => {
    const teamEvents = state.events.filter(e => e.teamId === teamId && !e.isAnnulled);
    return {
      goals: teamEvents.filter(e => e.type === 'GOAL').length,
      yellowCards: teamEvents.filter(e => e.type === 'YELLOW_CARD').length,
      redCards: teamEvents.filter(e => e.type === 'RED_CARD').length,
      fouls: teamEvents.filter(e => e.type === 'FOUL').length,
      corners: teamEvents.filter(e => e.type === 'CORNER').length,
      shots: teamEvents.filter(e => e.type === 'SHOT').length,
      saves: teamEvents.filter(e => e.type === 'SAVE').length,
      offsides: teamEvents.filter(e => e.type === 'OFFSIDE').length,
      substitutions: teamEvents.filter(e => e.type === 'SUBSTITUTION').length,
    };
  }, [state.events]);

  const getPeriodEvents = useCallback((period: Period) => {
    return state.events.filter(e => e.period === period && !e.isAnnulled);
  }, [state.events]);

  const saveMatchToHistory = useCallback(() => {
    try {
      const history: SavedMatch[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const homeGoals = state.events.filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
      const awayGoals = state.events.filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;
      const match: SavedMatch = {
        id: genId(), savedAt: Date.now(), state: JSON.parse(JSON.stringify(state)),
        homeGoals, awayGoals,
        label: `${state.homeTeam.shortName} ${homeGoals} × ${awayGoals} ${state.awayTeam.shortName}`,
      };
      history.unshift(match);
      if (history.length > 50) history.length = 50;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return true;
    } catch { return false; }
  }, [state]);

  const getMatchHistory = useCallback((): SavedMatch[] => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }, []);

  const loadMatchFromHistory = useCallback((matchId: string) => {
    try {
      const history: SavedMatch[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const match = history.find(m => m.id === matchId);
      if (match) setState({ ...createDefaultState(), ...match.state });
    } catch {}
  }, []);

  const deleteMatchFromHistory = useCallback((matchId: string) => {
    try {
      const history: SavedMatch[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter(m => m.id !== matchId)));
    } catch {}
  }, []);

  // Quick Notes
  const addQuickNote = useCallback((text: string) => {
    const note: QuickNote = {
      id: genId(),
      text,
      minute: getCurrentMinute(),
      period: state.period,
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, quickNotes: [...prev.quickNotes, note] }));
  }, [state.period, getCurrentMinute]);

  const removeQuickNote = useCallback((noteId: string) => {
    setState(prev => ({ ...prev, quickNotes: prev.quickNotes.filter(n => n.id !== noteId) }));
  }, []);

  // Highlighted Players
  const toggleHighlightPlayer = useCallback((playerId: string, teamId: 'home' | 'away', reason?: string) => {
    setState(prev => {
      const exists = prev.highlightedPlayers.find(h => h.playerId === playerId);
      if (exists) {
        return { ...prev, highlightedPlayers: prev.highlightedPlayers.filter(h => h.playerId !== playerId) };
      }
      return { ...prev, highlightedPlayers: [...prev.highlightedPlayers, { playerId, teamId, reason }] };
    });
  }, []);

  const isPlayerHighlighted = useCallback((playerId: string): boolean => {
    return state.highlightedPlayers.some(h => h.playerId === playerId);
  }, [state.highlightedPlayers]);

  return {
    state, updateState, togglePlayPause, advancePeriod, addEvent, annulEvent, varReview,
    addPenaltyKick, updateTeam, updateMatchDetails, updateCoach, addPlayer,
    removePlayer, updatePlayer, resetMatch, undo, saveToHistory,
    getTeamStats, getDisplayTime, getFootballMinute, getTeamGoalCount,
    getCurrentMinute, importFromOCR, togglePossession, getPossessionPercent,
    setAddedTime, adjustTimer, getPeriodEvents,
    saveMatchToHistory, getMatchHistory, loadMatchFromHistory, deleteMatchFromHistory,
    addQuickNote, removeQuickNote, toggleHighlightPlayer, isPlayerHighlighted,
    EVENT_ICONS, EVENT_LABELS,
  };
}
