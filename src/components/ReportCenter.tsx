import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, BarChart3, Download, FileDown, FileText, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { fetchDatasets } from '../services/datasets'
import { fetchReportStatus, generateReport, type GeneratedReport } from '../services/reports'
import type { DatasetSummary } from '../types'
import './ReportCenter.css'

export function ReportCenter() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [aiConfigured, setAiConfigured] = useState(false)
  const [title, setTitle] = useState('Hydrology intelligence brief')
  const [region, setRegion] = useState('Aster Basin')
  const [datasetId, setDatasetId] = useState('all')
  const [focus, setFocus] = useState('Identify notable changes, data gaps, and uncertainty. Do not infer operational flood risk without validated thresholds.')
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchDatasets(), fetchReportStatus()]).then(([items, status]) => {
      if (cancelled) return
      setDatasets(items)
      setAiConfigured(status.aiAvailable)
      setLoading(false)
    }).catch(cause => {
      if (cancelled) return
      setError(cause instanceof Error ? cause.message : 'Unable to load report sources.')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const selectedDataset = datasets.find(dataset => dataset.id === datasetId)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGenerating(true)
    setError('')
    try {
      const generated = await generateReport({ title, region, datasetId, focus })
      setReport(generated)
      setAiConfigured(generated.aiAvailable)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to generate this report.')
    } finally {
      setGenerating(false)
    }
  }

  const download = () => {
    if (!report) return
    const sources = report.context.sources.map(source => {
      const statistics = source.statistics.length
        ? source.statistics.map(stat => `- ${stat.measure}: mean ${stat.mean} ${stat.unit}; range ${stat.minimum}-${stat.maximum}; latest ${stat.latest} (${stat.samples} samples)`).join('\n')
        : '- No recognized numeric hydrology measurements.'
      return `### ${source.name}\n\n- Region: ${source.region}\n- Classification: ${source.classification}\n- Source: ${source.source}\n- Records: ${source.analyzedRecords} analyzed of ${source.totalRecords}${source.sampleCapped ? ' (first 500 only)' : ''}\n- Time range: ${source.observedFrom ?? 'unknown'} to ${source.observedTo ?? 'unknown'}\n\n${statistics}`
    }).join('\n\n')
    const analysis = report.analysis ?? 'AI analysis was not run. Configure GEMINI_API_KEY on the server to enable it.'
    const markdown = `# ${report.context.title}\n\n**Region:** ${report.context.region || 'Not specified'}  \n**Generated:** ${new Date(report.context.generatedAt).toLocaleString()}  \n**AI analysis:** ${report.aiAvailable ? report.model : 'Not configured'}\n\n## Source summary\n\n${sources}\n\n## AI analysis\n\n${analysis}\n\n---\nGenerated from stored dataset summaries. Not an operational forecast or emergency warning.\n`
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${report.context.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="report-panel panel-surface report-workbench" aria-labelledby="reports-title">
      <header className="section-heading report-workbench-heading">
        <div><span className="eyebrow">REPORT BUILDER / SOURCE-AWARE</span><h2 id="reports-title">Create a report</h2></div>
        <span className={`report-ai-status ${aiConfigured ? 'ready' : ''}`}><Sparkles/>{aiConfigured ? 'GEMINI ANALYSIS READY' : 'AI KEY NOT CONFIGURED'}</span>
      </header>
      <div className="report-workspace">
        <form className="report-builder" onSubmit={submit}>
          <div className="report-field-grid">
            <label className="report-wide"><span>REPORT TITLE</span><input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)}/></label>
            <label><span>GEOGRAPHIC REGION</span><input maxLength={160} value={region} onChange={event => setRegion(event.target.value)} placeholder="Basin, district, or watershed"/></label>
            <label><span>DATA SOURCE</span><select value={datasetId} onChange={event => { setDatasetId(event.target.value); const source = datasets.find(dataset => dataset.id === event.target.value); if (source) setRegion(source.region) }}><option value="all">All available datasets</option>{datasets.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.name} · {dataset.dataClass}</option>)}</select></label>
            <label className="report-wide"><span>ANALYSIS FOCUS</span><textarea maxLength={500} value={focus} onChange={event => setFocus(event.target.value)} placeholder="What should the analysis investigate?"/></label>
          </div>
          {selectedDataset && <div className="report-selected-source"><FileText/><span><strong>{selectedDataset.name}</strong><small>{selectedDataset.sourceLabel} · {selectedDataset.rowCount.toLocaleString()} rows · {selectedDataset.dataClass}</small></span></div>}
          {error && <p className="report-error" role="alert"><AlertTriangle/>{error}</p>}
          <div className="report-form-footer">
            <p><ShieldCheck/> Only aggregate statistics are sent to Gemini when AI analysis is enabled. Raw records stay in this app.</p>
            <button className="report-generate" type="submit" disabled={loading || generating || datasets.length === 0}><Sparkles/>{generating ? 'ANALYZING…' : 'GENERATE REPORT'}{generating && <LoaderCircle className="spin"/>}</button>
          </div>
          {loading && <small className="report-loading"><LoaderCircle className="spin"/> LOADING SOURCE CATALOG…</small>}
          {!aiConfigured && !loading && <small className="report-config-note">Data summaries can be generated now. Add GEMINI_API_KEY to server .env.local for AI-written analysis.</small>}
        </form>

        <section className="report-output" aria-live="polite" aria-label="Generated report preview">
          <header><div><span className="eyebrow">DOCUMENT PREVIEW</span><h3>{report?.context.title ?? 'Your report will appear here'}</h3></div><button className="report-download" onClick={download} disabled={!report} title="Download Markdown report"><Download/><span>EXPORT</span></button></header>
          {report ? <>
            <div className="report-summary-strip"><span><small>REGION</small><strong>{report.context.region || 'Not specified'}</strong></span><span><small>SOURCES</small><strong>{report.context.sources.length}</strong></span><span><small>RECORDS ANALYZED</small><strong>{report.context.sources.reduce((sum, source) => sum + source.analyzedRecords, 0).toLocaleString()}</strong></span><span><small>GENERATED</small><strong>{new Date(report.context.generatedAt).toLocaleString()}</strong></span></div>
            <div className="report-source-list"><h4><BarChart3/> SOURCE STATISTICS</h4>
              {report.context.sources.map(source => <details key={source.name} open={report.context.sources.length === 1}>
                <summary><span>{source.name}</span><small>{source.classification} · {source.analyzedRecords}/{source.totalRecords} ROWS</small></summary>
                {source.sampleCapped && <p className="report-sample-note">Statistics use the first 500 records from this source.</p>}
                <div className="report-stat-list">{source.statistics.length ? source.statistics.map(stat => <div key={stat.measure}><span>{stat.measure}</span><strong>{stat.mean} <small>{stat.unit} mean</small></strong><small>{stat.minimum}–{stat.maximum} range</small></div>) : <p>No recognized numeric hydrology measurements in this source.</p>}</div>
              </details>)}
            </div>
            <div className="report-analysis"><h4><Sparkles/> AI ANALYSIS</h4>
              {report.analysis ? <div className="report-analysis-copy">{renderAnalysis(report.analysis)}</div> : <div className="report-ai-unavailable"><Sparkles/><div><strong>DATA SUMMARY READY · AI NOT CONFIGURED</strong><p>This report contains measured source statistics. Configure <code>GEMINI_API_KEY</code> on the server to generate AI analysis.</p></div></div>}
            </div>
          </> : <div className="report-output-empty"><FileDown/><strong>READY WHEN YOU ARE</strong><span>Choose sources and generate a report preview.</span></div>}
        </section>
      </div>
    </section>
  )
}

function renderAnalysis(markdown: string) {
  return markdown.split(/\n\s*\n/).map((block, index) => {
    const heading = block.match(/^#{1,3}\s+(.+)/)
    if (heading) return <h5 key={index}>{heading[1]}</h5>
    const lines = block.split('\n')
    if (lines.every(line => /^[-*]\s+/.test(line))) {
      return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^[-*]\s+/, '')}</li>)}</ul>
    }
    return <p key={index}>{block}</p>
  })
}
