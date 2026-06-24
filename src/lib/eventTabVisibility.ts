import { EventCategory } from '../types/database';

export interface TabVisibility {
  details: boolean;
  inTheBag: boolean;
  documents: boolean;
  tickets: boolean;
}

export function getTabVisibility(category: EventCategory): TabVisibility {
  return {
    details: true,
    inTheBag: true,
    tickets:
      category === 'transport_air' ||
      category === 'transport_rail' ||
      category === 'transport_water' ||
      category === 'activity' ||
      category === 'shore_excursion',
    documents:
      category !== 'rest' && category !== 'free_time',
  };
}
