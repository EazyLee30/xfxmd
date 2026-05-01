const PALETTE = [
  '#e6194B',
  '#3cb44b',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#46f0f0',
  '#f032e6',
  '#bcf60c',
  '#fabebe',
  '#008080',
  '#e6beff',
  '#9A6324',
  '#fffac8',
  '#800000',
  '#aaffc3',
  '#808000',
  '#ffd8b1',
  '#000075',
  '#808080',
]

let idx = 0

/** Deterministic color from a string (session-stable for same name). */
export function colorFromName(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

/** Next color from a rotating palette (for random display name). */
export function nextRandomColor(): string {
  const c = PALETTE[idx % PALETTE.length]
  idx++
  return c
}

export function withAlpha(hex: string, alphaHex: string = '33'): string {
  if (hex.length === 7 && hex[0] === '#') {
    return hex + alphaHex
  }
  return hex
}
