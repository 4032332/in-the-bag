import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { UpgradePromptSheet } from './UpgradePromptSheet'
import { purchaseMonthly, purchaseLifetime, restorePurchases } from '@/lib/revenuecat'
import { setDemoTier } from '@/lib/demoMode'

jest.mock('@/lib/revenuecat', () => ({
  purchaseMonthly: jest.fn().mockResolvedValue({ success: true }),
  purchaseLifetime: jest.fn().mockResolvedValue({ success: true }),
  restorePurchases: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/lib/demoMode', () => ({
  setDemoTier: jest.fn(),
}))

const mockRefetch = jest.fn()
jest.mock('@/context/SubscriptionContext', () => ({
  usePremium: () => ({ refetch: mockRefetch }),
}))

jest.mock('react-native-purchases', () => {
  return {
    getOfferings: jest.fn().mockResolvedValue({
      current: {
        monthly: { product: { priceString: '$9.99' } },
        lifetime: { product: { priceString: '$99.99' } },
      },
    }),
  }
})

describe('UpgradePromptSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correct buttons for variant authenticated', async () => {
    const { findByText } = await render(
      <UpgradePromptSheet
        visible={true}
        onClose={jest.fn()}
        featureTitle="Feature"
        featureDescription="Desc"
        variant="authenticated"
      />
    )

    const monthlyText = await findByText('Premium Monthly')
    expect(monthlyText).toBeTruthy()

    const lifetimeText = await findByText('Premium Lifetime')
    expect(lifetimeText).toBeTruthy()

    const restoreText = await findByText('Restore Purchase')
    expect(restoreText).toBeTruthy()
  })

  it('renders Switch to Premium for variant demo', async () => {
    const { getByText } = await render(
      <UpgradePromptSheet
        visible={true}
        onClose={jest.fn()}
        featureTitle="Feature"
        featureDescription="Desc"
        variant="demo"
      />
    )

    expect(getByText('Switch to Premium (demo)')).toBeTruthy()
  })

  it('calls onClose when Maybe Later is pressed', async () => {
    const mockClose = jest.fn()
    const { getByText } = await render(
      <UpgradePromptSheet
        visible={true}
        onClose={mockClose}
        featureTitle="Feature"
        featureDescription="Desc"
        variant="demo"
      />
    )

    fireEvent.press(getByText('Maybe Later'))
    expect(mockClose).toHaveBeenCalled()
  })

  it('demo switch sets MMKV and calls onClose', async () => {
    const mockClose = jest.fn()
    const { getByText } = await render(
      <UpgradePromptSheet
        visible={true}
        onClose={mockClose}
        featureTitle="Feature"
        featureDescription="Desc"
        variant="demo"
      />
    )

    fireEvent.press(getByText('Switch to Premium (demo)'))
    expect(setDemoTier).toHaveBeenCalledWith('premium')
    expect(mockRefetch).toHaveBeenCalled()
    expect(mockClose).toHaveBeenCalled()
  })
})
