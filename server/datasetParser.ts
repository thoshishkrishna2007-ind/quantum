export type DatasetRecord = Record<string, string | number | boolean | null>

const MAX_ROWS = 5_000

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]
    if (char === '"' && quoted && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field.trim())
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field.trim())
      field = ''
      if (row.some(cell => cell.length > 0)) rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  row.push(field.trim())
  if (row.some(cell => cell.length > 0)) rows.push(row)
  return rows
}

function coerce(value: string): string | number | boolean | null {
  if (value === '') return null
  if (/^-?(?:\d+|\d*\.\d+)$/.test(value)) return Number(value)
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  return value
}

export function parseDatasetContent(fileName: string, content: string): DatasetRecord[] {
  const extension = fileName.toLowerCase().split('.').pop()
  let records: DatasetRecord[]

  if (extension === 'json') {
    const parsed: unknown = JSON.parse(content)
    const candidate = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && 'records' in parsed
        ? (parsed as { records: unknown }).records
        : null
    if (!Array.isArray(candidate)) throw new Error('JSON must be an array or an object containing a records array.')
    if (!candidate.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
      throw new Error('Every JSON record must be an object.')
    }
    records = candidate as DatasetRecord[]
  } else if (extension === 'csv') {
    const rows = parseCsvRows(content.replace(/^\uFEFF/, ''))
    if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row.')
    const headers = rows[0].map(header => header.trim())
    if (headers.some(header => !header)) throw new Error('CSV headers cannot be empty.')
    if (new Set(headers).size !== headers.length) throw new Error('CSV headers must be unique.')
    records = rows.slice(1).map(cells => Object.fromEntries(headers.map((header, index) => [header, coerce(cells[index] ?? '')])))
  } else {
    throw new Error('Only CSV and JSON files are supported.')
  }

  if (records.length === 0) throw new Error('The dataset contains no records.')
  if (records.length > MAX_ROWS) throw new Error(`A single import is limited to ${MAX_ROWS.toLocaleString()} records.`)
  return records
}

export function canonicalValues(record: DatasetRecord) {
  const normalized = new Map(Object.entries(record).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value]))
  const numeric = (...keys: string[]) => {
    const value = keys.map(key => normalized.get(key)).find(candidate => candidate !== undefined && candidate !== null)
    if (value === undefined || value === null || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  const text = (...keys: string[]) => {
    const value = keys.map(key => normalized.get(key)).find(candidate => candidate !== undefined && candidate !== null)
    return value === undefined || value === null ? null : String(value)
  }

  return {
    observedAt: text('timestamp', 'observedat', 'datetime', 'date', 'time'),
    rainfallMm: numeric('rainfallmm', 'rainfall', 'precipitationmm', 'precipitation'),
    riverLevelM: numeric('riverlevelm', 'riverlevel', 'waterlevelm', 'waterlevel'),
    soilMoisturePct: numeric('soilmoisturepct', 'soilmoisture', 'soilsaturationpct', 'soilsaturation'),
    dischargeM3s: numeric('dischargem3s', 'discharge', 'flowratem3s', 'flowrate'),
    temperatureC: numeric('temperaturec', 'temperature', 'tempc'),
  }
}
