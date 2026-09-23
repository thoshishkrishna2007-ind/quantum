import { CircleDashed, Clock3, ShieldQuestion, Waves } from 'lucide-react'

export function ForecastPanel() {
  return (
    <section className="forecast-panel panel-surface" aria-labelledby="forecast-title">
      <header className="section-heading">
        <div><span className="eyebrow">PREDICTION ENVELOPE</span><h2 id="forecast-title">AI forecast</h2></div>
        <span className="simulation-tag">SIMULATION MODE</span>
      </header>
      <div className="forecast-hero">
        <div className="ring-value"><div><small>FLOOD<br/>PROBABILITY</small><strong>—</strong><span>DATA UNAVAILABLE</span></div></div>
        <div className="forecast-stats">
          <div><Clock3 /><span>FORECAST TIME</span><strong>+24 HOURS</strong></div>
          <div><ShieldQuestion /><span>CONFIDENCE</span><strong>UNAVAILABLE</strong></div>
          <div><Waves /><span>EXPECTED PEAK</span><strong>UNAVAILABLE</strong></div>
        </div>
      </div>
      <div className="uncertainty-chart">
        <div className="chart-label">PREDICTED WATER LEVEL <span>ILLUSTRATIVE SHAPE</span></div>
        <svg viewBox="0 0 700 170" role="img" aria-label="Illustrative water-level uncertainty envelope, without values">
          <defs><linearGradient id="band" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#72e6d6" stopOpacity=".25"/><stop offset="1" stopColor="#72e6d6" stopOpacity="0"/></linearGradient></defs>
          {[30,65,100,135].map(y=><line key={y} x1="0" y1={y} x2="700" y2={y} stroke="rgba(220,245,236,.07)" />)}
          <path d="M0 132 C90 129,120 121,185 124 C250 126,265 99,320 84 C390 65,420 79,474 60 C540 37,585 48,700 32 L700 89 C590 92,540 86,478 107 C410 129,365 114,310 132 C220 159,100 145,0 150Z" fill="url(#band)" />
          <path d="M0 140 C90 136,140 133,190 134 C246 135,275 113,320 104 C386 91,419 99,477 83 C553 62,610 70,700 58" fill="none" stroke="#83eadb" strokeWidth="2" />
          <line x1="510" y1="16" x2="510" y2="154" stroke="#ffb66d" strokeDasharray="4 5"/><text x="522" y="28">DANGER THRESHOLD</text>
        </svg>
      </div>
      <p className="integrity-note"><CircleDashed /> Connect a validated model endpoint to populate forecasts and uncertainty intervals.</p>
    </section>
  )
}
