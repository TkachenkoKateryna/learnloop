import { useCallback, useEffect, useState } from 'react';

// Counts down once a second after start(seconds). Each tick is measured
// against the clock, so a throttled background tab still shows the right
// value when it wakes up.
export const useCountdown = () => {
  const [endsAt, setEndsAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const start = useCallback((seconds: number) => {
    setEndsAt(Date.now() + seconds * 1000);
    setSecondsLeft(seconds);
  }, []);

  useEffect(() => {
    if (endsAt <= Date.now()) {
      return;
    }

    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  return { secondsLeft, start };
};
