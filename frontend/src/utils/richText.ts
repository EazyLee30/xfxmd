export type RichStyleKind = 'color' | 'mark'

export type RichStyleOption = {
  key: string
  label: string
  value: string
}

export const TEXT_COLOR_OPTIONS: RichStyleOption[] = [
  { key: 'slate', label: '石墨', value: '#64748b' },
  { key: 'red', label: '红色', value: '#ef4444' },
  { key: 'orange', label: '橙色', value: '#f97316' },
  { key: 'amber', label: '琥珀', value: '#f59e0b' },
  { key: 'green', label: '绿色', value: '#10b981' },
  { key: 'sky', label: '天蓝', value: '#0ea5e9' },
  { key: 'violet', label: '紫色', value: '#8b5cf6' },
  { key: 'rose', label: '玫红', value: '#f43f5e' },
]

export const HIGHLIGHT_COLOR_OPTIONS: RichStyleOption[] = [
  { key: 'yellow', label: '黄色高光', value: '#fef08a' },
  { key: 'amber', label: '琥珀高光', value: '#fde68a' },
  { key: 'lime', label: '青绿高光', value: '#d9f99d' },
  { key: 'cyan', label: '青色高光', value: '#a5f3fc' },
  { key: 'sky', label: '蓝色高光', value: '#bae6fd' },
  { key: 'violet', label: '紫色高光', value: '#ddd6fe' },
  { key: 'rose', label: '粉色高光', value: '#fecdd3' },
  { key: 'slate', label: '灰色高光', value: '#e2e8f0' },
]

const OPTIONS_BY_KIND: Record<RichStyleKind, RichStyleOption[]> = {
  color: TEXT_COLOR_OPTIONS,
  mark: HIGHLIGHT_COLOR_OPTIONS,
}

export function getRichStyleOption(kind: RichStyleKind, key: string): RichStyleOption | undefined {
  return OPTIONS_BY_KIND[kind].find((option) => option.key === key)
}

export function getRichStyleCss(kind: RichStyleKind, key: string): string | null {
  const option = getRichStyleOption(kind, key)
  if (!option) return null
  if (kind === 'color') return `color: ${option.value}`
  return `background-color: ${option.value}; color: #0f172a`
}
