import { useState, useCallback, useRef } from 'react';
import type { MatchState, EventType, Player, MatchEvent } from '../types';
import { parseCommand, type ParsedCommand } from '../services/commandParser';
import { useVoiceCommand } from '../services/voiceService';
import { generateNarration } from '../services/narrationService';

interface CommandBarProps {
  state: MatchState;
  selectedTeam: 'home' | 'away';
  onSelectTeam: (team: 'home' | 'away') => void;
  onAddEvent: (data: { type: EventType; teamId: 'home' | 'away'; playerId?: string; relatedPlayerId?: string; description?: string }) => void;
  onAddPenaltyKick: (teamId: 'home' | 'away', scored: boolean) => void;
  onToggleTimer: () => void;
  onAdvancePeriod: (targetPeriod?: string) => void;
  onReset: () => void;
  onUndo: () => void;
  onVarReview: (decision: {
    type: 'GOAL_CONFIRMED' | 'GOAL_ANNULLED' | 'PENALTY_AWARDED' | 'PENALTY_CANCELLED' | 'RED_AWARDED' | 'RED_CANCELLED' | 'IDENTITY_CORRECTION';
    targetEventId?: string;
    teamId?: 'home' | 'away';
    correctPlayerId?: string;
    reason?: string;
  }) => void;
  events: MatchEvent[];
  openSubModal?: boolean;
  openVarModal?: boolean;
  onCloseModals?: () => void;
}

// Event buttons configuration
const EVENT_BUTTONS: { type: EventType; icon: string; label: string; color: string }[] = [
  { type: 'GOAL', icon: '⚽', label: 'GOL', color: 'bg-yellow-500' },
  { type: 'YELLOW_CARD', icon: '🟨', label: 'AMAR', color: 'bg-yellow-600' },
  { type: 'RED_CARD', icon: '🟥', label: 'VERM', color: 'bg-red-600' },
  { type: 'FOUL', icon: '🛑', label: 'FALTA', color: 'bg-orange-600' },
  { type: 'CORNER', icon: '🚩', label: 'ESC', color: 'bg-cyan-600' },
  { type: 'SHOT', icon: '🎯', label: 'CHUTE', color: 'bg-purple-600' },
  { type: 'OFFSIDE', icon: '📏', label: 'IMP', color: 'bg-pink-600' },
  { type: 'SAVE', icon: '🧤', label: 'DEF', color: 'bg-teal-600' },
  { type: 'SUBSTITUTION', icon: '🔄', label: 'SUB', color: 'bg-blue-600' },
  { type: 'VAR', icon: '📺', label: 'VAR', color: 'bg-violet-600' },
];

export function CommandBar({ 
  state, 
  selectedTeam, 
  onSelectTeam,
  onAddEvent, 
  onAddPenaltyKick, 
  onToggleTimer, 
  onAdvancePeriod, 
  onReset, 
  onUndo,
  onVarReview,
  events,
}: CommandBarProps) {
  const [showSubModal, setShowSubModal] = useState(false);
  const [showVarModal, setShowVarModal] = useState(false);
  const [playerOut, setPlayerOut] = useState<string>('');
  const [playerIn, setPlayerIn] = useState<string>('');
  const [manualPlayerIn, setManualPlayerIn] = useState<string>('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  
  const [showTextInput, setShowTextInput] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [narration, setNarration] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const voice = useVoiceCommand();

  const team = selectedTeam === 'home' ? state.homeTeam : state.awayTeam;
  const activePlayers = team.players.filter(p => p.isStarter && !p.hasLeftGame);
  const benchPlayers = team.players.filter(p => !p.isStarter && !p.hasLeftGame);

  

  const getCurrentMinute = (): number => {
    if (state.period === 'PRE_MATCH') return 0;
    const now = Date.now();
    const ms = state.timeElapsed + (state.timerStartedAt ? now - state.timerStartedAt : 0);
    return Math.floor(ms / 60000);
  };

  const showFeedbackFn = useCallback((text: string, type: 'success' | 'error' | 'info') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const showNarrationFn = useCallback((text: string) => {
    setNarration(text);
    setTimeout(() => setNarration(null), 5000);
  }, []);

  const findPlayerByNumber = useCallback((teamId: 'home' | 'away', number: number): Player | undefined => {
    const t = teamId === 'home' ? state.homeTeam : state.awayTeam;
    return t.players.find(p => p.number === number);
  }, [state.homeTeam, state.awayTeam]);

  // Execute command from text/voice
  const executeCommand = useCallback((parsed: ParsedCommand) => {
    switch (parsed.action) {
      case 'ADD_EVENT': {
        if (!parsed.eventType) {
          showFeedbackFn('❓ Evento não reconhecido', 'error');
          return;
        }
        const teamId = parsed.teamId || selectedTeam;
        const foundTeam = teamId === 'home' ? state.homeTeam : state.awayTeam;
        const playerObj = parsed.playerNumber ? findPlayerByNumber(teamId, parsed.playerNumber) : undefined;
        const playerId = playerObj?.id;

        if (parsed.eventType === 'SUBSTITUTION') {
          onSelectTeam(teamId);
          setShowSubModal(true);
          showFeedbackFn(`🔄 Substituição — ${foundTeam.shortName}`, 'info');
          return;
        }

        onAddEvent({ type: parsed.eventType, teamId, playerId });

        // Narration
        const h = state.events.filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
        const a = state.events.filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;
        const newHome = parsed.eventType === 'GOAL' && teamId === 'home' ? h + 1 : h;
        const newAway = parsed.eventType === 'GOAL' && teamId === 'away' ? a + 1 : a;

        const nar = generateNarration({
          eventType: parsed.eventType,
          teamShort: foundTeam.shortName,
          playerName: playerObj?.name,
          playerNumber: playerObj?.number,
          minute: getCurrentMinute(),
          homeShort: state.homeTeam.shortName,
          awayShort: state.awayTeam.shortName,
          homeScore: newHome,
          awayScore: newAway,
        });
        if (nar) showNarrationFn(nar);

        const button = EVENT_BUTTONS.find(e => e.type === parsed.eventType);
        showFeedbackFn(`${button?.icon || '•'} ${button?.label || parsed.eventType} — ${foundTeam.shortName}${parsed.playerNumber ? ` #${parsed.playerNumber}` : ''}`, 'success');
        break;
      }
      case 'TOGGLE_TIMER':
        onToggleTimer();
        showFeedbackFn(state.isPaused ? '▶️ Iniciado' : '⏸️ Pausado', 'info');
        break;
      case 'ADVANCE_PERIOD':
        onAdvancePeriod(parsed.description as string | undefined);
        showFeedbackFn('🏁 Período avançado', 'info');
        break;
      case 'RESET':
        onReset();
        showFeedbackFn('🗑️ Partida resetada', 'info');
        break;
      default:
        showFeedbackFn(`❓ Não entendi: "${parsed.original}"`, 'error');
    }
  }, [selectedTeam, state, onAddEvent, onToggleTimer, onAdvancePeriod, onReset, findPlayerByNumber, showFeedbackFn, showNarrationFn, onSelectTeam]);

  // Text command submit
  const handleTextSubmit = useCallback(() => {
    const el = textInputRef.current;
    const text = (el?.value || commandText).trim();
    if (!text) return;
    const parsed = parseCommand(text);
    executeCommand(parsed);
    setCommandText('');
    if (el) el.value = '';
  }, [commandText, executeCommand]);

  // Handle quick event button
  const handleQuickEvent = useCallback((type: EventType) => {
    if (type === 'SUBSTITUTION') {
      setShowSubModal(true);
      return;
    }
    if (type === 'VAR') {
      setShowVarModal(true);
      return;
    }
    onAddEvent({ type, teamId: selectedTeam });
    
    // Generate narration
    const button = EVENT_BUTTONS.find(e => e.type === type);
    const teamName = selectedTeam === 'home' ? state.homeTeam.shortName : state.awayTeam.shortName;
    
    if (type === 'GOAL') {
      const h = state.events.filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
      const a = state.events.filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;
      const newHome = selectedTeam === 'home' ? h + 1 : h;
      const newAway = selectedTeam === 'away' ? a + 1 : a;
      
      const nar = generateNarration({
        eventType: type,
        teamShort: teamName,
        minute: getCurrentMinute(),
        homeShort: state.homeTeam.shortName,
        awayShort: state.awayTeam.shortName,
        homeScore: newHome,
        awayScore: newAway,
      });
      if (nar) showNarrationFn(nar);
    }
    
    showFeedbackFn(`${button?.icon} ${button?.label} — ${teamName}`, 'success');
  }, [selectedTeam, state, onAddEvent, showFeedbackFn, showNarrationFn]);

  // Execute substitution - allows saving without players
  const executeSubstitution = useCallback(() => {
    const teamName = selectedTeam === 'home' ? state.homeTeam.shortName : state.awayTeam.shortName;
    
    if (useManualEntry && manualPlayerIn.trim()) {
      // Manual entry for player coming in
      onAddEvent({ 
        type: 'SUBSTITUTION', 
        teamId: selectedTeam, 
        playerId: playerOut || undefined,
        description: playerOut 
          ? `🔄 Substituição [${teamName}] — Entra: ${manualPlayerIn.trim()}`
          : `🔄 Substituição [${teamName}] — Entra: ${manualPlayerIn.trim()}`
      });
      showFeedbackFn(`🔄 Entra ${manualPlayerIn.trim()}`, 'success');
    } else if (playerOut && playerIn) {
      // Complete substitution with both players
      onAddEvent({ type: 'SUBSTITUTION', teamId: selectedTeam, playerId: playerOut, relatedPlayerId: playerIn });
      showFeedbackFn('🔄 Substituição registrada', 'success');
    } else if (playerOut) {
      // Only player going out
      const outPlayer = team.players.find(p => p.id === playerOut);
      onAddEvent({ 
        type: 'SUBSTITUTION', 
        teamId: selectedTeam, 
        playerId: playerOut,
        description: `🔄 Substituição [${teamName}] — Sai: #${outPlayer?.number || '?'} ${outPlayer?.name || ''}`
      });
      showFeedbackFn(`🔄 Sai ${outPlayer?.name || 'jogador'}`, 'success');
    } else if (playerIn) {
      // Only player coming in (from bench)
      const inPlayer = team.players.find(p => p.id === playerIn);
      onAddEvent({ 
        type: 'SUBSTITUTION', 
        teamId: selectedTeam, 
        relatedPlayerId: playerIn,
        description: `🔄 Substituição [${teamName}] — Entra: #${inPlayer?.number || '?'} ${inPlayer?.name || ''}`
      });
      showFeedbackFn(`🔄 Entra ${inPlayer?.name || 'jogador'}`, 'success');
    } else {
      // No players - just register the substitution time
      onAddEvent({ 
        type: 'SUBSTITUTION', 
        teamId: selectedTeam,
        description: `🔄 Substituição [${teamName}]`
      });
      showFeedbackFn('🔄 Substituição registrada', 'success');
    }
    
    setShowSubModal(false);
    setPlayerOut('');
    setPlayerIn('');
    setManualPlayerIn('');
    setUseManualEntry(false);
  }, [playerOut, playerIn, manualPlayerIn, useManualEntry, selectedTeam, state, team, onAddEvent, showFeedbackFn]);

  // Voice command handling
  const handleVoiceClick = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening((transcript) => {
        const parsed = parseCommand(transcript);
        executeCommand(parsed);
      });
    }
  }, [voice, executeCommand]);

  return (
    <>
      {/* Feedback Toast */}
      {(feedback || narration) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
          <div className={`px-4 py-2 rounded-xl font-bold text-sm shadow-2xl ${
            feedback?.type === 'success' ? 'bg-green-600 text-white' :
            feedback?.type === 'error' ? 'bg-red-600 text-white' :
            narration ? 'bg-blue-600 text-white' :
            'bg-neutral-800 text-white'
          }`}>
            {narration || feedback?.text}
          </div>
        </div>
      )}

      <div className="shrink-0 bg-neutral-950 border-t border-white/10 px-2 py-2 safe-bottom">
        {/* Team Selector */}
        <div className="flex justify-center gap-2 mb-2">
          <button
            onClick={() => onSelectTeam('home')}
            className={`flex-1 max-w-[140px] py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              selectedTeam === 'home'
                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
                : 'bg-neutral-800 text-neutral-400'
            }`}
            style={selectedTeam === 'home' ? { backgroundColor: state.homeTeam.color } : {}}
          >
            {state.homeTeam.shortName}
          </button>
          <button
            onClick={() => onSelectTeam('away')}
            className={`flex-1 max-w-[140px] py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              selectedTeam === 'away'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'bg-neutral-800 text-neutral-400'
            }`}
            style={selectedTeam === 'away' ? { backgroundColor: state.awayTeam.color } : {}}
          >
            {state.awayTeam.shortName}
          </button>
        </div>

        {/* Event Buttons Grid */}
        <div className="grid grid-cols-5 gap-1.5 mb-2">
          {EVENT_BUTTONS.slice(0, 10).map(event => (
            <button
              key={event.type}
              onClick={() => handleQuickEvent(event.type)}
              className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all active:scale-90 ${event.color} text-white`}
            >
              <span className="text-lg">{event.icon}</span>
              <span className="text-[9px] font-bold mt-0.5">{event.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary Actions */}
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            <button
              onClick={onUndo}
              className="p-2 rounded-lg bg-neutral-800 text-neutral-400 text-xs active:bg-neutral-700"
            >
              ↩ Desfazer
            </button>
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="p-2 rounded-lg bg-neutral-800 text-neutral-400 text-xs active:bg-neutral-700"
            >
              ⌨️ Comando
            </button>
            <button
              onClick={handleVoiceClick}
              className={`p-2 rounded-lg text-xs ${voice.isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-400'}`}
              disabled={!voice.isSupported}
            >
              🎙️ {voice.isListening ? 'Ouvindo...' : 'Voz'}
            </button>
          </div>

          {/* Penalty mode */}
          {state.period === 'PENALTIES' && (
            <div className="flex gap-1">
              <button
                onClick={() => onAddPenaltyKick(selectedTeam, true)}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold"
              >
                ⚽ Gol
              </button>
              <button
                onClick={() => onAddPenaltyKick(selectedTeam, false)}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
              >
                ❌ Perdeu
              </button>
            </div>
          )}
        </div>

        {/* Text Input */}
        {showTextInput && (
          <div className="mt-2 flex gap-2">
            <input
              ref={textInputRef}
              type="text"
              value={commandText}
              onChange={e => setCommandText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Ex: gol casa 10, amarelo fora 5..."
              className="flex-1 bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none"
            />
            <button
              onClick={handleTextSubmit}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold text-sm"
            >
              Enviar
            </button>
          </div>
        )}
      </div>

      {/* Substitution Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setShowSubModal(false)}>
          <div className="bg-neutral-900 rounded-3xl w-full max-w-sm p-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">🔄 Substituição — {team.shortName}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Sai</label>
                <select
                  value={playerOut}
                  onChange={e => setPlayerOut(e.target.value)}
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  <option value="">Selecione...</option>
                  {activePlayers.map(p => (
                    <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider">Entra</label>
                  <button
                    onClick={() => setUseManualEntry(!useManualEntry)}
                    className="text-[10px] text-blue-400 font-medium"
                  >
                    {useManualEntry ? '← Lista' : 'Manual ✏️'}
                  </button>
                </div>
                
                {useManualEntry ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={manualPlayerIn}
                      onChange={e => setManualPlayerIn(e.target.value)}
                      placeholder="Nome do jogador que entra"
                      className="w-full bg-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-500"
                    />
                    <input
                      type="number"
                      placeholder="Número (opcional)"
                      className="w-full bg-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-500"
                      min={1}
                      max={99}
                    />
                  </div>
                ) : (
                  <select
                    value={playerIn}
                    onChange={e => setPlayerIn(e.target.value)}
                    className="w-full bg-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white"
                  >
                    <option value="">Selecione...</option>
                    {benchPlayers.map(p => (
                      <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                    ))}
                  </select>
                )}
                
                {benchPlayers.length === 0 && !useManualEntry && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    ⚠️ Nenhum reserva cadastrado. Use entrada manual.
                  </p>
                )}
              </div>

              {/* Help text */}
              {!playerOut && !playerIn && !manualPlayerIn.trim() && (
                <p className="text-[10px] text-neutral-500 text-center">
                  💡 Pode registrar apenas o momento e editar depois
                </p>
              )}

              <button
                onClick={executeSubstitution}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold active:bg-blue-700"
              >
                {!playerOut && !playerIn && !manualPlayerIn.trim() 
                  ? 'Registrar Substituição (sem jogadores)'
                  : 'Confirmar Substituição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VAR Modal */}
      {showVarModal && (
        <VARModal
          events={events}
          homeTeam={state.homeTeam}
          awayTeam={state.awayTeam}
          selectedTeam={selectedTeam}
          onClose={() => setShowVarModal(false)}
          onVarReview={onVarReview}
          showFeedback={showFeedbackFn}
        />
      )}
    </>
  );
}

// VAR Modal Component
function VARModal({
  events,
  homeTeam,
  awayTeam,
  selectedTeam,
  onClose,
  onVarReview,
  showFeedback,
}: {
  events: MatchEvent[];
  homeTeam: { shortName: string; players: Player[] };
  awayTeam: { shortName: string; players: Player[] };
  selectedTeam: 'home' | 'away';
  onClose: () => void;
  onVarReview: (decision: {
    type: 'GOAL_CONFIRMED' | 'GOAL_ANNULLED' | 'PENALTY_AWARDED' | 'PENALTY_CANCELLED' | 'RED_AWARDED' | 'RED_CANCELLED' | 'IDENTITY_CORRECTION';
    targetEventId?: string;
    teamId?: 'home' | 'away';
    correctPlayerId?: string;
    reason?: string;
  }) => void;
  showFeedback: (text: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [varAction, setVarAction] = useState<string>('');
  const [targetEventId, setTargetEventId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [correctPlayerId, setCorrectPlayerId] = useState<string>('');

  // Get relevant events for VAR
  const goals = events.filter(e => e.type === 'GOAL' && !e.isAnnulled);
  const penalties = events.filter(e => e.type === 'PENALTY' && !e.isAnnulled);
  const redCards = events.filter(e => e.type === 'RED_CARD' && !e.isAnnulled);

  const handleVarDecision = () => {
    switch (varAction) {
      case 'GOAL_CONFIRMED':
        if (!targetEventId) return;
        onVarReview({ type: 'GOAL_CONFIRMED', targetEventId });
        showFeedback('✅ VAR: Gol confirmado', 'success');
        break;
      case 'GOAL_ANNULLED':
        if (!targetEventId) return;
        onVarReview({ type: 'GOAL_ANNULLED', targetEventId, reason: reason || 'revisão' });
        showFeedback('❌ VAR: Gol anulado', 'success');
        break;
      case 'PENALTY_AWARDED':
        onVarReview({ type: 'PENALTY_AWARDED', teamId: selectedTeam });
        showFeedback('💥 VAR: Pênalti marcado', 'success');
        break;
      case 'PENALTY_CANCELLED':
        if (!targetEventId) return;
        onVarReview({ type: 'PENALTY_CANCELLED', targetEventId });
        showFeedback('❌ VAR: Pênalti cancelado', 'success');
        break;
      case 'RED_AWARDED':
        onVarReview({ type: 'RED_AWARDED', teamId: selectedTeam, correctPlayerId: correctPlayerId || undefined });
        showFeedback('🟥 VAR: Vermelho aplicado', 'success');
        break;
      case 'RED_CANCELLED':
        if (!targetEventId) return;
        onVarReview({ type: 'RED_CANCELLED', targetEventId });
        showFeedback('✅ VAR: Vermelho cancelado', 'success');
        break;
      case 'IDENTITY_CORRECTION':
        if (!targetEventId || !correctPlayerId) return;
        onVarReview({ type: 'IDENTITY_CORRECTION', targetEventId, correctPlayerId });
        showFeedback('🔄 VAR: Identidade corrigida', 'success');
        break;
      default:
        return;
    }
    onClose();
  };

  const getEventLabel = (e: MatchEvent) => {
    const team = e.teamId === 'home' ? homeTeam : awayTeam;
    const player = e.playerId ? team.players.find(p => p.id === e.playerId) : null;
    return `${e.minute}' ${e.type === 'GOAL' ? '⚽' : e.type === 'PENALTY' ? '💥' : '🟥'} ${player ? `#${player.number} ${player.name}` : ''} [${team.shortName}]`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className="bg-neutral-900 rounded-3xl w-full max-w-sm p-4 animate-scale-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          📺 VAR — Revisão de Lance
        </h3>
        
        <div className="space-y-4">
          {/* Action Selection */}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Ação do VAR</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'GOAL_CONFIRMED', label: '✅ Confirmar Gol', icon: '⚽' },
                { id: 'GOAL_ANNULLED', label: '❌ Anular Gol', icon: '⚽' },
                { id: 'PENALTY_AWARDED', label: '💥 Marcar Pênalti', icon: '💥' },
                { id: 'PENALTY_CANCELLED', label: '❌ Cancelar Pênalti', icon: '💥' },
                { id: 'RED_AWARDED', label: '🟥 Aplicar Vermelho', icon: '🟥' },
                { id: 'RED_CANCELLED', label: '✅ Cancelar Vermelho', icon: '🟥' },
                { id: 'IDENTITY_CORRECTION', label: '🔄 Corrigir Identidade', icon: '🔄' },
              ].map(action => (
                <button
                  key={action.id}
                  onClick={() => setVarAction(action.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                    varAction === action.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Event Selection */}
          {['GOAL_CONFIRMED', 'GOAL_ANNULLED', 'PENALTY_CANCELLED', 'RED_CANCELLED', 'IDENTITY_CORRECTION'].includes(varAction) && (
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Evento Alvo</label>
              <select
                value={targetEventId}
                onChange={e => setTargetEventId(e.target.value)}
                className="w-full bg-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="">Selecione o evento...</option>
                {varAction.includes('GOAL') && goals.map(e => (
                  <option key={e.id} value={e.id}>{getEventLabel(e)}</option>
                ))}
                {varAction === 'PENALTY_CANCELLED' && penalties.map(e => (
                  <option key={e.id} value={e.id}>{getEventLabel(e)}</option>
                ))}
                {['RED_CANCELLED', 'IDENTITY_CORRECTION'].includes(varAction) && redCards.map(e => (
                  <option key={e.id} value={e.id}>{getEventLabel(e)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reason for goal annulment */}
          {varAction === 'GOAL_ANNULLED' && (
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Motivo</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="">Selecione...</option>
                <option value="impedimento">Impedimento</option>
                <option value="falta no ataque">Falta no ataque</option>
                <option value="mão na bola">Mão na bola</option>
                <option value="bola fora">Bola saiu antes</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          )}

          {/* Correct player for identity correction or red card */}
          {['IDENTITY_CORRECTION', 'RED_AWARDED'].includes(varAction) && (
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Jogador Correto</label>
              <select
                value={correctPlayerId}
                onChange={e => setCorrectPlayerId(e.target.value)}
                className="w-full bg-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="">Selecione...</option>
                {(selectedTeam === 'home' ? homeTeam : awayTeam).players.map(p => (
                  <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Info about VAR rules */}
          <div className="bg-neutral-800/50 rounded-xl p-3 text-[10px] text-neutral-400 space-y-1">
            <p>📋 <strong>Regras do VAR:</strong></p>
            <p>• Gols: pode confirmar ou anular (impedimento, falta, mão)</p>
            <p>• Pênaltis: pode marcar ou cancelar</p>
            <p>• Vermelho: pode aplicar ou revogar (apenas direto)</p>
            <p>• Identidade: corrige cartão para jogador errado</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-neutral-800 text-white font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleVarDecision}
              disabled={!varAction || (['GOAL_CONFIRMED', 'GOAL_ANNULLED', 'PENALTY_CANCELLED', 'RED_CANCELLED', 'IDENTITY_CORRECTION'].includes(varAction) && !targetEventId)}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50"
            >
              Confirmar VAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
