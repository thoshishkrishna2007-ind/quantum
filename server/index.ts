import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { authenticateUser, createDataset, createSession, databaseStatus, deleteDataset, deleteSession, getDatasetRecords, getSession, listDatasets, registerUser, type DataClass, type DatasetCategory } from './database.js'
import { parseDatasetContent } from './datasetParser.js'
import { generateReportAnalysis, ReportProviderError } from './reportAnalysis.js'

const port = Number(process.env.PORT ?? 4174)
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = resolve(root, 'dist')
const MAX_BODY_SIZE = 6 * 1024 * 1024
const sessionCookie = 'quanta_session'
const sessionMaxAge = 7 * 24 * 60 * 60

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

function readSessionToken(request: IncomingMessage) {
  const cookie = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${sessionCookie}=`))
  return cookie?.slice(sessionCookie.length + 1) || null
}

function setSessionCookie(response: ServerResponse, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionMaxAge}${secure}`)
}

function clearSessionCookie(response: ServerResponse) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`)
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
    if (request.method === 'GET' && url.pathname === '/api/auth/session') {
      const token = readSessionToken(request)
      const user = token ? getSession(token) : null
      return user ? json(response, 200, { user }) : json(response, 401, { error: 'Sign in to continue.' })
    }
    if (request.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')) {
      const body = await readJson(request)
      const email = requiredString(body.email, 'Email', 254).toLowerCase()
      const password = typeof body.password === 'string' ? body.password : ''
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
      if (password.length < 12 || password.length > 128) throw new Error('Password must be between 12 and 128 characters.')

      let user
      if (url.pathname === '/api/auth/register') {
        try {
          user = registerUser(email, password)
        } catch (error) {
          if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            return json(response, 409, { error: 'An account with this email already exists.' })
          }
          throw error
        }
      } else {
        user = authenticateUser(email, password)
        if (!user) return json(response, 401, { error: 'Email or password is incorrect.' })
      }

      const session = createSession(user.id)
      setSessionCookie(response, session.token)
      return json(response, 200, { user })
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = readSessionToken(request)
      if (token) deleteSession(token)
      clearSessionCookie(response)
      return json(response, 200, { signedOut: true })
    }

    if (url.pathname.startsWith('/api/datasets') || url.pathname.startsWith('/api/reports')) {
      const token = readSessionToken(request)
      if (!token || !getSession(token)) return json(response, 401, { error: 'Sign in to continue.' })
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json(response, 200, { status: 'ok', database: databaseStatus() })
    }
    if (request.method === 'GET' && url.pathname === '/api/datasets') {
      return json(response, 200, { datasets: listDatasets() })
    }
    if (request.method === 'GET' && url.pathname === '/api/reports/status') {
      return json(response, 200, { aiAvailable: Boolean(process.env.GEMINI_API_KEY) })
    }
    if (request.method === 'POST' && url.pathname === '/api/reports/analyze') {
      const body = await readJson(request)
      const report = await generateReportAnalysis({
        title: requiredString(body.title, 'Report title', 160),
        region: typeof body.region === 'string' ? body.region.trim().slice(0, 160) : '',
        datasetId: requiredString(body.datasetId, 'Dataset selection', 80),
        focus: typeof body.focus === 'string' ? body.focus.trim().slice(0, 500) : '',
      })
      return json(response, 200, report)
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
    if (error instanceof ReportProviderError) return json(response, 502, { error: error.message })
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    json(response, message.includes('exceeds') ? 413 : 400, { error: message })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`QUANTA data service ready on http://0.0.0.0:${port}`)
})
