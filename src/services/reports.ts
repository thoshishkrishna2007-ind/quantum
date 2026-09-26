import type { DataClass } from '../types'

export interface ReportMetric {
  measure: string
  unit: string
  samples: number
  mean: number
  minimum: number
  maximum: number
  latest: number
}

export interface ReportSource {
  name: string
  source: string
  region: string
  classification: DataClass
  totalRecords: number
  analyzedRecords: number
  sampleCapped: boolean
  observedFrom: string | null
  observedTo: string | null
  statistics: ReportMetric[]
}

export interface GeneratedReport {
  aiAvailable: boolean
  analysis: string | null
  model?: string
  context: {
    title: string
    region: string
    generatedAt: string
    sources: ReportSource[]
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? `Request failed with status ${response.status}.`)
  return payload
}

export function fetchReportStatus() {
  return request<{ aiAvailable: boolean }>('/api/reports/status')
}

export function generateReport(input: { title: string; region: string; datasetId: string; focus: string }) {
  return request<GeneratedReport>('/api/reports/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
