import { useEffect, useMemo, useState } from 'react'
import { Activity, CloudRain, Droplets, Gauge, Hexagon, Menu, Satellite, ShieldAlert, Waves, X } from 'lucide-react'
import { navItems } from './data'
import type { LayerId, SimulationSettings, ViewId } from './types'
import { AlertSystem } from './components/AlertSystem'
import { ForecastPanel } from './components/ForecastPanel'
import { QuantumVisualization } from './components/QuantumVisualization'
import { ReportCenter } from './components/ReportCenter'
import { RiverIntelligence } from './components/RiverIntelligence'
import { SimulationPanel } from './components/SimulationPanel'
import { StartupSequence } from './components/StartupSequence'
import { TerrainScene } from './components/TerrainScene'
import { TimeSlider } from './components/TimeSlider'

const initialSettings: SimulationSettings = { rainfall: 42, riverLevel: 36, soil: 58, release: 18, temperature: 19, duration: 24 }

const metrics = [
  { label: 'FLOOD RISK', value: 'UNAVAILABLE', icon: ShieldAlert, tone: 'risk' },
  { label: 'FORECAST CONFIDENCE', value: 'UNAVAILABLE', icon: Activity },
  { label: 'RIVER LEVEL', value: 'UNAVAILABLE', icon: Waves },
  { label: 'RAINFALL', value: 'SIMULATED', icon: CloudRain },
]

const viewTitles: Record<ViewId, [string,string]> = {
  overview:['BASIN OVERVIEW','Live environmental intelligence'], forecast:['FORECAST INTELLIGENCE','Prediction and uncertainty'],
  map:['FLOOD MAP','Spatial risk and propagation'], quantum:['QUANTUM AI','Hybrid computation architecture'],
  river:['RIVER NETWORK','Station intelligence'], simulation:['SIMULATION','Scenario laboratory'],
  alerts:['ALERTS','Spatial warning engine'], reports:['REPORTS','Decision intelligence center'],
}

function App() {
  const [intro, setIntro] = useState(true)
  const [view, setView] = useState<ViewId>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [timeIndex, setTimeIndex] = useState(2)
  const [playing, setPlaying] = useState(false)
  const [layers, setLayers] = useState<Set<LayerId>>(new Set(['rain','rivers','probability','elevation','inundation','infrastructure']))
  const [settings, setSettings] = useState(initialSettings)
  const [simulating, setSimulating] = useState(false)
  const [station, setStation] = useState('n01')
  const [rainPeriod, setRainPeriod] = useState('24H')

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setTimeIndex(current => current >= 8 ? 0 : current + 1), 1100)
    return () => window.clearInterval(timer)
  }, [playing])

  const switchView = (next: ViewId) => { setView(next); setMobileNav(false); window.scrollTo({top:0, behavior:'smooth'}) }
  const runSimulation = () => {
    setSimulating(true); setView('simulation'); setTimeIndex(2)
    window.setTimeout(() => { setTimeIndex(5); setSimulating(false) }, 3600)
  }
  const toggleLayer = (layer: LayerId) => setLayers(current => {
    const next = new Set(current)
    if (next.has(layer)) next.delete(layer)
    else next.add(layer)
    return next
  })
  const title = viewTitles[view]
  const showMap = ['overview','map','simulation'].includes(view)
  const intensity = useMemo(() => view === 'simulation' ? settings.rainfall : 35, [view, settings.rainfall])

  if (intro) return <StartupSequence onEnter={() => setIntro(false)} onForecast={() => { setIntro(false); setView('forecast') }} />

  return (
    <div className={`app-shell view-${view} ${simulating ? 'is-simulating' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <button className="brand" onClick={() => switchView('overview')} aria-label="Go to overview">
          <span className="brand-mark"><i/><i/><i/></span><span><b>QUANTA</b><small>FLOOD INTELLIGENCE</small></span>
        </button>
        <nav className={mobileNav ? 'open' : ''} aria-label="Main navigation">
          {navItems.map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>switchView(id)}>{label}</button>)}
        </nav>
        <div className="top-status"><span><i/> SYSTEM ONLINE</span><button aria-label="Open menu" onClick={()=>setMobileNav(!mobileNav)}>{mobileNav?<X/>:<Menu/>}</button></div>
      </header>

      <main id="main-content">
        <div className="view-header">
          <div><span className="eyebrow">QUANTUM FLOOD INTELLIGENCE / {title[0]}</span><h1>{title[1]}</h1></div>
          <div className="session-meta"><span>ASTER BASIN</span><small>SIMULATION ENVIRONMENT</small></div>
        </div>

        {showMap && <>
          <section className="command-grid" aria-label="Flood intelligence map">
            <div className="map-frame">
              <TerrainScene intensity={intensity} timeIndex={timeIndex} layers={layers} simulating={simulating}/>
              <div className="metric-rail">
                {metrics.map(({label,value,icon:Icon,tone})=><div className={`metric ${tone??''}`} key={label}><Icon/><span>{label}</span><strong>{value}</strong><small>{label==='RAINFALL' ? `${intensity}% SCENARIO INTENSITY` : 'AWAITING MODEL INPUT'}</small></div>)}
              </div>
              <div className="layer-control">
                <div><span><Satellite/> MAP INTELLIGENCE</span><small>SPATIAL LAYERS</small></div>
                {(['rain','rivers','probability','elevation','inundation','infrastructure'] as LayerId[]).map(layer=><button key={layer} className={layers.has(layer)?'active':''} onClick={()=>toggleLayer(layer)}><i/>{layer==='probability'?'FLOOD PROBABILITY':layer.toUpperCase()}</button>)}
              </div>
              {simulating && <div className="compute-overlay"><Hexagon/><strong>HYBRID COMPUTE ACTIVE</strong><span>PROPAGATING SCENARIO FIELD</span><i/></div>}
            </div>
            <TimeSlider value={timeIndex} onChange={setTimeIndex} playing={playing} onPlay={()=>setPlaying(!playing)}/>
          </section>
          {view==='overview' && <div className="overview-story">
            <div><span className="eyebrow">INTELLIGENCE CHAIN</span><p>Predict <i/> Understand <i/> Simulate <i/> Warn <i/> Prepare</p></div>
            <button onClick={()=>switchView('simulation')}>OPEN SCENARIO LAB <span>↗</span></button>
          </div>}
          {view==='simulation' && <SimulationPanel values={settings} setValues={setSettings} onRun={runSimulation} running={simulating}/>} 
          {view==='map' && <RainfallModule period={rainPeriod} setPeriod={setRainPeriod}/>} 
        </>}

        {view==='forecast' && <ForecastPanel/>}
        {view==='quantum' && <QuantumVisualization/>}
        {view==='river' && <RiverIntelligence selected={station} onSelect={setStation}/>} 
        {view==='alerts' && <AlertSystem/>}
        {view==='reports' && <ReportCenter/>}
      </main>

      <footer className="app-footer"><span>QF / ENVIRONMENTAL INTELLIGENCE</span><p>Demonstration interface. Not for operational emergency decisions.</p><span>v1.0 · UTC</span></footer>
    </div>
  )
}

function RainfallModule({period,setPeriod}:{period:string;setPeriod:(p:string)=>void}) {
  return <section className="rain-module panel-surface"><header className="section-heading"><div><span className="eyebrow">PRECIPITATION FIELD</span><h2>Rainfall intelligence</h2></div><span className="simulation-tag">SIMULATED PARTICLES</span></header>
    <div className="rain-periods">{['1H','6H','12H','24H','48H','7D'].map(p=><button className={period===p?'active':''} onClick={()=>setPeriod(p)} key={p}>{p}</button>)}</div>
    <div className="rain-analysis"><div><Droplets/><span>ACCUMULATED RAINFALL</span><strong>DATA UNAVAILABLE</strong></div><div><Gauge/><span>RAINFALL ANOMALY</span><strong>DATA UNAVAILABLE</strong></div><div><CloudRain/><span>FORECAST RAINFALL</span><strong>DATA UNAVAILABLE</strong></div></div>
  </section>
}

export default App
