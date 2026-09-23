import { Pause, Play } from 'lucide-react'
import { timeSteps } from '../data'

export function TimeSlider({ value, onChange, playing, onPlay }: { value: number; onChange: (v:number)=>void; playing:boolean; onPlay:()=>void }) {
  return (
    <div className="time-slider" role="group" aria-label="Forecast timeline">
      <button className={playing ? 'active play-button' : 'play-button'} onClick={onPlay} aria-label={playing ? 'Pause forecast animation' : 'Play forecast animation'}>
        {playing ? <Pause /> : <Play />}
      </button>
      <div className="time-track">
        <div className="time-progress" style={{ width: `${value / (timeSteps.length - 1) * 100}%` }} />
        <input type="range" min="0" max={timeSteps.length - 1} value={value} onChange={e => onChange(Number(e.target.value))} aria-label="Select forecast time" />
        <div className="time-labels">{timeSteps.map((time, i) => <button key={time} className={value === i ? 'active' : ''} onClick={() => onChange(i)}>{time}</button>)}</div>
      </div>
      <div className="forecast-horizon"><small>FORECAST HORIZON</small><strong>{timeSteps[value]}</strong></div>
    </div>
  )
}
