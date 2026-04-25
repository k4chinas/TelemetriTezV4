"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MetricCard } from "./metric-card"
import { GPSMap } from "./gps-map"
import { MPUVisualizer } from "./mpu-visualizer"
import { ConnectionStatus } from "./connection-status"
import { ThemeToggle } from "./theme-toggle"
import { RecordingControls } from "./recording-controls"
import { 
  Gauge, 
  Zap, 
  Activity, 
  Bolt, 
  Timer,
  Battery
} from "lucide-react"
import { io } from "socket.io-client"

// Backend sunucu adresi — .env.local dosyasında NEXT_PUBLIC_SERVER_URL ile değiştirilebilir
const SERVER_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SERVER_URL
    ? process.env.NEXT_PUBLIC_SERVER_URL
    : "http://localhost:1881"

const OFFLINE_TIMEOUT = 60000 // 1 dakika
const MAX_HISTORY = 50
const MAX_GPS_HISTORY = 100

export function TelemetryDashboard() {
  const [telemetry, setTelemetry] = useState({
    lat: 39.92,
    lon: 32.85,
    gpsHistory: [],
    gx: 0, gy: 0, gz: 0,
    ax: 0, ay: 0, az: 0,
    mx: 0, my: 0, mz: 0,
    temp: 0,
    voltage: 0,
    current: 0,
    watt: 0,
    wattHour: 0,
    speed: 0,
    remainingEnergy: 100,
    voltageHistory: [],
    currentHistory: [],
    wattHistory: [],
    wattHourHistory: [],
    speedHistory: [],
    remainingEnergyHistory: [],
    lastDataTime: null,
    isOnline: false,
  })

  const [expandedCards, setExpandedCards] = useState(new Set())
  const [isRecording, setIsRecording] = useState(false)
  const recordedDataRef = useRef([])
  const [recordedRows, setRecordedRows] = useState(0)

  const toggleCard = (key) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) { newSet.delete(key) } else { newSet.add(key) }
      return newSet
    })
  }

  const startRecording = () => {
    recordedDataRef.current = []
    setRecordedRows(0)
    setIsRecording(true)
  }
  const stopRecording = () => setIsRecording(false)
  const resumeRecording = () => setIsRecording(true)
  const finishRecording = () => {
    setIsRecording(false)
    downloadRecording()
    recordedDataRef.current = []
    setRecordedRows(0)
  }

  const downloadRecording = useCallback(async () => {
    if (recordedDataRef.current.length === 0) return
    let filenameSuffix = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")
    try {
      const res = await fetch(`${SERVER_URL}/api/server-time`)
      if (res.ok) {
        const json = await res.json()
        if (json.filenameSuffix) filenameSuffix = json.filenameSuffix
      }
    } catch (_) {}
    const headers = [
      "Timestamp","Lat","Lon",
      "Gx","Gy","Gz","Ax","Ay","Az","Mx","My","Mz","Temp",
      "Voltage","Current","Watt","WattHour","Speed","RemainingEnergy",
    ]
    const csvContent = [
      headers.join(","),
      ...recordedDataRef.current.map((row) =>
        [
          row.timestamp,
          row.lat.toFixed(6), row.lon.toFixed(6),
          row.gx.toFixed(3), row.gy.toFixed(3), row.gz.toFixed(3),
          row.ax.toFixed(3), row.ay.toFixed(3), row.az.toFixed(3),
          row.mx.toFixed(3), row.my.toFixed(3), row.mz.toFixed(3),
          row.temp.toFixed(2),
          row.voltage.toFixed(2), row.current.toFixed(2),
          row.watt.toFixed(2), row.wattHour.toFixed(4),
          row.speed.toFixed(2), row.remainingEnergy.toFixed(2),
        ].join(",")
      ),
    ].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `telemetry_${filenameSuffix}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  // ─── Socket.IO Bağlantısı ─────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    })

    socket.on("status", (data) => {
      setTelemetry((prev) => ({ ...prev, isOnline: Boolean(data?.online) }))
    })

    socket.on("telemetry", (data) => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString("tr-TR", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })

      setTelemetry((prev) => {
        const addToHistory = (history, value) => {
          const next = [...history, { time: timeStr, value }]
          if (next.length > MAX_HISTORY) next.shift()
          return next
        }
        const addToGPSHistory = (history) => {
          const next = [...history, { lat: data.lat, lon: data.lon, timestamp: Date.now() }]
          if (next.length > MAX_GPS_HISTORY) next.shift()
          return next
        }
        // Sunucu alanı → Frontend state eşleştirmesi:
        // tmp→temp  v→voltage  i→current  w→watt  wh→wattHour  spd→speed  bat→remainingEnergy
        return {
          ...prev,
          lat: data.lat, lon: data.lon,
          gpsHistory: addToGPSHistory(prev.gpsHistory),
          gx: data.gx, gy: data.gy, gz: data.gz,
          ax: data.ax, ay: data.ay, az: data.az,
          mx: data.mx, my: data.my, mz: data.mz,
          temp: data.tmp,
          voltage: data.v, current: data.i, watt: data.w,
          wattHour: data.wh, speed: data.spd, remainingEnergy: data.bat,
          voltageHistory: addToHistory(prev.voltageHistory, data.v),
          currentHistory: addToHistory(prev.currentHistory, data.i),
          wattHistory: addToHistory(prev.wattHistory, data.w),
          wattHourHistory: addToHistory(prev.wattHourHistory, data.wh),
          speedHistory: addToHistory(prev.speedHistory, data.spd),
          remainingEnergyHistory: addToHistory(prev.remainingEnergyHistory, data.bat),
          lastDataTime: data.server_ts ?? Date.now(),
          isOnline: true,
        }
      })
    })

    socket.on("disconnect", () => {
      setTelemetry((prev) => ({ ...prev, isOnline: false }))
    })

    return () => { socket.disconnect() }
  }, [])

  // ─── Kayıt işlemi ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording && telemetry.lastDataTime) {
      recordedDataRef.current.push({
        timestamp: new Date().toISOString(),
        lat: telemetry.lat, lon: telemetry.lon,
        gx: telemetry.gx, gy: telemetry.gy, gz: telemetry.gz,
        ax: telemetry.ax, ay: telemetry.ay, az: telemetry.az,
        mx: telemetry.mx, my: telemetry.my, mz: telemetry.mz,
        temp: telemetry.temp,
        voltage: telemetry.voltage, current: telemetry.current,
        watt: telemetry.watt, wattHour: telemetry.wattHour,
        speed: telemetry.speed, remainingEnergy: telemetry.remainingEnergy,
      })
      setRecordedRows(recordedDataRef.current.length)
    }
  }, [isRecording, telemetry.lastDataTime, telemetry.lat, telemetry.lon,
    telemetry.gx, telemetry.gy, telemetry.gz, telemetry.ax, telemetry.ay, telemetry.az,
    telemetry.mx, telemetry.my, telemetry.mz, telemetry.temp, telemetry.voltage,
    telemetry.current, telemetry.watt, telemetry.wattHour, telemetry.speed, telemetry.remainingEnergy])

  // ─── Bağlantı zaman aşımı kontrolü ───────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setTelemetry((prev) => {
        if (!prev.lastDataTime) return prev
        return { ...prev, isOnline: Date.now() - prev.lastDataTime < OFFLINE_TIMEOUT }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const metrics = [
    { key: "speed", label: "Hız", unit: "km/h", icon: <Gauge className="w-6 h-6" />, history: telemetry.speedHistory, currentValue: telemetry.speed, accentColor: "#ef4444" },
    { key: "voltage", label: "Voltaj", unit: "V", icon: <Zap className="w-6 h-6" />, history: telemetry.voltageHistory, currentValue: telemetry.voltage, accentColor: "#f59e0b" },
    { key: "current", label: "Akım", unit: "A", icon: <Activity className="w-6 h-6" />, history: telemetry.currentHistory, currentValue: telemetry.current, accentColor: "#3b82f6" },
    { key: "watt", label: "Güç", unit: "W", icon: <Bolt className="w-6 h-6" />, history: telemetry.wattHistory, currentValue: telemetry.watt, accentColor: "#8b5cf6", decimals: 0 },
    { key: "wattHour", label: "Enerji", unit: "Wh", icon: <Timer className="w-6 h-6" />, history: telemetry.wattHourHistory, currentValue: telemetry.wattHour, accentColor: "#06b6d4", decimals: 2 },
    { key: "remainingEnergy", label: "Kalan Enerji", unit: "%", icon: <Battery className="w-6 h-6" />, history: telemetry.remainingEnergyHistory, currentValue: telemetry.remainingEnergy, accentColor: "#10b981" },
  ]

  const expandedMetrics = metrics.filter((m) => expandedCards.has(m.key))
  const collapsedMetrics = metrics.filter((m) => !expandedCards.has(m.key))

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-1/2 h-[200%] bg-gradient-to-b from-red-500/5 via-transparent to-transparent rotate-12" />
        <div className="absolute -top-1/2 right-0 w-1 h-[200%] bg-red-500/10 rotate-12" />
        <div className="absolute -top-1/2 right-8 w-1 h-[200%] bg-red-500/5 rotate-12" />
      </div>
      <div className="relative max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25">
                <Gauge className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Telemetri Dashboard</h1>
                <RecordingControls
                  isRecording={isRecording}
                  recordedRows={recordedRows}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  onResumeRecording={resumeRecording}
                  onFinishRecording={finishRecording}
                />
              </div>
              <p className="text-sm text-muted-foreground">ESTUPRJ352026</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus isOnline={telemetry.isOnline} lastDataTime={telemetry.lastDataTime} />
            <ThemeToggle />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="lg:col-span-5 xl:col-span-4 grid grid-cols-1 gap-4 md:gap-6">
            <div className="min-h-[350px]">
              <GPSMap lat={telemetry.lat} lon={telemetry.lon} history={telemetry.gpsHistory} />
            </div>
            <MPUVisualizer
              gx={telemetry.gx} gy={telemetry.gy} gz={telemetry.gz}
              ax={telemetry.ax} ay={telemetry.ay} az={telemetry.az}
              mx={telemetry.mx} my={telemetry.my} mz={telemetry.mz}
              temp={telemetry.temp}
            />
          </div>
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {expandedMetrics.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {expandedMetrics.map((metric) => (
                  <MetricCard key={metric.key} {...metric} gradientId={`${metric.key}Gradient`} isExpanded={true} onToggle={() => toggleCard(metric.key)} />
                ))}
              </div>
            )}
            {collapsedMetrics.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {collapsedMetrics.map((metric) => (
                  <MetricCard key={metric.key} {...metric} gradientId={`${metric.key}Gradient`} isExpanded={false} onToggle={() => toggleCard(metric.key)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
