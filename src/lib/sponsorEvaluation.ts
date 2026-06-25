import { supabase } from './supabase'

export async function evaluateSponsor(tripId: string) {
  const { error } = await (supabase.rpc as any)('evaluate_trip_sponsor', { trip_id: tripId })
  if (error) {
    console.error('Failed to evaluate trip sponsor:', error)
    return false
  }
  return true
}
