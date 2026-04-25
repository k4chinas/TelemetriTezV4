"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts"

export function MetricCard({
  label,
  unit,
  icon,
  currentValue,
  history,
  accentColor,
  gradientId,
  decimals = 1,
  isExpanded,
  onToggle,
}) {
  const average = useMemo(() => {
    if (history.length === 0) return 0
    const validValues = history.filter((h) => h.value > 0)
    if (validValues.length === 0) return 0
    return validValues.reduce((sum, h) => sum + h.value, 0) / validValues.length
  }, [history])

  const formatValue = (val) => {
    if (val === 0 || isNaN(val)) return "—"
    return val.toFixed(decimals)
  }

  // Genisletilmis grafik gorünümü
  if (isExpanded) {
    return (
      <Card className="relative overflow-hidden border-0 bg-card/90 backdrop-blur-xl shadow-xl col-span-1 sm:col-span-2 xl:col-span-3">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 opacity-90"
          style={{ backgroundColor: accentColor }}
        />
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <div style={{ color: accentColor }}>{icon}</div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{label}</h3>
                <p className="text-xs text-muted-foreground">Canli Grafik Analizi</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {formatValue(currentValue)}
                  </span>
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
                  <span className="text-xs text-muted-foreground">AVG</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatValue(average)}
                  </span>
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle()
                }}
                className="w-9 h-9 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="flex sm:hidden items-center gap-3 mb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatValue(currentValue)}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50">
              <span className="text-xs text-muted-foreground">AVG</span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {formatValue(average)}
              </span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`${gradientId}-expanded`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  width={45}
                />
                <ReferenceLine 
                  y={average} 
                  stroke={accentColor} 
                  strokeDasharray="5 5" 
                  strokeOpacity={0.6}
                  label={{ 
                    value: `AVG: ${formatValue(average)}`, 
                    fill: accentColor,
                    fontSize: 10,
                    position: 'right'
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    padding: "10px",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: "bold" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accentColor}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId}-expanded)`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    )
  }

  // Kart görünümü
  return (
    <Card
      onClick={onToggle}
      className="relative overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
    >
      <div
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
        style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-1 opacity-80"
        style={{ backgroundColor: accentColor }}
      />
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <div style={{ color: accentColor }}>{icon}</div>
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {formatValue(currentValue)}
            </span>
            <span className="text-lg text-muted-foreground">{unit}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ortalama:</span>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {formatValue(average)} {unit}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
