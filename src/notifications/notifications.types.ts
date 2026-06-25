export type NotificationPayload = {
  action: 'save_offline_docs' | 'trip_reminder' | 'family_invitation' | 'treasure_map_ready' | 'family_accepted'
  trip_id?: string
}

export const SAVE_NOW_ACTION = 'SAVE_NOW'
export const LATER_ACTION = 'LATER'
export const OFFLINE_DOCS_CATEGORY = 'OFFLINE_DOCS'
