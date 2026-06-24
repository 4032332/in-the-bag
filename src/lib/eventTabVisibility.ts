import { EventCategory } from '../types/database';

export interface TabVisibility {
  summary: boolean;
  tickets: boolean;
  transport: boolean;
  documents: boolean;
}

export function getTabVisibility(category: EventCategory): TabVisibility {
  return {
    summary: true,
    tickets:
      category === 'transport_air' ||
      category === 'transport_rail' ||
      category === 'transport_water' ||
      category === 'activity' ||
      category === 'shore_excursion',
    transport:
      category === 'activity',
    documents:
      category !== 'rest' && category !== 'free_time',
  };
}
