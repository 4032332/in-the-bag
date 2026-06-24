import React, { useState } from 'react';
import { getDemoTier, setDemoTier as persistDemoTier } from '../lib/mmkv';
import { DEMO_MODE_ENABLED, DemoTier } from '../lib/constants';
import { DemoModeContext } from '../hooks/useDemoMode';

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demoTier, setTierState] = useState<DemoTier | null>(getDemoTier);

  function setDemoTier(tier: DemoTier) {
    persistDemoTier(tier);
    setTierState(tier);
  }

  const isDemoMode = DEMO_MODE_ENABLED && demoTier !== null;

  return (
    <DemoModeContext.Provider value={{ isDemoMode, demoTier, setDemoTier }}>
      {children}
    </DemoModeContext.Provider>
  );
}
