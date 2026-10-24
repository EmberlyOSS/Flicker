import { ClipboardFormat } from '../types'

export function formatForClipboard(url: string, name: string, format: ClipboardFormat = 'url'): string {
  switch (format) {
    case 'raw-url':
      return url.endsWith('/raw') ? url : `${url}/raw`
    case 'markdown':
      return `![${name}](${url})`
    case 'html':
      return `<img src="${url}" alt="${name}">`
    case 'url':
    default:
      return url
  }
}
