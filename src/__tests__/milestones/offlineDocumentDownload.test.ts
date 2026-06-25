import { offlineDocumentDownload } from '../../features/offline/offlineDocumentDownload'
import { supabase } from '@/lib/supabase'
import * as FileSystem from 'expo-file-system'
import { storage } from '@/lib/mmkv'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/doc/dir/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn().mockResolvedValue({}),
}))

jest.mock('@/lib/mmkv', () => ({
  storage: {
    set: jest.fn(),
  },
}))

describe('offlineDocumentDownload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('selects the correct documents according to rules', async () => {
    const mockTripDays = [
      { id: 'day-1', day_number: 1 },
      { id: 'day-2', day_number: 2 },
      { id: 'day-3', day_number: 3 },
    ]

    const mockDocs = [
      {
        id: 'doc-visa',
        storage_url: 'http://visa.pdf',
        tab_source: 'documents',
        events: { category: 'Transport', subcategory: 'Air', trip_day_id: 'day-2' }
      },
      {
        id: 'doc-boarding-pass',
        storage_url: 'http://bp.pdf',
        tab_source: 'tickets',
        events: { category: 'Transport', subcategory: 'Air', trip_day_id: 'day-2' }
      },
      {
        id: 'doc-airport-trans-day1',
        storage_url: 'http://trans1.pdf',
        tab_source: 'tickets',
        events: { category: 'Transport', subcategory: 'Taxi', trip_day_id: 'day-1' }
      },
      {
        id: 'doc-airport-trans-day3',
        storage_url: 'http://trans3.pdf',
        tab_source: 'documents',
        events: { category: 'Transport', subcategory: 'Taxi', trip_day_id: 'day-3' }
      },
      {
        id: 'doc-trans-day2-exclude',
        storage_url: 'http://trans2.pdf',
        tab_source: 'tickets',
        events: { category: 'Transport', subcategory: 'Taxi', trip_day_id: 'day-2' } // Day 2 transport, not Air, excluded
      },
      {
        id: 'doc-hotel',
        storage_url: 'http://hotel.pdf',
        tab_source: 'documents',
        events: { category: 'Accommodation', trip_day_id: 'day-2' }
      },
      {
        id: 'doc-activity-exclude',
        storage_url: 'http://act.pdf',
        tab_source: 'tickets',
        events: { category: 'Activity', trip_day_id: 'day-2' }
      }
    ]

    const fromMock = jest.fn((table) => {
      if (table === 'event_documents') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockDocs, error: null }),
          }),
        }
      }
      if (table === 'trip_days') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockTripDays, error: null }),
            }),
          }),
        }
      }
    })

    ;(supabase.from as jest.Mock).mockImplementation(fromMock)

    const result = await offlineDocumentDownload('trip-1', 'user-1')

    expect(result.success).toBe(true)
    expect(result.savedCount).toBe(5) // visa, bp, trans-day1, trans-day3, hotel
    
    // Check if the manifest is saved correctly
    expect(storage.set).toHaveBeenCalledWith('offline_save_done_trip-1', 'true')
    
    // Check the files downloaded
    expect(FileSystem.downloadAsync).toHaveBeenCalledTimes(5)
  })
})
