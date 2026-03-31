import { useState, useEffect, useRef } from 'react';
import { MatchStatus } from '../types';

interface UseMatchTimerProps {
  initialMinutes: number;
  initialSeconds: number;
  isPaused: boolean;
  period: MatchStatus;
  onMinuteChange: (newMinute: number) => void;
}

export const useMatchTimer = ({
  initialMinutes,
  initialSeconds,
  isPaused,
  period,
  onMinuteChange
}: UseMatchTimerProps) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentMinutesRef = useRef<number>(initialMinutes);

  useEffect(() => {
    currentMinutesRef.current = initialMinutes;
  }, [initialMinutes]);

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
    
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [isPaused, period, onMinuteChange]);

  return { seconds, setSeconds };
};
