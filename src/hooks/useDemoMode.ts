import { createContext, useContext } from 'react';
import { DemoTier } from '../lib/constants';

export interface DemoModeContextValue {
  isDemoMode: boolean;
  demoTier: DemoTier | null;
  setDemoTier: (tier: DemoTier) => void;
}

export const DemoModeContext = createContext<DemoModeContextValue>({
  isDemoMode: false,
  demoTier: null,
  setDemoTier: () => {},
});

export function useDemoMode() {
  return useContext(DemoModeContext);
}
