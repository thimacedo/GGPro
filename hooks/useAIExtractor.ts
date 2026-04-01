import React, { useCallback } from 'react';
import { parsePlayersFromImage, parsePlayersFromText } from '../services/geminiServiceV6';
import { MatchState, Player } from '../types';
import { FORMATIONS } from '../constants';
import { generateDistinctShortName, ensureDistinctColors } from '../utils/teamUtils';

export function useAIExtractor({ matchState, setMatchState, addToast, ui }: { matchState: MatchState, setMatchState: any, addToast: any, ui: any }) {
  
  const applyMatchDetails = useCallback((matchDetails: any) => {
    if (!matchDetails) return;
    setMatchState((p: MatchState) => ({
      ...p,
      competition: p.competition || matchDetails.competition || '',
      stadium: p.stadium || matchDetails.stadium || '',
      referee: p.referee || matchDetails.referee || '',
      matchDate: p.matchDate || matchDetails.date || ''
    }));
  }, [setMatchState]);

  const processAIResult = useCallback((d: any, mode: 'home_only' | 'away_only' | 'both', tId?: 'home' | 'away') => {
    if (!d || !d.teams) return;
    const warnings: string[] = [];

    setMatchState((p: MatchState) => {
      let newState = { ...p };
      
      // Se tiver detalhes da partida, tenta preencher os campos vazios
      if (d.matchDetails) {
        newState.competition = newState.competition || d.matchDetails.competition || '';
        newState.stadium = newState.stadium || d.matchDetails.stadium || '';
        newState.referee = newState.referee || d.matchDetails.referee || '';
        newState.matchDate = newState.matchDate || d.matchDetails.date || '';
      }

      const processTeam = (teamData: any, target: 'homeTeam' | 'awayTeam') => {
        const formationKey = p[target].formation as keyof typeof FORMATIONS || '4-4-2';
        const coords = FORMATIONS[formationKey];
        let sC = 0, rC = 0;
        
        const nL = (teamData.players || []).map((pl: any) => {
          const isStarter = pl.isStarter !== false;
          let x = 50, y = 50;
          if (isStarter) {
            if (sC < coords.length) { x = coords[sC].x; y = coords[sC].y; }
            sC++;
          } else {
            x = 110; y = 20 + rC * 5; rC++;
          }

          let pos = pl.position || 'MF';
          const num = parseInt(String(pl.number));
          if (/goleiro|gk|gol/i.test(pos) || num === 1 || num === 12) pos = 'GK';

          return { 
            id: Math.random().toString(36).substr(2, 9), 
            fullName: pl.name, name: pl.name, number: pl.number, 
            position: pos, teamId: target === 'homeTeam' ? 'home' : 'away', 
            isStarter, events: [], x, y 
          };
        });

        if (!nL.some((pl: any) => pl.position === 'GK')) {
          warnings.push(`Sem goleiro para: ${teamData.teamName || target}`);
        }

        const updatedName = teamData.teamName || p[target].name;
        const otherKey = target === 'homeTeam' ? 'awayTeam' : 'homeTeam';
        const finalShort = generateDistinctShortName(updatedName, newState[otherKey]?.shortName || p[otherKey].shortName);

        newState[target] = { 
          ...p[target], 
          name: updatedName, 
          shortName: finalShort, 
          coach: teamData.coach || p[target].coach,
          commission: teamData.commission || p[target].commission,
          players: nL 
        };
      };

      if (mode === 'both' && d.teams.length >= 2) {
        processTeam(d.teams[0], 'homeTeam'); // Esquerda = Mandante
        processTeam(d.teams[1], 'awayTeam'); // Direita = Visitante
      } else if (mode === 'home_only') {
        processTeam(d.teams[0], 'homeTeam');
      } else if (mode === 'away_only') {
        const teamIdx = d.teams.length > 1 ? 1 : 0;
        processTeam(d.teams[teamIdx], 'awayTeam');
      } else if (tId) {
         processTeam(d.teams[0], tId === 'home' ? 'homeTeam' : 'awayTeam');
      }

      return newState;
    });

    setTimeout(() => {
      if (warnings.length > 0) warnings.forEach(w => addToast("IA", w, "warning"));
      addToast("IA", "Elenco carregado!", "success");
    }, 100);
  }, [setMatchState, addToast]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, tId: 'home' | 'away') => {
    const file = e.target.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = async(ev) => {
        const matches = ev.target?.result?.toString().match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if(matches) {
          try {
            addToast("IA", "Lendo Súmula...", "info");
            const d = await parsePlayersFromImage(matches[2], matches[1]);
            
            if (d && d.teams && d.teams.length > 0) {
              if (d.teams.length > 1) {
                ui.setPendingAIResult(d);
                ui.setShowAISelectionModal(true);
              } else {
                processAIResult(d, 'home_only', tId); // Fallback para o time clicado
              }
            } else {
              addToast("IA", "Nenhum dado encontrado.", "warning");
            }
          } catch(err: any) {
            addToast("IA", `Erro: ${err.message}`, "error");
          }
        }
      };
      r.readAsDataURL(file);
    }
    e.target.value = '';
  }, [addToast, ui, processAIResult]);


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

                let pos = pl.position || 'MF';
                const num = parseInt(String(pl.number));
                if (/goleiro|gk|gol/i.test(pos) || num === 1 || num === 12) {
                   pos = 'GK';
                }

                return { id: Math.random().toString(36).substr(2,9), fullName: pl.name, name: pl.name, number: pl.number, position: pos, teamId: tId, isStarter: pl.isStarter, events: [], x, y };
            });
            const otherKey = targetKey === 'homeTeam' ? 'awayTeam' : 'homeTeam';
            const finalShortName = generateDistinctShortName(p[targetKey].name, p[otherKey].shortName);
            
            const hasGK = plist.some(pl => pl.position === 'GK');
            if (!hasGK) {
              setTimeout(() => addToast("Atenção", "Nenhum goleiro (GK) detectado.", "warning"), 100);
            }

            return { ...p, [targetKey]: { ...p[targetKey], players: plist, shortName: finalShortName } };
        });
        addToast("Sucesso", "Lista importada!", "success");
    }
  }, [setMatchState, addToast]);

  return { handleImageUpload, handlePasteProcess, processAIResult };
}
