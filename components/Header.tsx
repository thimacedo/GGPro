import React, { useState, useMemo } from 'react';
import { MatchState } from '../types';
import { Pencil, Play, Pause, ChevronRight, Trophy, MapPin, User } from 'lucide-react';
import TimerDisplay from './TimerDisplay';

interface HeaderProps {
  matchState: MatchState;
  resetSignal: number;
  isFullscreen: boolean;
  onPlayPauseToggle: () => void;
  onNextPeriodClick: () => void;
  onUpdateTeamName: (teamId: 'home' | 'away', name: string) => void;
  onMinuteChange: (m: number) => void;
}

const getContrastColor = (hexcolor: string) => {
  if (!hexcolor || hexcolor === 'transparent') return 'text-white';
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? 'text-slate-900' : 'text-white';
};

const Header: React.FC<HeaderProps> = ({ matchState, resetSignal, onPlayPauseToggle, onNextPeriodClick, onUpdateTeamName, onMinuteChange, isFullscreen }) => {
  const [isEditingHomeName, setIsEditingHomeName] = useState(false);
  const [tempHomeName, setTempHomeName] = useState('');
  const [isEditingAwayName, setIsEditingAwayName] = useState(false);
  const [tempAwayName, setTempAwayName] = useState('');

  const homeContrast = useMemo(() => getContrastColor(matchState.homeTeam?.color || '#000'), [matchState.homeTeam?.color]);
  const awayContrast = useMemo(() => getContrastColor(matchState.awayTeam?.color || '#FFF'), [matchState.awayTeam?.color]);
  const safeEventsCountHome = (matchState.events || []).filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
  const safeEventsCountAway = (matchState.events || []).filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;

  return (
    <header className="bg-slate-900 border-b border-white/10 shadow-2xl relative z-50">
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4 flex justify-between items-center">
        {/* HOME TEAM */}
        <div className="flex flex-1 items-center justify-end gap-1 md:gap-4 min-w-0">
          <div className="flex flex-col items-end min-w-0 group">
            {isEditingHomeName ? (
              <input 
                autoFocus
                className="bg-slate-800 border border-blue-500 rounded px-2 py-1 text-[10px] md:text-sm font-black text-white w-20 md:w-40 uppercase text-right"
                value={tempHomeName}
                onChange={(e) => setTempHomeName(e.target.value)}
                onBlur={() => {
                  if (tempHomeName.trim()) onUpdateTeamName('home', tempHomeName);
                  setIsEditingHomeName(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            ) : (
              <h2 
                onClick={() => { setTempHomeName(matchState.homeTeam.name); setIsEditingHomeName(true); }}
                className="text-[10px] md:text-xl font-black truncate text-white uppercase tracking-tighter cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1 md:gap-2"
              >
                <Pencil size={10} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" />
                {matchState.homeTeam.shortName}
              </h2>
            )}
            <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">{matchState.homeTeam.formation}</span>
          </div>
          
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center text-sm md:text-3xl font-black shadow-xl ${homeContrast}`} style={{ backgroundColor: matchState.homeTeam.color }}>
              {safeEventsCountHome}
            </div>
          </div>
        </div>

        {/* CLOCK (isolated re-renders) */}
        <div className="flex flex-col items-center justify-center min-w-[80px] md:min-w-[180px]">
           <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
              <div className="text-[7px] md:text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">{matchState.period}</div>
              <button onClick={onPlayPauseToggle} className={`p-0.5 md:p-1 rounded-md ${matchState.isPaused ? 'text-emerald-500' : 'text-yellow-500'}`}>
                {matchState.isPaused ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
              </button>
           </div>
           <TimerDisplay 
             initialMinutes={matchState.currentTime}
             isPaused={matchState.isPaused}
             period={matchState.period}
             onMinuteChange={onMinuteChange}
             resetSignal={resetSignal}
           />
           <button onClick={onNextPeriodClick} className="mt-0.5 md:mt-1 text-[6px] md:text-[7px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-1">
              Próximo <ChevronRight size={6} />
           </button>
        </div>

        {/* AWAY TEAM */}
        <div className="flex flex-1 items-center justify-start gap-1 md:gap-4 min-w-0">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center text-sm md:text-3xl font-black shadow-xl ${awayContrast}`} style={{ backgroundColor: matchState.awayTeam.color }}>
              {safeEventsCountAway}
            </div>
          </div>
          
          <div className="flex flex-col items-start min-w-0 group">
            {isEditingAwayName ? (
              <input 
                autoFocus
                className="bg-slate-800 border border-blue-500 rounded px-2 py-1 text-[10px] md:text-sm font-black text-white w-20 md:w-40 uppercase"
                value={tempAwayName}
                onChange={(e) => setTempAwayName(e.target.value)}
                onBlur={() => {
                  if (tempAwayName.trim()) onUpdateTeamName('away', tempAwayName);
                  setIsEditingAwayName(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            ) : (
              <h2 
                onClick={() => { setTempAwayName(matchState.awayTeam.name); setIsEditingAwayName(true); }}
                className="text-[10px] md:text-xl font-black truncate text-white uppercase tracking-tighter cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1 md:gap-2"
              >
                {matchState.awayTeam.shortName}
                <Pencil size={10} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" />
              </h2>
            )}
            <span className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">{matchState.awayTeam.formation}</span>
          </div>
        </div>
      </div>
      
      {!isFullscreen && (
      <div className="w-full bg-slate-950/50 border-t border-white/5 py-1 px-4 flex justify-center items-center gap-4 md:gap-8 text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1"><Trophy size={10} className="text-yellow-500" /> {matchState.competition || "Camp. Não Definido"}</span>
          <span className="hidden sm:flex items-center gap-1"><MapPin size={10} /> {matchState.stadium || "Local"}</span>
          <span className="hidden sm:flex items-center gap-1"><User size={10} /> {matchState.referee || "Árbitro"}</span>
      </div>
      )}
    </header>
  );
};

export default Header;
