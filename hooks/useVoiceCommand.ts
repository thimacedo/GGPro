import React, { useState, useEffect, useRef, useCallback } from 'react';
import { processVoiceCommand } from '../services/geminiService';
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

  const handleCommandInternal = useCallback(async (text: string) => {
    if (!text.trim()) return; 
    setCommandText('');
    setIsProcessing(true);
    
    try {
      const safeEvents = matchState.events || [];
      const recentEvents = safeEvents.slice(0, 10).map(e => `[${e.minute}'] ${formatEventType(e.type)}: ${e.description}`).join('; ');
      
      const richContextData = JSON.stringify({
        home: { name: matchState.homeTeam.name, players: matchState.homeTeam.players.map(p=>({num: p.number, name: p.name})) },
        away: { name: matchState.awayTeam.name, players: matchState.awayTeam.players.map(p=>({num: p.number, name: p.name})) }
      });
      const context = `Tempo Atual: ${matchState.currentTime}'. Fase: ${matchState.period}. DADOS OFICIAIS DOS TIMES: ${richContextData}`;
      
      const result = await processVoiceCommand(text, matchState.homeTeam, matchState.awayTeam, recentEvents);
      
      if (result.type === 'INVALID') { addToast("Erro IA", "Comando não entendido", "info"); return; }
      if (result.type === 'START_TIMER') { setMatchState(p => ({...p, isPaused: false})); return; }
      if (result.type === 'ANSWER') { addToast("Resposta", result.customMessage || "Entendido", "ai"); return; }
      
      let teamId: 'home' | 'away' = result.team === 'away' ? 'away' : 'home';
      const team = matchState[teamId === 'home' ? 'homeTeam' : 'awayTeam'];

      let finalDescription = '';
      let eventPlayerId: string | undefined = undefined;
      let eventRelatedPlayerId: string | undefined = undefined;
      let manualSubData: { name: string, number: number } | undefined = undefined;

      if (result.type === 'SUBSTITUTION') {
          const pOut = result.playerOutNumber ? team.players.find(p => p.number === result.playerOutNumber) : null;
          const pIn = result.playerInNumber ? team.players.find(p => p.number === result.playerInNumber) : null;
          
          if (pOut) eventPlayerId = pOut.id; 
          if (pIn) eventRelatedPlayerId = pIn.id;
          else if (result.playerInNumber && result.customMessage) {
            manualSubData = { name: result.customMessage, number: result.playerInNumber };
          }
          
          const outName = pOut ? pOut.name : (result.playerOutNumber || '?');
          const inName = pIn ? pIn.name : (result.playerInNumber || '?');
          finalDescription = `🔄 Substituição no ${team.shortName}: Sai ${outName}, Entra ${inName}`;

      } else {
          const p = result.playerNumber ? team.players.find(pl => pl.number === result.playerNumber) : null; 
          if (p) eventPlayerId = p.id;
          
          const playerNameStr = p ? `${p.name} (${p.number})` : (result.playerNumber ? `Nº ${result.playerNumber}` : 'Desconhecido');
          
          if (result.type === 'GOAL') finalDescription = `⚽ Gol do ${team.shortName} - ${playerNameStr}`;
          else if (result.type === 'YELLOW_CARD') finalDescription = `🟨 Amarelo - ${playerNameStr} (${team.shortName})`;
          else if (result.type === 'RED_CARD') finalDescription = `🟥 Vermelho - ${playerNameStr} (${team.shortName})`;
          else if (result.type === 'FOUL') finalDescription = `🛑 Falta de ${playerNameStr} (${team.shortName})`;
          else if (result.type === 'OFFSIDE') finalDescription = `🚩 Impedimento de ${playerNameStr} (${team.shortName})`;
          else if (result.type === 'SHOT') finalDescription = `🎯 Finalização de ${playerNameStr} (${team.shortName})`;
          else finalDescription = result.customMessage || `${formatEventType(result.type as EventType)} - ${team.shortName}`;
      }

      let event: any = { 
          type: result.type as EventType, 
          teamId, 
          playerId: eventPlayerId,
          relatedPlayerId: eventRelatedPlayerId,
          manualSub: manualSubData,
          description: finalDescription 
      };
      
      addEvent(event);
    } catch (error) { 
      handleGeminiError(error);
    } finally { 
      setIsProcessing(false); 
    }
  }, [matchState, addEvent, addToast, setMatchState, formatEventType, handleGeminiError]);

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
