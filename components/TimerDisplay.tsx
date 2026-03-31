import React, { useEffect, useState, useRef } from 'react';
import { MatchStatus } from '../types';

interface TimerDisplayProps {
  timerStartedAt: number | null;
  timeElapsed: number;
  isPaused: boolean;
  period: MatchStatus;
  resetSignal: number;
  onMinuteChange?: (m: number) => void;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ timerStartedAt, timeElapsed, isPaused, period, resetSignal, onMinuteChange }) => {
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMinuteRef = useRef<number>(-1);

  useEffect(() => {
    const isClockRunning = !isPaused && !['PRE_MATCH', 'INTERVAL', 'FINISHED', 'PENALTIES'].includes(period);
    
    if (isClockRunning && timerStartedAt) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const totalMs = timeElapsed + (now - timerStartedAt);
        const totalSecs = Math.floor(totalMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        
        setDisplayMinutes(mins);
        setDisplaySeconds(secs);

        if (mins !== lastMinuteRef.current) {
          lastMinuteRef.current = mins;
          if (onMinuteChange) onMinuteChange(mins);
        }
      }, 200); // 200ms para garantir fluidez visual sem sobrecarga
    } else {
        // Quando pausado, calcula o tempo estático
        const totalMs = timeElapsed;
        const totalSecs = Math.floor(totalMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setDisplayMinutes(mins);
        setDisplaySeconds(secs);
        if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused, period, timerStartedAt, timeElapsed, onMinuteChange]);

  // Reset visual ao mudar de período ou sinal de reset
  useEffect(() => {
    if (period === 'PRE_MATCH' || period === 'INTERVAL') {
       setDisplayMinutes(0);
       setDisplaySeconds(0);
       lastMinuteRef.current = -1;
    }
  }, [resetSignal, period]);

  return (
    <div className="text-sm md:text-3xl font-mono font-black tracking-tighter flex items-center text-white bg-slate-800/50 px-2 md:px-3 py-0.5 md:py-1 rounded-lg md:rounded-xl border border-white/5 shadow-inner">
        <span>{String(displayMinutes).padStart(2, '0')}</span>
        <span className={!isPaused ? 'animate-pulse text-blue-500' : 'text-slate-700'}>:</span>
        <span>{String(displaySeconds).padStart(2, '0')}</span>
    </div>
  );
};

export default TimerDisplay;
