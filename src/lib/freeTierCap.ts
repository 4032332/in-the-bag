export const FREE_TIER_EVENT_CAP = 3;

export function isDayAtCap(eventCount: number, isPremium: boolean, isDemoMode = false): boolean {
  if (isDemoMode) return false;
  if (isPremium) return false;
  return eventCount >= FREE_TIER_EVENT_CAP;
}
