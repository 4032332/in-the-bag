import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { TripDay } from '../types/database';

export function generateTripDays(tripId: string, startDate: string, endDate: string): Omit<TripDay, 'id'>[] {
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  return days.map((date, index) => ({
    trip_id: tripId,
    day_number: index + 1,
    date: format(date, 'yyyy-MM-dd'),
  }));
}

export function formatDayTabLabel(day: TripDay, dateFormat?: string): [string, string, string] {
  const parsed = parseISO(day.date);
  const weekday = format(parsed, 'EEE').toUpperCase();
  const dayMonth = `${parsed.getDate()}/${parsed.getMonth() + 1}`;
  return [`Day ${day.day_number}`, weekday, dayMonth];
}
