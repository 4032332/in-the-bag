/* eslint-disable @typescript-eslint/no-explicit-any */
// var (not const/let) so jest.mock hoisting can safely reference these before module init
var mockIsAvailable = jest.fn();
var mockInitHealthKit = jest.fn();
var mockGetStepCount = jest.fn();
var mockGetActiveEnergyBurned = jest.fn();
var mockGetFlightsClimbed = jest.fn();

jest.mock('react-native-health', () => ({
  __esModule: true,
  default: {
    Constants: {
      Permissions: {
        StepCount: 'StepCount',
        ActiveEnergyBurned: 'ActiveEnergyBurned',
        FlightsClimbed: 'FlightsClimbed',
      },
    },
    isAvailable: (...args: any[]) => mockIsAvailable(...args),
    initHealthKit: (...args: any[]) => mockInitHealthKit(...args),
    getStepCount: (...args: any[]) => mockGetStepCount(...args),
    getActiveEnergyBurned: (...args: any[]) => mockGetActiveEnergyBurned(...args),
    getFlightsClimbed: (...args: any[]) => mockGetFlightsClimbed(...args),
  },
}));

import { requestHealthKitPermission, fetchTravelHealthData } from './healthKitBridge';

beforeEach(() => jest.clearAllMocks());

describe('requestHealthKitPermission', () => {
  it('returns unavailable when HealthKit is not available', async () => {
    mockIsAvailable.mockImplementation((cb: (err: null, available: boolean) => void) => cb(null, false));
    expect(await requestHealthKitPermission()).toBe('unavailable');
  });

  it('returns granted when HealthKit initialises successfully', async () => {
    mockIsAvailable.mockImplementation((cb: (err: null, available: boolean) => void) => cb(null, true));
    mockInitHealthKit.mockImplementation((_p: unknown, cb: (err: null) => void) => cb(null));
    expect(await requestHealthKitPermission()).toBe('granted');
  });

  it('returns denied when HealthKit init fails', async () => {
    mockIsAvailable.mockImplementation((cb: (err: null, available: boolean) => void) => cb(null, true));
    mockInitHealthKit.mockImplementation((_p: unknown, cb: (err: Error) => void) => cb(new Error('denied')));
    expect(await requestHealthKitPermission()).toBe('denied');
  });
});

describe('fetchTravelHealthData', () => {
  const range1 = { start: new Date('2024-01-01'), end: new Date('2024-01-07') };
  const range2 = { start: new Date('2024-06-01'), end: new Date('2024-06-14') };

  it('sums data across two non-overlapping ranges', async () => {
    mockGetStepCount
      .mockImplementationOnce((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 5000 }))
      .mockImplementationOnce((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 8000 }));
    mockGetActiveEnergyBurned
      .mockImplementation((_o: unknown, cb: (e: null, r: { value: number }[]) => void) => cb(null, [{ value: 100 }]));
    mockGetFlightsClimbed
      .mockImplementationOnce((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 10 }))
      .mockImplementationOnce((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 15 }));

    const result = await fetchTravelHealthData([range1, range2]);
    expect(result.totalSteps).toBe(13000);
    expect(result.totalFlightsClimbed).toBe(25);
  });

  it('kJ conversion: 100 kcal active energy returns 418.4 kJ', async () => {
    mockGetStepCount.mockImplementation((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 0 }));
    mockGetActiveEnergyBurned.mockImplementation((_o: unknown, cb: (e: null, r: { value: number }[]) => void) => cb(null, [{ value: 100 }]));
    mockGetFlightsClimbed.mockImplementation((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 0 }));

    const result = await fetchTravelHealthData([range1]);
    expect(result.totalKj).toBeCloseTo(418.4);
  });

  it('queries overlapping ranges independently and sums correctly', async () => {
    const r1 = { start: new Date('2024-03-01'), end: new Date('2024-03-10') };
    const r2 = { start: new Date('2024-03-05'), end: new Date('2024-03-15') };

    mockGetStepCount
      .mockImplementationOnce((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 3000 }))
      .mockImplementationOnce((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 4000 }));
    mockGetActiveEnergyBurned.mockImplementation((_o: unknown, cb: (e: null, r: { value: number }[]) => void) => cb(null, []));
    mockGetFlightsClimbed.mockImplementation((_o: unknown, cb: (e: null, r: { value: number }) => void) => cb(null, { value: 0 }));

    const result = await fetchTravelHealthData([r1, r2]);
    expect(result.totalSteps).toBe(7000);
  });
});
