import { useState, useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';
import { requestHealthKitPermission, fetchTravelHealthData } from '../lib/stats/healthKitBridge';

const storage = new MMKV({ id: 'in-the-bag-stats' });
const PERMISSION_REQUESTED_KEY = 'healthkit_permission_requested';

type PermissionStatus = 'granted' | 'denied' | 'unavailable' | 'not_asked';

interface HealthData {
  totalSteps: number;
  totalKj: number;
  totalFlightsClimbed: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface State {
  permissionStatus: PermissionStatus;
  healthData: HealthData | null;
  loading: boolean;
  needsPermissionPrompt: boolean;
}

export function useHealthKitData(dateRanges: DateRange[]) {
  const previouslyRequested = storage.getBoolean(PERMISSION_REQUESTED_KEY) ?? false;

  const [state, setState] = useState<State>({
    permissionStatus: previouslyRequested ? 'not_asked' : 'not_asked',
    healthData: null,
    loading: false,
    needsPermissionPrompt: !previouslyRequested,
  });

  const fetchData = useCallback(async (status: 'granted') => {
    if (status !== 'granted' || dateRanges.length === 0) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await fetchTravelHealthData(dateRanges);
      setState((s) => ({ ...s, healthData: data, loading: false }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [dateRanges]);

  const requestPermission = useCallback(async () => {
    const status = await requestHealthKitPermission();
    storage.set(PERMISSION_REQUESTED_KEY, true);
    setState((s) => ({ ...s, permissionStatus: status, needsPermissionPrompt: false }));
    if (status === 'granted') fetchData('granted');
  }, [fetchData]);

  const checkExistingPermission = useCallback(async () => {
    if (!previouslyRequested) return;
    // Silent re-check (no system dialog) — initHealthKit without prompting
    const status = await requestHealthKitPermission();
    setState((s) => ({ ...s, permissionStatus: status, needsPermissionPrompt: false }));
    if (status === 'granted') fetchData('granted');
  }, [previouslyRequested, fetchData]);

  const refetch = useCallback(() => {
    checkExistingPermission();
  }, [checkExistingPermission]);

  return {
    permissionStatus: state.permissionStatus,
    healthData: state.healthData,
    loading: state.loading,
    needsPermissionPrompt: state.needsPermissionPrompt,
    requestPermission,
    refetch,
  };
}
