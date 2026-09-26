import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, Marker as MapLibreMarker, StyleSpecification } from 'maplibre-gl'
import { Crosshair, ExternalLink, Globe2, Layers3, LocateFixed, Map as MapIcon, Maximize2, RotateCcw, Satellite, Search } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import './GeospatialMap.css'

const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
    streets: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
    terrain: {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 15,
      encoding: 'terrarium',
      attribution: 'Elevation © AWS Terrain Tiles',
    },
  },
  layers: [
    { id: 'satellite-imagery', type: 'raster', source: 'satellite' },
    { id: 'street-imagery', type: 'raster', source: 'streets', layout: { visibility: 'none' } },
  ],
}

const GoogleMapView = lazy(() => import('./GoogleMapView').then(module => ({ default: module.GoogleMapView })))

export function GeospatialMap() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const [googleFailure, setGoogleFailure] = useState('')
  if (!apiKey) return <MapLibreFallbackMap fallbackNotice="Google Maps key is not configured."/>
  if (googleFailure) return <MapLibreFallbackMap fallbackNotice={googleFailure}/>
  return <Suspense fallback={<div className="geo-map-loading"><span className="geo-loader"/> LOADING GOOGLE MAPS…</div>}><GoogleMapView apiKey={apiKey} onApiFailure={setGoogleFailure}/></Suspense>
}

function MapLibreFallbackMap({ fallbackNotice = '' }: { fallbackNotice?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const locationMarkerRef = useRef<MapLibreMarker | null>(null)
  const [baseLayer, setBaseLayer] = useState<'satellite' | 'streets'>('satellite')
  const [terrainEnabled, setTerrainEnabled] = useState(true)
  const [globeEnabled, setGlobeEnabled] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([12, 24])
  const [placeQuery, setPlaceQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [mapNotice, setMapNotice] = useState(fallbackNotice)

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: satelliteStyle,
      center: [12, 24],
      zoom: 1.8,
      pitch: 0,
      maxPitch: 75,
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left')
    map.on('load', () => {
      map.setProjection({ type: 'globe' })
      map.setTerrain({ source: 'terrain', exaggeration: 1.25 })
      mapRef.current = map
      map.on('moveend', () => {
        const center = map.getCenter()
        setMapCenter([center.lng, center.lat])
      })
      setMapReady(true)
    })
    return () => {
      locationMarkerRef.current?.remove()
      locationMarkerRef.current = null
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.setLayoutProperty('satellite-imagery', 'visibility', baseLayer === 'satellite' ? 'visible' : 'none')
    map.setLayoutProperty('street-imagery', 'visibility', baseLayer === 'streets' ? 'visible' : 'none')
  }, [baseLayer, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.setProjection({ type: globeEnabled ? 'globe' : 'mercator' })
    map.easeTo({ pitch: terrainEnabled ? (globeEnabled ? 30 : 52) : 0, duration: 650 })
  }, [globeEnabled, terrainEnabled, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    map.setTerrain(terrainEnabled ? { source: 'terrain', exaggeration: 1.25 } : null)
  }, [terrainEnabled, mapReady])

  const openStreetImagery = () => {
    const center = mapRef.current?.getCenter().toArray()
    if (!center) return
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center[1]},${center[0]}`, '_blank', 'noopener,noreferrer')
  }

  const moveToPlace = (longitude: number, latitude: number, zoom = 12) => {
    const map = mapRef.current
    if (!map) return
    locationMarkerRef.current?.remove()
    locationMarkerRef.current = new maplibregl.Marker({ color: '#f1bc75' }).setLngLat([longitude, latitude]).addTo(map)
    map.flyTo({ center: [longitude, latitude], zoom, pitch: terrainEnabled ? 48 : 0, duration: 1200 })
  }

  const searchPlace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = placeQuery.trim()
    if (!query) return
    const coordinateMatch = query.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/)
    if (coordinateMatch) {
      const latitude = Number(coordinateMatch[1])
      const longitude = Number(coordinateMatch[2])
      if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        moveToPlace(longitude, latitude)
        setMapNotice(`Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        return
      }
    }
    setSearching(true)
    setMapNotice('')
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Place search is currently unavailable.')
      const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
      const result = results[0]
      if (!result) throw new Error('No matching place found.')
      moveToPlace(Number(result.lon), Number(result.lat))
      setMapNotice(result.display_name)
    } catch (cause) {
      setMapNotice(cause instanceof Error ? cause.message : 'Unable to search this place.')
    } finally {
      setSearching(false)
    }
  }

  const locateDevice = () => {
    if (!navigator.geolocation) {
      setMapNotice('Device location is not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(position => {
      const { longitude, latitude } = position.coords
      moveToPlace(longitude, latitude, 14)
      setMapNotice('Showing your device location.')
    }, cause => {
      setMapNotice(cause.code === cause.PERMISSION_DENIED ? 'Allow location access to find your position.' : 'Unable to determine your device location.')
    }, { enableHighAccuracy: true, timeout: 12000 })
  }

  const toggleFullscreen = async () => {
    const panel = containerRef.current?.parentElement
    if (!panel) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await panel.requestFullscreen()
  }

  return <section className="geospatial-panel" aria-label="Interactive global satellite map">
    <div className="geo-map" ref={containerRef} />
    <div className="geo-map-header">
      <div className="geo-map-brand"><span className="eyebrow">GLOBAL EARTH VIEW</span><strong><Globe2/> SATELLITE MAP</strong><small className="geo-provider-note">{fallbackNotice ? 'GOOGLE MAPS UNAVAILABLE · PUBLIC MAP ACTIVE' : 'PUBLIC MAP · GOOGLE KEY REQUIRED'}</small></div>
      <form className="geo-search-form" onSubmit={searchPlace} role="search">
        <Search/><input aria-label="Search places or coordinates" value={placeQuery} onChange={event => setPlaceQuery(event.target.value)} placeholder="Search a place or enter lat, lon"/>
        <button type="submit" disabled={!mapReady || searching} aria-label="Search map" title="Search map"><Search/></button>
      </form>
      <div className="geo-map-actions">
        <div className="geo-view-switch" role="group" aria-label="Map style">
          <button className={baseLayer === 'satellite' ? 'selected' : ''} onClick={() => setBaseLayer('satellite')} aria-pressed={baseLayer === 'satellite'} title="Satellite imagery"><Satellite/><span>Satellite</span></button>
          <button className={baseLayer === 'streets' ? 'selected' : ''} onClick={() => setBaseLayer('streets')} aria-pressed={baseLayer === 'streets'} title="Street map"><MapIcon/><span>Map</span></button>
        </div>
        <button className={globeEnabled ? 'selected' : ''} onClick={() => setGlobeEnabled(value => !value)} aria-pressed={globeEnabled} title="Toggle globe projection"><Globe2/><span>Globe</span></button>
        <button className={terrainEnabled ? 'selected' : ''} onClick={() => setTerrainEnabled(value => !value)} aria-pressed={terrainEnabled} title="Toggle 3D terrain"><Layers3/><span>Terrain</span></button>
        <button className="geo-icon-button" onClick={locateDevice} title="Find my location" aria-label="Find my location"><LocateFixed/></button>
        <button className="geo-icon-button" onClick={() => mapRef.current?.easeTo({ center: [12, 24], zoom: 1.8, pitch: 0, bearing: 0, duration: 900 })} title="Reset world view" aria-label="Reset world view"><RotateCcw/></button>
        <button className="geo-icon-button" onClick={() => void toggleFullscreen()} title="Toggle fullscreen" aria-label="Toggle fullscreen"><Maximize2/></button>
        <button onClick={openStreetImagery} disabled={!mapReady} title="Open this location in Google Street View"><ExternalLink/><span>Street View</span></button>
      </div>
    </div>
    <div className="geo-map-legend"><span><Crosshair/> {mapCenter[1].toFixed(3)}, {mapCenter[0].toFixed(3)}</span></div>
    {mapNotice && <button className="geo-map-notice" onClick={() => setMapNotice('')} title="Dismiss map message">{mapNotice}<span>×</span></button>}
    {!mapReady && <div className="geo-map-loading"><span className="geo-loader"/>LOADING SATELLITE AND ELEVATION TILES…</div>}
  </section>
}