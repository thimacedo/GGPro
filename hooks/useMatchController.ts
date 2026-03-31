import { useState, useCallback, useEffect, useRef } from 'react';
import { MatchState, Player, Team, MatchEvent, EventType, MatchStatus, PenaltyShot } from '../types';
import { DEFAULT_HOME_TEAM, DEFAULT_AWAY_TEAM, STORAGE_KEY } from '../constants';
import { syncMatchStateToFirebase, subscribeToMatchState } from '../services/firebaseService';

export function useMatchController(addToast: (title: string, msg: string, type: 'info'|'success'|'warning'|'error'|'ai') => void) {
  const [matchState, setMatchState] = useState<MatchState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaultRules = { halfDuration: 45, maxSubstitutions: 5, penaltyKicks: 5, summary: '' };
    
    const baseState: MatchState = {
      homeTeam: { ...DEFAULT_HOME_TEAM, coach: '' }, 
      awayTeam: { ...DEFAULT_AWAY_TEAM, coach: '' },
      events: [], startTime: null, 
      timerStartedAt: null, 
      timeElapsed: 0, 
      isPaused: true, 
      period: 'PRE_MATCH' as MatchStatus,
      competition: '', 
      matchDate: new Date().toISOString().split('T')[0], 
      stadium: '', 
      referee: '', 
      observations: '',
      penaltyScore: { home: 0, away: 0 }, 
      penaltySequence: [], 
      penaltyStarter: 'home' as 'home' | 'away',
      rules: defaultRules
    };

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return { 
              ...baseState,
              ...parsed, 
              events: parsed.events || [],
              homeTeam: { ...baseState.homeTeam, ...parsed.homeTeam },
              awayTeam: { ...baseState.awayTeam, ...parsed.awayTeam },
              penaltyScore: parsed.penaltyScore || { home: 0, away: 0 }, 
              penaltySequence: parsed.penaltySequence || [], 
              rules: parsed.rules || defaultRules
            };
        } catch (e) { console.error("Erro ao carregar cache", e); }
    }
    return baseState;
  });
  
  const [history, setHistory] = useState<MatchState[]>([]);
  const [resetSignal, setResetSignal] = useState(0);
  
  const saveToHistory = useCallback(() => { 
    setHistory(prev => [...prev.slice(-10), JSON.parse(JSON.stringify(matchState))]); 
  }, [matchState]);

  const handleMinuteChange = useCallback((newMins: number) => {
    // Apenas para compatibilidade se algo ainda chamar, mas o ideal é não depender disso no estado
    setMatchState(prev => {
        const totalMs = newMins * 60000;
        return { ...prev, timeElapsed: totalMs, timerStartedAt: prev.isPaused ? null : Date.now() };
    });
  }, []);

  const lastToastEventId = useRef<string | null>(null);

  const formatEventType = useCallback((type: EventType): string => {
    const map: Record<EventType, string> = {
      'GOAL': 'GOL', 'YELLOW_CARD': 'AMARELO', 'RED_CARD': 'VERMELHO', 'SUBSTITUTION': 'SUBSTITUIÇÃO',
      'SHOT': 'FINALIZAÇÃO', 'FOUL': 'FALTA', 'CORNER': 'ESCANTEIO', 'PENALTY': 'PÊNALTI',
      'INJURY': 'CONTUSÃO', 'PERIOD_START': 'INÍCIO', 'PERIOD_END': 'FIM', 'START_TIMER': 'CRONÔMETRO',
      'VAR': 'VAR', 'PENALTY_SHOOTOUT': 'PÊNALTIS', 'INVALID': 'INVÁLIDO', 'OFFSIDE': 'IMPEDIMENTO', 'SAVE': 'DEFESA', 'WOODWORK': 'NA TRAVE', 'ANSWER': 'RESPOSTA', 'CORRECTION': 'CORREÇÃO',
      'CONCUSSION_SUBSTITUTION': 'SUBST. CONCUSSÃO', 'GK_8_SECONDS': 'INFRAÇÃO 8S', 'GENERIC': 'EVENTO'
    };
    return map[type] || type;
  }, []);

  useEffect(() => {
    const lastEvent = matchState.events[0];
    if (lastEvent && lastEvent.id !== lastToastEventId.current) {
      if (lastToastEventId.current !== null) {
        addToast(formatEventType(lastEvent.type), lastEvent.description, lastEvent.type === 'GOAL' ? 'success' : 'info');
      }
      lastToastEventId.current = lastEvent.id;
    }
  }, [matchState.events, addToast, formatEventType]);

  const handlePlayPauseToggle = useCallback(() => {
    if (matchState.isPaused && (matchState.period === 'PRE_MATCH' || matchState.period === 'INTERVAL')) {
      setResetSignal(s => s + 1);
    }
    
    setMatchState(prev => {
      const now = Date.now();
      let newTimeElapsed = prev.timeElapsed;
      
      // Se estava rodando e vai pausar, acumula o tempo
      if (!prev.isPaused && prev.timerStartedAt) {
        newTimeElapsed += (now - prev.timerStartedAt);
      }

      const newIsPaused = !prev.isPaused;
      const newTimerStartedAt = newIsPaused ? null : now;

      if (prev.isPaused) {
        if (prev.period === 'PRE_MATCH') {
          return {
            ...prev,
            period: '1T',
            isPaused: false,
            timerStartedAt: now,
            timeElapsed: 0,
            events: [{ id: Math.random().toString(36).substr(2, 9), type: 'PERIOD_START', teamId: 'none', minute: 0, timestamp: now, description: `Início de Jogo (1º Tempo)`, isAnnulled: false }, ...(prev.events || [])]
          };
        }
        if (prev.period === 'INTERVAL') {
          return {
            ...prev,
            period: '2T',
            isPaused: false,
            timerStartedAt: now,
            timeElapsed: 0, 
            events: [{ id: Math.random().toString(36).substr(2, 9), type: 'PERIOD_START', teamId: 'none', minute: 0, timestamp: now, description: `Recomeço de Jogo (2º Tempo)`, isAnnulled: false }, ...(prev.events || [])]
          };
        }
      }
      
      return { 
        ...prev, 
        isPaused: newIsPaused, 
        timerStartedAt: newTimerStartedAt, 
        timeElapsed: newTimeElapsed 
      };
    });
  }, [matchState.isPaused, matchState.period]);

  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    const unsub = subscribeToMatchState('current-match', (remoteData) => {
        setMatchState(prev => {
            if (JSON.stringify(remoteData) === JSON.stringify(prev)) return prev;
            isRemoteUpdate.current = true;
            return remoteData;
        });
    });
    return unsub;
  }, []);

  useEffect(() => { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matchState)); 
    
    // Sincronização otimizada para o Firebase
    const handler = setTimeout(() => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
        } else {
            // Não precisamos sincronizar o tempo a cada segundo com esta nova lógica, 
            // apenas quando o estado geral muda ou o cronômetro é pausado/iniciado.
            syncMatchStateToFirebase('current-match', matchState);
        }
    }, 1500); // Aumentado um pouco o debounce para poupar conexões
    return () => clearTimeout(handler);
  }, [matchState]);

  useEffect(() => {
    const homeColor = matchState.homeTeam?.color?.toLowerCase();
    const awayColor = matchState.awayTeam?.color?.toLowerCase();
    if (homeColor && awayColor && homeColor === awayColor) {
      let fallbackColor = matchState.awayTeam?.secondaryColor?.toLowerCase();
      if (!fallbackColor || fallbackColor === homeColor || fallbackColor === '') {
        fallbackColor = (homeColor === '#000000' || homeColor === '#1e293b' || homeColor === '#0c1222') ? '#ffffff' : '#475569';
      }
      setMatchState(prev => ({ ...prev, awayTeam: { ...prev.awayTeam, color: fallbackColor } }));
      addToast("Conflito de Identidade Visual", `A cor predominant do Visitante foi alterada automaticamente para evitar confusão com o Mandante.`, "warning");
    }
  }, [matchState.homeTeam?.color, matchState.awayTeam?.color, matchState.awayTeam?.secondaryColor, addToast]);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMatchState({
      homeTeam: { ...DEFAULT_HOME_TEAM, coach: '' },
      awayTeam: { ...DEFAULT_AWAY_TEAM, coach: '' },
      events: [], startTime: null, 
      timerStartedAt: null, 
      timeElapsed: 0,
      isPaused: true, period: 'PRE_MATCH',
      competition: '', matchDate: new Date().toISOString().split('T')[0], stadium: '', referee: '', observations: '',
      penaltyScore: { home: 0, away: 0 }, penaltySequence: [], penaltyStarter: 'home',
      rules: { halfDuration: 45, maxSubstitutions: 5, penaltyKicks: 5, summary: '' }
    });
    setResetSignal(s => s + 1);
    setHistory([]);
    addToast("Nova Partida", "Todos os dados foram zerados.", "info");
  }, [addToast]);

  const handleFinalizeMatch = useCallback(() => {
    setMatchState(prev => ({
      ...prev,
      period: 'FINISHED',
      isPaused: true,
      events: [{
        id: Math.random().toString(36).substr(2, 9), type: 'PERIOD_END', teamId: 'none',
        minute: Math.floor((prev.timeElapsed + (prev.timerStartedAt ? Date.now() - prev.timerStartedAt : 0)) / 60000), 
        timestamp: Date.now(), description: 'Fim de Jogo Finalizado', isAnnulled: false
      }, ...(prev.events || [])]
    }));
    addToast("Partida Finalizada", "O jogo foi encerrado e o relatório está pronto.", "success");
  }, [addToast]);

  const addEvent = useCallback((eventData: Omit<MatchEvent, 'id' | 'timestamp' | 'minute'> & { manualSub?: { name: string, number: number } }) => {
    saveToHistory();
    setMatchState(prev => {
      const now = Date.now();
      const currentMs = prev.timeElapsed + (prev.timerStartedAt ? now - prev.timerStartedAt : 0);
      const currentMin = Math.floor(currentMs / 60000);
      
      let finalDescription = eventData.description;
      const teamKey = eventData.teamId === 'home' ? 'homeTeam' : 'awayTeam';
      const team = { ...prev[teamKey] } as Team;
      const newEvent: MatchEvent = { 
        id: Math.random().toString(36).substr(2, 9), 
        type: eventData.type, 
        teamId: eventData.teamId, 
        playerId: eventData.playerId, 
        relatedPlayerId: eventData.relatedPlayerId, 
        description: eventData.description, 
        minute: currentMin, 
        timestamp: now, 
        isAnnulled: false 
      };
      let newState = { ...prev };

      let extraEvent: MatchEvent | null = null;

      if (newEvent.type === 'SUBSTITUTION' || newEvent.type === 'CONCUSSION_SUBSTITUTION') {
        let players = [...team.players];
        const playerOut = newEvent.playerId ? players.find(p => p.id === newEvent.playerId) : null;
        let playerIn = newEvent.relatedPlayerId ? players.find(p => p.id === newEvent.relatedPlayerId) : null;
        
        if (!playerIn && eventData.manualSub) {
            const newPlayer: Player = { id: Math.random().toString(36).substr(2, 9), name: eventData.manualSub.name, fullName: eventData.manualSub.name, number: eventData.manualSub.number, teamId: eventData.teamId as 'home' | 'away', isStarter: false, position: 'MF', events: [], x: 50, y: 50 };
            players.push(newPlayer);
            playerIn = newPlayer;
            newEvent.relatedPlayerId = newPlayer.id;
        }

        const subTypeLabel = newEvent.type === 'CONCUSSION_SUBSTITUTION' ? '(Concussão)' : '';
        if (playerOut && playerIn) finalDescription = `Sai ${playerOut.name} (#${playerOut.number}) Entra ${playerIn.name} (#${playerIn.number}) ${subTypeLabel}`;
        newEvent.description = finalDescription;

        const updatedPlayers = players.map(p => {
          if (p.id === newEvent.playerId) return { ...p, isStarter: false, hasLeftGame: true, events: [...p.events, newEvent] };
          if (p.id === newEvent.relatedPlayerId) return { ...p, isStarter: true, events: [...p.events, newEvent] };
          return p;
        });
        newState[teamKey] = { ...team, players: updatedPlayers };

      } else if (newEvent.type === 'GK_8_SECONDS') {
        extraEvent = {
          id: Math.random().toString(36).substr(2, 9), type: 'CORNER', teamId: newEvent.teamId === 'home' ? 'away' : 'home',
          description: `Escanteio (Infração 8s GK): ${team.name}`, minute: currentMin, timestamp: Date.now() + 1, isAnnulled: false
        };
        const updatePlayersInTeam = (t: Team) => ({ ...t, players: t.players.map(p => p.id === newEvent.playerId ? { ...p, events: [...p.events, newEvent] } : p) });
        newState[teamKey] = updatePlayersInTeam(team);
        addToast("Infração 8s", "Goleiro segurou a bola por mais de 8s. Escanteio concedido.", "warning");
        
      } else if (newEvent.playerId) {
        const tKey = newEvent.teamId === 'home' ? 'homeTeam' : 'awayTeam';
        const teamToUpdate = { ...prev[tKey] } as Team;

        const updatedPlayers = teamToUpdate.players.map(p => {
          if (p.id === newEvent.playerId) {
            let updatedEvents = [...p.events, newEvent];
            let hasLeftGame = p.hasLeftGame;

            if (newEvent.type === 'YELLOW_CARD') {
              const yellowCards = p.events.filter(e => e.type === 'YELLOW_CARD' && !e.isAnnulled).length;
              if (yellowCards >= 1) {
                extraEvent = {
                  id: Math.random().toString(36).substr(2, 9), type: 'RED_CARD', teamId: newEvent.teamId, playerId: p.id,
                  description: `Expulsão (2º Amarelo): ${p.name}`, minute: currentMin, timestamp: Date.now() + 1, isAnnulled: false
                };
                updatedEvents.push(extraEvent);
                hasLeftGame = true;
                addToast("Expulsão!", `Segundo cartão amarelo para ${p.name}. Vermelho aplicado.`, "error");
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
          newState.events = [extraEvent, newEvent, ...(prev.events || [])];
          return newState;
        }
      }

      newState.events = [newEvent, ...(prev.events || [])];
      return newState;
    });
  }, [saveToHistory, addToast]);

  const advancePeriod = useCallback((target?: MatchStatus) => {
    const periods: MatchStatus[] = ['PRE_MATCH', '1T', 'INTERVAL', '2T', '1ET', '2ET', 'PENALTIES', 'FINISHED'];
    setMatchState(prev => {
      const currentIdx = periods.indexOf(prev.period);
      const nextPeriod = target || periods[Math.min(currentIdx + 1, periods.length - 1)];
      setResetSignal(s => s + 1);
      
      const periodEvent: MatchEvent = { id: Math.random().toString(36).substr(2, 9), type: 'PERIOD_START', teamId: 'none', minute: 0, timestamp: Date.now(), description: `Início de Fase: ${nextPeriod}`, isAnnulled: false };
      addToast("Fase Alterada", periodEvent.description, "info");
      
      return {
        ...prev, period: nextPeriod, timeElapsed: 0, timerStartedAt: null, isPaused: true,
        events: [periodEvent, ...(prev.events || [])]
      };
    });
  }, [addToast]);

  return {
    matchState, setMatchState,
    resetSignal, handleMinuteChange,
    addEvent, formatEventType, history,
    handleReset, handleFinalizeMatch, handlePlayPauseToggle, advancePeriod, saveToHistory
  };
}
