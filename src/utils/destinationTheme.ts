export type DestinationTheme = 'beach' | 'mountain' | 'city' | 'desert' | 'generic'

const BEACH_KEYWORDS = ['bali', 'maldives', 'fiji', 'hawaii', 'cancun', 'miami', 'sydney', 'barcelona', 'beach', 'coast', 'island', 'phuket', 'bora bora']
const MOUNTAIN_KEYWORDS = ['innsbruck', 'whistler', 'queenstown', 'zermatt', 'aspen', 'nepal', 'switzerland', 'alps', 'mountain', 'ski', 'chamonix']
const DESERT_KEYWORDS = ['dubai', 'abu dhabi', 'marrakech', 'cairo', 'phoenix', 'las vegas', 'riyadh', 'morocco', 'egypt', 'uae', 'desert']

export function getDestinationThemeKey(city: string, country: string): DestinationTheme {
  const searchStr = `${city} ${country}`.toLowerCase()

  if (BEACH_KEYWORDS.some(k => searchStr.includes(k))) return 'beach'
  if (MOUNTAIN_KEYWORDS.some(k => searchStr.includes(k))) return 'mountain'
  if (DESERT_KEYWORDS.some(k => searchStr.includes(k))) return 'desert'
  
  // City match is harder, let's say major capitals or generic city keywords
  const CITY_KEYWORDS = ['london', 'paris', 'tokyo', 'new york', 'singapore', 'berlin', 'rome', 'city', 'urban']
  if (CITY_KEYWORDS.some(k => searchStr.includes(k))) return 'city'

  return 'generic'
}
