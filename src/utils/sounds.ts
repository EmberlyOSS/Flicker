/**
 * Sound effects utility using Web Audio API
 * Creates fun audio feedback for app events
 */

interface AudioContextType {
  ctx: AudioContext | null
}

const audioState: AudioContextType = {
  ctx: null
}

function getAudioContext(): AudioContext {
  if (!audioState.ctx) {
    audioState.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioState.ctx
}

export function playSuccessSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const notes = [523.25, 659.25, 783.99]
    const duration = 0.15

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'sine'

      gain.gain.setValueAtTime(0.3, now + index * duration)
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * duration + duration)

      osc.start(now + index * duration)
      osc.stop(now + index * duration + duration)
    })
  } catch (e) {
    console.debug('Sound playback not available')
  }
}

export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const notes = [523.25, 330.0]
    const duration = 0.2

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'sine'

      gain.gain.setValueAtTime(0.3, now + index * duration)
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * duration + duration)

      osc.start(now + index * duration)
      osc.stop(now + index * duration + duration)
    })
  } catch (e) {
    console.debug('Sound playback not available')
  }
}

export function playCopySound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const duration = 0.1

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = 800
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

    osc.start(now)
    osc.stop(now + duration)
  } catch (e) {
    console.debug('Sound playback not available')
  }
}

export function playClickSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const duration = 0.08

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = 600 + i * 100
      osc.type = 'sine'

      gain.gain.setValueAtTime(0.2, now + i * duration * 0.6)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * duration * 0.6 + duration * 0.5)

      osc.start(now + i * duration * 0.6)
      osc.stop(now + i * duration * 0.6 + duration * 0.5)
    }
  } catch (e) {
    console.debug('Sound playback not available')
  }
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const duration = 0.12

    const notes = [659.25, 659.25, 783.99]
    const timing = [0, 150, 100]

    let currentTime = 0
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = freq
      osc.type = 'sine'

      const startTime = now + currentTime / 1000
      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      osc.start(startTime)
      osc.stop(startTime + duration)

      currentTime += timing[index]
    })
  } catch (e) {
    console.debug('Sound playback not available')
  }
}
