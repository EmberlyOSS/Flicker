import { useState, useEffect, useRef, useCallback } from 'react'
import { Keyboard, X, RotateCcw } from 'lucide-react'

interface HotkeyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

// Map browser key codes to Tauri shortcut format
const KEY_MAP: Record<string, string> = {
  'Control': 'Control',
  'Shift': 'Shift',
  'Alt': 'Alt',
  'Meta': 'Super', // Windows key
  'PrintScreen': 'PrintScreen',
  'Escape': 'Escape',
  'Enter': 'Return',
  'Backspace': 'Backspace',
  'Tab': 'Tab',
  'Space': 'Space',
  'ArrowUp': 'Up',
  'ArrowDown': 'Down',
  'ArrowLeft': 'Left',
  'ArrowRight': 'Right',
  'Delete': 'Delete',
  'Insert': 'Insert',
  'Home': 'Home',
  'End': 'End',
  'PageUp': 'PageUp',
  'PageDown': 'PageDown',
  // F keys
  'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
  'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
  'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
}

// Modifiers in order they should appear
const MODIFIER_ORDER = ['Control', 'Shift', 'Alt', 'Super']

function normalizeKey(key: string, code: string): string | null {
  // Handle modifiers - they shouldn't be standalone
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
    return null // We handle modifiers separately
  }
  
  // Check key map
  if (KEY_MAP[key]) return KEY_MAP[key]
  
  // Single letter/number keys
  if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
    return key.toUpperCase()
  }
  
  // Numpad keys
  if (code.startsWith('Numpad')) {
    return code.replace('Numpad', 'Num')
  }
  
  // Special characters
  const specialKeys: Record<string, string> = {
    ';': 'Semicolon',
    '=': 'Equal',
    ',': 'Comma',
    '-': 'Minus',
    '.': 'Period',
    '/': 'Slash',
    '`': 'Backquote',
    '[': 'BracketLeft',
    '\\': 'Backslash',
    ']': 'BracketRight',
    "'": 'Quote',
  }
  if (specialKeys[key]) return specialKeys[key]
  
  return null
}

export function HotkeyInput({ value, onChange, placeholder, disabled }: HotkeyInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [currentKeys, setCurrentKeys] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  const buildShortcut = useCallback((modifiers: string[], key: string | null): string => {
    // Sort modifiers in standard order
    const sortedMods = MODIFIER_ORDER.filter(m => modifiers.includes(m))
    if (key) {
      return [...sortedMods, key].join('+')
    }
    return sortedMods.join('+')
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return
    
    e.preventDefault()
    e.stopPropagation()

    const modifiers: string[] = []
    if (e.ctrlKey) modifiers.push('Control')
    if (e.shiftKey) modifiers.push('Shift')
    if (e.altKey) modifiers.push('Alt')
    if (e.metaKey) modifiers.push('Super')

    const mainKey = normalizeKey(e.key, e.code)
    
    // Update current keys display
    const newKeys = new Set(modifiers)
    if (mainKey) newKeys.add(mainKey)
    setCurrentKeys(newKeys)
    
    // Only save if we have at least one modifier and a non-modifier key
    if (modifiers.length > 0 && mainKey) {
      const shortcut = buildShortcut(modifiers, mainKey)
      onChange(shortcut)
      setIsRecording(false)
      inputRef.current?.blur()
    }
  }, [isRecording, onChange, buildShortcut])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return
    
    // Clear keys on all key releases
    setCurrentKeys(new Set())
  }, [isRecording])

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown, true)
      window.addEventListener('keyup', handleKeyUp, true)
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true)
        window.removeEventListener('keyup', handleKeyUp, true)
      }
    }
  }, [isRecording, handleKeyDown, handleKeyUp])

  const startRecording = () => {
    if (disabled) return
    setIsRecording(true)
    setCurrentKeys(new Set())
  }

  const stopRecording = () => {
    setIsRecording(false)
    setCurrentKeys(new Set())
  }

  const clearHotkey = () => {
    onChange('')
    setIsRecording(false)
    setCurrentKeys(new Set())
  }

  const displayValue = isRecording
    ? (currentKeys.size > 0 ? Array.from(currentKeys).join(' + ') : 'Press keys...')
    : (value || placeholder || 'Click to record')

  return (
    <div className="relative">
      <div
        ref={inputRef as any}
        onClick={startRecording}
        onBlur={stopRecording}
        tabIndex={0}
        className={`
          w-full px-4 py-2.5 bg-background border rounded-lg text-sm
          flex items-center justify-between gap-2 cursor-pointer
          transition-all duration-200
          ${isRecording 
            ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
            : 'border-input hover:border-primary/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1">
          <Keyboard size={16} className={isRecording ? 'text-primary' : 'text-muted-foreground'} />
          <span className={`
            ${isRecording ? 'text-primary animate-pulse' : value ? 'text-foreground' : 'text-muted-foreground'}
          `}>
            {displayValue}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {value && !isRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearHotkey()
              }}
              className="p-1 hover:bg-secondary/50 rounded transition-colors"
              title="Clear hotkey"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
          {isRecording && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                stopRecording()
              }}
              className="p-1 hover:bg-secondary/50 rounded transition-colors"
              title="Cancel"
            >
              <RotateCcw size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      
      {isRecording && (
        <p className="text-xs text-primary mt-1 animate-pulse">
          Press a key combination (e.g., Ctrl+Shift+S)
        </p>
      )}
    </div>
  )
}

// Display a hotkey in a nice badge format
export function HotkeyBadge({ shortcut, className }: { shortcut: string; className?: string }) {
  if (!shortcut) return null
  
  const keys = shortcut.split('+')
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {keys.map((key, i) => (
        <span key={i}>
          <kbd className="px-2 py-0.5 text-xs font-mono bg-secondary/50 border border-border rounded">
            {key}
          </kbd>
          {i < keys.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
        </span>
      ))}
    </div>
  )
}
