"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Navigation, Satellite, Map } from "lucide-react"

export function GPSMap({ lat, lon, history }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const tileLayerRef = useRef(null)
  const [isSatellite, setIsSatellite] = useState(false)

  // GPS geçmişinden yön hesapla (derece cinsinden)
  const heading = useMemo(() => {
    if (history.length < 2) return 0
    const prev = history[history.length - 2]
    const curr = history[history.length - 1]
    
    const dLon = (curr.lon - prev.lon) * Math.PI / 180
    const lat1 = prev.lat * Math.PI / 180
    const lat2 = curr.lat * Math.PI / 180
    
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI
    bearing = (bearing + 360) % 360
    
    return bearing
  }, [history])

  const updateMarkerIcon = (angle) => {
    if (!markerRef.current || !window.L) return
    
    const L = window.L
    const customIcon = L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${angle}deg);
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 20L12 16L20 20L12 2Z" fill="#ef4444" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
    
    markerRef.current.setIcon(customIcon)
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadLeaflet = async () => {
      if (!window.L) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)

        await new Promise((resolve) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }

      if (!mapRef.current || mapInstanceRef.current) return

      const L = window.L
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat || 39.92, lon || 32.85], 16)

      // Default dark tile layer
      const darkTiles = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
      )
      darkTiles.addTo(map)
      tileLayerRef.current = darkTiles

      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 20L12 16L20 20L12 2Z" fill="#ef4444" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const marker = L.marker([lat || 39.92, lon || 32.85], {
        icon: customIcon,
      }).addTo(map)

      mapInstanceRef.current = map
      markerRef.current = marker

      setTimeout(() => map.invalidateSize(), 100)
    }

    loadLeaflet()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        tileLayerRef.current = null
      }
    }
  }, [])

  // Update marker position and heading
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && lat && lon) {
      markerRef.current.setLatLng([lat, lon])
      mapInstanceRef.current.panTo([lat, lon], { animate: true, duration: 0.3 })
      updateMarkerIcon(heading)
    }
  }, [lat, lon, heading])

  // Toggle satellite/map view
  const toggleMapView = () => {
    if (!mapInstanceRef.current || !window.L) return
    
    const L = window.L
    
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current)
    }
    
    const newLayer = isSatellite
      ? L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 })
      : L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 })
    
    newLayer.addTo(mapInstanceRef.current)
    tileLayerRef.current = newLayer
    setIsSatellite(!isSatellite)
  }

  const formatCoord = (val) => {
    if (!val || isNaN(val)) return "—"
    return val.toFixed(6)
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-lg h-full flex flex-col">
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-emerald-500 to-transparent" />
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">GPS Konum</h3>
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <span>Lat: {formatCoord(lat)}</span>
                  <span className="text-muted-foreground/50">|</span>
                  <span>Lon: {formatCoord(lon)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={toggleMapView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
            >
              {isSatellite ? (
                <>
                  <Map className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Harita</span>
                </>
              ) : (
                <>
                  <Satellite className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Uydu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Map */}
        <div ref={mapRef} className="flex-1 min-h-[280px]" />

        {/* Heading indicator */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg">
            <Navigation 
              className="w-4 h-4 text-red-500" 
              style={{ transform: `rotate(${heading}deg)` }}
            />
            <span className="text-xs font-mono text-muted-foreground">
              {heading.toFixed(0)}°
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
