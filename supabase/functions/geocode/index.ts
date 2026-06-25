// Geocode cities/countries to lat/lon using Gemini grounded search.
// Request body: { cities: Array<{ city: string; country: string }> }
// Response: Array<{ city: string; country: string; lat: number; lon: number }>
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  const { cities } = await req.json() as { cities: Array<{ city: string; country: string }> }
  if (!cities?.length) return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })

  const prompt = `Return ONLY a JSON array with approximate lat/lon for each of these cities. No prose, no markdown.\n${JSON.stringify(cities)}\nFormat: [{"city":"...","country":"...","lat":0.0,"lon":0.0}]`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )

  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : []

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
