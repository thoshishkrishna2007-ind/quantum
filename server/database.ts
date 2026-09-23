import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { canonicalValues, type DatasetRecord } from './datasetParser.js'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeDataDirectory = process.env.QUANTA_DATA_DIR
  ? resolve(process.env.QUANTA_DATA_DIR)
  : resolve(repositoryRoot, 'data')

mkdirSync(runtimeDataDirectory, { recursive: true })

export const databasePath = resolve(runtimeDataDirectory, 'quantum-flood.db')
export const database = new DatabaseSync(databasePath)

database.exec(readFileSync(resolve(repositoryRoot, 'server/sql/schema.sql'), 'utf8'))
database.exec(readFileSync(resolve(repositoryRoot, 'server/sql/seed.sql'), 'utf8'))

export type DataClass = 'SIMULATION' | 'HISTORICAL' | 'OBSERVED' | 'MODEL_OUTPUT'
export type DatasetCategory = 'RAINFALL' | 'RIVER' | 'SOIL' | 'TERRAIN' | 'INFRASTRUCTURE' | 'HYDROLOGY' | 'OTHER'

export interface NewDataset {
  name: string
  description?: string
  category: DatasetCategory
  sourceLabel: string
  region: string
  dataClass: DataClass
  fileName: string
  records: DatasetRecord[]
}

interface DatasetRow {
  id: string
  name: string
  description: string
  category: DatasetCategory
  sourceLabel: string
  region: string
  dataClass: DataClass
  fileName: string | null
  rowCount: number
  fieldNames: string
  isSeed: number
  createdAt: string
  updatedAt: string
}

export function listDatasets() {
  const rows = database.prepare(`
    SELECT id, name, description, category, source_label AS sourceLabel, region,
      data_class AS dataClass, file_name AS fileName, row_count AS rowCount,
      field_names AS fieldNames, is_seed AS isSeed, created_at AS createdAt, updated_at AS updatedAt
    FROM datasets ORDER BY is_seed DESC, created_at DESC
  `).all() as unknown as DatasetRow[]
  return rows.map(row => ({
    ...row,
    fieldNames: JSON.parse(row.fieldNames) as string[],
    isSeed: Boolean(row.isSeed),
  }))
}

export function getDatasetRecords(id: string, limit = 100) {
  const safeLimit = Math.max(1, Math.min(limit, 500))
  return database.prepare(`
    SELECT id, observed_at AS observedAt, rainfall_mm AS rainfallMm,
      river_level_m AS riverLevelM, soil_moisture_pct AS soilMoisturePct,
      discharge_m3s AS dischargeM3s, temperature_c AS temperatureC, payload_json AS payload
    FROM observations WHERE dataset_id = ? ORDER BY id LIMIT ?
  `).all(id, safeLimit).map(row => ({ ...row, payload: JSON.parse(String((row as { payload: string }).payload)) }))
}

export function createDataset(input: NewDataset) {
  const id = randomUUID()
  const fieldNames = [...new Set(input.records.flatMap(record => Object.keys(record)))]
  const insertDataset = database.prepare(`
    INSERT INTO datasets (id, name, description, category, source_label, region, data_class, file_name, row_count, field_names)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertRecord = database.prepare(`
    INSERT INTO observations (dataset_id, observed_at, rainfall_mm, river_level_m, soil_moisture_pct, discharge_m3s, temperature_c, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  database.exec('BEGIN IMMEDIATE')
  try {
    insertDataset.run(id, input.name, input.description ?? '', input.category, input.sourceLabel, input.region, input.dataClass, input.fileName, input.records.length, JSON.stringify(fieldNames))
    for (const record of input.records) {
      const values = canonicalValues(record)
      insertRecord.run(id, values.observedAt, values.rainfallMm, values.riverLevelM, values.soilMoisturePct, values.dischargeM3s, values.temperatureC, JSON.stringify(record))
    }
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
  return listDatasets().find(dataset => dataset.id === id)
}

export function deleteDataset(id: string) {
  const result = database.prepare('DELETE FROM datasets WHERE id = ? AND is_seed = 0').run(id)
  return Number(result.changes) > 0
}

export function databaseStatus() {
  const row = database.prepare('SELECT COUNT(*) AS datasetCount, COALESCE(SUM(row_count), 0) AS recordCount FROM datasets').get() as { datasetCount: number; recordCount: number }
  return { connected: true, engine: 'SQLite', ...row }
}
