
import React, { useRef, useState, useEffect } from 'react';
import { Team, Player, EventType } from '../types';
import { ShieldAlert, Target, RectangleVertical, Activity, ArrowUpCircle } from 'lucide-react';
import { SoccerBall } from './SoccerBall';

interface FieldProps {
  homeTeam: Team;
  awayTeam: Team;
  onPlayerClick: (player: Player) => void;
  onPlayerMove: (teamId: 'home' | 'away', playerId: string, x: number, y: number) => void;
  onQuickAction: (type: EventType, teamId: 'home' | 'away') => void;
  isFullscreen?: boolean;
}

const getContrastClass = (hexcolor: string) => {
  if (!hexcolor || hexcolor === 'transparent') return 'text-white';
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? 'text-slate-900' : 'text-white';
};

const PlayerStatusIcons: React.FC<{ player: Player }> = ({ player }) => {
  const hasGoal = player.events.some(e => e.type === 'GOAL' && !e.isAnnulled);
  const yellowCards = player.events.filter(e => e.type === 'YELLOW_CARD' && !e.isAnnulled).length;
  const hasRedCard = player.events.some(e => e.type === 'RED_CARD' && !e.isAnnulled);
  const hasInjury = player.events.some(e => e.type === 'INJURY');
  const isSubIn = player.events.some(e => e.type === 'SUBSTITUTION' && e.relatedPlayerId === player.id);

  if (!hasGoal && yellowCards === 0 && !hasRedCard && !hasInjury && !isSubIn) return null;

  return (
    <div className="absolute -top-1 -right-2 flex flex-col gap-0.5 z-20">
      {hasGoal && <SoccerBall className="w-4 h-4 text-amber-300 drop-shadow-lg" />}
      {yellowCards > 0 && <RectangleVertical size={14} className="text-yellow-400 fill-yellow-400 drop-shadow-lg" />}
      {hasRedCard && <RectangleVertical size={14} className="text-red-500 fill-red-500 drop-shadow-lg" />}
      {hasInjury && <Activity size={14} className="text-white fill-red-500 bg-red-600 rounded-full p-0.5 drop-shadow-lg" />}
      {isSubIn && <ArrowUpCircle size={14} className="text-emerald-500 fill-emerald-900 bg-white rounded-full p-0.5 drop-shadow-lg" />}
    </div>
  );
};

const Field: React.FC<FieldProps> = ({ homeTeam, awayTeam, onPlayerClick, onPlayerMove, onQuickAction, isFullscreen }) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [activePlayer, setActivePlayer] = useState<{ teamId: 'home' | 'away', playerId: string } | null>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, teamId: 'home' | 'away', playerId: string) => {
    e.stopPropagation();
    setActivePlayer({ teamId, playerId });
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!activePlayer || !fieldRef.current) return;
    
    e.preventDefault();
    const rect = fieldRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));

    const finalX = activePlayer.teamId === 'home' ? x : (100 - x);
    const finalY = activePlayer.teamId === 'home' ? y : (100 - y);

    onPlayerMove(activePlayer.teamId, activePlayer.playerId, finalX, finalY);
  };

  const handleMouseUp = () => setActivePlayer(null);

  useEffect(() => {
    if (activePlayer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [activePlayer]);

  const renderPlayers = (team: Team) => {
    const isHome = team.id === 'home';
    const contrastClass = getContrastClass(team.color);

    return team.players.filter(p => p.isStarter).map((player) => {
      const isDragging = activePlayer?.playerId === player.id;
      const displayX = isHome ? player.x : (100 - player.x);
      const displayY = isHome ? player.y : (100 - player.y);

      return (
        <div
          key={player.id}
          className={`absolute -translate-x-1/2 -translate-y-1/2 transition-shadow cursor-move select-none z-10 ${isDragging ? 'z-50 scale-125' : ''}`}
          style={{ top: `${displayY}%`, left: `${displayX}%` }}
          onMouseDown={(e) => handleMouseDown(e, team.id, player.id)}
          onTouchStart={(e) => handleMouseDown(e, team.id, player.id)}
        >
          <div className="group relative flex flex-col items-center">
             <div className="relative">
                <button
                  onClick={(e) => {
                    if (isDragging) return;
                    e.stopPropagation();
                    onPlayerClick(player);
                  }}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-[3px] border-white/90 shadow-lg font-black text-sm md:text-base transition-all ${contrastClass} ${isDragging ? 'ring-4 ring-white/50 scale-110' : ''}`}
                  style={{ backgroundColor: team.color }}
                >
                  {player.number}
                </button>
                <PlayerStatusIcons player={player} />
             </div>
            <div className={`mt-1.5 bg-slate-900/80 text-white px-2 py-0.5 rounded text-[10px] md:text-xs font-bold whitespace-nowrap drop-shadow-md border border-white/5 transition-all ${isDragging ? 'scale-110 shadow-blue-500/20 border-blue-500' : 'opacity-100'}`}>
              {player.name}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className={`flex flex-col gap-2 ${isFullscreen ? 'h-full w-full' : ''}`}>
      <div 
        ref={fieldRef}
        className={`relative bg-emerald-700 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-emerald-800/50 select-none ${isFullscreen ? 'h-full w-full' : 'w-full aspect-[4/3]'}`}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(0,0,0,0.2) 10%, rgba(0,0,0,0.2) 20%)' }}></div>
        <div className="absolute inset-0 border-2 border-white/30 m-6 rounded-sm"></div>
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full"></div>
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-28 h-56 border-2 border-white/30 border-l-0 rounded-r-lg"></div>
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-28 h-56 border-2 border-white/30 border-r-0 rounded-l-lg"></div>
        
        {renderPlayers(homeTeam)}
        {renderPlayers(awayTeam)}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 pointer-events-none">
          <p className="text-[8px] font-black text-white/80 uppercase tracking-[0.2em]">Mapa Tático Interativo • Narrador Pro</p>
        </div>
      </div>
    </div>
  );
};

export default Field;
