"use client"

import { Card } from "@/components/ui/card"
import { Axis3D, Thermometer } from "lucide-react"

export function MPUVisualizer({
  gx, gy, gz,
  ax, ay, az,
  mx, my, mz,
  temp
}) {
  const formatValue = (val) => {
    if (isNaN(val)) return "—"
    return val.toFixed(2)
  }

  // Gyro verilerinden 3D rotasyon hesapla
  const rotateX = Math.min(Math.max(gx * 0.5, -45), 45)
  const rotateY = Math.min(Math.max(gy * 0.5, -45), 45)
  const rotateZ = Math.min(Math.max(gz * 0.5, -45), 45)

  return (
    <Card className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-lg h-full">
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-cyan-500 to-transparent" />
      <div className="relative p-4 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
              <Axis3D className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">MPU Sensor</h3>
              <p className="text-xs text-muted-foreground">Gyro / Ivme / Manyetik</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Thermometer className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-semibold text-orange-500 tabular-nums">
              {formatValue(temp)}°C
            </span>
          </div>
        </div>

        {/* 3D Visualization */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <div 
            className="relative w-32 h-32"
            style={{ perspective: "400px" }}
          >
            <div
              className="absolute inset-0 rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/5"
              style={{
                transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
                transformStyle: "preserve-3d",
                transition: "transform 0.1s ease-out",
              }}
            >
              {/* X Axis */}
              <div className="absolute top-1/2 left-1/2 w-16 h-0.5 bg-red-500 origin-left" style={{ transform: "translateY(-50%)" }}>
                <span className="absolute -right-4 -top-2 text-[10px] font-bold text-red-500">X</span>
              </div>
              {/* Y Axis */}
              <div className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-emerald-500 origin-top" style={{ transform: "translateX(-50%)" }}>
                <span className="absolute -bottom-4 -left-1 text-[10px] font-bold text-emerald-500">Y</span>
              </div>
              {/* Z Axis (simulated) */}
              <div className="absolute top-1/2 left-1/2 w-10 h-0.5 bg-blue-500 origin-left" style={{ transform: "rotate(-45deg) translateY(-50%)" }}>
                <span className="absolute -right-3 -top-2 text-[10px] font-bold text-blue-500">Z</span>
              </div>
              {/* Center */}
              <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50" />
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Gyro */}
          <div className="bg-secondary/50 rounded-lg p-2">
            <div className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              GYRO
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">X</span>
                <span className="font-mono text-foreground">{formatValue(gx)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Y</span>
                <span className="font-mono text-foreground">{formatValue(gy)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Z</span>
                <span className="font-mono text-foreground">{formatValue(gz)}</span>
              </div>
            </div>
          </div>

          {/* Accelerometer */}
          <div className="bg-secondary/50 rounded-lg p-2">
            <div className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              IVME
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">X</span>
                <span className="font-mono text-foreground">{formatValue(ax)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Y</span>
                <span className="font-mono text-foreground">{formatValue(ay)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Z</span>
                <span className="font-mono text-foreground">{formatValue(az)}</span>
              </div>
            </div>
          </div>

          {/* Magnetometer */}
          <div className="bg-secondary/50 rounded-lg p-2">
            <div className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              MAG
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">X</span>
                <span className="font-mono text-foreground">{formatValue(mx)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Y</span>
                <span className="font-mono text-foreground">{formatValue(my)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Z</span>
                <span className="font-mono text-foreground">{formatValue(mz)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
