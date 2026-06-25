import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MemoriesStyleToggle } from './MemoriesStyleToggle'
import { useMemoriesStyle } from '../../hooks/useMemoriesStyle'
import { Trip } from '../../types/database' // Assumes a Trip type exists or adjust to your setup

// Import renderers (to be created)
import { PostcardRenderer } from './styles/PostcardRenderer'
import { FridgeMagnetRenderer } from './styles/FridgeMagnetRenderer'
import { PolaroidRenderer } from './styles/PolaroidRenderer'
import { PassportStampRenderer } from './styles/PassportStampRenderer'
import { PuzzlePieceRenderer } from './styles/PuzzlePieceRenderer'
import { MonopolyFigureRenderer } from './styles/MonopolyFigureRenderer'

export function MemoriesSection() {
  const { user } = useAuth()
  const [style] = useMemoriesStyle()
  const [pastTrips, setPastTrips] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchPastTrips = async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id, name, destination, start_date, end_date, cover_photo_url,
          trip_participants!inner(user_id)
        `)
        .eq('trip_participants.user_id', user.id)
        .lt('end_date', today)
        .order('end_date', { ascending: false })

      if (!error && data) {
        setPastTrips(data)
      }
      setIsLoading(false)
    }

    fetchPastTrips()
  }, [user])

  if (isLoading) return null
  if (pastTrips.length === 0) return null

  const renderStyle = () => {
    switch (style) {
      case 'postcards':
        return <PostcardRenderer trips={pastTrips} />
      case 'fridge_magnets':
        return <FridgeMagnetRenderer trips={pastTrips} />
      case 'polaroids':
        return <PolaroidRenderer trips={pastTrips} />
      case 'passport_stamps':
        return <PassportStampRenderer trips={pastTrips} />
      case 'puzzle_pieces':
        return <PuzzlePieceRenderer trips={pastTrips} />
      case 'monopoly_figures':
        return <MonopolyFigureRenderer trips={pastTrips} />
      default:
        return null
    }
  }

  return (
    <View style={styles.container}>
      <MemoriesStyleToggle />
      <View style={styles.content}>
        {renderStyle()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  content: {
    // Shared container styles
  }
})
