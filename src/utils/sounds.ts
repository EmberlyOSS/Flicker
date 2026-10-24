export type SoundName = 'uploadSuccess' | 'uploadError' | 'copyLink' | 'settingsSave' | 'notification' | 'capture'

export interface SoundPreferences {
  enabled: boolean
  uploadSuccess: boolean
  uploadError: boolean
  copyLink: boolean
  settingsSave: boolean
  notification: boolean
  capture: boolean
}

export const SOUND_STORAGE_KEY = 'emberly_sound_prefs'

export const DEFAULT_SOUND_PREFS: SoundPreferences = {
  enabled: true,
  uploadSuccess: true,
  uploadError: true,
  copyLink: true,
  settingsSave: true,
  notification: true,
  capture: true,
}

export function loadSoundPrefs(): SoundPreferences {
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY)
    return stored ? { ...DEFAULT_SOUND_PREFS, ...JSON.parse(stored) } : DEFAULT_SOUND_PREFS
  } catch {
    return DEFAULT_SOUND_PREFS
  }
}

let ctx: AudioContext | null = null
let output: AudioNode | null = null

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.ratio.value = 6
    const master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(limiter)
    limiter.connect(ctx.destination)
    output = master
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return { ctx, out: output! }
}

function tone(freq: number, start: number, length: number, { type = 'sine' as OscillatorType, volume = 0.3, glideTo = 0, attack = 0.005 } = {}) {
  const { ctx, out } = audio()
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + length)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain)
  gain.connect(out)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

function bell(freq: number, start: number, length: number, volume: number) {
  tone(freq, start, length, { type: 'sine', volume })
  tone(freq * 2.01, start, length * 0.5, { type: 'sine', volume: volume * 0.25 })
  tone(freq * 3.02, start, length * 0.25, { type: 'triangle', volume: volume * 0.08 })
}

function noiseBurst(start: number, length: number, volume: number, cutoff: number) {
  const { ctx, out } = audio()
  const t = ctx.currentTime + start
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  src.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.value = cutoff
  filter.Q.value = 0.9
  gain.gain.value = volume
  src.connect(filter)
  filter.connect(gain)
  gain.connect(out)
  src.start(t)
}

const SOUNDS: Record<SoundName, () => void> = {
  uploadSuccess: () => {
    bell(784, 0, 0.55, 0.22)
    bell(1175, 0.09, 0.8, 0.2)
  },
  uploadError: () => {
    tone(392, 0, 0.22, { type: 'triangle', volume: 0.22 })
    tone(294, 0.14, 0.38, { type: 'triangle', volume: 0.2, glideTo: 262 })
  },
  copyLink: () => {
    tone(1400, 0, 0.07, { volume: 0.18, glideTo: 900 })
    tone(2100, 0.035, 0.06, { volume: 0.06 })
  },
  settingsSave: () => {
    bell(988, 0, 0.3, 0.16)
  },
  notification: () => {
    bell(880, 0, 0.35, 0.16)
    bell(1319, 0.11, 0.45, 0.14)
  },
  capture: () => {
    noiseBurst(0, 0.045, 0.5, 3200)
    noiseBurst(0.07, 0.06, 0.35, 1800)
    tone(180, 0, 0.06, { volume: 0.1 })
  },
}

export function playSound(name: SoundName, { force = false } = {}) {
  const prefs = loadSoundPrefs()
  if (!force && (!prefs.enabled || !prefs[name])) return
  try {
    SOUNDS[name]()
  } catch {}
}
