import { getDatasetRecords, listDatasets } from './database.js'
import type { DatasetRecord } from './datasetParser.js'

export interface ReportRequest {
  title: string
  region: string
  datasetId: string
  focus: string
}

export class ReportProviderError extends Error {}

const measures = [
  { key: 'rainfallMm', label: 'Rainfall', unit: 'mm' },
  { key: 'riverLevelM', label: 'River level', unit: 'm' },
  { key: 'soilMoisturePct', label: 'Soil moisture', unit: '%' },
  { key: 'dischargeM3s', label: 'Discharge', unit: 'm3/s' },
  { key: 'temperatureC', label: 'Temperature', unit: 'C' },
] as const satisfies ReadonlyArray<{ key: keyof DatasetRecord; label: string; unit: string }>

function summarizeDataset(datasetId: string) {
  const dataset = listDatasets().find(item => item.id === datasetId)
  if (!dataset) throw new Error('Selected report dataset was not found.')
  const records = getDatasetRecords(dataset.id, 500) as DatasetRecord[]
  const observedTimes = records.map(record => record.observedAt).filter((value): value is string => Boolean(value)).sort()
  const statistics = measures.flatMap(measure => {
    const values = records.map(record => record[measure.key]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    if (values.length === 0) return []
    return [{
      measure: measure.label,
      unit: measure.unit,
      samples: values.length,
      mean: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
      minimum: Number(Math.min(...values).toFixed(2)),
      maximum: Number(Math.max(...values).toFixed(2)),
      latest: Number(values.at(-1)!.toFixed(2)),
    }]
  })
  return {
    name: dataset.name,
    source: dataset.sourceLabel,
    region: dataset.region,
    classification: dataset.dataClass,
    totalRecords: dataset.rowCount,
    analyzedRecords: records.length,
    sampleCapped: dataset.rowCount > records.length,
    observedFrom: observedTimes[0] ?? null,
    observedTo: observedTimes.at(-1) ?? null,
    statistics,
  }
}

export async function generateReportAnalysis(input: ReportRequest) {
  const availableDatasets = listDatasets()
  const selectedDatasets = input.datasetId === 'all'
    ? availableDatasets
    : availableDatasets.filter(dataset => dataset.id === input.datasetId)
  if (selectedDatasets.length === 0) throw new Error('No datasets are available for this report.')
  if (selectedDatasets.length > 20) throw new Error('Select a single dataset when the workspace contains more than 20 datasets.')

  const context = {
    title: input.title,
    region: input.region,
    generatedAt: new Date().toISOString(),
    sources: selectedDatasets.map(dataset => summarizeDataset(dataset.id)),
  }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { aiAvailable: false, analysis: null, context }

  const prompt = [
    'Create a concise hydrology report in Markdown using only the supplied dataset summaries.',
    'Separate reported statistics from interpretation. Do not invent measurements, locations, thresholds, probabilities, or causal claims.',
    'Call out missing data, sample limits, simulation classifications, and uncertainty. Do not present this as a live forecast or emergency warning.',
    `Report focus: ${input.focus || 'Summarize notable observed patterns and data limitations.'}`,
    `Report facts: ${JSON.stringify(context)}`,
  ].join('\n\n')

  let response: Response
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are a cautious hydrology reporting assistant. Treat supplied records as the only evidence.' }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    throw new ReportProviderError('AI analysis service could not be reached. The source summary is still available.')
  }
  if (!response.ok) throw new ReportProviderError('AI analysis failed. Check the Gemini API key, billing, and model access.')

  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const analysis = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim()
  if (!analysis) throw new ReportProviderError('AI returned no analysis. The source summary is still available.')
  return { aiAvailable: true, analysis, model: 'Gemini 2.5 Flash', context }
}