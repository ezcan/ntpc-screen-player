export type ZoneId =
  | 'future-ai'
  | 'future-digital'
  | 'maker'
  | 'cross-disciplinary'
  | 'service'
  | 'unassigned'

export interface Exhibit {
  id: string
  unitName: string
  unitType: 'school' | 'organization'
  theme: string
  zoneId: ZoneId
  order: number
  subcategory?: string
  highlightTerms?: readonly string[]
}

// A missing zone is accepted at the data boundary and normalized to unassigned.
export type ExhibitInput = Omit<Exhibit, 'zoneId'> & { zoneId?: ZoneId }

export interface Zone {
  id: ZoneId
  name: string
  alwaysVisible: boolean
}

export interface ZoneWithCount extends Zone {
  count: number
}

export type ZoneFilter = ZoneId | 'all'
