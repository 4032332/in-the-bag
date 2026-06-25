import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.FlightsClimbed,
    ],
    write: [],
  },
};

export function requestHealthKitPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  return new Promise((resolve) => {
    if (!AppleHealthKit.isAvailable) {
      resolve('unavailable');
      return;
    }
    AppleHealthKit.isAvailable((err: Object, available: boolean) => {
      if (err || !available) { resolve('unavailable'); return; }
      AppleHealthKit.initHealthKit(PERMISSIONS, (initErr: string) => {
        resolve(initErr ? 'denied' : 'granted');
      });
    });
  });
}

interface DateRange {
  start: Date;
  end: Date;
}

interface TravelHealthData {
  totalSteps: number;
  totalKj: number;
  totalFlightsClimbed: number;
}

function sumSamples(samples: HealthValue[]): number {
  return samples.reduce((acc, s) => acc + (s.value ?? 0), 0);
}

export async function fetchTravelHealthData(dateRanges: DateRange[]): Promise<TravelHealthData> {
  let totalSteps = 0;
  let totalKcal = 0;
  let totalFlightsClimbed = 0;

  for (const range of dateRanges) {
    const opts = { startDate: range.start.toISOString(), endDate: range.end.toISOString() };

    const steps: number = await new Promise((resolve) => {
      AppleHealthKit.getStepCount(opts, (err: string, result: HealthValue) => {
        resolve(err ? 0 : (result?.value ?? 0));
      });
    });

    const kcal: number = await new Promise((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(
        { ...opts, ascending: false },
        (err: string, results: HealthValue[]) => {
          resolve(err || !Array.isArray(results) ? 0 : sumSamples(results));
        },
      );
    });

    const flights: number = await new Promise((resolve) => {
      AppleHealthKit.getFlightsClimbed(opts, (err: string, result: HealthValue) => {
        resolve(err ? 0 : (result?.value ?? 0));
      });
    });

    totalSteps += steps;
    totalKcal += kcal;
    totalFlightsClimbed += flights;
  }

  return {
    totalSteps,
    totalKj: totalKcal * 4.184,
    totalFlightsClimbed,
  };
}
