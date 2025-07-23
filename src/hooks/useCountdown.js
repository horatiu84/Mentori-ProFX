import { useEffect, useState, useMemo } from 'react';

export function useCountdown(targetDate, updateInterval = 1000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate || isNaN(targetDate)) {
      return;
    }
    const id = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (targetDate - currentTime <= 0) {
        clearInterval(id);
      }
    }, updateInterval);
    return () => clearInterval(id);
  }, [targetDate, updateInterval]);

  return useMemo(() => {
    if (!targetDate || isNaN(targetDate)) {
      return { days: 0, hrs: 0, mins: 0, secs: 0, isExpired: true };
    }
    const diff = targetDate - now;
    const clamped = Math.max(diff, 0);
    const secs = Math.floor(clamped / 1000) % 60;
    const mins = Math.floor(clamped / (1000 * 60)) % 60;
    const hrs = Math.floor(clamped / (1000 * 60 * 60)) % 24;
    const days = Math.floor(clamped / (1000 * 60 * 60 * 24));
    return { days, hrs, mins, secs, isExpired: diff <= 0 };
  }, [now, targetDate]);
}