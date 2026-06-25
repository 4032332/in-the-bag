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
          const d = data as any
          if (!error && d?.pref_memories_style && MEMORIES_STYLES.includes(d.pref_memories_style)) {
            storage.set('pref_memories_style', d.pref_memories_style)
            setStyleState(d.pref_memories_style as MemoriesStyle)
          }
        })
    }
  }, [user])

  const setStyle = async (newStyle: MemoriesStyle) => {
    setStyleState(newStyle)
    storage.set('pref_memories_style', newStyle)

    if (user) {
      await (supabase.from('profiles') as any)
        .update({ pref_memories_style: newStyle })
        .eq('id', user.id)
    }
  }

  return [style, setStyle] as const
}
