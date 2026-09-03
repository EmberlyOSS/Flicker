import { useEffect, useRef, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { loadConfig } from '../../config'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

interface DragState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  dragging: boolean
}

function getRect(d: DragState): Region {
  const x = Math.min(d.startX, d.currentX)
  const y = Math.min(d.startY, d.currentY)
  const width = Math.abs(d.currentX - d.startX)
  const height = Math.abs(d.currentY - d.startY)
  return { x, y, width, height }
}

/**
 * Global region overlay - runs in its own transparent fullscreen window (region-overlay-*)
 * Works system-wide even when main app is hidden/backgrounded.
 * Each monitor gets its own overlay window; selection is per-monitor.
 */
export function GlobalRegionOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<DragState | null>(null)
  const [monitorIndex, setMonitorIndex] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  // Synchronous guard to prevent double-invoke (fixes “billion uploads” — state is async, ref is sync)
  const processingRef = useRef(false)

  // Resolve monitor index from window label or URL query
  useEffect(() => {
    const resolve = async () => {
      try {
        const win = getCurrentWindow()
        const label = win.label
        // label is like "region-overlay-0"
        const m = label.match(/region-overlay-(\d+)/)
        if (m) {
          setMonitorIndex(parseInt(m[1], 10))
          return
        }
      } catch {}
      // Fallback to query param
      const params = new URLSearchParams(window.location.search)
      const q = params.get('monitor')
      if (q) setMonitorIndex(parseInt(q, 10) || 0)
    }
    resolve()
  }, [])

  useEffect(() => {
    dragRef.current = drag
  }, [drag])

  const draw = useCallback((d: DragState | null, mx: number, my: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dark overlay - semi-transparent to still see what's behind
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (d?.dragging) {
      const rect = getRect(d)

      // Cut out selected region (clear to reveal desktop behind)
      // Use destination-out to punch hole, but clearRect works since we just filled
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height)

      // Subtle border around selection
      ctx.strokeStyle = 'rgba(99, 102, 241, 1)'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)

      // Dashed outer border for contrast
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.strokeRect(rect.x - 0.5, rect.y - 0.5, rect.width + 1, rect.height + 1)
      ctx.setLineDash([])

      // Corner handles
      const handleSize = 8
      ctx.fillStyle = 'rgba(99, 102, 241, 1)'
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1
      const corners: [number, number][] = [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x, rect.y + rect.height],
        [rect.x + rect.width, rect.y + rect.height],
      ]
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
        ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
      }

      // Dimension label
      if (rect.width > 40 && rect.height > 20) {
        const label = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
        ctx.font = 'bold 12px ui-monospace, monospace'
        const textW = ctx.measureText(label).width + 14
        const labelX = rect.x + rect.width / 2 - textW / 2
        const labelYBelow = rect.y + rect.height + 8
        const finalY = labelYBelow + 22 > canvas.height ? rect.y - 30 : labelYBelow

        ctx.fillStyle = 'rgba(79, 70, 229, 0.95)'
        ctx.beginPath()
        // @ts-ignore roundRect may not be in older lib
        if (ctx.roundRect) ctx.roundRect(labelX, finalY, textW, 20, 6)
        else ctx.fillRect(labelX, finalY, textW, 20)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, labelX + 7, finalY + 14)
      }
    }

    // Crosshair lines (thinner, follow cursor)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, my)
    ctx.lineTo(canvas.width, my)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(mx, 0)
    ctx.lineTo(mx, canvas.height)
    ctx.stroke()
    ctx.setLineDash([])

    // Coordinate tooltip near cursor
    const coordLabel = `${Math.round(mx)}, ${Math.round(my)}`
    ctx.font = '11px ui-monospace, monospace'
    const cw = ctx.measureText(coordLabel).width + 12
    let tipX = mx + 16
    let tipY = my + 16
    if (tipX + cw > canvas.width) tipX = mx - cw - 8
    if (tipY + 18 > canvas.height) tipY = my - 26

    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.beginPath()
    // @ts-ignore
    if (ctx.roundRect) ctx.roundRect(tipX, tipY, cw, 18, 4)
    else ctx.fillRect(tipX, tipY, cw, 18)
    ctx.fill()
    ctx.fillStyle = 'rgba(200, 210, 255, 1)'
    ctx.fillText(coordLabel, tipX + 6, tipY + 12)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const updateSize = () => {
      // Use physical pixel ratio for crisp rendering
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      // But our draw expects logical coordinates, so we reset transform handling:
      // Simpler: keep canvas logical size and let CSS handle scaling; we already scale context
      // So we need to adjust draw to use logical sizes.
      // For now revert to logical: set width/height to innerWidth/innerHeight without dpr scaling
      // to avoid double scaling confusion with capture.
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // Reset scale
      const ctx2 = canvas.getContext('2d')
      if (ctx2) ctx2.setTransform(1, 0, 0, 1, 0, 0)
      draw(dragRef.current, mousePos.x, mousePos.y)
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [draw, mousePos])

  useEffect(() => {
    draw(drag, mousePos.x, mousePos.y)
  }, [drag, mousePos, draw])

  const handleCancel = useCallback(async () => {
    if (processingRef.current) return
    try {
      await invoke('cancel_region_capture')
    } catch (e) {
      console.error('Cancel failed', e)
      // Fallback: close this window directly
      try {
        const win = getCurrentWindow()
        await win.close()
      } catch {}
    }
  }, [])

  const handleSelect = useCallback(async (region: Region) => {
    if (processingRef.current) return
    processingRef.current = true
    setIsProcessing(true)

    const isTinyClick = region.width < 5 || region.height < 5

    try {
      const config = loadConfig()
      if (!config.uploadToken) {
        await invoke('cancel_region_capture')
        try { await sendNotification({ title: 'Not logged in', body: 'Please log in via main window first' }) } catch {}
        return
      }

      const scale = window.devicePixelRatio || 1

      // Single click without drag → capture the window under cursor (fixes Helium tabs not captured)
      // Drag → capture the selected region
      let result: any
      if (isTinyClick) {
        // Use window capture which includes full window chrome (tabs, title bar) via screencapture -R
        result = await invoke<any>('capture_window_and_upload', {
          x: region.x,
          y: region.y,
          monitorIndex,
          scaleFactor: scale,
          apiUrl: config.uploadUrl || 'https://embrly.ca',
          uploadToken: config.uploadToken,
          visibility: config.visibility || 'PUBLIC',
          domain: config.preferredDomain || null,
        })
      } else {
        // Use combined capture+upload command (handles closing overlay before capture internally)
        // Guarded in Rust via REGION_CAPTURING AtomicBool — prevents “billion uploads” on rapid triggers
        result = await invoke<any>('capture_region_and_upload', {
          monitorIndex,
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          scaleFactor: scale,
          apiUrl: config.uploadUrl || 'https://embrly.ca',
          uploadToken: config.uploadToken,
          visibility: config.visibility || 'PUBLIC',
          domain: config.preferredDomain || null,
        })
      }

      // Success: Rust already did clipboard + OS notification + history (works even when app hidden)
      if (result?.url) {
        try { await writeText(result.url) } catch {}
        console.log('Captured uploaded:', result.url)
      }
    } catch (e) {
      console.error('Region capture failed', e)
      const msg = e instanceof Error ? e.message : String(e)
      // Ignore “already in progress” — it’s the guard preventing spam
      if (msg.includes('already in progress')) {
        return
      }
      // Still try to close overlay
      try { await invoke('cancel_region_capture') } catch {}
      try { await sendNotification({ title: 'Capture failed', body: msg.slice(0, 120) }) } catch {}
    } finally {
      setIsProcessing(false)
      // Keep ref true for a short cooldown to absorb duplicate mouseUp events (fixes spam)
      setTimeout(() => { processingRef.current = false }, 1200)
      // Ensure overlay closes; if Rust didn't close (error case), close this window
      try {
        const win = getCurrentWindow()
        setTimeout(async () => {
          try { await win.close() } catch {}
        }, 600)
      } catch {}
    }
  }, [monitorIndex])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setDrag(prev => (prev?.dragging ? { ...prev, currentX: e.clientX, currentY: e.clientY } : prev))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Left click only for selection; right click cancels (ShareX behavior)
    if (e.button === 2) {
      e.preventDefault()
      handleCancel()
      return
    }
    if (e.button !== 0) return
    e.preventDefault()
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      dragging: true,
    })
  }, [handleCancel])

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Guard against double-fire (canvas + window) and spam
      if (processingRef.current) return
      if (!drag?.dragging) return
      // Right button already handled
      if (e.button === 2) return
      e.preventDefault()
      const rect = getRect(drag)
      // Reset visual state immediately — but keep drag ref until handleSelect completes
      setDrag(null)
      handleSelect(rect)
    },
    [drag, handleSelect]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    handleCancel()
  }, [handleCancel])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleCancel]
  )

  useEffect(() => {
    const preventContext = (e: MouseEvent) => e.preventDefault()
    const handleGlobalContext = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        handleCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    // Also handle right-click outside canvas (instruction banner area)
    window.addEventListener('contextmenu', preventContext)
    window.addEventListener('mouseup', handleGlobalContext as unknown as EventListener)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', preventContext)
      window.removeEventListener('mouseup', handleGlobalContext as unknown as EventListener)
    }
  }, [handleKeyDown, handleCancel])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        cursor: 'crosshair',
        userSelect: 'none',
        background: 'transparent',
      }}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', background: 'transparent' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />

      {/* Top instruction - hidden while dragging */}
      {!drag?.dragging && !isProcessing && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.72)',
            color: '#e2e8f0',
            padding: '9px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontWeight: 500 }}>Drag to select region</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ opacity: 0.8 }}>Click to capture screen</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <kbd
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderBottomColor: 'rgba(255,255,255,0.08)',
              borderRadius: 5,
              padding: '2px 7px',
              fontSize: 11,
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
            }}
          >
            Esc
          </kbd>
          <span style={{ opacity: 0.5, fontSize: 11 }}>or right-click to cancel</span>
        </div>
      )}

      {isProcessing && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '16px 28px',
            borderRadius: 12,
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          Capturing...
        </div>
      )}

      {/* Cancel button */}
      {!isProcessing && (
        <button
          onClick={handleCancel}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            background: 'rgba(0,0,0,0.62)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
          }}
        >
          ✕ Cancel
        </button>
      )}

      {/* Monitor indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'rgba(0,0,0,0.55)',
          color: 'rgba(255,255,255,0.7)',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        Screen {monitorIndex + 1}
      </div>
    </div>
  )
}
