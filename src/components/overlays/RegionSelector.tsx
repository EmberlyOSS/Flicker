import { useEffect, useRef, useState, useCallback } from 'react'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

interface RegionSelectorProps {
  onSelect: (region: Region) => void
  onCancel: () => void
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

export function RegionSelector({ onSelect, onCancel }: RegionSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const dragRef = useRef<DragState | null>(null)

  // Keep dragRef in sync so draw loop always has latest state
  useEffect(() => {
    dragRef.current = drag
  }, [drag])

  const draw = useCallback((d: DragState | null, mx: number, my: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (d?.dragging) {
      const rect = getRect(d)

      // Cut out the selected region (make it visible)
      ctx.clearRect(rect.x, rect.y, rect.width, rect.height)

      // Border around selection
      ctx.strokeStyle = 'rgba(99, 102, 241, 1)'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)

      // Corner handles
      const handleSize = 7
      ctx.fillStyle = 'rgba(99, 102, 241, 1)'
      const corners: [number, number][] = [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x, rect.y + rect.height],
        [rect.x + rect.width, rect.y + rect.height],
      ]
      for (const [cx, cy] of corners) {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize)
      }

      // Dimension label
      if (rect.width > 40 && rect.height > 20) {
        const label = `${Math.round(rect.width)} × ${Math.round(rect.height)}`
        ctx.font = 'bold 12px ui-monospace, monospace'
        const textW = ctx.measureText(label).width + 14
        const labelX = rect.x + rect.width / 2 - textW / 2
        const labelYBelow = rect.y + rect.height + 6
        const finalY = labelYBelow + 22 > canvas.height ? rect.y - 28 : labelYBelow

        ctx.fillStyle = 'rgba(79, 70, 229, 0.92)'
        ctx.beginPath()
        ctx.roundRect(labelX, finalY, textW, 20, 4)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, labelX + 7, finalY + 14)
      }
    }

    // Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
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

    ctx.fillStyle = 'rgba(0,0,0,0.72)'
    ctx.beginPath()
    ctx.roundRect(tipX, tipY, cw, 18, 3)
    ctx.fill()
    ctx.fillStyle = 'rgba(200, 210, 255, 1)'
    ctx.fillText(coordLabel, tipX + 6, tipY + 13)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      draw(dragRef.current, mousePos.x, mousePos.y)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw, mousePos])

  // Redraw on state changes
  useEffect(() => {
    draw(drag, mousePos.x, mousePos.y)
  }, [drag, mousePos, draw])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY })
    setDrag(prev =>
      prev?.dragging ? { ...prev, currentX: e.clientX, currentY: e.clientY } : prev
    )
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      dragging: true,
    })
  }, [])

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drag?.dragging) return
      e.preventDefault()
      const rect = getRect(drag)
      // Ignore tiny accidental clicks
      if (rect.width < 5 || rect.height < 5) {
        setDrag(null)
        return
      }
      onSelect(rect)
    },
    [drag, onSelect]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    },
    [onCancel]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        cursor: 'crosshair',
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />

      {/* Instruction banner — only shown before dragging */}
      {!drag?.dragging && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.72)',
            color: '#e2e8f0',
            padding: '8px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span>Click and drag to select a region</span>
          <kbd
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            Esc
          </kbd>
          <span style={{ opacity: 0.6, fontSize: 11 }}>to cancel</span>
        </div>
      )}

      {/* Cancel button */}
      <button
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0,0,0,0.6)',
          color: '#e2e8f0',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: '6px 14px',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          backdropFilter: 'blur(8px)',
        }}
      >
        ✕ Cancel
      </button>
    </div>
  )
}
