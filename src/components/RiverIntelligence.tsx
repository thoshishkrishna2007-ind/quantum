import { ArrowDownRight, ArrowUpRight, Minus, Radio } from 'lucide-react'
import { stations } from '../data'

export function RiverIntelligence({ selected, onSelect }: { selected:string; onSelect:(id:string)=>void }) {
  const station = stations.find(s=>s.id===selected) ?? stations[0]
  return (
    <section className="river-panel panel-surface" aria-labelledby="river-title">
      <header className="section-heading"><div><span className="eyebrow">STATION NETWORK</span><h2 id="river-title">River intelligence</h2></div><span className="data-state"><Radio /> LIVE FEED NOT CONNECTED</span></header>
      <div className="station-tabs">{stations.map(s=><button key={s.id} className={selected===s.id?'active':''} onClick={()=>onSelect(s.id)}><i />{s.name}<small>{s.river}</small></button>)}</div>
      <div className="river-body">
        <div className="river-reading"><small>CURRENT LEVEL</small><strong>—</strong><span>DATA UNAVAILABLE</span><div><b>{station.trend==='RISING'?<ArrowUpRight/>:station.trend==='FALLING'?<ArrowDownRight/>:<Minus/>}{station.trend}</b><em>DEMONSTRATION STATUS</em></div></div>
        <div className="river-chart">
          <div className="chart-legend"><span className="current">CURRENT</span><span className="predicted">PREDICTED</span><span className="danger">DANGER THRESHOLD</span><span>HISTORICAL RANGE</span></div>
          <svg viewBox="0 0 720 210" role="img" aria-label="Illustrative river-level trend without measurements">
            <path d="M0 142 C70 146,120 136,170 139 C230 145,280 118,337 123 C394 128,420 103,480 98 C542 92,600 73,720 66 L720 132 C620 126,560 141,490 142 C420 145,380 164,318 157 C230 147,160 170,0 161Z" fill="rgba(111,160,139,.09)" />
            {[45,90,135,180].map(y=><line key={y} x1="0" x2="720" y1={y} y2={y} stroke="rgba(219,241,233,.07)"/>) }
            <line x1="0" x2="720" y1="62" y2="62" stroke="#e9a764" strokeDasharray="5 8"/>
            <path d="M0 152 C90 150,135 140,200 145 C260 150,293 128,350 126" fill="none" stroke="#d7eee5" strokeWidth="2" />
            <path d="M350 126 C410 123,450 107,505 106 C580 104,635 83,720 79" fill="none" stroke="#6de1d2" strokeWidth="2" strokeDasharray="4 4"/>
            <circle cx="350" cy="126" r="5" fill="#e9fff7"/><circle cx="350" cy="126" r="10" fill="none" stroke="rgba(233,255,247,.25)"/>
          </svg>
          <div className="axis-labels"><span>T−24H</span><span>T−12H</span><span>NOW</span><span>+12H</span><span>+24H</span><span>+48H</span></div>
        </div>
      </div>
    </section>
  )
}
