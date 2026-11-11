import type { Zone, ZoneId } from '../types/exhibit'

export const zones: readonly Zone[] = [
  { id: 'future-ai', name: 'AI 教學', alwaysVisible: true },
  { id: 'future-digital', name: '數位學習', alwaysVisible: true },
  { id: 'maker', name: '科技手作', alwaysVisible: true },
  { id: 'cross-disciplinary', name: '跨域探究', alwaysVisible: true },
  { id: 'unassigned', name: '待分類', alwaysVisible: false },
]

export function isZoneId(value: unknown): value is ZoneId {
  return zones.some((zone) => zone.id === value)
}

export function getZoneName(id: ZoneId): string {
  return zones.find((zone) => zone.id === id)?.name ?? '待分類'
}
