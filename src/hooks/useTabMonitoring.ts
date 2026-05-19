import { useCallback, useRef } from 'react';

// The Visibility API only tells us when the user leaves our page — the
// browser does not expose the destination URL for security reasons.
// We report the event honestly without guessing the destination site.

export function useTabMonitoring(onTabSwitch: () => void) {
  const handlerRef = useRef<(() => void) | null>(null);
  const activeRef = useRef(true);

  const startMonitoring = useCallback(() => {
    activeRef.current = true;

    const handler = () => {
      if (document.hidden && activeRef.current) {
        onTabSwitch();
      }
    };
    handlerRef.current = handler;
    document.addEventListener('visibilitychange', handler);
  }, [onTabSwitch]);

  const stopMonitoring = useCallback(() => {
    activeRef.current = false;
    if (handlerRef.current) {
      document.removeEventListener('visibilitychange', handlerRef.current);
      handlerRef.current = null;
    }
  }, []);

  return { startMonitoring, stopMonitoring };
}
