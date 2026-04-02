import React, { useState, useCallback } from 'react';
import { MatchState, Player, Position } from '../types';
import { parsePlayersFromImage } from '../services/geminiService';

interface UseAIExtractorProps {
  matchState: MatchState;
  setMatchState: React.Dispatch<React.SetStateAction<MatchState>>;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
  ui: {
    setImportListModal: (modal: { isOpen: boolean; teamId: 'home' | 'away' }) => void;
    setShowAISelectionModal: (show: boolean) => void;
    setPendingAIResult: (result: any) => void;
  };
}

interface AIResult {
  players?: Player[];
  teamName?: string;
  coach?: string;
  type?: string;
}

export function useAIExtractor({ matchState, setMatchState, addToast, ui }: UseAIExtractorProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePasteProcess = useCallback(async (text: string, teamId: 'home' | 'away') => {
    setIsProcessing(true);
    try {
      // Processar texto colado para extrair informações
      const lines = text.split('\n').filter(line => line.trim());
      const players: Player[] = [];
      let teamName = '';
      let coach = '';

      for (const line of lines) {
        // Tentar extrair nome do time
        if (line.toLowerCase().includes('time:') || line.toLowerCase().includes('team:')) {
          teamName = line.split(':')[1]?.trim() || '';
        }
        // Tentar extrair nome do técnico
        if (line.toLowerCase().includes('técnico:') || line.toLowerCase().includes('coach:')) {
          coach = line.split(':')[1]?.trim() || '';
        }
        // Tentar extrair jogadores (formato: número nome)
        const playerMatch = line.match(/^(\d+)\s+(.+)$/);
        if (playerMatch) {
          const number = parseInt(playerMatch[1]);
          const name = playerMatch[2].trim();
          if (number > 0 && number <= 99 && name.length > 0) {
            players.push({
              id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name,
              fullName: name,
              number,
              position: 'MF' as Position,
              teamId: teamId,
              isStarter: players.length < 11,
              events: [],
              x: 0,
              y: 0
            });
          }
        }
      }

      if (players.length > 0) {
        setMatchState(prev => {
          const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
          return {
            ...prev,
            [teamKey]: {
              ...prev[teamKey],
              name: teamName || prev[teamKey].name,
              coach: coach || prev[teamKey].coach,
              players: [...prev[teamKey].players, ...players]
            }
          };
        });
        addToast("Lista Importada", `${players.length} jogadores adicionados com sucesso.`, "success");
      } else {
        addToast("Erro na Importação", "Não foi possível extrair jogadores do texto.", "error");
      }
    } catch (error) {
      addToast("Erro na Importação", "Ocorreu um erro ao processar o texto.", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [setMatchState, addToast]);

  const processAIResult = useCallback((result: AIResult | null, mode: string) => {
    if (!result) return;

    setIsProcessing(true);
    try {
      if (result.players && result.players.length > 0) {
        setMatchState(prev => {
          const teamKey = mode === 'home' ? 'homeTeam' : 'awayTeam';
          return {
            ...prev,
            [teamKey]: {
              ...prev[teamKey],
              name: result.teamName || prev[teamKey].name,
              coach: result.coach || prev[teamKey].coach,
              players: [...prev[teamKey].players, ...result.players]
            }
          };
        });
        addToast("IA Processou", `${result.players.length} jogadores extraídos pela IA.`, "success");
      }
    } catch (error) {
      addToast("Erro de IA", "Ocorreu um erro ao processar o resultado da IA.", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [setMatchState, addToast]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, teamId: 'home' | 'away') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result?.toString().split(',')[1];
      if (base64) {
        try {
          const data = await parsePlayersFromImage(base64);
          
          // Compatibilidade com diferentes formatos de retorno da IA e estruturação dos dados
          const rawPlayers = data.players || (teamId === 'home' ? data.teamA : data.teamB) || [];
          const teamName = data.teamName || (teamId === 'home' ? data.teamAName : data.teamBName) || '';

          if (rawPlayers && rawPlayers.length > 0) {
            setMatchState(prev => {
              const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
              
              const newPlayers: Player[] = rawPlayers.map((p: any, index: number) => ({
                id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: p.name || `Jogador ${p.number}`,
                fullName: p.fullName || p.name || `Jogador ${p.number}`,
                number: parseInt(p.number) || (index + 1),
                position: (p.position || 'MF') as Position,
                teamId: teamId,
                isStarter: index < 11,
                events: [],
                x: 0, 
                y: 0
              }));

              return {
                ...prev,
                [teamKey]: {
                  ...prev[teamKey],
                  name: teamName || prev[teamKey].name,
                  players: [...prev[teamKey].players, ...newPlayers]
                }
              };
            });
            addToast("IA Processou", `${rawPlayers.length} jogadores extraídos da foto.`, "success");
          } else {
            addToast("Erro", "IA não identificou jogadores na imagem.", "error");
          }
        } catch (error) {
          console.error("Erro no processamento de imagem:", error);
          addToast("Erro de IA", "Falha ao processar imagem ou limite de API atingido.", "error");
        } finally {
          setIsProcessing(false);
          if (e.target) e.target.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  }, [setMatchState, addToast]);

  return {
    isProcessing,
    handlePasteProcess,
    processAIResult,
    handleImageUpload
  };
}