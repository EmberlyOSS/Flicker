import { useState, useEffect } from 'react'
import {
    FileText, Trash2, Copy, Check, RefreshCw,
    AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp,
    Search, X, AlertOctagon
} from 'lucide-react'
import { useAudit, AuditLogEntry } from '../../hooks/useAudit'

interface AuditLogPanelProps {
    initialLimit?: number
    compact?: boolean
}

export function AuditLogPanel({ initialLimit = 50, compact = false }: AuditLogPanelProps) {
    const { logs, loading, loadAuditLogs, clearAuditLogs, exportAuditLogs, isTauriAvailable } = useAudit()
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all')

    useEffect(() => {
        if (isTauriAvailable) {
            loadAuditLogs(initialLimit)
        }
    }, [loadAuditLogs, initialLimit, isTauriAvailable])

    // Show message if not in Tauri
    if (!isTauriAvailable) {
        return (
            <div className="py-8 text-center">
                <AlertOctagon size={24} className="mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Audit logs are only available in the desktop app</p>
                <p className="mt-1 text-xs text-muted-foreground/60">Run the Tauri application to view logs</p>
            </div>
        )
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchQuery === '' ||
            log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.event_type.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesLevel = levelFilter === 'all' || log.level === levelFilter
        return matchesSearch && matchesLevel
    })

    const handleExport = async () => {
        const exported = await exportAuditLogs()
        if (exported) {
            navigator.clipboard.writeText(exported)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleClear = async () => {
        if (confirm('Are you sure you want to clear all audit logs?')) {
            await clearAuditLogs()
        }
    }

    const levelCounts = {
        all: logs.length,
        info: logs.filter(l => l.level === 'info').length,
        warning: logs.filter(l => l.level === 'warning').length,
        error: logs.filter(l => l.level === 'error').length,
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span className="text-sm font-medium text-foreground">Activity Logs</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded">
                        {filteredLogs.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => loadAuditLogs(initialLimit)}
                        disabled={loading}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="Copy logs to clipboard"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-muted-foreground" />}
                    </button>
                    <button
                        onClick={handleClear}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            {!compact && (
                <div className="space-y-2">
                    <div className="relative">
                        <Search size={14} className="absolute -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-2 pr-8 text-xs border rounded-lg pl-9 bg-secondary/30 border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute p-1 -translate-y-1/2 rounded right-2 top-1/2 hover:bg-secondary"
                            >
                                <X size={12} className="text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* Level Filter Pills */}
                    <div className="flex gap-1">
                        {(['all', 'info', 'warning', 'error'] as const).map(level => (
                            <button
                                key={level}
                                onClick={() => setLevelFilter(level)}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${levelFilter === level
                                    ? level === 'all' ? 'bg-primary text-primary-foreground' :
                                        level === 'error' ? 'bg-red-500/20 text-red-400' :
                                            level === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-blue-500/20 text-blue-400'
                                    : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                                    }`}
                            >
                                {level.charAt(0).toUpperCase() + level.slice(1)} ({levelCounts[level]})
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Log List */}
            <div className={`space-y-2 overflow-y-auto ${compact ? 'max-h-48' : 'max-h-96'}`}>
                {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                        <LogEntry
                            key={log.id}
                            log={log}
                            expanded={expandedId === log.id}
                            onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        />
                    ))
                ) : (
                    <div className="py-8 text-center">
                        <FileText size={24} className="mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">
                            {searchQuery || levelFilter !== 'all' ? 'No matching logs' : 'No activity logged yet'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// Helper functions
function getLevelIcon(level: string) {
    switch (level) {
        case 'error':
            return <AlertCircle size={14} className="text-red-400" />
        case 'warning':
            return <AlertTriangle size={14} className="text-yellow-400" />
        default:
            return <Info size={14} className="text-blue-400" />
    }
}

function getLevelStyle(level: string) {
    switch (level) {
        case 'error':
            return 'bg-red-500/20 text-red-400 border-red-500/30'
        case 'warning':
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        default:
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
}

function formatTimestamp(timestamp: string): string {
    try {
        const date = new Date(timestamp)
        return date.toLocaleString()
    } catch {
        return timestamp
    }
}

function LogEntry({ log, expanded, onToggle }: { log: AuditLogEntry; expanded: boolean; onToggle: () => void }) {
    return (
        <div className={`border rounded-lg transition-all ${getLevelStyle(log.level).split(' ')[2]} bg-secondary/20`}>
            <button onClick={onToggle} className="flex items-start w-full gap-3 p-3 text-left">
                <div className="flex-shrink-0 mt-0.5">{getLevelIcon(log.level)}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getLevelStyle(log.level)}`}>
                            {log.level}
                        </span>
                        <span className="text-xs font-medium text-foreground">{log.event_type}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{log.message}</p>
                </div>
                <div className="flex-shrink-0">
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>

            {expanded && log.metadata && (
                <div className="px-3 pt-0 pb-3">
                    <div className="p-2 rounded bg-black/30 font-mono text-[10px] text-muted-foreground overflow-x-auto">
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    )
}
