"use client"

import { useState } from "react"
import { Circle, Square, Play, CheckCircle, Database } from "lucide-react"
import { cn } from "@/lib/utils"

export function RecordingControls({
  isRecording,
  recordedRows,
  onStartRecording,
  onStopRecording,
  onResumeRecording,
  onFinishRecording,
}) {
  const [isPaused, setIsPaused] = useState(false)

  const handleStop = () => {
    setIsPaused(true)
    onStopRecording()
  }

  const handleResume = () => {
    setIsPaused(false)
    onResumeRecording()
  }

  const handleFinish = () => {
    setIsPaused(false)
    onFinishRecording()
  }

  const handleStart = () => {
    setIsPaused(false)
    onStartRecording()
  }

  // Kayit baslatilmamis
  if (!isRecording && !isPaused) {
    return (
      <button
        onClick={handleStart}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all duration-300 group"
      >
        <Circle className="w-4 h-4 text-red-500 fill-red-500 group-hover:animate-pulse" />
        <span className="text-sm font-medium text-red-500">Kaydi Baslat</span>
      </button>
    )
  }

  // Kayit duraklatilmis - devam et veya bitir secenekleri
  if (isPaused && recordedRows > 0) {
    return (
      <div className="flex items-center gap-3">
        {/* Kayit Durumu - Duraklatilmis */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-mono font-bold text-amber-500">
              {recordedRows.toLocaleString("tr-TR")}
            </span>
            <span className="text-xs text-amber-400">satir</span>
          </div>
        </div>

        {/* Kayda Devam Et */}
        <button
          onClick={handleResume}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
            "bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
          )}
        >
          <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
          <span className="text-sm font-medium text-emerald-500">Devam Et</span>
        </button>

        {/* Kaydi Bitir */}
        <button
          onClick={handleFinish}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
            "bg-primary/10 border border-primary/30 hover:bg-primary/20"
          )}
        >
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Bitir ve Indir</span>
        </button>
      </div>
    )
  }

  // Kayit devam ediyor
  return (
    <div className="flex items-center gap-3">
      {/* Kayit Durumu */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
        <div className="relative">
          <Circle className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-red-400" />
          <span className="text-sm font-mono font-bold text-red-500">
            {recordedRows.toLocaleString("tr-TR")}
          </span>
          <span className="text-xs text-red-400">satir</span>
        </div>
      </div>

      {/* Kaydi Durdur */}
      <button
        onClick={handleStop}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
          "bg-secondary/80 border border-border hover:bg-secondary"
        )}
      >
        <Square className="w-4 h-4 text-foreground fill-foreground" />
        <span className="text-sm font-medium text-foreground">Durdur</span>
      </button>
    </div>
  )
}
