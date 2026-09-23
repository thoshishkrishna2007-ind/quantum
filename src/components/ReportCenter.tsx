import { Download, FileChartColumn, FileClock, FileDown, ShieldCheck } from 'lucide-react'

const reports = ['Flood forecast report','AI prediction report','Quantum model report','River intelligence report','Rainfall report','Flood impact report','Historical analysis report']

export function ReportCenter() {
  return (
    <section className="report-panel panel-surface" aria-labelledby="reports-title">
      <header className="section-heading"><div><span className="eyebrow">DECISION DOCUMENTS</span><h2 id="reports-title">Report center</h2></div><span className="data-state"><ShieldCheck /> SOURCE-AWARE EXPORTS</span></header>
      <div className="report-feature">
        <div className="document-preview"><FileChartColumn /><div><i/><i/><i/><i/></div><span>QF / 01</span></div>
        <div><span className="eyebrow">FEATURED TEMPLATE</span><h3>Flood intelligence brief</h3><p>A concise operational summary structured around location, severity, timing, confidence and exposed infrastructure.</p><ul><li>Geographic region</li><li>Model provenance</li><li>Confidence / uncertainty</li><li>Key observations</li></ul><button disabled><Download /> DATA REQUIRED TO EXPORT</button></div>
      </div>
      <div className="report-grid">{reports.map((report,i)=><article key={report}><span>{String(i+1).padStart(2,'0')}</span><FileDown/><div><h3>{report}</h3><small><FileClock/> TEMPLATE READY · DATA UNAVAILABLE</small></div><button aria-label={`Open ${report}`} disabled>↗</button></article>)}</div>
    </section>
  )
}
