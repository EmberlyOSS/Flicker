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

export function GlobalRegionOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<DragState | null>(null)
  const [monitorIndex, setMonitorIndex] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const processingRef = useRef(false)

  useEffect(() => {
    const resolve = async () => {
      try {
        const win = getCurrentWindow()
        const label = win.label

        const m = label.match(/region-overlay-(\d+)/)
        if (m) {
          setMonitorIndex(parseInt(m[1], 10))
          return
        }
      } catch {}

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

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (d?.dragging) {
      const rect = getRect(d)

      ctx.clearRect(rect.x, rect.y, rect.width, rect.height)

      ctx.strokeStyle = 'rgba(249, 115, 22, 1)'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)

      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.strokeRect(rect.x - 0.5, rect.y - 0.5, rect.width + 1, rect.height + 1)
      ctx.setLineDash([])

      const handleSize = 8
      ctx.fillStyle = 'rgba(249, 115, 22, 1)'
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

      if (rect.width > 40 && rect.height > 20) {
        const label = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
        ctx.font = 'bold 12px ui-monospace, monospace'
        const textW = ctx.measureText(label).width + 14
        const labelX = rect.x + rect.width / 2 - textW / 2
        const labelYBelow = rect.y + rect.height + 8
        const finalY = labelYBelow + 22 > canvas.height ? rect.y - 30 : labelYBelow

        ctx.fillStyle = 'rgba(194, 65, 12, 0.95)'
        ctx.beginPath()
        // @ts-ignore roundRect may not be in older lib
        if (ctx.roundRect) ctx.roundRect(labelX, finalY, textW, 20, 6)
        else ctx.fillRect(labelX, finalY, textW, 20)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, labelX + 7, finalY + 14)
      }
    }

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
    ctx.fillStyle = 'rgba(254, 215, 170, 1)'
    ctx.fillText(coordLabel, tipX + 6, tipY + 12)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const updateSize = () => {

      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

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

      try {
        const win = getCurrentWindow()
        await win.close()
      } catch {}
    }
  }, [])

  const handleSelect = useCallback(async (region: Region) => {
    console.log('[Flicker][Overlay] handleSelect region=', region, 'isTinyClick=', region.width < 5 || region.height < 5, 'monitorIndex=', monitorIndex);
    if (processingRef.current) {
      console.warn('[Flicker][Overlay] handleSelect blocked: already processing');
      return
    }
    processingRef.current = true
    setIsProcessing(true)

    const isTinyClick = region.width < 5 || region.height < 5

    try {

    let config = loadConfig()
    let token: string | null = config.uploadToken || null
    let apiUrl = config.uploadUrl || 'https://embrly.ca'
    let visibility = config.visibility || 'PUBLIC'
    let domain = config.preferredDomain || null
    if (!token) {
      try {
        const rustCfg: any = await invoke('load_config')

        token = rustCfg.upload_token || rustCfg.uploadToken || rustCfg.upload_token?.trim() || null
        apiUrl = rustCfg.upload_url || rustCfg.uploadUrl || apiUrl
        visibility = rustCfg.visibility || visibility

      } catch {}
    }
    if (!token) {
      await invoke('cancel_region_capture')
      try { await sendNotification({ title: 'Not logged in', body: 'Please log in via main window first' }) } catch {}
      return
    }

    const scale = window.devicePixelRatio || 1

      let result: any
      if (isTinyClick) {

        result = await invoke<any>('capture_window_and_upload', {
          x: region.x,
          y: region.y,
          monitorIndex,
          scaleFactor: scale,
          apiUrl,
          uploadToken: token,
          visibility,
          domain,
        })
      } else {

        result = await invoke<any>('capture_region_and_upload', {
          monitorIndex,
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          scaleFactor: scale,
          apiUrl,
          uploadToken: token,
          visibility,
          domain,
        })
      }

      if (result?.url) {
        try { await writeText(result.url) } catch {}
        console.log('Captured uploaded:', result.url)
      }
    } catch (e) {
      console.error('Region capture failed', e)
      const msg = e instanceof Error ? e.message : String(e)

      if (msg.includes('already in progress')) {
        return
      }

      try { await invoke('cancel_region_capture') } catch {}
      try { await sendNotification({ title: 'Capture failed', body: msg.slice(0, 120) }) } catch {}
    } finally {
      setIsProcessing(false)

      setTimeout(() => { processingRef.current = false }, 1200)

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

      if (processingRef.current) return
      if (!drag?.dragging) return

      if (e.button === 2) return
      e.preventDefault()
      const rect = getRect(drag)

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
