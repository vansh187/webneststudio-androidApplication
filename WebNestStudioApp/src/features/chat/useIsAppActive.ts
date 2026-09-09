import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/** True while the app is foregrounded. Used to pause chat polling. */
export function useIsAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const onChange = (state: AppStateStatus) => setActive(state === 'active');
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return active;
}
