import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Play, Pause, Settings, Info, ChevronRight, Flag, History, Loader2, Mic, Send, Users
} from 'lucide-react';
import { inject } from "@vercel/analytics"
import { MatchState, Player, Team, EventType } from './types';
import ToastContainer from './components/ToastContainer';
import Header from './components/Header';
import PreMatchSetup from './components/PreMatchSetup';
import { 
  EditTeamModal, EditPlayerModal, EditCoachModal, EndGameOptionsModal, PenaltyStarterModal, ImportListModal, ResetConfirmModal, AISelectionModal 
} from './components/MatchModals';
import PlayerActionModal from './components/PlayerActionModal';
import TeamActionModal from './components/TeamActionModal';

// Hooks Arquiteturais
import { useToasts } from './hooks/useToasts';
import { useUIController } from './hooks/useUIController';
import { useMatchController } from './hooks/useMatchController';
import { useBackupSystem } from './hooks/useBackupSystem';
import { useAIExtractor } from './hooks/useAIExtractor';
import { useVoiceCommand } from './hooks/useVoiceCommand';

// Abas (Views)
import DashboardTab from './components/DashboardTab';
import MatchStats from './components/MatchStats';

import { generateDistinctShortName } from './utils/teamUtils';

export default function App() {
  const { toasts, addToast, removeToast } = useToasts();
  const ui = useUIController();
  const ctrl = useMatchController(addToast);
  const backup = useBackupSystem({ matchState: ctrl.matchState, setMatchState: ctrl.setMatchState, addToast, formatEventType: ctrl.formatEventType, setIsSettingsOpen: ui.setIsSettingsOpen });
  const ai = useAIExtractor({ matchState: ctrl.matchState, setMatchState: ctrl.setMatchState, addToast, ui });

  // Initialize Vercel Analytics
  useEffect(() => {
    inject();
  }, []);

  const [hasApiKey, setHasApiKey] = useState(true);
  const [billingError, setBillingError] = useState(false);
  const [invalidKeyError, setInvalidKeyError] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // @ts-ignore
        const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
        setHasApiKey(!!envKey || !!localStorage.getItem('GEMINI_API_KEY'));
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasApiKey(true); setBillingError(false); setInvalidKeyError(false);
    } else {
      const key = prompt("Localhost / Sem Proxy IA:\n\nPor favor, informe a Chave de API do Gemini para continuar.");
      if (key && key.trim()) {
        localStorage.setItem('GEMINI_API_KEY', key.trim());
        setHasApiKey(true); setBillingError(false); setInvalidKeyError(false);
      }
    }
  };

  const handleGeminiError = (error: any) => {
    const msg = error?.message || "";
    if (msg === "BILLING_LIMIT_EXCEEDED") {
      setBillingError(true);
      addToast("Erro de Faturamento", "Seu limite de gastos no Google Cloud foi atingido.", "error");
    } else if (msg === "INVALID_API_KEY") {
      setInvalidKeyError(true);
      addToast("Erro de API", "Chave de API inválida ou não selecionada.", "error");
    } else {
      addToast("Erro de IA", "Ocorreu um erro ao processar o comando.", "error");
    }
  };

  const { isRecording, isProcessing, commandText, setCommandText, toggleRecording, processCommand } = useVoiceCommand({
    matchState: ctrl.matchState,
    addToast,
    addEvent: ctrl.addEvent,
    setMatchState: ctrl.setMatchState,
    formatEventType: ctrl.formatEventType,
    handleGeminiError
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleActionFromModal = (type: EventType | 'TOGGLE_STARTER', details: { relatedPlayer?: Player, manualSub?: { name: string, number: number }, customDescription?: string }) => {
    if (!ui.selectedPlayerForAction) return;

    if (type === 'TOGGLE_STARTER') {
      ctrl.setMatchState((prev: MatchState) => {
        const teamKey = ui.selectedPlayerForAction!.teamId === 'home' ? 'homeTeam' : 'awayTeam';
        const team = prev[teamKey];
        const updatedPlayers = team.players.map(p =>
          p.id === ui.selectedPlayerForAction!.player.id ? { ...p, isStarter: !p.isStarter } : p
        );
        return { ...prev, [teamKey]: { ...team, players: updatedPlayers } };
      });
      addToast("Correção de Escalação", `${ui.selectedPlayerForAction.player.name} movido para o ${ui.selectedPlayerForAction.player.isStarter ? 'Banco' : 'Campo'}.`, "success");
      ui.setSelectedPlayerForAction(null);
      return;
    }

    let description = details.customDescription || `${ctrl.formatEventType(type as EventType)}: ${ui.selectedPlayerForAction.player.name}`;
    if (type === 'SUBSTITUTION') description = "Substituição"; 
    ctrl.addEvent({ type: type as EventType, teamId: ui.selectedPlayerForAction.teamId, playerId: ui.selectedPlayerForAction.player.id, relatedPlayerId: details.relatedPlayer?.id, manualSub: details.manualSub, description });
    ui.setSelectedPlayerForAction(null); 
  };

  const handleTeamActionFromModal = (type: EventType, details: { playerId?: string, customDescription?: string }) => {
      if (!ui.selectedTeamForAction) return;
      ctrl.addEvent({ 
        type, 
        teamId: ui.selectedTeamForAction.teamId, 
        playerId: details.playerId,
        description: details.customDescription || `${ctrl.formatEventType(type)} - ${ui.selectedTeamForAction.team.shortName}` 
      });
      ui.setSelectedTeamForAction(null);
  };

  return (
    <div className={`h-screen flex flex-col font-sans selection:bg-blue-500/20 overflow-hidden transition-colors duration-500 ${ui.isLightMode ? 'claro' : 'bg-slate-950 text-slate-50'}`}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={backup.handleImportLog} />
      
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-[70] flex gap-2">
        {!hasApiKey && (
           <button onClick={handleOpenKeySelector} className="px-3 py-2 rounded-full bg-red-600/80 text-white text-[10px] font-black uppercase tracking-wider border border-red-500 shadow-xl opacity-90 hover:opacity-100 flex items-center gap-1 animate-pulse">
             ⚠ Configurar API Gemini
           </button>
        )}
        <button onClick={() => ui.setIsSettingsOpen(!ui.isSettingsOpen)} className="p-2 rounded-full bg-slate-800 text-slate-200 border border-slate-700 shadow-xl opacity-80 hover:opacity-100" title="Menu">
           <Settings size={16} />
        </button>
        <button onClick={() => ui.setIsLightMode(!ui.isLightMode)} className="p-2 rounded-full bg-slate-800 text-slate-200 border border-slate-700 shadow-xl opacity-80 hover:opacity-100" title="Alternar Contraste">
           <Info size={16} /> 
        </button>
      </div>

      <Header 
        matchState={ctrl.matchState}
        resetSignal={ctrl.resetSignal}
        isFullscreen={ui.isFullscreen}
        onPlayPauseToggle={ctrl.handlePlayPauseToggle}
        onMinuteChange={ctrl.handleMinuteChange}
        onNextPeriodClick={() => {
            ui.setIsSettingsOpen(false);
            if (ctrl.matchState.period === '2T' || ctrl.matchState.period === '2ET') ui.setShowEndGameModal(true);
            else ctrl.advancePeriod(); 
        }}
        onUpdateTeamName={(teamId, newName) => {
          ctrl.setMatchState((prev: MatchState) => {
            const tKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
            const oKey = teamId === 'home' ? 'awayTeam' : 'homeTeam';
            
            const expectedShort = generateDistinctShortName(prev[tKey].name, prev[oKey].shortName);
            const isAutoShort = !prev[tKey].shortName || prev[tKey].shortName === expectedShort;
            const newShort = isAutoShort ? generateDistinctShortName(newName, prev[oKey].shortName) : prev[tKey].shortName;

            return {
              ...prev,
              [tKey]: {
                ...prev[tKey],
                name: newName,
                shortName: newShort
              }
            };
          });
        }}
      />

      <main className={`flex-1 flex flex-col px-2 md:px-4 min-h-0 ${ui.isFullscreen ? 'overflow-hidden pb-24 pt-2 md:pt-4' : 'overflow-y-auto pb-40 pt-4'} custom-scrollbar transition-all`}>
        <div className={`w-full max-w-7xl mx-auto flex flex-col min-h-0 ${ui.isFullscreen ? 'h-full' : 'gap-4 md:gap-6'}`}>
            {!ui.isFullscreen && (
            <div className="flex justify-center gap-4">
               {(['main', 'stats'] as const).map((tab) => (
                <button key={tab} onClick={() => ui.setActiveTab(tab)} className={`px-6 py-2 rounded-full font-black text-[10px] tracking-widest transition-all ${ui.activeTab === tab ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{tab === 'main' ? 'DASHBOARD' : 'ESTATÍSTICAS'}</button>
                ))}
            </div>
            )}

            {ui.activeTab === 'main' && <DashboardTab matchState={ctrl.matchState} ctrl={ctrl} ui={ui} ai={ai} />}
            {ui.activeTab === 'stats' && <MatchStats state={ctrl.matchState} />}
        </div>
      </main>

      {/* Roda-Pé de Comando (Mobile-Friendly) */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <button onClick={ctrl.handlePlayPauseToggle} className={`p-4 rounded-2xl shadow-xl transition-all shrink-0 ${ctrl.matchState.isPaused ? 'bg-emerald-600 text-white' : 'bg-yellow-500 text-slate-900'} flex items-center justify-center active:scale-90`}>{ctrl.matchState.isPaused ? <Play size={22} fill="currentColor"/> : <Pause size={22} fill="currentColor"/>}</button>
          <div className="flex-1 bg-slate-900/95 p-1.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-1.5 backdrop-blur-3xl ring-1 ring-white/5 relative">
            <button type="button" onClick={toggleRecording} className={`p-3 rounded-xl transition-all active:scale-90 shrink-0 ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'}`}><Mic size={18} className="text-white" /></button>
            <div className="flex-1 relative min-w-0">
              <input 
                type="text" 
                placeholder={isRecording ? "Ouvindo..." : (isProcessing ? "Interpretando..." : "Lance ou pergunta...")} 
                disabled={isProcessing}
                className="w-full bg-transparent border-none py-2.5 px-1 font-bold text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0" 
                value={commandText} 
                onChange={(e) => setCommandText(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); processCommand(commandText); } }}
              />
              {isProcessing && <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 animate-spin text-blue-500 mr-2" size={16} />}
            </div>
            <button type="button" onClick={() => processCommand(commandText)} disabled={isProcessing || !commandText.trim()} className="p-3 bg-blue-600 rounded-xl text-white font-black hover:bg-blue-500 transition-colors active:scale-95 shadow-lg shrink-0 disabled:opacity-50"><Send size={18} /></button>
          </div>
        </div>
      </div>

      {/* Premium AI Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-slate-900/90 p-8 rounded-[2.5rem] border border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col items-center gap-4 max-w-xs w-full">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Mic size={24} className="text-blue-400 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Gemini está PENSANDO</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Sincronizando com a Narração...</p>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE MODAIS E INFORMATIVOS */}
      {ui.isContextModalOpen && <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"><PreMatchSetup matchState={ctrl.matchState} setMatchState={ctrl.setMatchState} onSave={() => { ui.setIsContextModalOpen(false); addToast("Partida Iniciada", "Configurações salvas e cronômetro pronto.", "success"); }} onClose={() => ui.setIsContextModalOpen(false)} handleGeminiError={handleGeminiError} /></div>}
      
      {ui.isSettingsOpen && (
        <div className="fixed inset-0 z-[75]" onClick={() => ui.setIsSettingsOpen(false)}>
           <div className="absolute top-14 right-4 w-72 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl p-4 flex flex-col gap-2 z-[80]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { ui.setIsContextModalOpen(true); ui.setIsSettingsOpen(false); }} className="w-full p-4 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:bg-white/5 hover:text-white text-left flex items-center gap-3"><Info size={16}/> Editar Súmula</button>
              <button onClick={() => { ui.setIsSettingsOpen(false); if(ctrl.matchState.period === '2T' || ctrl.matchState.period === '2ET') ui.setShowEndGameModal(true); else ctrl.advancePeriod(); }} className="w-full p-4 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/5 text-left flex items-center gap-3"><ChevronRight size={16}/> Próxima Fase</button>
              <button onClick={() => { ctrl.handleFinalizeMatch(); ui.setIsSettingsOpen(false); ui.setActiveTab('stats'); }} className="w-full p-4 rounded-xl text-[10px] font-black uppercase text-blue-400 hover:bg-blue-500/10 text-left flex items-center gap-3"><Flag size={16} className="text-red-500" /> Finalizar Partida</button>
              <button onClick={() => { 
                const safeEvents = ctrl.matchState.events || [];
                const idx = safeEvents.findIndex(e => ['GOAL', 'PENALTY', 'RED_CARD'].includes(e.type) && !e.isAnnulled);
                if (idx !== -1) {
                  ctrl.saveToHistory(); 
                  ctrl.setMatchState((prev: MatchState) => { 
                    const nE = [...(prev.events || [])]; 
                    const i = nE.findIndex(e => ['GOAL', 'PENALTY', 'RED_CARD'].includes(e.type) && !e.isAnnulled); 
                    if (i !== -1) { 
                      nE[i] = { ...nE[i], isAnnulled: true, description: `${nE[i].description} (ANULADO)` }; 
                      const now = Date.now();
                      const currentMs = prev.timeElapsed + (prev.timerStartedAt ? now - prev.timerStartedAt : 0);
                      const currentMin = Math.floor(currentMs / 60000);
                      nE.unshift({ id: Math.random().toString(36).substr(2, 9), type: 'VAR', teamId: 'none', minute: currentMin, timestamp: now, description: `VAR anulou lance`, isAnnulled: false }); 
                      return { ...prev, events: nE }; 
                    } 
                    return prev; 
                  }); 
                } else addToast("VAR", "Nada a anular", "info");
                ui.setIsSettingsOpen(false);
              }} className="w-full p-4 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/5 text-left flex items-center gap-3"><History size={16}/> Reversão de VAR</button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full w-full p-4 rounded-xl text-[10px] font-black uppercase flex items-center gap-3"><History size={16}/> Importar Backup</button>
              <button onClick={backup.exportMatchLog} className="w-full p-4 rounded-xl text-[10px] font-black flex items-center gap-3"><History size={16} /> Exportar Backup</button>
              <button onClick={() => { ui.setShowResetModal(true); ui.setIsSettingsOpen(false); }} className="w-full p-4 rounded-xl text-[10px] font-black text-red-500 border border-red-500/20 flex items-center gap-3"><History size={16}/> Resetar Partida</button>
           </div>
        </div>
      )}

      {ui.showEndGameModal && <EndGameOptionsModal isOpen={ui.showEndGameModal} onClose={() => ui.setShowEndGameModal(false)} onFinish={() => { ctrl.handleFinalizeMatch(); ui.setActiveTab('stats'); ui.setShowEndGameModal(false); }} onExtraTime={() => { ctrl.advancePeriod('1ET'); ui.setShowEndGameModal(false); }} onPenalties={() => { ui.setShowPenaltyStarterModal(true); ui.setShowEndGameModal(false); }} />}
      {ui.showPenaltyStarterModal && <PenaltyStarterModal isOpen={ui.showPenaltyStarterModal} homeTeam={ctrl.matchState.homeTeam} awayTeam={ctrl.matchState.awayTeam} onClose={() => ui.setShowPenaltyStarterModal(false)} onSelect={(teamId) => { ctrl.setMatchState((prev: MatchState) => ({ ...prev, penaltyStarter: teamId as 'home'|'away' })); ctrl.advancePeriod('PENALTIES'); ui.setShowPenaltyStarterModal(false); }} />}
      {ui.showResetModal && <ResetConfirmModal isOpen={ui.showResetModal} onConfirm={() => { ctrl.handleReset(); ui.setShowResetModal(false); }} onClose={() => ui.setShowResetModal(false)} />}
      
      {ui.teamModal.isOpen && <EditTeamModal isOpen={ui.teamModal.isOpen} team={ui.teamModal.teamId === 'home' ? ctrl.matchState.homeTeam : ctrl.matchState.awayTeam} onClose={() => ui.setTeamModal({isOpen: false, teamId: 'home'})} onSave={(name, shortName, color) => { ctrl.saveToHistory(); ctrl.setMatchState((prev: MatchState) => { const k = ui.teamModal.teamId === 'home' ? 'homeTeam' : 'awayTeam'; return { ...prev, [k]: { ...prev[k], name, shortName, color } }; }); ui.setTeamModal({isOpen: false, teamId: 'home'}); addToast("Equipe Atualizada", "Detalhes salvos com sucesso", "success"); }} />}
      {ui.coachModal.isOpen && <EditCoachModal isOpen={ui.coachModal.isOpen} initialName={ui.coachModal.teamId === 'home' ? (ctrl.matchState.homeTeam.coach || '') : (ctrl.matchState.awayTeam.coach || '')} onClose={() => ui.setCoachModal({isOpen: false, teamId: 'home'})} onSave={(name) => { ctrl.saveToHistory(); ctrl.setMatchState((prev: MatchState) => { const k = ui.coachModal.teamId === 'home' ? 'homeTeam' : 'awayTeam'; return { ...prev, [k]: { ...prev[k], coach: name } }; }); ui.setCoachModal({isOpen: false, teamId: 'home'}); addToast("Treinador Atualizado", "Nome salvo com sucesso", "success"); }} />}
      {ui.playerModal.isOpen && ui.playerModal.player && <EditPlayerModal isOpen={ui.playerModal.isOpen} player={ui.playerModal.player} onClose={() => ui.setPlayerModal({isOpen: false, teamId: 'home', player: null})} onSave={(name, number, isStarter) => { ctrl.saveToHistory(); ctrl.setMatchState((prev: MatchState) => { const k = ui.playerModal.teamId === 'home' ? 'homeTeam' : 'awayTeam'; return { ...prev, [k]: { ...prev[k], players: prev[k].players.map(pl => pl.id === ui.playerModal.player!.id ? { ...pl, name, number, isStarter } : pl) } }; }); ui.setPlayerModal({isOpen: false, teamId: 'home', player: null}); }} />}
      {ui.importListModal.isOpen && <ImportListModal isOpen={ui.importListModal.isOpen} onClose={() => ui.setImportListModal({ isOpen: false, teamId: 'home'})} onProcess={async (text) => { await ai.handlePasteProcess(text, ui.importListModal.teamId); ui.setImportListModal({ isOpen: false, teamId: 'home'}); }} />}
      {ui.selectedPlayerForAction && (
        <PlayerActionModal 
          player={ui.selectedPlayerForAction.player} 
          team={ui.selectedPlayerForAction.teamId === 'home' ? ctrl.matchState.homeTeam : ctrl.matchState.awayTeam} 
          onClose={() => ui.setSelectedPlayerForAction(null)} 
          onAction={handleActionFromModal} 
        />
      )}

      {ui.selectedTeamForAction && <TeamActionModal team={ui.selectedTeamForAction.team} teamId={ui.selectedTeamForAction.teamId} onClose={() => ui.setSelectedTeamForAction(null)} onAction={handleTeamActionFromModal} />}
      
      <AISelectionModal 
        isOpen={ui.showAISelectionModal} 
        result={ui.pendingAIResult} 
        onClose={() => { ui.setShowAISelectionModal(false); ui.setPendingAIResult(null); }}
        onSelect={(mode) => {
          ai.processAIResult(ui.pendingAIResult, mode);
          ui.setShowAISelectionModal(false);
          ui.setPendingAIResult(null);
        }}
      />
    </div>
  );
}
