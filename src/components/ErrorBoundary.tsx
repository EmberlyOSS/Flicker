import { ReactNode, Component, ErrorInfo } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-8 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-destructive" size={32} />
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <details className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded overflow-auto max-h-48">
              <summary className="cursor-pointer font-mono mb-2">Error details</summary>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
