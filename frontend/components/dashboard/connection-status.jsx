"use client"

import { Wifi, WifiOff, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export function ConnectionStatus({ isOnline, lastDataTime }) {
  const formatLastDataTime = () => {
    if (!lastDataTime) return null
    const date = new Date(lastDataTime)
    const dateStr = date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const timeStr = date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    return { dateStr, timeStr }
  }

  const lastData = formatLastDataTime()

  return (
    <div className="flex items-center gap-3">
      {/* Son Veri Zamani */}
      {lastData && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Son Veri:</span>
            <span className="font-mono text-foreground">{lastData.timeStr}</span>
            <span className="text-muted-foreground/50">|</span>
            <span className="font-mono text-muted-foreground">{lastData.dateStr}</span>
          </div>
        </div>
      )}

      {/* Baglanti Durumu */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border transition-all duration-500",
          isOnline
            ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            : "bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
        )}
      >
        <div className="relative">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )}
          />
        </div>
        <span
          className={cn(
            "text-sm font-semibold",
            isOnline ? "text-emerald-500" : "text-red-500"
          )}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  )
}
