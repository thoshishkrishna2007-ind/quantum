import { BellRing, CircleAlert, Clock3, MapPin } from 'lucide-react'

const alerts = [
  { level:'WATCH', title:'Threshold monitoring enabled', detail:'Station feeds are awaiting connection.', region:'All demonstration regions', time:'NO LIVE TIMESTAMP' },
  { level:'NORMAL', title:'Simulation environment ready', detail:'Adjust scenario parameters to inspect propagation.', region:'Aster Basin digital twin', time:'LOCAL SESSION' },
]

export function AlertSystem() {
  return (
    <section className="alerts-panel panel-surface" aria-labelledby="alerts-title">
      <header className="section-heading"><div><span className="eyebrow">SPATIAL WARNING ENGINE</span><h2 id="alerts-title">Alert intelligence</h2></div><span className="data-state"><BellRing /> 0 LIVE ALERTS</span></header>
      <div className="alert-scale">{['NORMAL','WATCH','WARNING','SEVERE','CRITICAL'].map((s,i)=><div key={s} className={i===0?'active':''}><i />{s}</div>)}</div>
      <div className="alert-list">{alerts.map(alert=><article key={alert.title}>
        <div className={`alert-level ${alert.level.toLowerCase()}`}><CircleAlert /><span>{alert.level}</span></div>
        <div><h3>{alert.title}</h3><p>{alert.detail}</p><footer><span><MapPin />{alert.region}</span><span><Clock3 />{alert.time}</span></footer></div>
      </article>)}</div>
      <p className="integrity-note"><CircleAlert /> Operational alerts require validated sensor, model and geographic inputs.</p>
    </section>
  )
}
