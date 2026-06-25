import * as FileSystem from 'expo-file-system'
import { supabase } from '@/lib/supabase'
import { storage } from '@/lib/mmkv'

export type OfflineSaveResult = {
  success: boolean
  savedCount: number
  errors: string[]
}

export type OfflineDocManifest = {
  label: string
  localUri: string
  originalUrl: string
  savedAt: string
}

export async function offlineDocumentDownload(tripId: string, userId: string): Promise<OfflineSaveResult> {
  const result: OfflineSaveResult = { success: false, savedCount: 0, errors: [] }

  try {
    // We need to fetch event_documents and join on events
    // Supabase JS: we can query `event_documents` and select `*, events!inner(*)`
    const { data: eventDocs, error } = await supabase
      .from('event_documents')
      .select('*, events!inner(*)')
      .eq('events.trip_id', tripId)

    if (error) throw error

    // Fetch trip_days to determine first and last days
    const { data: tripDays, error: daysError } = await supabase
      .from('trip_days')
      .select('id, day_number')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })

    if (daysError) throw daysError

    let firstDayId = null
    let lastDayId = null
    if (tripDays && tripDays.length > 0) {
      firstDayId = tripDays[0].id
      lastDayId = tripDays[tripDays.length - 1].id
    }

    const docsToDownload: any[] = []

    for (const doc of (eventDocs || [])) {
      const event = (doc as any).events
      if (!event) continue

      let include = false

      // Visa/immigration docs
      if (event.category === 'Transport' && event.subcategory === 'Air' && (doc as any).tab_source === 'documents') {
        include = true
      }
      // Boarding passes
      else if (event.category === 'Transport' && event.subcategory === 'Air' && (doc as any).tab_source === 'tickets') {
        include = true
      }
      // Airport transport confirmations (Transport events on first or last day)
      else if (event.category === 'Transport' && (event.trip_day_id === firstDayId || event.trip_day_id === lastDayId)) {
        include = true
      }
      // Hotel confirmation
      else if (event.category === 'Accommodation') {
        include = true
      }

      if (include && (doc as any).storage_url) {
        docsToDownload.push(doc)
      }
    }

    const folderUri = `${FileSystem.documentDirectory}offline/${tripId}/`
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(folderUri)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true })
    }

    const manifest: OfflineDocManifest[] = []

    for (const doc of docsToDownload) {
      try {
        const fileExt = (doc as any).storage_url.split('.').pop()?.split('?')[0] || 'pdf'
        const localUri = `${folderUri}${(doc as any).id}.${fileExt}`
        
        await FileSystem.downloadAsync((doc as any).storage_url, localUri)
        
        manifest.push({
          label: (doc as any).label || 'Document',
          localUri,
          originalUrl: (doc as any).storage_url,
          savedAt: new Date().toISOString(),
        })
        result.savedCount++
      } catch (err: any) {
        result.errors.push(`Failed to download doc ${(doc as any).id}: ${err.message}`)
      }
    }

    storage.set(`offline_docs_${tripId}`, JSON.stringify(manifest))
    storage.set(`offline_save_done_${tripId}`, 'true')

    result.success = result.errors.length === 0
  } catch (err: any) {
    result.success = false
    result.errors.push(err.message)
  }

  return result
}
