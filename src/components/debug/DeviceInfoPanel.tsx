import { useState, useEffect } from 'react'
import { RefreshCw, Copy, Check } from 'lucide-react'
import { useAudit } from '../../hooks/useAudit'

export function DeviceInfoPanel() {
    const { deviceInfo, loadDeviceInfo } = useAudit()
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        loadDeviceInfo()
    }, [loadDeviceInfo])

    const handleRefresh = async () => {
        setLoading(true)
        await loadDeviceInfo()
        setLoading(false)
    }

    const handleCopy = () => {
        if (!deviceInfo) return
        navigator.clipboard.writeText(JSON.stringify(deviceInfo, null, 2))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!deviceInfo) {
        return (
            <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Load device information
            </button>
        )
    }

    const items = [
        { label: 'Operating system', value: `${deviceInfo.os_name ?? ''} ${deviceInfo.os_version ?? ''}`.trim() },
        { label: 'Architecture', value: deviceInfo.architecture },
        { label: 'CPU cores', value: String(deviceInfo.cpu_count ?? '') },
        { label: 'Available memory', value: deviceInfo.available_memory_mb ? `${(deviceInfo.available_memory_mb / 1024).toFixed(1)} GB` : '' },
        { label: 'Flicker version', value: deviceInfo.app_version },
        { label: 'Data folder', value: deviceInfo.app_data_dir },
    ]

    return (
        <div className="space-y-2">
            <div className="flex justify-end gap-1">
                <button onClick={handleRefresh} disabled={loading} title="Refresh" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={handleCopy} title="Copy as JSON" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
            </div>
            <dl className="divide-y divide-border/60 rounded-lg border border-border/60 text-xs">
                {items.map(item => (
                    <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2">
                        <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
                        <dd className="truncate font-mono text-foreground" title={item.value}>{item.value || '—'}</dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}
