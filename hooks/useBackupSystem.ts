import React, { useCallback } from 'react';
import { MatchState } from '../types';
import { generateReportText } from '../utils/reportUtils';

export function useBackupSystem({ matchState, setMatchState, addToast, formatEventType, setIsSettingsOpen }: { matchState: MatchState, setMatchState: any, addToast: any, formatEventType: any, setIsSettingsOpen: any }) {
  
  const exportMatchLog = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(matchState));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    
    const sanitize = (str: string) => (str || 'indef').toString().replace(/[\s/\\]+/g, '-').toLowerCase();
    const comp = sanitize(matchState.competition);
    const date = sanitize(matchState.matchDate);
    const home = sanitize(matchState.homeTeam?.name);
    const away = sanitize(matchState.awayTeam?.name);
    
    dlAnchorElem.setAttribute("download", `${comp}_${date}_${home}_${away}.json`);
    dlAnchorElem.click();
    addToast("Backup Exportado", "O arquivo JSON foi salvo no seu dispositivo.", "success");
    setIsSettingsOpen(false);
  }, [matchState, addToast, setIsSettingsOpen]);

  const handleImportLog = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const importedState = JSON.parse(ev.target?.result as string);
            if (importedState.homeTeam && importedState.awayTeam) {
                setMatchState(importedState);
                addToast("Sucesso", "Backup restaurado com sucesso!", "success");
            } else throw new Error("Arquivo inválido");
        } catch (err) { addToast("Erro", "O arquivo importado não é um backup válido.", "error"); }
    };
    reader.readAsText(file);
    setIsSettingsOpen(false);
  }, [setMatchState, addToast, setIsSettingsOpen]);

  const copyMatchReport = useCallback(() => {
    const reportText = generateReportText(matchState, formatEventType);
    navigator.clipboard.writeText(reportText);
    addToast("Copiado", "Relatório na área de transferência", "success");
  }, [matchState, formatEventType, addToast]);

  return { exportMatchLog, handleImportLog, copyMatchReport };
}
