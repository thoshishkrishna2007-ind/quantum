import { ArrowDown, Atom, Binary, Braces, BrainCircuit, CircleDashed, GitBranch, Orbit } from 'lucide-react'

export function QuantumVisualization({ active = false }: { active?: boolean }) {
  const stages = [
    { label: 'ENVIRONMENTAL DATA', sub: 'Rain · terrain · river', icon: Binary },
    { label: 'FEATURE ENGINEERING', sub: 'Normalized feature space', icon: Braces },
    { label: 'AI MODEL', sub: 'Temporal encoder', icon: BrainCircuit },
    { label: 'QUANTUM LAYER', sub: 'Parameterized feature map', icon: Atom, quantum: true },
    { label: 'HYBRID PREDICTION', sub: 'Uncertainty-aware output', icon: GitBranch },
  ]
  return (
    <section className={`quantum-visual panel-surface ${active ? 'computing' : ''}`} aria-labelledby="quantum-title">
      <header className="section-heading">
        <div><span className="eyebrow">HYBRID COMPUTE PIPELINE</span><h2 id="quantum-title">Quantum intelligence</h2></div>
        <span className="data-state"><CircleDashed /> MODEL OUTPUT UNAVAILABLE</span>
      </header>
      <div className="pipeline">
        {stages.map(({ label, sub, icon: Icon, quantum }, i) => (
          <div className="pipeline-fragment" key={label}>
            <div className={`pipeline-stage ${quantum ? 'quantum-stage' : ''}`}>
              <div className="stage-icon"><Icon /></div><div><strong>{label}</strong><small>{sub}</small></div>
              {quantum && <div className="qubit-field" aria-hidden="true">{[0,1,2,3,4].map(n => <i key={n} />)}<Orbit /></div>}
            </div>
            {i < stages.length - 1 && <ArrowDown className="pipeline-arrow" />}
          </div>
        ))}
      </div>
      <div className="quantum-bottom">
        <div><small>QUANTUM STATE</small><strong>NOT CONNECTED</strong></div>
        <div className="amplitudes" aria-label="Illustrative probability amplitudes">
          {[26, 48, 34, 78, 55, 40, 62, 31, 70, 42].map((height, i) => <i key={i} style={{height:`${height}%`}} />)}
        </div>
        <p>Visualization illustrates the intended hybrid pipeline. No quantum advantage or performance claim is inferred.</p>
      </div>
    </section>
  )
}
