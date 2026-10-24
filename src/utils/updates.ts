import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { APP_VERSION } from '../constants'
import { logActivity } from './consoleBuffer'

const RELEASES_API = 'https://api.github.com/repos/EmberlyOSS/Flicker/releases/latest'
const RELEASES_PAGE = 'https://github.com/EmberlyOSS/Flicker/releases'

export interface AvailableUpdate {
  version: string
  notes?: string
  url: string
  canInstall: boolean
}

let signedUpdate: Update | null = null
let lastResult: AvailableUpdate | null = null

export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^.*?v(?=\d)/, '').split(/[.-]/).map(p => parseInt(p, 10) || 0)
  const [x, y] = [parse(a), parse(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function cachedUpdate() {
  return lastResult
}

export async function findUpdate(): Promise<AvailableUpdate | null> {
  try {
    const update = await check()
    if (update) {
      signedUpdate = update
      lastResult = { version: update.version, notes: update.body, url: `${RELEASES_PAGE}/latest`, canInstall: true }
      logActivity('update_check', `Update available: v${update.version}`)
      return lastResult
    }
  } catch {}

  const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`)
  const release = (await res.json()) as { tag_name: string; body?: string; html_url: string }
  const version = release.tag_name.replace(/^.*?v(?=\d)/, '')

  lastResult = compareVersions(version, APP_VERSION) > 0
    ? { version, notes: release.body, url: release.html_url, canInstall: false }
    : null
  logActivity('update_check', lastResult ? `Update available: v${version}` : `Up to date (v${APP_VERSION})`)
  return lastResult
}

export async function installUpdate(onProgress: (percent: number) => void): Promise<void> {
  if (!signedUpdate) throw new Error('No installable update')
  let downloaded = 0
  let total = 0
  await signedUpdate.downloadAndInstall(event => {
    if (event.event === 'Started') total = event.data.contentLength ?? 0
    if (event.event === 'Progress') {
      downloaded += event.data.chunkLength
      if (total > 0) onProgress(Math.round((downloaded / total) * 100))
    }
    if (event.event === 'Finished') onProgress(100)
  })
  logActivity('update_install', `Installed v${signedUpdate.version}`)
  await relaunch()
}
