interface ScreenshotToastProps {
    status: string | null
}

export function ScreenshotToast({ status }: ScreenshotToastProps) {
    if (!status) return null

    return (
        <div className="fixed z-50 bottom-4 left-4 animate-slide-up">
            <div className="flex items-center gap-3 px-4 py-3 border glass-card border-primary/30">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-foreground">{status}</span>
            </div>
        </div>
    )
}
