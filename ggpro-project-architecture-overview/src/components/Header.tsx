import { useState } from 'react';
import type { MatchState } from '../types';

const PERIOD_LABELS: Record<string, string> = {
  PRE_MATCH: 'PRÉ-JOGO', '1T': '1º TEMPO', INTERVAL: 'INTERVALO', '2T': '2º TEMPO',
  '1ET': '1ª PRORR.', '2ET': '2ª PRORR.', PENALTIES: 'PÊNALTIS', FINISHED: 'ENCERRADO',
};
const PERIOD_COLORS: Record<string, string> = {
  PRE_MATCH: 'text-slate-400', '1T': 'text-emerald-400', INTERVAL: 'text-amber-400',
  '2T': 'text-emerald-400', '1ET': 'text-blue-400', '2ET': 'text-blue-400',
  PENALTIES: 'text-red-400', FINISHED: 'text-slate-500',
};

interface HeaderProps {
  state: MatchState;
  displayTime: string;
  footballMinute: string;
  homeGoals: number;
  awayGoals: number;
  possession: { home: number; away: number };
  onTogglePlayPause: () => void;
  onAdvancePeriod: () => void;
  onTogglePossession: (teamId: 'home' | 'away') => void;
  onSetAddedTime: (period: '1T' | '2T', minutes: number) => void;
  onAdjustTimer: (delta: number) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export function Header({ state, displayTime, footballMinute, homeGoals, awayGoals, possession, onTogglePlayPause, onAdvancePeriod, onTogglePossession, onSetAddedTime, onAdjustTimer, onToggleFullscreen, isFullscreen }: HeaderProps) {
  const { homeTeam, awayTeam, period, isPaused, penaltyScore, isPenaltyShootoutActive } = state;
  const isLive = !isPaused;
  const [showAddedTime, setShowAddedTime] = useState(false);
  const [showTimerAdj, setShowTimerAdj] = useState(false);

  return (
    <header className="bg-slate-950 border-b border-white/5 select-none shrink-0">
      {/* Competition info */}
      {state.matchDetails.competition && (
        <div className="text-center py-0.5 text-[8px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/5 bg-slate-950/50">
          🏆 {state.matchDetails.competition}
          {state.matchDetails.stadium && ` · 🏟️ ${state.matchDetails.stadium}`}
        </div>
      )}

      {/* Scoreboard */}
      <div className="flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3">
        {/* HOME */}
        <button className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 justify-end" onClick={() => onTogglePossession('home')} title="Posse → Casa">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-xs sm:text-lg font-black text-white uppercase tracking-tight truncate leading-none">{homeTeam.shortName}</span>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{homeTeam.formation}</span>
          </div>
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xl sm:text-3xl text-white shadow-lg ring-2 ring-white/10 shrink-0" style={{ backgroundColor: homeTeam.color }}>
            {homeGoals}
          </div>
          {period === 'PENALTIES' && <span className="text-xs font-black text-blue-400">({penaltyScore.home})</span>}
        </button>

        {/* CENTER */}
        <div className="flex flex-col items-center justify-center mx-1 sm:mx-3 shrink-0">
          <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] ${PERIOD_COLORS[period] || 'text-slate-400'} ${isLive && (period === '1T' || period === '2T') ? 'animate-pulse' : ''}`}>
            {PERIOD_LABELS[period] || period}
          </span>

          <div className="flex items-center gap-1.5">
            <div className="bg-slate-800/80 px-2.5 py-0.5 sm:px-4 sm:py-1 rounded-lg sm:rounded-xl border border-white/5 flex items-center gap-0.5">
              <span className="text-xs sm:text-sm font-mono font-black tracking-tight text-emerald-400/70 hidden sm:block">{footballMinute}</span>
              <span className="text-slate-600 hidden sm:block mx-0.5">|</span>
              <span className="text-xl sm:text-3xl font-mono font-black tracking-tight text-white">{displayTime.split(':')[0]}</span>
              <span className={`${isLive ? 'text-emerald-400 animate-pulse' : 'text-slate-600'} mx-0.5 text-xl sm:text-3xl font-black`}>:</span>
              <span className="text-xl sm:text-3xl font-mono font-black tracking-tight text-white">{displayTime.split(':')[1]}</span>
            </div>

            <button onClick={(e) => { e.stopPropagation(); onTogglePlayPause(); }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-lg ${
                isLive ? 'bg-amber-500 text-white hover:bg-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20'
                       : 'bg-emerald-500 text-white hover:bg-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/20'
              }`} title={isPaused ? 'Iniciar' : 'Pausar'}>
              {isPaused ? (
                <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-black text-emerald-400 sm:hidden">{footballMinute}</span>
            <button onClick={(e) => { e.stopPropagation(); onAdvancePeriod(); }}
              className="text-[7px] sm:text-[9px] font-bold text-slate-600 hover:text-white active:text-emerald-400 uppercase tracking-widest flex items-center gap-0.5 transition-colors py-1 px-2 rounded-lg active:bg-white/5">
              Avançar <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>
            {(period === '1T' || period === '2T') && (
              <button onClick={() => setShowAddedTime(!showAddedTime)} className="text-[7px] font-bold text-amber-500/60 hover:text-amber-400 uppercase tracking-widest py-1 px-1.5 rounded-lg active:bg-white/5 transition-colors">+acr</button>
            )}
            {!isPaused && (
              <button onClick={() => setShowTimerAdj(!showTimerAdj)} className="text-[7px] font-bold text-slate-600 hover:text-white uppercase tracking-widest py-1 px-1.5 rounded-lg active:bg-white/5 transition-colors">⏱±</button>
            )}
            <button onClick={onToggleFullscreen} className="text-[7px] font-bold text-slate-600 hover:text-white uppercase py-1 px-1 rounded-lg active:bg-white/5 transition-colors">
              {isFullscreen ? '⬜' : '⬛'}
            </button>
          </div>
        </div>

        {/* AWAY */}
        <button className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 justify-start" onClick={() => onTogglePossession('away')} title="Posse → Visitante">
          {period === 'PENALTIES' && <span className="text-xs font-black text-blue-400">({penaltyScore.away})</span>}
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xl sm:text-3xl text-white shadow-lg ring-2 ring-white/10 shrink-0" style={{ backgroundColor: awayTeam.color }}>
            {awayGoals}
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-xs sm:text-lg font-black text-white uppercase tracking-tight truncate leading-none">{awayTeam.shortName}</span>
            <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{awayTeam.formation}</span>
          </div>
        </button>
      </div>

      {/* Timer Adjustment */}
      {showTimerAdj && !isPaused && (
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-blue-500/5 border-t border-blue-500/10">
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Ajustar:</span>
          {[-30, -10, -5, -1, 1, 5, 10, 30].map(val => (
              <button key={val} onClick={() => onAdjustTimer(val)}
                className="w-8 h-7 rounded-lg text-[10px] font-black bg-slate-800/60 text-slate-400 hover:text-white active:scale-90 transition-all">
                {val > 0 ? '+' : ''}{val}s
              </button>
            ))}
        </div>
      )}

      {/* Added Time */}
      {showAddedTime && (period === '1T' || period === '2T') && (
        <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-amber-500/5 border-t border-amber-500/10">
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Acréscimos {period}:</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => (
              <button key={m} onClick={() => onSetAddedTime(period, m)}
                className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all active:scale-90 ${state.addedTime[period] === m ? 'bg-amber-500 text-white' : 'bg-slate-800/60 text-slate-500 hover:text-white'}`}>{m}</button>
            ))}
          </div>
          <span className="text-[9px] text-amber-500/50">min</span>
        </div>
      )}

      {/* Possession Bar */}
      {(period === '1T' || period === '2T' || period === 'PENALTIES') && (
        <div className="w-full px-2 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-white/60 w-6 text-right">{possession.home}%</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full rounded-l-full transition-all duration-700 ease-out" style={{ width: `${possession.home}%`, backgroundColor: homeTeam.color }} />
              <div className="h-full rounded-r-full transition-all duration-700 ease-out" style={{ width: `${possession.away}%`, backgroundColor: awayTeam.color }} />
            </div>
            <span className="text-[8px] font-black text-white/60 w-6">{possession.away}%</span>
          </div>
        </div>
      )}

      {/* Penalty Shootout Visual */}
      {isPenaltyShootoutActive && state.penaltySequence.length > 0 && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 bg-amber-500/5 border-t border-amber-500/10">
          <PenaltyVisual sequence={state.penaltySequence} homeShort={homeTeam.shortName} awayShort={awayTeam.shortName} homeScore={penaltyScore.home} awayScore={penaltyScore.away} />
        </div>
      )}
    </header>
  );
}

function PenaltyVisual({ sequence, homeShort, awayShort, homeScore, awayScore }: {
  sequence: { teamId: 'home' | 'away'; scored: boolean }[];
  homeShort: string; awayShort: string;
  homeScore: number; awayScore: number;
}) {
  const homeKicks = sequence.filter(k => k.teamId === 'home');
  const awayKicks = sequence.filter(k => k.teamId === 'away');
  const maxKicks = Math.max(homeKicks.length, awayKicks.length, 5);

  return (
    <div className="flex items-center gap-3 text-[10px]">
      <span className="font-black text-white">{homeShort}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: maxKicks }).map((_, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${i < homeKicks.length ? (homeKicks[i].scored ? 'bg-emerald-500 text-white' : 'bg-red-500/40 text-red-400') : 'bg-slate-800 text-slate-600'}`}>
              {i < homeKicks.length ? (homeKicks[i].scored ? '●' : '✕') : '·'}
            </span>
          </div>
        ))}
      </div>
      <span className="font-black text-amber-400 text-sm">{homeScore} × {awayScore}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: maxKicks }).map((_, i) => (
          <span key={i} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${i < awayKicks.length ? (awayKicks[i].scored ? 'bg-emerald-500 text-white' : 'bg-red-500/40 text-red-400') : 'bg-slate-800 text-slate-600'}`}>
            {i < awayKicks.length ? (awayKicks[i].scored ? '●' : '✕') : '·'}
          </span>
        ))}
      </div>
      <span className="font-black text-white">{awayShort}</span>
    </div>
  );
}
