import { useState, useEffect } from 'react'
import { storage } from '../lib/mmkv'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type MemoriesStyle = 'postcards' | 'fridge_magnets' | 'polaroids' | 'passport_stamps' | 'puzzle_pieces' | 'monopoly_figures'
export const MEMORIES_STYLES: MemoriesStyle[] = ['postcards', 'fridge_magnets', 'polaroids', 'passport_stamps', 'puzzle_pieces', 'monopoly_figures']

export function useMemoriesStyle() {
  const { user } = useAuth()
  
  const [style, setStyleState] = useState<MemoriesStyle>(() => {
    const cached = storage.getString('pref_memories_style') as MemoriesStyle
    if (cached && MEMORIES_STYLES.includes(cached)) return cached
    return 'postcards'
  })

  useEffect(() => {
    if (!user) return

    // If cache miss, fetch from supabase
    if (!storage.getString('pref_memories_style')) {
      supabase
        .from('profiles')
        .select('pref_memories_style')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.pref_memories_style && MEMORIES_STYLES.includes(data.pref_memories_style)) {
            storage.set('pref_memories_style', data.pref_memories_style)
            setStyleState(data.pref_memories_style as MemoriesStyle)
          }
        })
    }
  }, [user])

  const setStyle = async (newStyle: MemoriesStyle) => {
    setStyleState(newStyle)
    storage.set('pref_memories_style', newStyle)

    if (user) {
      await supabase
        .from('profiles')
        .update({ pref_memories_style: newStyle })
        .eq('id', user.id)
    }
  }

  return [style, setStyle] as const
}
