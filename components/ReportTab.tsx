import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { MatchState } from '../types';
import { generateMatchReport } from '../services/geminiService';

interface Props {
  matchState: MatchState;
  backup: any; // useBackupSystem
  handleGeminiError: (err: any) => void;
}

export default function ReportTab({ matchState, backup, handleGeminiError }: Props) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [finalReport, setFinalReport] = useState('');

  const handleGenerate = async () => {
    setIsGeneratingReport(true); 
    const now = Date.now();
    const elapsed = matchState.timeElapsed + (matchState.timerStartedAt && !matchState.isPaused ? now - matchState.timerStartedAt : 0);
    const currentMin = Math.floor(elapsed / 60000);
    const summary = (matchState.events || []).map(e => `[${e.minute}'] ${e.description}`).join('\n');
    const homeGoals = (matchState.events || []).filter(e => e.teamId === 'home' && e.type === 'GOAL').length;
    const awayGoals = (matchState.events || []).filter(e => e.teamId === 'away' && e.type === 'GOAL').length;
    const status = matchState.period === 'FINISHED' ? 'Finalizada' : `Em andamento (${matchState.period} - ${currentMin}')`;
    const context = `Partida: ${matchState.homeTeam.name} ${homeGoals} x ${awayGoals} ${matchState.awayTeam.name}. Status: ${status}. Competição: ${matchState.competition}.`;
    try {
      const report = await generateMatchReport(context, summary); 
      setFinalReport(report); 
    } catch (error) {
      handleGeminiError(error);
    } finally {
      setIsGeneratingReport(false); 
    }
  };

  return (
    <div className="bg-slate-900/50 p-6 md:p-12 rounded-[2rem] border border-white/10 min-h-[60vh] flex flex-col shadow-2xl relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Relatório</h2>
        <button onClick={backup.copyMatchReport} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-bold transition-all">
          <ClipboardList size={14} /> Copiar Resumo
        </button>
      </div>
      <button 
        onClick={handleGenerate} 
        disabled={isGeneratingReport}
        className="bg-blue-600 p-3 rounded-lg text-white font-bold text-xs w-max mb-4 disabled:opacity-50"
      >
        {isGeneratingReport ? 'Gerando...' : 'Gerar Análise Crônica com IA'}
      </button>
      <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: finalReport.replace(/\n/g, '<br/>') }} />
    </div>
  );
}
