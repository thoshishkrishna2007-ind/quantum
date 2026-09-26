import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bike, Car, Compass, Crosshair, ExternalLink, Layers3, LocateFixed, Map as MapIcon, Maximize2, Search, Satellite, TrafficCone, TramFront } from 'lucide-react'
import './GeospatialMap.css'

type MapStyle = 'roadmap' | 'satellite' | 'hybrid' | 'terrain'

let googleMapsScript: Promise<void> | null = null

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve()
  if (googleMapsScript) return googleMapsScript

  googleMapsScript = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      googleMapsScript = null
      reject(new Error('Google Maps did not load. Check the API key and enabled APIs.'))
    }
    document.head.append(script)
  })
  return googleMapsScript
}

function goToMapLocation(map: google.maps.Map, lat: number, lng: number, zoom = 13) {
  map.setCenter({ lat, lng })
  map.setZoom(zoom)
}

export function GoogleMapView({ apiKey, onApiFailure }: { apiKey: string; onApiFailure: (message: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const searchMarkerRef = useRef<google.maps.Marker | null>(null)
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null)
  const cyclingLayerRef = useRef<google.maps.BicyclingLayer | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [mapStyle, setMapStyle] = useState<MapStyle>('hybrid')
  const [placeQuery, setPlaceQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [notice, setNotice] = useState('')
  const [traffic, setTraffic] = useState(false)
  const [transit, setTransit] = useState(false)
  const [cycling, setCycling] = useState(false)
  const [tilt3d, setTilt3d] = useState(false)
  const [center, setCenter] = useState({ lat: 20, lng: 0 })

  useEffect(() => {
    let cancelled = false
    let centerListener: google.maps.MapsEventListener | undefined
    let placeListener: google.maps.MapsEventListener | undefined
    let tileListener: google.maps.MapsEventListener | undefined
    let tileTimeout: number | undefined
    const mapsWindow = window as Window & { gm_authFailure?: () => void }
    const previousAuthFailure = mapsWindow.gm_authFailure
    const authFailure = () => {
      const message = 'Google Maps authorization failed. Check key restrictions, billing, and enabled APIs.'
      setMapError(message)
      onApiFailure(message)
    }
    mapsWindow.gm_authFailure = authFailure
    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !containerRef.current) return
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || undefined,
        mapTypeId: 'hybrid',
        mapTypeControl: false,
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: true,
        rotateControl: true,
        scaleControl: true,
        gestureHandling: 'greedy',
        keyboardShortcuts: true,
      })
      mapRef.current = map
      searchMarkerRef.current = new google.maps.Marker({ map })
      trafficLayerRef.current = new google.maps.TrafficLayer()
      transitLayerRef.current = new google.maps.TransitLayer()
      cyclingLayerRef.current = new google.maps.BicyclingLayer()
      if (searchInputRef.current) {
        try {
          const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
            fields: ['geometry', 'formatted_address', 'name'],
          })
          placeListener = autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
            const location = place.geometry?.location
            if (!location) {
              setNotice('No map location is available for that result.')
              return
            }
            if (place.geometry?.viewport) map.fitBounds(place.geometry.viewport)
            else goToMapLocation(map, location.lat(), location.lng())
            searchMarkerRef.current?.setPosition(location)
            setPlaceQuery(place.formatted_address ?? place.name ?? '')
            setNotice(place.formatted_address ?? place.name ?? '')
          })
        } catch {
          setNotice('Place suggestions need Places API enabled; map search still works.')
        }
      }
      centerListener = map.addListener('idle', () => {
        const mapCenter = map.getCenter()
        if (mapCenter) setCenter({ lat: mapCenter.lat(), lng: mapCenter.lng() })
      })
      let tilesLoaded = false
      tileListener = map.addListener('tilesloaded', () => {
        tilesLoaded = true
        if (tileTimeout !== undefined) window.clearTimeout(tileTimeout)
        setMapReady(true)
      })
      tileTimeout = window.setTimeout(() => {
        if (cancelled || tilesLoaded) return
        const message = 'Google Maps tiles did not load. Check key referrer restrictions, billing, and API access.'
        setMapError(message)
        onApiFailure(message)
      }, 10_000)
    }).catch(cause => {
      if (!cancelled) {
        const message = cause instanceof Error ? cause.message : 'Google Maps failed to initialize.'
        setMapError(message)
        onApiFailure(message)
      }
    })
    return () => {
      cancelled = true
      if (mapsWindow.gm_authFailure === authFailure) {
        if (previousAuthFailure) mapsWindow.gm_authFailure = previousAuthFailure
        else delete mapsWindow.gm_authFailure
      }
      centerListener?.remove()
      placeListener?.remove()
      tileListener?.remove()
      if (tileTimeout !== undefined) window.clearTimeout(tileTimeout)
      searchMarkerRef.current?.setMap(null)
      trafficLayerRef.current?.setMap(null)
      transitLayerRef.current?.setMap(null)
      cyclingLayerRef.current?.setMap(null)
      mapRef.current = null
    }
  }, [apiKey, onApiFailure])

  useEffect(() => { mapRef.current?.setMapTypeId(mapStyle) }, [mapStyle, mapReady])
  useEffect(() => { trafficLayerRef.current?.setMap(traffic ? mapRef.current : null) }, [traffic, mapReady])
  useEffect(() => { transitLayerRef.current?.setMap(transit ? mapRef.current : null) }, [transit, mapReady])
  useEffect(() => { cyclingLayerRef.current?.setMap(cycling ? mapRef.current : null) }, [cycling, mapReady])

  const goToCoordinates = (lat: number, lng: number, zoom = 13) => {
    const map = mapRef.current
    if (!map) return
    goToMapLocation(map, lat, lng, zoom)
    searchMarkerRef.current?.setPosition({ lat, lng })
  }

  const searchPlace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = placeQuery.trim()
    if (!query || !mapReady) return
    const coordinates = query.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/)
    if (coordinates) {
      const lat = Number(coordinates[1])
      const lng = Number(coordinates[2])
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        goToCoordinates(lat, lng)
        setNotice(`Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        return
      }
    }

    setSearching(true)
    setNotice('')
    try {
      const geocoder = new google.maps.Geocoder()
      const { results } = await geocoder.geocode({ address: query })
      const result = results[0]
      if (!result) throw new Error('No matching place found.')
      if (result.geometry.viewport) mapRef.current?.fitBounds(result.geometry.viewport)
      else {
        const location = result.geometry.location
        goToCoordinates(location.lat(), location.lng())
      }
      const location = result.geometry.location
      searchMarkerRef.current?.setPosition(location)
      setNotice(result.formatted_address)
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Google place search failed. Check Geocoding API access.')
    } finally {
      setSearching(false)
    }
  }

  const locateDevice = () => {
    if (!navigator.geolocation) {
      setNotice('Device location is not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude: lat, longitude: lng } = position.coords
      goToCoordinates(lat, lng, 15)
      setNotice('Showing your device location.')
    }, cause => {
      setNotice(cause.code === cause.PERMISSION_DENIED ? 'Allow location access to find your position.' : 'Unable to determine your device location.')
    }, { enableHighAccuracy: true, timeout: 12000 })
  }

  const openStreetView = () => {
    const mapCenter = mapRef.current?.getCenter()
    if (!mapCenter) return
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${mapCenter.lat()},${mapCenter.lng()}`, '_blank', 'noopener,noreferrer')
  }

  const toggleFullscreen = async () => {
    const panel = containerRef.current?.parentElement
    if (!panel) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await panel.requestFullscreen()
  }

  const toggle3d = () => {
    const map = mapRef.current
    if (!map) return
    if (!tilt3d) {
      map.setMapTypeId('satellite')
      setMapStyle('satellite')
      map.setZoom(Math.max(map.getZoom() ?? 2, 18))
      map.setTilt(45)
      setNotice('3D tilt is available where Google imagery supports it; a Map ID enables vector-map features.')
    } else {
      map.setTilt(0)
    }
    setTilt3d(value => !value)
  }

  return <section className="geospatial-panel google-map-panel" aria-label="Google Maps global map">
    <div className="geo-map" ref={containerRef}/>
    <div className="geo-map-header">
      <div className="geo-map-brand"><span className="eyebrow">GOOGLE MAPS PLATFORM</span><strong><MapIcon/> WORLD MAP</strong></div>
      <form className="geo-search-form" onSubmit={searchPlace} role="search">
        <Search/><input ref={searchInputRef} aria-label="Search Google Maps or enter coordinates" value={placeQuery} onChange={event => setPlaceQuery(event.target.value)} placeholder="Search Google Maps or enter lat, lon"/>
        <button type="submit" disabled={!mapReady || searching} aria-label="Search map" title="Search map"><Search/></button>
      </form>
      <div className="geo-map-actions google-map-actions">
        <div className="geo-view-switch" role="group" aria-label="Google map type">
          <button className={mapStyle === 'roadmap' ? 'selected' : ''} onClick={() => setMapStyle('roadmap')} title="Road map"><Car/><span>Road</span></button>
          <button className={mapStyle === 'satellite' ? 'selected' : ''} onClick={() => setMapStyle('satellite')} title="Satellite imagery"><Satellite/><span>Satellite</span></button>
          <button className={mapStyle === 'hybrid' ? 'selected' : ''} onClick={() => setMapStyle('hybrid')} title="Satellite with labels"><MapIcon/><span>Hybrid</span></button>
          <button className={mapStyle === 'terrain' ? 'selected' : ''} onClick={() => setMapStyle('terrain')} title="Terrain map"><Compass/><span>Terrain</span></button>
        </div>
        <button className={tilt3d ? 'selected' : ''} onClick={toggle3d} disabled={!mapReady} aria-pressed={tilt3d} title="Enable 3D satellite tilt"><Layers3/><span>3D</span></button>
        <button className="geo-icon-button" onClick={locateDevice} disabled={!mapReady} title="Find my location" aria-label="Find my location"><LocateFixed/></button>
        <button className="geo-icon-button" onClick={() => void toggleFullscreen()} disabled={!mapReady} title="Toggle fullscreen" aria-label="Toggle fullscreen"><Maximize2/></button>
        <button onClick={openStreetView} disabled={!mapReady} title="Open this location in Google Street View"><ExternalLink/><span>Street View</span></button>
      </div>
    </div>
    <div className="google-map-layers" role="group" aria-label="Google Maps layers">
      <label><input type="checkbox" checked={traffic} onChange={event => setTraffic(event.target.checked)}/><TrafficCone/> Traffic</label>
      <label><input type="checkbox" checked={transit} onChange={event => setTransit(event.target.checked)}/><TramFront/> Transit</label>
      <label><input type="checkbox" checked={cycling} onChange={event => setCycling(event.target.checked)}/><Bike/> Bicycling</label>
    </div>
    <div className="geo-map-legend google-map-center"><Crosshair/> {center.lat.toFixed(3)}, {center.lng.toFixed(3)}</div>
    {notice && <button className="geo-map-notice" onClick={() => setNotice('')} title="Dismiss map message">{notice}<span>×</span></button>}
    {!mapReady && <div className="geo-map-loading"><span className="geo-loader"/>{mapError || 'LOADING GOOGLE MAPS…'}</div>}
  </section>
}