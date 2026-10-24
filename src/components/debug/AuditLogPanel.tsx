import { useState, useEffect } from 'react'
import { Trash2, Copy, Check, RefreshCw, AlertCircle, AlertTriangle, Info, Search, X } from 'lucide-react'
import { useAudit, AuditLogEntry } from '../../hooks/useAudit'
import { Segmented } from '../ui/kit'

interface AuditLogPanelProps {
    initialLimit?: number
    compact?: boolean
}

type Level = 'all' | 'info' | 'warning' | 'error'

export function AuditLogPanel({ initialLimit = 50, compact = false }: AuditLogPanelProps) {
    const { logs, loading, loadAuditLogs, clearAuditLogs, exportAuditLogs, isTauriAvailable } = useAudit()
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [levelFilter, setLevelFilter] = useState<Level>('all')

    useEffect(() => {
        if (isTauriAvailable) loadAuditLogs(initialLimit)
    }, [loadAuditLogs, initialLimit, isTauriAvailable])

    if (!isTauriAvailable) {
        return <p className="py-6 text-center text-xs text-muted-foreground">The activity log is only available in the desktop app.</p>
    }

    const query = searchQuery.toLowerCase()
    const filteredLogs = logs.filter(log =>
        (query === '' || log.message.toLowerCase().includes(query) || log.event_type.toLowerCase().includes(query)) &&
        (levelFilter === 'all' || log.level === levelFilter)
    )

    const handleExport = async () => {
        const exported = await exportAuditLogs()
        if (!exported) return
        navigator.clipboard.writeText(exported)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleClear = async () => {
        if (confirm('Clear the activity log?')) await clearAuditLogs()
    }

    const count = (level: Level) => (level === 'all' ? logs.length : logs.filter(l => l.level === level).length)
    const iconButton = 'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                {!compact ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                        <div className="relative min-w-40 flex-1">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <Segmented
                            value={levelFilter}
                            onChange={setLevelFilter}
                            options={(['all', 'info', 'warning', 'error'] as const).map(level => ({
                                value: level,
                                label: `${level === 'warning' ? 'Warnings' : level === 'error' ? 'Errors' : level.charAt(0).toUpperCase() + level.slice(1)} ${count(level)}`,
                            }))}
                        />
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">{logs.length} entries</span>
                )}
                <div className="flex gap-1">
                    <button onClick={() => loadAuditLogs(initialLimit)} disabled={loading} title="Refresh" className={iconButton}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleExport} title="Copy as JSON" className={iconButton}>
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                    <button onClick={handleClear} title="Clear" className={iconButton}>
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className={`overflow-y-auto rounded-lg border border-border/60 ${compact ? 'max-h-48' : 'max-h-80'}`}>
                {filteredLogs.length > 0 ? (
                    <div className="divide-y divide-border/60">
                        {filteredLogs.map(log => (
                            <LogEntry
                                key={log.id}
                                log={log}
                                expanded={expandedId === log.id}
                                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                        {searchQuery || levelFilter !== 'all' ? 'Nothing matches' : 'Nothing logged yet'}
                    </p>
                )}
            </div>
        </div>
    )
}

function LevelIcon({ level }: { level: AuditLogEntry['level'] }) {
    if (level === 'error') return <AlertCircle size={14} className="text-red-400" />
    if (level === 'warning') return <AlertTriangle size={14} className="text-amber-400" />
    return <Info size={14} className="text-muted-foreground" />
}

function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? timestamp : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function LogEntry({ log, expanded, onToggle }: { log: AuditLogEntry; expanded: boolean; onToggle: () => void }) {
    const hasMetadata = !!log.metadata && Object.keys(log.metadata).length > 0
    return (
        <div>
            <button onClick={hasMetadata ? onToggle : undefined} className={`flex w-full items-start gap-3 px-3 py-2 text-left ${hasMetadata ? 'hover:bg-secondary/40' : 'cursor-default'}`}>
                <span className="mt-0.5 shrink-0"><LevelIcon level={log.level} /></span>
                <span className="min-w-0 flex-1">
                    <span className="block text-xs text-foreground">{log.message}</span>
                    <span className="block text-[11px] text-muted-foreground">{log.event_type} · {formatTimestamp(log.timestamp)}</span>
                </span>
            </button>
            {expanded && hasMetadata && (
                <pre className="mx-3 mb-2 overflow-x-auto rounded bg-black/30 p-2 font-mono text-[10px] text-muted-foreground">
                    {JSON.stringify(log.metadata, null, 2)}
                </pre>
            )}
        </div>
    )
}
