// src/hooks/useInTheBagSession.ts
import { useEffect, useRef } from 'react';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'in-the-bag-session' });
const SESSION_KEY = 'sparkle_shown_this_session';

/** Returns true on the first call per app session; false on subsequent calls. */
export function useSparkleOnFirstAppearance(): boolean {
  const isFirst = useRef(!storage.getBoolean(SESSION_KEY));

  useEffect(() => {
    if (isFirst.current) {
      storage.set(SESSION_KEY, true);
    }
  }, []);

  return isFirst.current;
}
