import type { DataClass, DatasetCategory, DatasetRecord, DatasetSummary } from '../types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? `Request failed with status ${response.status}.`)
  return payload
}

export async function fetchDatabaseHealth() {
  return request<{ status: string; database: { connected: boolean; engine: string; datasetCount: number; recordCount: number } }>('/api/health')
}

export async function fetchDatasets() {
  const response = await request<{ datasets: DatasetSummary[] }>('/api/datasets')
  return response.datasets
}

export async function fetchDatasetRecords(id: string) {
  const response = await request<{ records: DatasetRecord[] }>(`/api/datasets/${encodeURIComponent(id)}/records?limit=100`)
  return response.records
}

export interface DatasetUpload {
  name: string
  description: string
  category: DatasetCategory
  sourceLabel: string
  region: string
  dataClass: DataClass
  fileName: string
  content: string
}

export async function uploadDataset(input: DatasetUpload) {
  const response = await request<{ dataset: DatasetSummary }>('/api/datasets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  return response.dataset
}

export async function removeDataset(id: string) {
  await request<{ deleted: boolean }>(`/api/datasets/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
