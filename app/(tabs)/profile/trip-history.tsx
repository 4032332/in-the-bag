import React, { useEffect, useState } from 'react'
import { FlatList, Text, TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { router } from 'expo-router'

interface PastTrip {
  id: string
  name: string
  cover_photo_url: string | null
  created_at: string
  trip_destinations: { city: string; country: string; start_date: string; end_date: string }[]
}

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<PastTrip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const today = new Date().toISOString().split('T')[0]
      // Past trips: all destination end_dates are before today
      const { data } = await supabase
        .from('trips')
        .select('id, name, cover_photo_url, created_at, trip_destinations(city, country, start_date, end_date)')
        .order('created_at', { ascending: false })

      if (!mounted) return

      // Filter to trips where all destinations have ended
      const past = (data ?? []).filter((trip: any) =>
        trip.trip_destinations &&
        trip.trip_destinations.length > 0 &&
        trip.trip_destinations.every((d: any) => d.end_date < today),
      )
      setTrips(past)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  return (
    <FlatList
      style={styles.container}
      data={trips}
      keyExtractor={(t) => t.id}
      ListEmptyComponent={<Text style={styles.empty}>No past trips yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push({ pathname: '/(app)/trips/[tripId]', params: { tripId: item.id, readOnly: 'true' } })}
        >
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.dest}>
            {item.trip_destinations.map((d) => `${d.city}, ${d.country}`).join(' — ')}
          </Text>
        </TouchableOpacity>
      )}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
  name: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  dest: { fontSize: 13, color: '#777', marginTop: 4 },
})
