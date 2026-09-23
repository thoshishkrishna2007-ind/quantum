export type ViewId = 'overview' | 'forecast' | 'map' | 'quantum' | 'river' | 'simulation' | 'alerts' | 'reports'

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
