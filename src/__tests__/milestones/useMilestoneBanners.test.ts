import { renderHook, act } from '@testing-library/react-native'
import { useMilestoneBanners } from '../../features/milestones/useMilestoneBanners'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('../../features/offline/offlineDocumentDownload', () => ({
  offlineDocumentDownload: jest.fn(),
}))

describe('useMilestoneBanners', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows insurance_30d if within 30 days and no state', async () => {
    jest.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    const departureDateISO = '2026-06-25T00:00:00Z' // 24 days away

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [] })
        })
      })
    })

    const { result, waitForNextUpdate } = renderHook(() => useMilestoneBanners('trip-1', 'user-1', departureDateISO))
    await waitForNextUpdate()

    expect(result.current.activeBanners.some(b => b.key === 'insurance_30d')).toBe(true)
  })

  it('hides insurance_30d if dismissed_at is set', async () => {
    jest.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    const departureDateISO = '2026-06-25T00:00:00Z' 

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [
            { banner_key: 'insurance_30d', dismissed_at: '2026-05-30T00:00:00Z' }
          ] })
        })
      })
    })

    const { result, waitForNextUpdate } = renderHook(() => useMilestoneBanners('trip-1', 'user-1', departureDateISO))
    await waitForNextUpdate()

    expect(result.current.activeBanners.some(b => b.key === 'insurance_30d')).toBe(false)
  })

  it('shows visa_14d even if resurface_at is in the future because it ignores snooze', async () => {
    jest.setSystemTime(new Date('2026-06-15T00:00:00Z'))
    const departureDateISO = '2026-06-25T00:00:00Z' // 10 days away

    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [
            { banner_key: 'visa_14d', resurface_at: '2026-06-16T00:00:00Z', dismissed_at: null }
          ] })
        })
      })
    })

    const { result, waitForNextUpdate } = renderHook(() => useMilestoneBanners('trip-1', 'user-1', departureDateISO))
    await waitForNextUpdate()

    expect(result.current.activeBanners.some(b => b.key === 'visa_14d')).toBe(true)
  })

  it('throws error when snoozeBanner called with visa_14d', async () => {
    const { result } = renderHook(() => useMilestoneBanners('trip-1', 'user-1', new Date().toISOString()))
    
    expect(() => {
      result.current.snoozeBanner('visa_14d')
    }).toThrow('visa_14d cannot be snoozed')
  })
})
