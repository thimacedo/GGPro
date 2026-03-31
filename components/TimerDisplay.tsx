import React, { useEffect, useState, useRef } from 'react';
import { MatchStatus } from '../types';

interface TimerDisplayProps {
  initialMinutes: number;
  isPaused: boolean;
  period: MatchStatus;
  onMinuteChange: (m: number) => void;
  resetSignal: number;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ initialMinutes, isPaused, period, onMinuteChange, resetSignal }) => {
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentMinutesRef = useRef<number>(initialMinutes);

  useEffect(() => {
    currentMinutesRef.current = initialMinutes;
  }, [initialMinutes]);

  useEffect(() => {
    setSeconds(0);
  }, [resetSignal, period]);

  useEffect(() => {
    const isClockRunning = !isPaused && !['PRE_MATCH', 'INTERVAL', 'FINISHED', 'PENALTIES'].includes(period);
    if (isClockRunning) {
      startTimeRef.current = Date.now() - (currentMinutesRef.current * 60000 + seconds * 1000);
      timerRef.current = setInterval(() => {
        const diff = Date.now() - startTimeRef.current;
        const totalSecs = Math.floor(diff / 1000);
        const newMins = Math.floor(totalSecs / 60);
        const newSecs = totalSecs % 60;
        
        setSeconds(newSecs);
        
        if (newMins !== currentMinutesRef.current) {
          currentMinutesRef.current = newMins;
          onMinuteChange(newMins);
        }
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPaused, period, onMinuteChange, seconds]);

  return (
    <div className="text-sm md:text-3xl font-mono font-black tracking-tighter flex items-center text-white bg-slate-800/50 px-2 md:px-3 py-0.5 md:py-1 rounded-lg md:rounded-xl border border-white/5 shadow-inner">
        <span>{String(currentMinutesRef.current).padStart(2, '0')}</span>
        <span className={!isPaused ? 'animate-pulse text-blue-500' : 'text-slate-700'}>:</span>
        <span>{String(seconds).padStart(2, '0')}</span>
    </div>
  );
};

export default TimerDisplay;
