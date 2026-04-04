import React from 'react';
import { MatchEvent, MatchState, EventType } from '../types';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface EventItemProps {
  event: MatchEvent;
  matchState: MatchState;
  formatEventType: (type: EventType) => string;
}

const EventItem: React.FC<EventItemProps> = ({ event, matchState, formatEventType }) => {
  const team = event.teamId === 'home' ? matchState.homeTeam : event.teamId === 'away' ? matchState.awayTeam : null;
  const player = event.playerId && team ? team.players.find(p => p.id === event.playerId) : null;
  const relatedPlayer = event.relatedPlayerId && team ? team.players.find(p => p.id === event.relatedPlayerId) : null;

  if (event.type === 'SUBSTITUTION') {
    return (
      <div className="flex flex-col gap-1 w-full">
        {player && <div className="flex items-center gap-2 text-xs text-red-400"><ArrowDownCircle size={14} /><span className="font-mono opacity-75">#{player.number}</span><span className="font-bold truncate">{player.name}</span></div>}
        {relatedPlayer && <div className="flex items-center gap-2 text-xs text-emerald-400"><ArrowUpCircle size={14} /><span className="font-mono opacity-75">#{relatedPlayer.number}</span><span className="font-bold truncate">{relatedPlayer.name}</span></div>}
        {!player && !relatedPlayer && event.manualSub && (
          <>
            <div className="flex items-center gap-2 text-xs text-red-400"><ArrowDownCircle size={14} /><span className="font-bold truncate">Desconhecido</span></div>
            <div className="flex items-center gap-2 text-xs text-emerald-400"><ArrowUpCircle size={14} /><span className="font-mono opacity-75">#{event.manualSub.number}</span><span className="font-bold truncate">{event.manualSub.name}</span></div>
          </>
        )}
        {team && <span className="text-[9px] uppercase tracking-widest opacity-50 mt-1">{team.name}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <span className={`text-slate-100 font-bold text-xs ${event.isAnnulled ? 'line-through decoration-slate-500 text-slate-500' : ''}`}>{event.description}</span>
      <div className="flex gap-2 mt-1">
          <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">{formatEventType(event.type)}</span>
          {event.isAnnulled && <span className="text-[7px] font-black uppercase tracking-widest text-red-500">ANULADO</span>}
      </div>
    </div>
  );
};

export default EventItem;
