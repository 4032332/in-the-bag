import { EventCategory } from '../types/database';

export type FieldType = 'text' | 'textarea' | 'time' | 'date' | 'phone' | 'email';

export interface FieldDescriptor {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
}

const COMMON_FIELDS: FieldDescriptor[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'start_time', label: 'Start time', type: 'time' },
  { name: 'end_time', label: 'End time', type: 'time' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export function getEventFields(category: EventCategory, subcategory?: string | null): FieldDescriptor[] {
  switch (category) {
    case 'transport_air':
      return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'airline', label: 'Airline', type: 'text' },
        { name: 'flight_number', label: 'Flight number', type: 'text' },
        { name: 'start_time', label: 'Departure time', type: 'time' },
        { name: 'end_time', label: 'Arrival time', type: 'time' },
        { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'transport_road':
      return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'provider', label: 'Provider', type: 'text' },
        { name: 'pickup_location', label: 'Pickup location', type: 'text' },
        { name: 'dropoff_location', label: 'Dropoff location', type: 'text' },
        { name: 'start_time', label: 'Pickup time', type: 'time' },
        { name: 'confirmation_number', label: 'Confirmation number', type: 'text' },
        { name: 'contact_phone', label: 'Provider phone', type: 'phone' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'transport_rail':
      return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'operator', label: 'Operator', type: 'text' },
        { name: 'route', label: 'Route', type: 'text' },
        { name: 'start_time', label: 'Departure time', type: 'time' },
        { name: 'end_time', label: 'Arrival time', type: 'time' },
        { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'transport_water':
      return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'operator', label: 'Operator', type: 'text' },
        { name: 'route', label: 'Route', type: 'text' },
        { name: 'start_time', label: 'Departure time', type: 'time' },
        { name: 'end_time', label: 'Arrival time', type: 'time' },
        { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'accommodation':
      return [
        { name: 'title', label: 'Property name', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'text' },
        { name: 'start_time', label: 'Check-in time', type: 'time' },
        { name: 'end_time', label: 'Check-out time', type: 'time' },
        { name: 'confirmation_number', label: 'Confirmation number', type: 'text' },
        { name: 'contact_name', label: 'Contact name', type: 'text' },
        { name: 'contact_phone', label: 'Contact phone', type: 'phone' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'activity':
      return [
        { name: 'title', label: 'Activity name', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'text' },
        { name: 'start_time', label: 'Start time', type: 'time' },
        { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'meal':
      return [
        { name: 'title', label: 'Restaurant / cafe name', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'text' },
        { name: 'start_time', label: 'Time', type: 'time' },
        { name: 'reservation_details', label: 'Reservation details', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'rest':
      return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'health':
      return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'contact_name', label: 'Provider name', type: 'text' },
        { name: 'address', label: 'Address', type: 'text' },
        { name: 'start_time', label: 'Appointment time', type: 'time' },
        { name: 'contact_phone', label: 'Provider phone', type: 'phone' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'free_time':
      return [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'address', label: 'Location (optional)', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    case 'shore_excursion':
      return [
        { name: 'title', label: 'Excursion name', type: 'text', required: true },
        { name: 'address', label: 'Port', type: 'text' },
        { name: 'operator', label: 'Operator', type: 'text' },
        { name: 'start_time', label: 'Start time', type: 'time' },
        { name: 'duration', label: 'Duration', type: 'text' },
        { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
        { name: 'meeting_point', label: 'Meeting point', type: 'text' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ];
    default:
      return COMMON_FIELDS;
  }
}
