import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalValues, parseDatasetContent } from './datasetParser.js'

test('parses quoted CSV records and coerces numeric values', () => {
  const records = parseDatasetContent('readings.csv', 'timestamp,rainfall_mm,note\n2026-01-01T00:00:00Z,12.5,"rain, sustained"')
  assert.deepEqual(records, [{ timestamp: '2026-01-01T00:00:00Z', rainfall_mm: 12.5, note: 'rain, sustained' }])
})

test('parses JSON records and maps canonical hydrology fields', () => {
  const [record] = parseDatasetContent('river.json', JSON.stringify({ records: [{ datetime: '2026-01-01', water_level_m: 2.7, flow_rate_m3s: 145 }] }))
  assert.deepEqual(canonicalValues(record), {
    observedAt: '2026-01-01', rainfallMm: null, riverLevelM: 2.7,
    soilMoisturePct: null, dischargeM3s: 145, temperatureC: null,
  })
})

test('rejects unsupported and empty datasets', () => {
  assert.throws(() => parseDatasetContent('notes.txt', 'hello'), /Only CSV and JSON/)
  assert.throws(() => parseDatasetContent('empty.csv', 'name'), /header and at least one data row/)
})
