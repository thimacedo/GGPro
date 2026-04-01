import React, { useState, useEffect, useRef, useCallback } from 'react';
import { processVoiceCommand } from '../services/geminiServiceV6';
import { Team, MatchState, EventType } from '../types';

interface UseVoiceCommandProps {
  matchState: MatchState;
  addToast: (title: string, message: string, type?: 'info' | 'success' | 'ai' | 'error' | 'warning') => void;
  addEvent: (eventData: any) => void;
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
  formatEventType: (type: EventType) => string;
  handleGeminiError: (error: any) => void;
}

export const useVoiceCommand = ({ matchState, addToast, addEvent, setMatchState, formatEventType, handleGeminiError }: UseVoiceCommandProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandText, setCommandText] = useState('');
  const recognitionRef = useRef<any>(null);

  const getHeuristicCommand = (text: string): any | null => {
    const t = text.toLowerCase().trim();
    
    // Timer controls
    if (t.match(/^(começar|iniciar|soltar|rodar|continuar)(.*)(jogo|cronômetro|timer|bola)/i)) return { type: 'START_TIMER' };
    if (t.match(/^(pausar|parar|interromper|travar)(.*)(jogo|cronômetro|timer|bola)/i)) return { type: 'PAUSE_TIMER' };

    // Simple Events (Gol, Falta, Cartão)
    const teams = { 
      home: ['mandante', 'casa', matchState.homeTeam.name.toLowerCase(), matchState.homeTeam.shortName.toLowerCase()],
      away: ['visitante', 'fora', matchState.awayTeam.name.toLowerCase(), matchState.awayTeam.shortName.toLowerCase()]
    };

    const findTeam = (txt: string) => {
      if (teams.home.some(n => txt.includes(n))) return 'home';
      if (teams.away.some(n => txt.includes(n))) return 'away';
      return null;
    };

    const numMatch = t.match(/(\d{1,2})/);
    const num = numMatch ? parseInt(numMatch[1]) : null;
    const teamId = findTeam(t);

    if (t.includes('gol') && teamId) return { type: 'GOAL', team: teamId, playerNumber: num };
    if (t.includes('falta') && teamId) {
       // "falta para" vs "falta de"
       const isAwarded = t.includes('falta para') || t.includes('falta pro') || t.includes('falta pra');
       const finalTeamId = isAwarded ? (teamId === 'home' ? 'away' : 'home') : teamId;
       return { type: 'FOUL', team: finalTeamId, playerNumber: num, isAwarded };
    }
    if ((t.includes('amarelo') || t.includes('cartão amarelo')) && num) return { type: 'YELLOW_CARD', team: teamId || 'home', playerNumber: num };
    if ((t.includes('vermelho') || t.includes('cartão vermelho')) && num) return { type: 'RED_CARD', team: teamId || 'home', playerNumber: num };

    return null;
  };

  const handleCommandInternal = useCallback(async (text: string) => {
    if (!text.trim()) return; 
    setCommandText('');
    setIsProcessing(true);
    
    try {
      // 1. Tentar Heurística (Regex) para Economia de Tokens
      const heuristicResult = getHeuristicCommand(text);
      let results = heuristicResult ? (Array.isArray(heuristicResult) ? heuristicResult : [heuristicResult]) : null;

      // 2. Se não houver match simples, usa o Gemini
      if (!results) {
        const safeEvents = matchState.events || [];
        const recentEvents = safeEvents.slice(0, 10).map(e => `[${e.minute}'] ${formatEventType(e.type)}: ${e.description}`).join('; ');
        
        const result = await processVoiceCommand(text, matchState.homeTeam, matchState.awayTeam, recentEvents);
        results = Array.isArray(result) ? result : [result];
      }
      
      for (const res of results) {
        if (res.type === 'INVALID') continue;
        if (res.type === 'START_TIMER') { setMatchState(p => ({...p, isPaused: false, timerStartedAt: p.timerStartedAt || Date.now() })); continue; }
        if (res.type === 'PAUSE_TIMER') { 
          setMatchState(p => {
             const now = Date.now();
             const elapsedSinceStart = p.timerStartedAt ? now - p.timerStartedAt : 0;
             return { ...p, isPaused: true, timerStartedAt: null, timeElapsed: p.timeElapsed + elapsedSinceStart };
          });
          continue; 
        }
        if (res.type === 'ANSWER') { addToast("Resposta", res.customMessage || "Entendido", "ai"); continue; }
        
        let teamId: 'home' | 'away' = res.team === 'away' ? 'away' : 'home';
        const team = matchState[teamId === 'home' ? 'homeTeam' : 'awayTeam'];

        let finalDescription = '';
        let eventPlayerId: string | undefined = undefined;
        let eventRelatedPlayerId: string | undefined = undefined;
        let manualSubData: { name: string, number: number } | undefined = undefined;

        if (res.type === 'SUBSTITUTION') {
            const pOut = res.playerOutNumber ? team.players.find(p => p.number === res.playerOutNumber) : null;
            const pIn = res.playerInNumber ? team.players.find(p => p.number === res.playerInNumber) : null;
            
            if (pOut) eventPlayerId = pOut.id; 
            if (pIn) eventRelatedPlayerId = pIn.id;
            else if (res.playerInNumber && res.customMessage) {
              manualSubData = { name: res.customMessage, number: res.playerInNumber };
            }
            
            const outName = pOut ? pOut.name : (res.playerOutNumber || '?');
            const inName = pIn ? pIn.name : (res.playerInNumber || '?');
            finalDescription = `🔄 Substituição no ${team.shortName}: Sai ${outName}, Entra ${inName}`;

        } else {
            const p = res.playerNumber ? team.players.find(pl => pl.number === res.playerNumber) : null; 
            if (p) eventPlayerId = p.id;
            
            const playerNameStr = p ? `${p.name} (${p.number})` : (res.playerNumber ? `Nº ${res.playerNumber}` : '');
            
            if (res.type === 'GOAL') finalDescription = `⚽ Gol do ${team.shortName}${playerNameStr ? ` - ${playerNameStr}` : ''}`;
            else if (res.type === 'YELLOW_CARD') finalDescription = `🟨 Amarelo - ${playerNameStr} (${team.shortName})`;
            else if (res.type === 'RED_CARD') finalDescription = `🟥 Vermelho - ${playerNameStr} (${team.shortName})`;
            else if (res.type === 'FOUL') finalDescription = `🛑 Falta ${res.isAwarded ? 'para o' : 'cometida pelo'} ${team.shortName}${playerNameStr ? ` (${playerNameStr})` : ''}`;
            else if (res.type === 'OFFSIDE') finalDescription = `🚩 Impedimento - ${team.shortName}${playerNameStr ? ` (${playerNameStr})` : ''}`;
            else if (res.type === 'SHOT') finalDescription = `🎯 Finalização - ${team.shortName}${playerNameStr ? ` (${playerNameStr})` : ''}`;
            else finalDescription = res.customMessage || `${formatEventType(res.type as EventType)} - ${team.shortName}`;
        }

        addEvent({ 
            type: res.type as EventType, 
            teamId, 
            playerId: eventPlayerId,
            relatedPlayerId: eventRelatedPlayerId,
            manualSub: manualSubData,
            description: finalDescription 
        });
      }
    } catch (error) { 
      handleGeminiError(error);
    } finally { 
      setIsProcessing(false); 
    }
  }, [matchState, addEvent, addToast, setMatchState, formatEventType, handleGeminiError, getHeuristicCommand]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCommandText(transcript);
        handleCommandInternal(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        if (event.error === 'network') {
          addToast("Erro de Rede", "Erro de conexão. Tentando novamente em 2 segundos...", "info");
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
                setIsRecording(true);
              } catch (e) { console.error("Erro ao tentar reiniciar:", e); }
            }
          }, 2000);
        } else {
          let errorMessage = "Não foi possível reconhecer o comando.";
          if (event.error === 'not-allowed') errorMessage = "Permissão de microfone negada.";
          else if (event.error === 'no-speech') errorMessage = "Nenhuma fala detectada.";
          addToast("Erro de Voz", errorMessage, "info");
        }
      };
    } else {
      console.warn("Web Speech API não suportada neste navegador.");
    }
  }, [handleCommandInternal, addToast]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) { console.error("Erro ao iniciar reconhecimento:", e); }
    }
  };

  return { isRecording, isProcessing, commandText, setCommandText, toggleRecording, processCommand: handleCommandInternal };
};
