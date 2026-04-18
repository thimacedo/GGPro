import { useState, useEffect, useCallback } from 'react';
import { useMatchState } from './hooks/useMatchState';
import { CommandBar } from './components/CommandBar';
import { Timeline } from './components/Timeline';
import { StatsPanel } from './components/StatsPanel';
import { ReportPanel } from './components/ReportPanel';
import { SettingsModal } from './components/SettingsModal';
import { OCRImport } from './components/OCRImport';
import { AIAssistant } from './components/AIAssistant';
import { PresentationMode } from './components/PresentationMode';
import { QuickNotes } from './components/QuickNotes';
import type { TabType, Player, SavedMatch, Team, MatchEvent } from './types';

// Haptic feedback
function vibrate(ms: number = 15) {
  try { navigator.vibrate?.(ms); } catch {}
}

export default function App() {
  const {
    state, togglePlayPause, advancePeriod, addEvent, annulEvent, varReview,
    addPenaltyKick, updateTeam, updateMatchDetails, updateCoach, addPlayer,
    removePlayer, updatePlayer, resetMatch, undo, saveToHistory,
    getTeamStats, getDisplayTime, getFootballMinute, getTeamGoalCount, importFromOCR,
    togglePossession, getPossessionPercent,
    saveMatchToHistory, getMatchHistory, loadMatchFromHistory, deleteMatchFromHistory,
    addQuickNote, removeQuickNote,
    EVENT_ICONS,
  } = useMatchState();

  // Navigation state
  const [activeTab, setActiveTab] = useState<TabType>('main');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOCRImportOpen, setIsOCRImportOpen] = useState(false);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  // Derived state
  const homeGoals = getTeamGoalCount('home');
  const awayGoals = getTeamGoalCount('away');
  const displayTime = getDisplayTime();
  const footballMinute = getFootballMinute();
  const possession = getPossessionPercent();
  const { period, isPaused, penaltyScore, homeTeam, awayTeam } = state;
  const isLive = !isPaused && (period === '1T' || period === '2T' || period === '1ET' || period === '2ET');

  // Tick for timer updates
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save every 2 min during live match
  useEffect(() => {
    if (isPaused || period === 'PRE_MATCH' || period === 'FINISHED') return;
    const interval = setInterval(() => saveMatchToHistory(), 120000);
    return () => clearInterval(interval);
  }, [isPaused, period, saveMatchToHistory]);

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlayPause(); vibrate(30); break;
        case 'g': case 'G': addEvent({ type: 'GOAL', teamId: selectedTeam }); vibrate(50); break;
        case 'y': case 'Y': addEvent({ type: 'YELLOW_CARD', teamId: selectedTeam }); vibrate(20); break;
        case 'r': case 'R': addEvent({ type: 'RED_CARD', teamId: selectedTeam }); vibrate(40); break;
        case 'f': case 'F': addEvent({ type: 'FOUL', teamId: selectedTeam }); break;
        case 'c': case 'C': addEvent({ type: 'CORNER', teamId: selectedTeam }); break;
        case 's': case 'S': addEvent({ type: 'SHOT', teamId: selectedTeam }); break;
        case 'v': case 'V': addEvent({ type: 'VAR', teamId: selectedTeam }); break;
        case 'z': case 'Z': if (e.ctrlKey || e.metaKey) { e.preventDefault(); undo(); } break;
        case 'p': case 'P': advancePeriod(); break;
        case 'Tab': e.preventDefault(); setSelectedTeam(t => t === 'home' ? 'away' : 'home'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlayPause, addEvent, undo, advancePeriod, selectedTeam]);

  // Event handlers
  const handleTogglePlayPause = useCallback(() => {
    saveToHistory();
    togglePlayPause();
    vibrate(25);
  }, [saveToHistory, togglePlayPause]);

  const handleAddEvent = useCallback((data: Parameters<typeof addEvent>[0]) => {
    saveToHistory();
    addEvent(data);
    vibrate(data.type === 'GOAL' ? 50 : data.type === 'RED_CARD' ? 40 : 15);
  }, [saveToHistory, addEvent]);

  const handleAdvancePeriod = useCallback((targetPeriod?: string) => {
    saveToHistory();
    advancePeriod(targetPeriod as any);
    vibrate(30);
  }, [saveToHistory, advancePeriod]);

  const handleOCRImport = useCallback((data: {
    homeTeamName: string; awayTeamName: string;
    homePlayers: Omit<Player, 'id'>[]; awayPlayers: Omit<Player, 'id'>[];
    competition: string; category: string; stadium: string; referee: string;
    date: string; time: string; homeCoach: string; awayCoach: string;
  }) => {
    importFromOCR(data);
    vibrate(25);
  }, [importFromOCR]);

  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${homeTeam.shortName}_vs_${awayTeam.shortName}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state, homeTeam.shortName, awayTeam.shortName]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.homeTeam && data.awayTeam) {
          localStorage.setItem('narrador_pro_v6_state', JSON.stringify(data));
          window.location.reload();
        }
      } catch { alert('Arquivo inválido'); }
    };
    input.click();
  }, []);

  const showOnboarding = period === 'PRE_MATCH' && homeTeam.players.length === 0 && awayTeam.players.length === 0;

  // Period labels and colors
  const PERIOD_LABELS: Record<string, string> = {
    PRE_MATCH: 'PRÉ-JOGO', '1T': '1º TEMPO', INTERVAL: 'INTERVALO', '2T': '2º TEMPO',
    '1ET': '1ª PRORR.', '2ET': '2ª PRORR.', PENALTIES: 'PÊNALTIS', FINISHED: 'FIM',
  };
  const PERIOD_COLORS: Record<string, string> = {
    PRE_MATCH: 'text-neutral-500', '1T': 'text-emerald-400', INTERVAL: 'text-amber-400',
    '2T': 'text-emerald-400', '1ET': 'text-blue-400', '2ET': 'text-blue-400',
    PENALTIES: 'text-red-400', FINISHED: 'text-neutral-600',
  };

  return (
    <div className="min-h-dvh flex flex-col bg-black text-white select-none overflow-hidden">
      {/* ========== SCOREBOARD ========== */}
      <header className="shrink-0 bg-black/95 backdrop-blur-md border-b border-white/5 safe-top">
        {/* Competition bar */}
        {state.matchDetails.competition && (
          <div className="text-center py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider border-b border-white/5">
            🏆 {state.matchDetails.competition}
            {state.matchDetails.stadium && <span className="ml-2 text-neutral-600">· {state.matchDetails.stadium}</span>}
          </div>
        )}
        
        {/* Scoreboard */}
        <div className="flex items-center justify-between px-3 py-2">
          {/* HOME */}
          <button 
            onClick={() => { togglePossession('home'); vibrate(10); }}
            className="flex items-center gap-2 flex-1 justify-end"
          >
            <div className="flex flex-col items-end">
              <span className="text-sm sm:text-lg font-bold uppercase tracking-tight truncate max-w-[120px] sm:max-w-[200px]">
                {homeTeam.shortName}
              </span>
              <span className="text-[10px] text-neutral-600 font-medium">{homeTeam.formation}</span>
            </div>
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-black"
              style={{ backgroundColor: homeTeam.color }}
            >
              {homeGoals}
            </div>
            {period === 'PENALTIES' && (
              <span className="text-sm font-bold text-blue-400 ml-1">({penaltyScore.home})</span>
            )}
          </button>

          {/* CENTER */}
          <div className="flex flex-col items-center justify-center mx-2 sm:mx-4 shrink-0">
            {/* Period */}
            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${PERIOD_COLORS[period] || 'text-neutral-500'} ${isLive ? 'animate-pulse-live' : ''}`}>
              {PERIOD_LABELS[period] || period}
            </span>
            
            {/* Timer */}
            <div className="flex items-center gap-2 my-1">
              <div className="bg-neutral-900 px-3 py-1 rounded-lg flex items-center">
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight">
                  {displayTime.split(':')[0]}
                </span>
                <span className={`${isLive ? 'text-yellow-400 animate-pulse-live' : 'text-neutral-700'} text-2xl sm:text-3xl font-black mx-0.5`}>
                  :
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight">
                  {displayTime.split(':')[1]}
                </span>
              </div>
              
              {/* Play/Pause */}
              <button
                onClick={handleTogglePlayPause}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                  isLive 
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                    : 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
                }`}
              >
                {isPaused ? (
                  <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Football minute */}
            <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-400/70">
              {footballMinute}
            </span>
            
            {/* Advance period */}
            <button
              onClick={() => handleAdvancePeriod()}
              className="mt-1 text-[9px] font-bold text-neutral-600 hover:text-white uppercase tracking-wider transition-colors"
            >
              Avançar período →
            </button>
          </div>

          {/* AWAY */}
          <button 
            onClick={() => { togglePossession('away'); vibrate(10); }}
            className="flex items-center gap-2 flex-1"
          >
            <div 
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-black"
              style={{ backgroundColor: awayTeam.color }}
            >
              {awayGoals}
            </div>
            {period === 'PENALTIES' && (
              <span className="text-sm font-bold text-blue-400 mr-1">({penaltyScore.away})</span>
            )}
            <div className="flex flex-col items-start">
              <span className="text-sm sm:text-lg font-bold uppercase tracking-tight truncate max-w-[120px] sm:max-w-[200px]">
                {awayTeam.shortName}
              </span>
              <span className="text-[10px] text-neutral-600 font-medium">{awayTeam.formation}</span>
            </div>
          </button>
        </div>

        {/* Possession bar */}
        {(possession.home > 0 || possession.away > 0) && (
          <div className="flex h-1 bg-neutral-900">
            <div 
              className="h-full transition-all duration-300"
              style={{ width: `${possession.home}%`, backgroundColor: homeTeam.color }}
            />
            <div 
              className="h-full transition-all duration-300"
              style={{ width: `${possession.away}%`, backgroundColor: awayTeam.color }}
            />
          </div>
        )}
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Onboarding */}
        {showOnboarding && activeTab === 'main' && (
          <OnboardingScreen
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenOCR={() => setIsOCRImportOpen(true)}
            onStart={handleTogglePlayPause}
          />
        )}

        {/* Tab Content */}
        {!showOnboarding && (
          <>
            {activeTab === 'main' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* CommandBar - AQUI no topo, ANTES da Timeline */}
                <CommandBar
                  state={state}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                  onAddEvent={handleAddEvent}
                  onAddPenaltyKick={addPenaltyKick}
                  onToggleTimer={handleTogglePlayPause}
                  onAdvancePeriod={handleAdvancePeriod}
                  onReset={resetMatch}
                  onUndo={undo}
                  onVarReview={varReview}
                  events={state.events}
                />
                
                {/* Timeline - ABAIXO dos botões */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                  <Timeline 
                    state={state} 
                    onAnnulEvent={(id) => { annulEvent(id); vibrate(20); }} 
                    onUndo={undo} 
                  />
                </div>
              </div>
            )}
            {activeTab === 'lineup' && (
              <div className="flex-1 overflow-y-auto p-2">
                <LineupView homeTeam={homeTeam} awayTeam={awayTeam} events={state.events} />
              </div>
            )}
            {activeTab === 'stats' && (
              <div className="flex-1 overflow-y-auto p-2">
                <StatsPanel state={state} getTeamStats={getTeamStats} possession={possession} />
              </div>
            )}
            {activeTab === 'report' && (
              <div className="flex-1 overflow-y-auto p-2">
                <ReportPanel state={state} homeGoals={homeGoals} awayGoals={awayGoals} onSaveMatch={saveMatchToHistory} />
              </div>
            )}
            {activeTab === 'ai' && (
              <div className="flex-1 overflow-y-auto p-2">
                <AIAssistant state={state} homeGoals={homeGoals} awayGoals={awayGoals} />
              </div>
            )}
          </>
        )}
      </main>

      {/* ========== BOTTOM NAV ========== */}
      {!showOnboarding && (
        <nav className="shrink-0 bg-neutral-950 border-t border-white/5 safe-bottom">
          <div className="flex justify-around items-center py-2">
            {[
              { id: 'main' as const, icon: '📺', label: 'Narração' },
              { id: 'lineup' as const, icon: '👥', label: 'Escalação' },
              { id: 'stats' as const, icon: '📊', label: 'Stats' },
              { id: 'report' as const, icon: '📝', label: 'Relatório' },
              { id: 'ai' as const, icon: '🤖', label: 'IA' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-lg transition-all ${
                  activeTab === tab.id 
                    ? 'text-green-400' 
                    : 'text-neutral-600 active:text-neutral-400'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* Quick actions bar */}
          <div className="flex justify-center items-center gap-2 pb-2 px-2">
            <QuickNotes
              notes={state.quickNotes}
              period={period}
              onAdd={addQuickNote}
              onRemove={removeQuickNote}
            />
            <button onClick={() => setIsPresentationMode(true)} className="px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-400 text-[10px] font-bold uppercase tracking-wider active:bg-neutral-800 transition-colors">
              🖥️ Tela
            </button>
            <button onClick={() => setIsOCRImportOpen(true)} className="px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-400 text-[10px] font-bold uppercase tracking-wider active:bg-neutral-800 transition-colors">
              📸 OCR
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-400 text-[10px] font-bold uppercase tracking-wider active:bg-neutral-800 transition-colors">
              ⚙️
            </button>
            <button onClick={() => setShowMatchHistory(true)} className="px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-400 text-[10px] font-bold uppercase tracking-wider active:bg-neutral-800 transition-colors">
              📁
            </button>
          </div>
        </nav>
      )}

      {/* ========== MODALS ========== */}
      <SettingsModal
        state={state}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateTeam={updateTeam}
        onAddPlayer={addPlayer}
        onRemovePlayer={removePlayer}
        onUpdatePlayer={updatePlayer}
        onUpdateMatchDetails={updateMatchDetails}
        onUpdateCoach={updateCoach}
        onResetMatch={resetMatch}
        onImportJSON={handleImportJSON}
        onExportJSON={handleExportJSON}
      />
      
      <OCRImport
        isOpen={isOCRImportOpen}
        onClose={() => setIsOCRImportOpen(false)}
        onImport={handleOCRImport}
      />

      {showMatchHistory && (
        <MatchHistoryModal
          history={getMatchHistory()}
          onLoad={(id) => { loadMatchFromHistory(id); setShowMatchHistory(false); }}
          onDelete={deleteMatchFromHistory}
          onClose={() => setShowMatchHistory(false)}
        />
      )}

      {/* Presentation Mode */}
      {isPresentationMode && (
        <PresentationMode
          state={state}
          getDisplayTime={getDisplayTime}
          getFootballMinute={getFootballMinute}
          EVENT_ICONS={EVENT_ICONS}
          onClose={() => setIsPresentationMode(false)}
        />
      )}
    </div>
  );
}

/* ============ ONBOARDING ============ */
function OnboardingScreen({ onOpenSettings, onOpenOCR, onStart }: { 
  onOpenSettings: () => void; 
  onOpenOCR: () => void; 
  onStart: () => void; 
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-8 animate-scale-in">
        <div>
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-3xl font-black uppercase tracking-tight">GGPro</h1>
          <p className="text-neutral-500 text-sm mt-2">Narrador Pro — Seu assistente de transmissão</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onOpenOCR}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98]"
          >
            📸 Importar Súmula (OCR)
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-4 bg-neutral-800 rounded-2xl text-white font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98]"
          >
            ⚙️ Configurar Manualmente
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black px-3 text-[10px] text-neutral-600 uppercase tracking-widest font-bold">ou</span>
            </div>
          </div>

          <button
            onClick={onStart}
            className="w-full py-4 bg-neutral-900 rounded-2xl text-neutral-400 font-bold text-sm uppercase tracking-wider transition-all active:scale-[0.98]"
          >
            ▶️ Iniciar Direto
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          {[
            { icon: '🎙️', label: 'Comandos de Voz' },
            { icon: '📊', label: 'Estatísticas' },
            { icon: '🤖', label: 'IA Assistente' },
            { icon: '📝', label: 'Relatórios' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 p-3 bg-neutral-900/50 rounded-xl">
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] text-neutral-500 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ MATCH HISTORY MODAL ============ */
function MatchHistoryModal({ history, onLoad, onDelete, onClose }: {
  history: SavedMatch[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="bg-neutral-900 rounded-3xl w-full max-w-md max-h-[70vh] overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-lg font-bold">📁 Histórico</h2>
          <button onClick={onClose} className="p-2 text-neutral-500 active:text-white">✕</button>
        </div>
        
        <div className="overflow-y-auto max-h-[50vh] p-2">
          {history.length === 0 ? (
            <div className="text-center text-neutral-600 py-8">
              Nenhuma partida salva
            </div>
          ) : (
            history.map(match => (
              <div key={match.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 mb-2">
                <div className="flex-1">
                  <div className="font-bold text-sm">
                    {match.state.homeTeam.shortName} {match.homeGoals} × {match.awayGoals} {match.state.awayTeam.shortName}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {new Date(match.savedAt).toLocaleDateString('pt-BR')} · {match.state.matchDetails.competition || 'Amistoso'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onLoad(match.id)} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold">Abrir</button>
                  <button onClick={() => onDelete(match.id)} className="p-1.5 text-neutral-600 active:text-red-400">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ LINEUP VIEW ============ */
function LineupView({ homeTeam, awayTeam, events }: { 
  homeTeam: Team; 
  awayTeam: Team; 
  events: MatchEvent[];
}) {
  const getPlayerEvents = (playerId: string) => 
    events.filter((e: MatchEvent) => e.playerId === playerId || e.relatedPlayerId === playerId);
  
  const startersHome = homeTeam.players.filter((p: Player) => p.isStarter);
  const reservesHome = homeTeam.players.filter((p: Player) => !p.isStarter);
  const startersAway = awayTeam.players.filter((p: Player) => p.isStarter);
  const reservesAway = awayTeam.players.filter((p: Player) => !p.isStarter);

  const PlayerCard = ({ player, teamColor }: { player: Player; teamColor: string }) => {
    const playerEvents = getPlayerEvents(player.id);
    const goals = playerEvents.filter((e: MatchEvent) => e.type === 'GOAL').length;
    const yellows = playerEvents.filter((e: MatchEvent) => e.type === 'YELLOW_CARD').length;
    const reds = playerEvents.filter((e: MatchEvent) => e.type === 'RED_CARD').length;
    
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg ${player.hasLeftGame ? 'opacity-40 line-through' : ''} bg-neutral-800/50`}>
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: teamColor }}
        >
          {player.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{player.name}</div>
          <div className="text-[10px] text-neutral-500 uppercase">{player.position}</div>
        </div>
        <div className="flex gap-1">
          {goals > 0 && <span className="text-xs">⚽{goals > 1 ? goals : ''}</span>}
          {yellows > 0 && <span className="text-xs">🟨{yellows > 1 ? yellows : ''}</span>}
          {reds > 0 && <span className="text-xs">🟥</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* HOME TEAM */}
      <div className="bg-neutral-900 rounded-2xl p-3">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: homeTeam.color }} />
          <span className="font-bold text-sm uppercase">{homeTeam.shortName}</span>
          <span className="text-[10px] text-neutral-500">{homeTeam.formation}</span>
        </div>
        
        {startersHome.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-2 font-bold">Titulares</div>
            <div className="space-y-1">
              {startersHome.sort((a: Player, b: Player) => a.number - b.number).map((p: Player) => (
                <PlayerCard key={p.id} player={p} teamColor={homeTeam.color} />
              ))}
            </div>
          </div>
        )}
        
        {reservesHome.length > 0 && (
          <div>
            <div className="text-[10px] text-amber-500 uppercase tracking-wider mb-2 font-bold">Reservas</div>
            <div className="space-y-1">
              {reservesHome.sort((a, b) => a.number - b.number).map(p => (
                <PlayerCard key={p.id} player={p} teamColor={homeTeam.color} />
              ))}
            </div>
          </div>
        )}
        
        {homeTeam.players.length === 0 && (
          <div className="text-center text-neutral-600 py-4 text-sm">
            Nenhum jogador cadastrado
          </div>
        )}
      </div>

      {/* AWAY TEAM */}
      <div className="bg-neutral-900 rounded-2xl p-3">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: awayTeam.color }} />
          <span className="font-bold text-sm uppercase">{awayTeam.shortName}</span>
          <span className="text-[10px] text-neutral-500">{awayTeam.formation}</span>
        </div>
        
        {startersAway.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-2 font-bold">Titulares</div>
            <div className="space-y-1">
              {startersAway.sort((a, b) => a.number - b.number).map(p => (
                <PlayerCard key={p.id} player={p} teamColor={awayTeam.color} />
              ))}
            </div>
          </div>
        )}
        
        {reservesAway.length > 0 && (
          <div>
            <div className="text-[10px] text-amber-500 uppercase tracking-wider mb-2 font-bold">Reservas</div>
            <div className="space-y-1">
              {reservesAway.sort((a: Player, b: Player) => a.number - b.number).map((p: Player) => (
                <PlayerCard key={p.id} player={p} teamColor={awayTeam.color} />
              ))}
            </div>
          </div>
        )}
        
        {awayTeam.players.length === 0 && (
          <div className="text-center text-neutral-600 py-4 text-sm">
            Nenhum jogador cadastrado
          </div>
        )}
      </div>
    </div>
  );
}
