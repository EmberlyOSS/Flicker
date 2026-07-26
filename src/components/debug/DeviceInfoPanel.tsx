import { useState, useEffect } from 'react'
import { Monitor, Cpu, HardDrive, RefreshCw, Copy, Check } from 'lucide-react'
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
        if (deviceInfo) {
            navigator.clipboard.writeText(JSON.stringify(deviceInfo, null, 2))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (!deviceInfo) {
        return (
            <div className="p-4 text-center glass-card">
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-secondary/50 rounded-lg text-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Load Device Info
                </button>
            </div>
        )
    }

    const items = [
        { icon: Monitor, label: 'OS', value: `${deviceInfo.os_name} ${deviceInfo.os_version}` },
        { icon: Cpu, label: 'Architecture', value: deviceInfo.architecture },
        { icon: Cpu, label: 'CPU Cores', value: deviceInfo.cpu_count.toString() },
        { icon: HardDrive, label: 'Available Memory', value: `${(deviceInfo.available_memory_mb / 1024).toFixed(2)} GB` },
        { icon: Monitor, label: 'App Version', value: deviceInfo.app_version },
    ]

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Monitor size={16} className="text-primary" />
                    <span className="text-sm font-medium text-foreground">Device Information</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-muted-foreground" />}
                    </button>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2">
                {items.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                        <div className="flex items-center gap-2 mb-1">
                            <item.icon size={12} className="text-muted-foreground" />
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
                        </div>
                        <p className="text-sm font-mono text-foreground truncate" title={item.value}>{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Data Directory */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-2 mb-1">
                    <HardDrive size={12} className="text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Data Directory</span>
                </div>
                <p className="text-xs font-mono text-foreground break-all">{deviceInfo.app_data_dir}</p>
            </div>
        </div>
    )
}
