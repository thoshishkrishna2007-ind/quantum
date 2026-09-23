import { useEffect, useRef } from 'react'
import { Crosshair, Layers3, LocateFixed, Maximize2, Minus, Plus } from 'lucide-react'
import type { LayerId } from '../types'

interface Props {
  intensity: number
  timeIndex: number
  layers: Set<LayerId>
  simulating: boolean
}

type Drop = { x: number; y: number; speed: number; length: number; drift: number }

const ridgePaths = [
  [[-0.08, .2], [.13, .03], [.3, .19], [.47, .07], [.61, .23], [.77, .17], [1.07, .38]],
  [[-.05, .43], [.18, .24], [.37, .37], [.54, .26], [.72, .4], [.87, .32], [1.05, .52]],
  [[-.04, .63], [.17, .47], [.34, .56], [.52, .45], [.7, .57], [.88, .49], [1.05, .67]],
  [[-.03, .81], [.16, .65], [.33, .75], [.51, .63], [.69, .76], [.88, .65], [1.05, .83]],
]

function drawPath(ctx: CanvasRenderingContext2D, points: number[][], w: number, h: number) {
  ctx.beginPath()
  points.forEach(([x, y], i) => i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h))
}

export function TerrainScene({ intensity, timeIndex, layers, simulating }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef(0)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let width = 0
    let height = 0
    let frame = 0
    const drops: Drop[] = Array.from({ length: 100 }, () => ({
      x: Math.random(), y: Math.random(), speed: .002 + Math.random() * .005,
      length: 6 + Math.random() * 13, drift: -.5 + Math.random(),
    }))

    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = box.width * scale
      canvas.height = box.height * scale
      width = box.width
      height = box.height
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
    }

    const river = (offset: number, alpha: number, lineWidth: number) => {
      ctx.beginPath()
      ctx.moveTo(width * .22, -10)
      ctx.bezierCurveTo(width * (.14 + offset), height * .25, width * (.57 + offset), height * .26, width * (.43 + offset), height * .53)
      ctx.bezierCurveTo(width * (.35 + offset), height * .72, width * (.65 + offset), height * .76, width * (.58 + offset), height * 1.08)
      ctx.strokeStyle = `rgba(107, 230, 220, ${alpha})`
      ctx.lineWidth = lineWidth
      ctx.shadowBlur = 18
      ctx.shadowColor = '#5fe3d9'
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    const draw = () => {
      frame += 1
      ctx.clearRect(0, 0, width, height)
      const t = frame * .008
      const flood = Math.max(0, (timeIndex - 2) / 6) * .72 + intensity / 300

      const bg = ctx.createRadialGradient(width * .45, height * .52, 20, width * .45, height * .5, width * .75)
      bg.addColorStop(0, '#153c38')
      bg.addColorStop(.35, '#0b2626')
      bg.addColorStop(1, '#040b0c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Lowland illumination and advancing inundation.
      if (layers.has('probability') || layers.has('inundation')) {
        const pulse = .03 * Math.sin(t * 2)
        const water = ctx.createRadialGradient(width * .48, height * .65, 10, width * .48, height * .65, width * (.16 + flood * .22))
        water.addColorStop(0, `rgba(38,194,186,${.32 + flood * .28 + pulse})`)
        water.addColorStop(.55, `rgba(27,113,130,${.17 + flood * .12})`)
        water.addColorStop(1, 'rgba(20,81,93,0)')
        ctx.fillStyle = water
        ctx.fillRect(0, 0, width, height)
      }

      // Contoured terrain topology.
      ridgePaths.forEach((path, index) => {
        for (let echo = 0; echo < 6; echo += 1) {
          const shifted = path.map(([x, y]) => [x, y + echo * .018])
          drawPath(ctx, shifted, width, height)
          ctx.strokeStyle = index === 0 ? `rgba(164,231,204,${.15 - echo * .016})` : `rgba(107,178,152,${.13 - echo * .013})`
          ctx.lineWidth = echo === 0 ? 1.1 : .55
          ctx.stroke()
        }
      })
      for (let x = -height; x < width + height; x += 34) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - height * .7, height)
        ctx.strokeStyle = 'rgba(124,205,182,.035)'; ctx.lineWidth = .5; ctx.stroke()
      }
      for (let x = -height; x < width + height; x += 34) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + height * .7, height)
        ctx.strokeStyle = 'rgba(124,205,182,.025)'; ctx.stroke()
      }

      if (layers.has('rivers')) {
        river(0, .8, 2.1 + flood * 7)
        river(-.1, .48, 1.2 + flood * 2)
        river(.13, .42, 1 + flood * 2)
      }

      if (layers.has('infrastructure')) {
        const roads = [[[.06,.62],[.31,.55],[.58,.59],[.96,.47]], [[.25,.2],[.37,.48],[.71,.72],[.91,.91]]]
        roads.forEach(path => { drawPath(ctx, path, width, height); ctx.setLineDash([5,7]); ctx.strokeStyle='rgba(225,234,215,.28)'; ctx.lineWidth=.8; ctx.stroke(); ctx.setLineDash([]) })
      }

      if (layers.has('rain')) {
        const visible = Math.floor(30 + intensity * .75)
        drops.slice(0, visible).forEach(drop => {
          drop.y += drop.speed * (1 + intensity / 50)
          drop.x += drop.drift * .0003
          if (drop.y > 1.1) { drop.y = -.1; drop.x = Math.random() }
          ctx.beginPath(); ctx.moveTo(drop.x * width, drop.y * height); ctx.lineTo(drop.x * width - 2, drop.y * height + drop.length)
          ctx.strokeStyle = `rgba(158,225,226,${.15 + intensity / 240})`; ctx.lineWidth = .6; ctx.stroke()
        })
      }

      // Settlements and observation nodes.
      [[.29,.32],[.53,.52],[.7,.67],[.43,.75]].forEach(([x,y], i) => {
        const danger = flood > .6 && i > 0
        ctx.beginPath(); ctx.arc(x*width,y*height, danger ? 4.2 : 2.6,0,Math.PI*2)
        ctx.fillStyle = danger ? '#ffb56b' : '#d9fff5'; ctx.shadowBlur = 15; ctx.shadowColor = danger ? '#ff9745' : '#8bfbe0'; ctx.fill(); ctx.shadowBlur=0
        ctx.beginPath(); ctx.arc(x*width,y*height, 9 + Math.sin(t*3+i)*2,0,Math.PI*2); ctx.strokeStyle=danger?'rgba(255,181,107,.35)':'rgba(156,249,226,.2)'; ctx.stroke()
      })

      if (simulating) {
        const sweep = (frame * 4) % (width + 200) - 100
        const beam = ctx.createLinearGradient(sweep - 60, 0, sweep + 60, 0)
        beam.addColorStop(0, 'rgba(84,232,213,0)'); beam.addColorStop(.5, 'rgba(143,255,234,.16)'); beam.addColorStop(1, 'rgba(84,232,213,0)')
        ctx.fillStyle = beam; ctx.fillRect(sweep-60,0,120,height)
      }
      animationRef.current = requestAnimationFrame(draw)
    }
    resize()
    window.addEventListener('resize', resize)
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationRef.current) }
  }, [intensity, timeIndex, layers, simulating])

  return (
    <div className="terrain-scene" role="group" aria-label="Interactive simulated river basin model">
      <canvas ref={ref} />
      <div className="map-vignette" />
      <div className="map-coordinate top-left"><Crosshair size={12} /> 34° 18′ N&nbsp;&nbsp; 76° 42′ E</div>
      <div className="map-status top-right"><span className="status-dot" /> SIMULATION ENVIRONMENT</div>
      <div className="map-tools" role="group" aria-label="Map controls">
        <button aria-label="Zoom in"><Plus /></button><button aria-label="Zoom out"><Minus /></button>
        <button aria-label="Recenter map"><LocateFixed /></button><button aria-label="Toggle full screen"><Maximize2 /></button>
      </div>
      <div className="orientation"><span>N</span><i /><small>AZ 032°</small></div>
      <div className="map-scale"><i /> 12 KM</div>
      <div className="basin-label"><span>ASTER BASIN</span><small>DEMONSTRATION DIGITAL TWIN</small></div>
      <div className="depth-chip"><Layers3 size={13} /> TERRAIN / HYDROLOGY</div>
    </div>
  )
}
