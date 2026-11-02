import { useCallback, useEffect, useState } from 'react';

/** Matches the backend's RESEND_OTP_COOLDOWN_SECONDS. */
export const RESEND_COOLDOWN_SECONDS = 60;

/** A once-per-second countdown, e.g. for "Resend code in 42s". */
export function useCooldown(initialSeconds = 0) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }
    const timer = setTimeout(() => setRemaining(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const start = useCallback((seconds = RESEND_COOLDOWN_SECONDS) => {
    setRemaining(Math.max(0, Math.round(seconds)));
  }, []);

  return { remaining, active: remaining > 0, start };
}
