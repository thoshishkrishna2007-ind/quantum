import { RotateCcw, Sparkles } from 'lucide-react'
import type { SimulationSettings } from '../types'

const controls: { key: keyof SimulationSettings; label: string; min: number; max: number; unit: string }[] = [
  { key: 'rainfall', label: 'Rainfall', min: 0, max: 100, unit: '%' },
  { key: 'riverLevel', label: 'River level', min: 0, max: 100, unit: '%' },
  { key: 'soil', label: 'Soil saturation', min: 0, max: 100, unit: '%' },
  { key: 'release', label: 'Reservoir release', min: 0, max: 100, unit: '%' },
  { key: 'temperature', label: 'Temperature', min: -5, max: 45, unit: '°C' },
  { key: 'duration', label: 'Duration', min: 1, max: 72, unit: 'H' },
]

export function SimulationPanel({ values, setValues, onRun, running }: { values: SimulationSettings; setValues:(s:SimulationSettings)=>void; onRun:()=>void; running:boolean }) {
  const reset = () => setValues({ rainfall: 42, riverLevel: 36, soil: 58, release: 18, temperature: 19, duration: 24 })
  return (
    <section className="simulation-panel panel-surface" aria-labelledby="simulation-title">
      <header className="section-heading">
        <div><span className="eyebrow">SCENARIO LABORATORY</span><h2 id="simulation-title">Flood simulation</h2></div>
        <button className="icon-action" onClick={reset}><RotateCcw /> RESET</button>
      </header>
      <div className="sim-compare"><div><small>REFERENCE</small><strong>BASELINE</strong></div><span>VS</span><div><small>EDITABLE</small><strong>SIMULATED SCENARIO</strong></div></div>
      <div className="sim-controls">
        {controls.map(control => <label key={control.key}>
          <span>{control.label}<output>{values[control.key]}{control.unit}</output></span>
          <input aria-label={control.label} type="range" min={control.min} max={control.max} value={values[control.key]} onChange={e => setValues({...values,[control.key]:Number(e.target.value)})} />
        </label>)}
      </div>
      <button className="run-simulation" onClick={onRun} disabled={running}><Sparkles />{running ? 'COMPUTING SCENARIO…' : 'RUN QUANTUM–AI SIMULATION'}<span /></button>
      <p className="integrity-copy">Scenario values control the visual model only. They are not predictions or live measurements.</p>
    </section>
  )
}
