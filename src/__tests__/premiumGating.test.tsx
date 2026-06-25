import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
import ExploreScreen from '../../app/(tabs)/explore'
import { usePremium } from '@/context/SubscriptionContext'

jest.mock('@/context/SubscriptionContext', () => ({
  usePremium: jest.fn(),
}))

describe('Premium Gating Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ExploreScreen shows UpgradePromptSheet when !isPremium', async () => {
    ;(usePremium as jest.Mock).mockReturnValue({ isPremium: false })

    const { getByText } = await render(<ExploreScreen />)

    await waitFor(() => {
      expect(getByText('Explore with AI')).toBeTruthy()
    })
  })

  it('ExploreScreen shows content when isPremium', async () => {
    ;(usePremium as jest.Mock).mockReturnValue({ isPremium: true })

    const { getByText, queryByText } = await render(<ExploreScreen />)

    await waitFor(() => {
      expect(getByText('AI-powered holiday planning features go here!')).toBeTruthy()
      expect(queryByText('Explore with AI')).toBeNull()
    })
  })
})
