import React, { useCallback } from 'react';
import { parsePlayersFromImage, parsePlayersFromText } from '../services/geminiService';
import { MatchState, Player } from '../types';
import { FORMATIONS } from '../constants';
import { generateDistinctShortName, ensureDistinctColors } from '../utils/teamUtils';

export function useAIExtractor({ matchState, setMatchState, addToast }: { matchState: MatchState, setMatchState: any, addToast: any }) {
  
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, tId: 'home' | 'away') => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = async(ev) => {
        const matches = ev.target?.result?.toString().match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if(matches) {
          const mimeType = matches[1];
          const b64 = matches[2];
          try {
            addToast("IA", "Processando foto da Súmula...", "info");
            const d = await parsePlayersFromImage(b64, mimeType);
            if (d && d.teams && d.teams.length > 0) {
              setMatchState((p: MatchState) => {
                let newState = { ...p, referee: d.referee || p.referee };
                d.teams.forEach((teamData: any, idx: number) => {
                  let targetKey: 'homeTeam' | 'awayTeam' = 'homeTeam';
                  if (d.teams.length === 1) {
                    // Se o usuário clicou no botão de um time específico, respeita isso
                    targetKey = tId === 'home' ? 'homeTeam' : 'awayTeam';
                  } else {
                    // Se a IA retornou dois times, tenta identificar mandante/visitante
                    const isManualHome = teamData.isHome === true || (teamData.teamName && teamData.teamName.toLowerCase().includes('mandante')) || (teamData.teamName && teamData.teamName.toLowerCase().includes('casa'));
                    const isManualAway = teamData.isHome === false || (teamData.teamName && teamData.teamName.toLowerCase().includes('visitante')) || (teamData.teamName && teamData.teamName.toLowerCase().includes('fora'));
                    
                    if (isManualHome) targetKey = 'homeTeam';
                    else if (isManualAway) targetKey = 'awayTeam';
                    else targetKey = idx === 0 ? 'homeTeam' : 'awayTeam';
                  }
                  
                  const formationKey = p[targetKey].formation as keyof typeof FORMATIONS || '4-4-2';
                  const coords = FORMATIONS[formationKey] || FORMATIONS['4-4-2'];
                  let starterCount = 0;
                  let reserveCount = 0;
                  
                  const safePlayers = Array.isArray(teamData.players) ? teamData.players : [];
                  const nL = safePlayers
                    .map((pl:any) => {
                      const isStarter = pl.isStarter !== false;
                      let x = 50, y = 50;
                      if (isStarter) {
                        if (starterCount < coords.length) {
                          x = coords[starterCount].x; y = coords[starterCount].y; 
                        }
                        starterCount++;
                      } else {
                        x = 110; y = 20 + reserveCount * 5; reserveCount++;
                      }
                      return { 
                        id: Math.random().toString(36).substr(2,9), 
                        fullName: pl.name, 
                        name: pl.name, 
                        number: pl.number, 
                        position: pl.position || 'MF', 
                        teamId: targetKey === 'homeTeam' ? 'home' : 'away', 
                        isStarter, 
                        events: [], 
                        x, y 
                      };
                    });
                  const updatedName = teamData.teamName || p[targetKey].name;
                  const otherKey = targetKey === 'homeTeam' ? 'awayTeam' : 'homeTeam';
                  
                  let finalShortName = generateDistinctShortName(updatedName, newState[otherKey]?.shortName || p[otherKey].shortName);
                  if (teamData.shortName && finalShortName.includes('UND')) finalShortName = teamData.shortName.substring(0, 3).toUpperCase();

                  let finalColor = teamData.primaryColor || p[targetKey].color;
                  if (targetKey === 'awayTeam') {
                      finalColor = ensureDistinctColors(finalColor, newState.homeTeam?.color || p.homeTeam.color);
                  } else if (targetKey === 'homeTeam' && d.teams.length === 1) {
                      finalColor = ensureDistinctColors(finalColor, p.awayTeam.color);
                  }

                  newState[targetKey] = { 
                      ...p[targetKey], 
                      name: updatedName, 
                      shortName: finalShortName, 
                      color: finalColor, 
                      secondaryColor: teamData.secondaryColor || p[targetKey].secondaryColor, 
                      coach: teamData.coach || p[targetKey].coach, 
                      players: nL 
                  };
                });
                // VERIFICAÇÃO DE GOLEIRO
                d.teams.forEach((teamData: any) => {
                  const targetKey = d.teams.length === 1 ? (tId === 'home' ? 'homeTeam' : 'awayTeam') : (teamData.isHome ? 'homeTeam' : 'awayTeam');
                  const hasGK = newState[targetKey].players.some(p => p.position === 'GK');
                  if (!hasGK) {
                    addToast("Atenção: Sem Goleiro", `A IA não identificou um goleiro para o ${newState[targetKey].shortName}. Por favor, edite um jogador e defina-o como Goleiro (GK).`, "warning");
                  }
                });

                return newState;
              });
              addToast("IA", "Elenco carregado com sucesso!", "success");
            } else {
              addToast("IA", "Nenhum dado encontrado na imagem.", "warning");
            }
          } catch(err: any) {
            addToast("IA", `Erro ao processar imagem: ${err.message || "Verifique sua chave de API"}`, "error");
          }
        }
      };
      r.readAsDataURL(file);
    }
    // Reseta o input para permitir enviar o mesmo arquivo novamente se necessário
    e.target.value = '';
  }, [setMatchState, addToast]);

  const handlePasteProcess = useCallback(async (text: string, tId: 'home' | 'away') => {
    addToast("Processando", "Lendo lista...", "info");
    const d = await parsePlayersFromText(text);
    if (d && d.players) {
        setMatchState((p: MatchState) => {
            const targetKey = tId === 'home' ? 'homeTeam' : 'awayTeam';
            const formationKey = p[targetKey].formation as keyof typeof FORMATIONS || '4-4-2';
            const coords = FORMATIONS[formationKey];
            let sc=0, rc=0;
            const plist = d.players.map((pl:any) => {
                let x=50, y=50;
                if(pl.isStarter){ if(sc<coords.length){ x=coords[sc].x; y=coords[sc].y;} sc++; }
                else{ x=110; y=20+rc*5; rc++; }
                return { id: Math.random().toString(36).substr(2,9), fullName: pl.name, name: pl.name, number: pl.number, position: pl.position || 'MF', teamId: tId, isStarter: pl.isStarter, events: [], x, y };
            });
            const otherKey = targetKey === 'homeTeam' ? 'awayTeam' : 'homeTeam';
            const finalShortName = generateDistinctShortName(p[targetKey].name, p[otherKey].shortName);
            const hasGK = plist.some(p => p.position === 'GK');
            if (!hasGK) {
              addToast("Atenção: Sem Goleiro", `Nenhum goleiro foi detectado na lista. Defina um jogador como Goleiro (GK) manualmente.`, "warning");
            }
            return { ...p, [targetKey]: { ...p[targetKey], players: plist, shortName: finalShortName } };
        });
        addToast("Sucesso", "Lista importada (Modo Local)!", "success");
    }
  }, [setMatchState, addToast]);

  return { handleImageUpload, handlePasteProcess };
}
