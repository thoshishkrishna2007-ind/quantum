import type { Station } from './types'

// Demonstration-only scenario metadata. No values in this file represent live observations.
export const stations: Station[] = [
  { id: 'n01', name: 'North Fork', river: 'Aster River', level: 'DATA UNAVAILABLE', trend: 'RISING', position: [29, 31] },
  { id: 'c02', name: 'Valley Gate', river: 'Aster River', level: 'DATA UNAVAILABLE', trend: 'STABLE', position: [53, 51] },
  { id: 's03', name: 'Delta Reach', river: 'Lumen Tributary', level: 'DATA UNAVAILABLE', trend: 'FALLING', position: [70, 67] },
]

export const navItems = [
  ['overview', 'Overview'], ['forecast', 'Forecast'], ['map', 'Flood map'], ['quantum', 'Quantum AI'],
  ['river', 'River network'], ['simulation', 'Simulation'], ['alerts', 'Alerts'], ['reports', 'Reports'],
] as const

export const timeSteps = ['T−24H', 'T−12H', 'NOW', '+6H', '+12H', '+24H', '+48H', '+72H', '+7D']
