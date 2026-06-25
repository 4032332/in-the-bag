import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { purchaseMonthly, purchaseLifetime, restorePurchases } from '@/lib/revenuecat'
import { usePremium } from '@/context/SubscriptionContext'
import { setDemoTier } from '@/lib/demoMode'
import Purchases, { PurchasesPackage } from 'react-native-purchases'

export interface UpgradePromptSheetProps {
  visible: boolean
  onClose: () => void
  featureTitle: string
  featureDescription: string
  variant: 'authenticated' | 'demo'
}

export function UpgradePromptSheet({
  visible,
  onClose,
  featureTitle,
  featureDescription,
  variant,
}: UpgradePromptSheetProps) {
  const sheetRef = React.useRef<BottomSheet>(null)
  const { refetch } = usePremium()
  
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null)
  const [lifetimePrice, setLifetimePrice] = useState<string | null>(null)
  const [isLoadingOffers, setIsLoadingOffers] = useState(true)

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand()
      if (variant === 'authenticated') {
        loadOfferings()
      }
    } else {
      sheetRef.current?.close()
    }
  }, [visible, variant])

  async function loadOfferings() {
    setIsLoadingOffers(true)
    try {
      const offerings = await Purchases.getOfferings()
      if (offerings.current) {
        if (offerings.current.monthly) {
          setMonthlyPrice(offerings.current.monthly.product.priceString)
        }
        if (offerings.current.lifetime) {
          setLifetimePrice(offerings.current.lifetime.product.priceString)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingOffers(false)
    }
  }

  async function handleSubscribeMonthly() {
    const { success } = await purchaseMonthly()
    if (success) {
      await refetch()
      onClose()
    }
  }

  async function handleSubscribeLifetime() {
    const { success } = await purchaseLifetime()
    if (success) {
      await refetch()
      onClose()
    }
  }

  async function handleRestore() {
    const { success } = await restorePurchases()
    if (success) {
      await refetch()
    }
  }

  function handleDemoUpgrade() {
    setDemoTier('premium')
    refetch()
    onClose()
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['50%', '70%']}
      enablePanDownToClose
      onClose={onClose}
    >
      <BottomSheetView style={styles.contentContainer}>
        <Text style={styles.title}>{featureTitle}</Text>
        <Text style={styles.description}>{featureDescription}</Text>

        {variant === 'authenticated' ? (
          <View style={styles.packagesContainer}>
            {isLoadingOffers ? (
              <ActivityIndicator size="large" />
            ) : (
              <>
                <TouchableOpacity style={styles.packageCard} onPress={handleSubscribeMonthly}>
                  <Text style={styles.packageTitle}>Premium Monthly</Text>
                  <Text style={styles.packagePrice}>{monthlyPrice || '$6.99'}</Text>
                  <Text style={styles.packageAction}>Subscribe</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.packageCard} onPress={handleSubscribeLifetime}>
                  <Text style={styles.packageTitle}>Premium Lifetime</Text>
                  <Text style={styles.packagePrice}>{lifetimePrice || '$44.99'}</Text>
                  <Text style={styles.packageAction}>Subscribe</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.textButton} onPress={handleRestore}>
                  <Text style={styles.textButtonLabel}>Restore Purchase</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.packagesContainer}>
            <TouchableOpacity style={styles.demoButton} onPress={handleDemoUpgrade}>
              <Text style={styles.demoButtonText}>Switch to Premium (demo)</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.textButton} onPress={onClose}>
          <Text style={styles.textButtonLabel}>Maybe Later</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  packagesContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  packageCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2a9d8f',
    marginBottom: 8,
  },
  packageAction: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  demoButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  textButton: {
    padding: 12,
    alignItems: 'center',
  },
  textButtonLabel: {
    fontSize: 16,
    color: '#666',
  },
})
