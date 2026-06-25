import {
  totalTrips,
  totalDaysAway,
  countriesVisited,
  citiesVisited,
  totalFlights,
  totalCruises,
  totalTrainJourneys,
  totalRoadTrips,
  longestTrip,
  mostVisitedCountry,
  mostCommonTravelCompanion,
  type Trip,
  type TripDestination,
  type Event,
  type TripParticipant,
} from './statsCalculator';

const makeTrip = (id: string, name: string, is_cruise = false): Trip => ({ id, name, is_cruise });

const makeDest = (id: string, trip_id: string, city: string, country: string, start: string, end: string): TripDestination => ({
  id, trip_id, city, country, start_date: start, end_date: end,
});

const makeEvent = (id: string, trip_id: string, category: string, subcategory: string | null): Event => ({
  id, trip_id, category, subcategory,
});

describe('totalRoadTrips', () => {
  it('counts only car_hire and self_drive, excludes taxi, shuttle, bus', () => {
    const events: Event[] = [
      makeEvent('1', 't1', 'Transport', 'car_hire'),
      makeEvent('2', 't1', 'Transport', 'self_drive'),
      makeEvent('3', 't1', 'Transport', 'taxi'),
      makeEvent('4', 't1', 'Transport', 'shuttle'),
      makeEvent('5', 't1', 'Transport', 'bus'),
      makeEvent('6', 't1', 'Transport', 'Air'),
    ];
    expect(totalRoadTrips(events)).toBe(2);
  });
});

describe('mostCommonTravelCompanion', () => {
  it('returns deterministic result on tie (lexicographically smallest user_id)', () => {
    const participants: TripParticipant[] = [
      { trip_id: 't1', user_id: 'user-a' },
      { trip_id: 't1', user_id: 'user-b' },
      { trip_id: 't1', user_id: 'user-c' },
      { trip_id: 't2', user_id: 'user-a' },
      { trip_id: 't2', user_id: 'user-b' },
      { trip_id: 't2', user_id: 'user-d' },
    ];
    // user-b appears on both trips with user-a; user-c and user-d appear once each
    const result = mostCommonTravelCompanion(participants, 'user-a');
    expect(result?.userId).toBe('user-b');
    expect(result?.count).toBe(2);
  });

  it('tie-breaks by lexicographically smallest user_id', () => {
    const participants: TripParticipant[] = [
      { trip_id: 't1', user_id: 'user-a' },
      { trip_id: 't1', user_id: 'user-z' },
      { trip_id: 't2', user_id: 'user-a' },
      { trip_id: 't2', user_id: 'user-m' },
    ];
    const result = mostCommonTravelCompanion(participants, 'user-a');
    expect(result?.userId).toBe('user-m'); // m < z
    expect(result?.count).toBe(1);
  });
});

describe('countriesVisited', () => {
  it('deduplicates same country across multiple trips', () => {
    const dests: TripDestination[] = [
      makeDest('1', 't1', 'Paris', 'France', '2024-01-01', '2024-01-07'),
      makeDest('2', 't2', 'Lyon', 'France', '2024-03-01', '2024-03-07'),
      makeDest('3', 't1', 'Berlin', 'Germany', '2024-02-01', '2024-02-07'),
    ];
    const result = countriesVisited(dests);
    expect(result.count).toBe(2);
    expect(result.list).toEqual(['France', 'Germany']);
  });

  it('returns alphabetically sorted list', () => {
    const dests: TripDestination[] = [
      makeDest('1', 't1', 'Tokyo', 'Japan', '2024-01-01', '2024-01-07'),
      makeDest('2', 't2', 'Sydney', 'Australia', '2024-03-01', '2024-03-07'),
      makeDest('3', 't3', 'London', 'UK', '2024-05-01', '2024-05-07'),
    ];
    const result = countriesVisited(dests);
    expect(result.list).toEqual(['Australia', 'Japan', 'UK']);
  });
});

describe('longestTrip', () => {
  it('returns correct trip when multiple trips have different lengths', () => {
    const trips = [makeTrip('t1', 'Short'), makeTrip('t2', 'Long')];
    const dests: TripDestination[] = [
      makeDest('1', 't1', 'Paris', 'France', '2024-01-01', '2024-01-05'), // 5 days
      makeDest('2', 't2', 'Tokyo', 'Japan', '2024-03-01', '2024-03-14'), // 14 days
    ];
    const result = longestTrip(trips, dests);
    expect(result?.tripName).toBe('Long');
    expect(result?.days).toBe(14);
  });
});

describe('totalDaysAway', () => {
  it('correctly sums across multiple trips including single-day trips', () => {
    const ranges = [
      { minStart: new Date('2024-01-01'), maxEnd: new Date('2024-01-07') }, // 7 days
      { minStart: new Date('2024-03-01'), maxEnd: new Date('2024-03-01') }, // 1 day
      { minStart: new Date('2024-06-01'), maxEnd: new Date('2024-06-10') }, // 10 days
    ];
    expect(totalDaysAway(ranges)).toBe(18);
  });
});

describe('totalFlights', () => {
  it('counts only Air transport events', () => {
    const events: Event[] = [
      makeEvent('1', 't1', 'Transport', 'Air'),
      makeEvent('2', 't1', 'Transport', 'Air'),
      makeEvent('3', 't1', 'Transport', 'Rail'),
      makeEvent('4', 't1', 'Transport', 'car_hire'),
      makeEvent('5', 't1', 'Accommodation', null),
    ];
    expect(totalFlights(events)).toBe(2);
  });
});

describe('totalCruises', () => {
  it('counts only trips with is_cruise = true', () => {
    const trips = [
      makeTrip('t1', 'Cruise 1', true),
      makeTrip('t2', 'Normal trip', false),
      makeTrip('t3', 'Cruise 2', true),
    ];
    expect(totalCruises(trips)).toBe(2);
  });
});

describe('totalTrainJourneys', () => {
  it('counts only Rail transport events', () => {
    const events: Event[] = [
      makeEvent('1', 't1', 'Transport', 'Rail'),
      makeEvent('2', 't1', 'Transport', 'Rail'),
      makeEvent('3', 't1', 'Transport', 'Air'),
      makeEvent('4', 't1', 'Transport', 'car_hire'),
    ];
    expect(totalTrainJourneys(events)).toBe(2);
  });
});

describe('mostVisitedCountry', () => {
  it('tie-breaks alphabetically', () => {
    const dests: TripDestination[] = [
      makeDest('1', 't1', 'Paris', 'France', '2024-01-01', '2024-01-07'),
      makeDest('2', 't2', 'Lyon', 'France', '2024-03-01', '2024-03-07'),
      makeDest('3', 't3', 'Berlin', 'Germany', '2024-05-01', '2024-05-07'),
      makeDest('4', 't4', 'Munich', 'Germany', '2024-07-01', '2024-07-07'),
    ];
    // France on t1,t2 = 2 trips; Germany on t3,t4 = 2 trips — tie, France wins alphabetically
    expect(mostVisitedCountry(dests)).toBe('France');
  });
});
