import Purchases, { PurchasesPackage } from 'react-native-purchases'
import Constants from 'expo-constants'
import { isDemoMode } from './demoMode'

export function initRevenueCat() {
  const apiKey = Constants.expoConfig?.extra?.REVENUECAT_API_KEY_IOS
  if (apiKey) {
    Purchases.configure({ apiKey })
  } else {
    console.warn('REVENUECAT_API_KEY_IOS is not set in app.config.ts')
  }
}

export async function purchaseMonthly() {
  if (isDemoMode()) return { success: true, error: null }
  try {
    const offerings = await Purchases.getOfferings()
    if (offerings.current !== null && offerings.current.monthly !== null) {
      const purchaseResult = await Purchases.purchasePackage(offerings.current.monthly)
      return { success: true, error: null, result: purchaseResult }
    }
    return { success: false, error: 'Monthly offering not found' }
  } catch (err: any) {
    if (!err.userCancelled) {
      console.error(err)
    }
    return { success: false, error: err.message }
  }
}

export async function purchaseLifetime() {
  if (isDemoMode()) return { success: true, error: null }
  try {
    const offerings = await Purchases.getOfferings()
    if (offerings.current !== null && offerings.current.lifetime !== null) {
      const purchaseResult = await Purchases.purchasePackage(offerings.current.lifetime)
      return { success: true, error: null, result: purchaseResult }
    }
    return { success: false, error: 'Lifetime offering not found' }
  } catch (err: any) {
    if (!err.userCancelled) {
      console.error(err)
    }
    return { success: false, error: err.message }
  }
}

export async function restorePurchases() {
  if (isDemoMode()) return { success: true, error: null }
  try {
    const customerInfo = await Purchases.restorePurchases()
    return { success: true, error: null, result: customerInfo }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
