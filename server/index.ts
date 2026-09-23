import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { databaseStatus, createDataset, deleteDataset, getDatasetRecords, listDatasets, type DataClass, type DatasetCategory } from './database.js'
import { parseDatasetContent } from './datasetParser.js'

const port = Number(process.env.PORT ?? 4174)
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = resolve(root, 'dist')
const MAX_BODY_SIZE = 6 * 1024 * 1024

function json(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_SIZE) throw new Error('Upload exceeds the 6 MB request limit.')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

function requiredString(value: unknown, label: string, maxLength = 160) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  return value.trim().slice(0, maxLength)
}

const dataClasses = new Set<DataClass>(['SIMULATION', 'HISTORICAL', 'OBSERVED', 'MODEL_OUTPUT'])
const categories = new Set<DatasetCategory>(['RAINFALL', 'RIVER', 'SOIL', 'TERRAIN', 'INFRASTRUCTURE', 'HYDROLOGY', 'OTHER'])

function serveStatic(request: IncomingMessage, response: ServerResponse) {
  if (!existsSync(dist)) return false
  const requestPath = request.url === '/' ? '/index.html' : (request.url ?? '/index.html').split('?')[0]
  const candidate = resolve(dist, `.${requestPath}`)
  const insideDist = candidate === dist || candidate.startsWith(`${dist}${sep}`)
  const file = insideDist && existsSync(candidate) && statSync(candidate).isFile() ? candidate : resolve(dist, 'index.html')
  const types: Record<string, string> = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' }
  response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(response)
  return true
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json(response, 200, { status: 'ok', database: databaseStatus() })
    }
    if (request.method === 'GET' && url.pathname === '/api/datasets') {
      return json(response, 200, { datasets: listDatasets() })
    }
    const recordsMatch = url.pathname.match(/^\/api\/datasets\/([^/]+)\/records$/)
    if (request.method === 'GET' && recordsMatch) {
      return json(response, 200, { records: getDatasetRecords(decodeURIComponent(recordsMatch[1]), Number(url.searchParams.get('limit') ?? 100)) })
    }
    if (request.method === 'POST' && url.pathname === '/api/datasets') {
      const body = await readJson(request)
      const fileName = requiredString(body.fileName, 'File name')
      const content = requiredString(body.content, 'File content', MAX_BODY_SIZE)
      const category = requiredString(body.category, 'Category') as DatasetCategory
      const dataClass = requiredString(body.dataClass, 'Data classification') as DataClass
      if (!categories.has(category)) throw new Error('Unsupported dataset category.')
      if (!dataClasses.has(dataClass)) throw new Error('Unsupported data classification.')
      const dataset = createDataset({
        name: requiredString(body.name, 'Dataset name'),
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '',
        category,
        sourceLabel: requiredString(body.sourceLabel, 'Source / provenance'),
        region: requiredString(body.region, 'Region'),
        dataClass,
        fileName,
        records: parseDatasetContent(fileName, content),
      })
      return json(response, 201, { dataset })
    }
    const datasetMatch = url.pathname.match(/^\/api\/datasets\/([^/]+)$/)
    if (request.method === 'DELETE' && datasetMatch) {
      const deleted = deleteDataset(decodeURIComponent(datasetMatch[1]))
      return deleted ? json(response, 200, { deleted: true }) : json(response, 403, { error: 'Seed datasets are protected or the dataset does not exist.' })
    }
    if (!url.pathname.startsWith('/api/') && serveStatic(request, response)) return
    json(response, 404, { error: 'Not found.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    json(response, message.includes('exceeds') ? 413 : 400, { error: message })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`QUANTA data service ready on http://0.0.0.0:${port}`)
})
