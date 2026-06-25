import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useSubscription } from '../../hooks/useSubscription'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { isDemoMode, getDemoTier } from '@/lib/demoMode'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

jest.mock('@/lib/demoMode', () => ({
  isDemoMode: jest.fn(),
  getDemoTier: jest.fn(),
}))

jest.mock('@/lib/subscriptionCache', () => ({
  readCachedStatus: jest.fn().mockReturnValue(null),
  cacheSubscriptionStatus: jest.fn(),
}))

describe('useSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: { id: 'user-1' } })
    ;(isDemoMode as jest.Mock).mockReturnValue(false)
  })

  it('returns true for active monthly subscription', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'sub-1', expires_at: null },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const { result } = renderHook(() => useSubscription())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isPremium).toBe(true)
  })

  it('returns true if demo mode is premium', async () => {
    ;(isDemoMode as jest.Mock).mockReturnValue(true)
    ;(getDemoTier as jest.Mock).mockReturnValue('premium')

    const { result } = renderHook(() => useSubscription())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isPremium).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns false if demo mode is free', async () => {
    ;(isDemoMode as jest.Mock).mockReturnValue(true)
    ;(getDemoTier as jest.Mock).mockReturnValue('free')

    const { result } = renderHook(() => useSubscription())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isPremium).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
