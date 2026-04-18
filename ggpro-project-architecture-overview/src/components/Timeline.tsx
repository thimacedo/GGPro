import { useState } from 'react';
import type { MatchState, EventType } from '../types';

const EVENT_ICONS: Record<string, string> = {
  GOAL: '⚽', YELLOW_CARD: '🟨', RED_CARD: '🟥', SUBSTITUTION: '🔄',
  SHOT: '🎯', FOUL: '🛑', CORNER: '🚩', PENALTY: '💥',
  SAVE: '🧤', WOODWORK: '🪵', OFFSIDE: '📏',
  INJURY: '🏥', VAR: '📺', GK_8_SECONDS: '⏱️',
  PERIOD_START: '▶️', PERIOD_END: '🏁', GENERIC: '•',
};

const EVENT_COLORS: Record<string, string> = {
  GOAL: 'border-l-yellow-500 bg-yellow-500/5',
  YELLOW_CARD: 'border-l-yellow-500 bg-yellow-500/5',
  RED_CARD: 'border-l-red-500 bg-red-500/5',
  SUBSTITUTION: 'border-l-blue-500 bg-blue-500/5',
  VAR: 'border-l-violet-500 bg-violet-500/5',
};

const FILTER_OPTIONS: { type: EventType | 'ALL'; label: string; icon: string }[] = [
  { type: 'ALL', label: 'Todos', icon: '📋' },
  { type: 'GOAL', label: 'Gols', icon: '⚽' },
  { type: 'YELLOW_CARD', label: 'Amarelo', icon: '🟨' },
  { type: 'RED_CARD', label: 'Vermelho', icon: '🟥' },
  { type: 'FOUL', label: 'Faltas', icon: '🛑' },
  { type: 'CORNER', label: 'Escanteios', icon: '🚩' },
  { type: 'SHOT', label: 'Chutes', icon: '🎯' },
  { type: 'SUBSTITUTION', label: 'Subs', icon: '🔄' },
  { type: 'VAR', label: 'VAR', icon: '📺' },
];

interface TimelineProps {
  state: MatchState;
  onAnnulEvent: (id: string) => void;
  onUndo: () => void;
}

export function Timeline({ state, onAnnulEvent, onUndo }: TimelineProps) {
  const { events, homeTeam, awayTeam } = state;
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');

  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const filteredEvents = filter === 'ALL'
    ? sortedEvents
    : sortedEvents.filter(e => e.type === filter);

  const getPlayerName = (playerId: string | undefined, teamId: 'home' | 'away'): string | undefined => {
    if (!playerId) return undefined;
    const team = teamId === 'home' ? homeTeam : awayTeam;
    return team.players.find(p => p.id === playerId)?.name;
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <span className="text-sm font-bold uppercase tracking-wider">Cronologia</span>
          <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400">
            {events.length}
          </span>
        </div>
        <button
          onClick={onUndo}
          className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-wider"
        >
          ↩ Desfazer
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-1 px-2 py-2 border-b border-white/5 overflow-x-auto no-scrollbar">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => setFilter(opt.type)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              filter === opt.type
                ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                : 'text-neutral-500 border border-transparent hover:text-neutral-300'
            }`}
          >
            <span>{opt.icon}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Events Feed */}
      <div className="flex-1 overflow-y-auto thin-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600 py-10">
            <span className="text-4xl mb-2">📋</span>
            <span className="text-sm">
              {filter === 'ALL' ? 'Nenhum lance registrado' : `Nenhum "${FILTER_OPTIONS.find(f => f.type === filter)?.label}"`}
            </span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredEvents.map(event => {
              const team = event.teamId === 'home' ? homeTeam : awayTeam;
              const playerName = getPlayerName(event.playerId, event.teamId!);
              const relatedPlayerName = getPlayerName(event.relatedPlayerId, event.teamId!);
              
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 px-4 py-3 border-l-4 ${
                    EVENT_COLORS[event.type] || 'border-l-neutral-700 bg-transparent'
                  } ${event.isAnnulled ? 'opacity-40' : ''}`}
                >
                  {/* Minute */}
                  <div className="text-sm font-mono font-bold text-neutral-500 shrink-0 w-8">
                    {event.minute}'
                  </div>
                  
                  {/* Icon */}
                  <div className="text-lg shrink-0">
                    {EVENT_ICONS[event.type] || '•'}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-xs font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ backgroundColor: team?.color || '#333', color: '#fff' }}
                      >
                        {team?.shortName || '---'}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {event.type.replace(/_/g, ' ')}
                      </span>
                      {event.isAnnulled && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                          ANULADO
                        </span>
                      )}
                    </div>
                    
                    {playerName && (
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {playerName}
                        {event.type === 'SUBSTITUTION' && relatedPlayerName && (
                          <span> ↔️ {relatedPlayerName}</span>
                        )}
                      </div>
                    )}
                    
                    {event.description && (
                      <div className="text-[10px] text-neutral-500 mt-0.5 truncate">
                        {event.description}
                      </div>
                    )}
                  </div>

                  {/* Annul button */}
                  {!event.isAnnulled && event.type !== 'PERIOD_START' && event.type !== 'PERIOD_END' && (
                    <button
                      onClick={() => onAnnulEvent(event.id)}
                      className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
