export type AvatarStyle = {
  id: string
  label: string
}

export const DICEBEAR_STYLES: AvatarStyle[] = [
  { id: 'adventurer', label: '探险' },
  { id: 'lorelei', label: '柔和' },
  { id: 'micah', label: '线稿' },
  { id: 'thumbs', label: '手绘' },
  { id: 'bottts', label: '机器人' },
  { id: 'pixel-art', label: '像素' },
  { id: 'notionists', label: '插画' },
  { id: 'shapes', label: '几何' },
]

const DICEBEAR_API_ORIGIN = 'https://api.dicebear.com'
const DICEBEAR_VERSION = '9.x'
const AVATAR_BACKGROUNDS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf']

export function nextAvatarSeed(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8)
  }
  return Math.random().toString(36).slice(2, 10)
}

export function buildDiceBearAvatarUrl(style: string, seed: string): string {
  const safeStyle = DICEBEAR_STYLES.some((item) => item.id === style) ? style : DICEBEAR_STYLES[0].id
  const url = new URL(`${DICEBEAR_API_ORIGIN}/${DICEBEAR_VERSION}/${safeStyle}/svg`)
  url.searchParams.set('seed', seed || 'visitor')
  url.searchParams.set('radius', '50')
  url.searchParams.set('backgroundColor', AVATAR_BACKGROUNDS.join(','))
  return url.toString()
}

export function safeDiceBearAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    const style = parsed.pathname.split('/')[2]
    const isKnownStyle = DICEBEAR_STYLES.some((item) => item.id === style)
    const isSafe =
      parsed.protocol === 'https:' &&
      parsed.origin === DICEBEAR_API_ORIGIN &&
      parsed.pathname.startsWith(`/${DICEBEAR_VERSION}/`) &&
      parsed.pathname.endsWith('/svg') &&
      isKnownStyle
    return isSafe ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}
