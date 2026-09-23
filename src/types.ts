export type ViewId = 'overview' | 'forecast' | 'map' | 'quantum' | 'river' | 'simulation' | 'datasets' | 'alerts' | 'reports'

export type LayerId = 'rain' | 'rivers' | 'probability' | 'elevation' | 'inundation' | 'infrastructure'

export interface SimulationSettings {
  rainfall: number
  riverLevel: number
  soil: number
  release: number
  temperature: number
  duration: number
}

export interface Station {
  id: string
  name: string
  river: string
  level: string
  trend: 'RISING' | 'STABLE' | 'FALLING'
  position: [number, number]
}

export type DataClass = 'SIMULATION' | 'HISTORICAL' | 'OBSERVED' | 'MODEL_OUTPUT'
export type DatasetCategory = 'RAINFALL' | 'RIVER' | 'SOIL' | 'TERRAIN' | 'INFRASTRUCTURE' | 'HYDROLOGY' | 'OTHER'

export interface DatasetSummary {
  id: string
  name: string
  description: string
  category: DatasetCategory
  sourceLabel: string
  region: string
  dataClass: DataClass
  fileName: string | null
  rowCount: number
  fieldNames: string[]
  isSeed: boolean
  createdAt: string
  updatedAt: string
}

export interface DatasetRecord {
  id: number
  observedAt: string | null
  rainfallMm: number | null
  riverLevelM: number | null
  soilMoisturePct: number | null
  dischargeM3s: number | null
  temperatureC: number | null
  payload: Record<string, unknown>
}
