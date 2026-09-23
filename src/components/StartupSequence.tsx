import { ArrowDownRight, Play, SkipForward } from 'lucide-react'

export function StartupSequence({ onEnter, onForecast }: { onEnter:()=>void; onForecast:()=>void }) {
  return (
    <div className="startup" role="dialog" aria-label="Quantum flood intelligence introduction">
      <div className="startup-atmosphere" />
      <div className="startup-orbit orbit-one"/><div className="startup-orbit orbit-two"/>
      <div className="startup-basin" aria-hidden="true">
        <div className="terrain-wire">{Array.from({length:14}).map((_,i)=><i key={i}/>)}</div>
        <svg viewBox="0 0 800 440"><path d="M400 0 C315 102 510 122 376 216 C250 303 472 320 390 440"/><path d="M168 12 C250 112 352 108 380 191"/><path d="M624 38 C522 91 470 121 418 185"/></svg>
        <div className="quantum-cloud">{Array.from({length:7}).map((_,i)=><i key={i}/>)}</div>
      </div>
      <button className="skip-intro" onClick={onEnter}><SkipForward/> SKIP INTRO</button>
      <div className="startup-copy">
        <div className="startup-kicker"><i/> QUANTUM FLOOD INTELLIGENCE CENTER</div>
        <h1><span>QUANTUM AI</span>FLOOD FORECASTING</h1>
        <p>Predicting water. Understanding risk. Protecting tomorrow.</p>
        <div className="startup-actions">
          <button className="primary-action" onClick={onEnter}>EXPLORE FLOOD INTELLIGENCE <ArrowDownRight/></button>
          <button className="secondary-action" onClick={onForecast}><Play/> RUN FORECAST</button>
        </div>
        <div className="system-online"><i/><span>ENVIRONMENTAL INTELLIGENCE ONLINE</span><small>DEMONSTRATION ENVIRONMENT / NO LIVE FEEDS</small></div>
      </div>
      <div className="startup-index"><span>01</span><i/><small>WATER · TIME · TERRAIN · UNCERTAINTY</small></div>
    </div>
  )
}
