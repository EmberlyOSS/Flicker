import { useState } from 'react'
import { LogIn, Eye, EyeOff, Loader2, AlertCircle, Shield } from 'lucide-react'
import { LoginRequest, LoginResponse } from '../types'
import { Logo } from './Logo'
import { API_URL } from '../constants'

interface LoginProps {
  onLogin: (uploadToken: string, user: LoginResponse['user']) => void
  onSkip: () => void
}

export function Login({ onLogin, onSkip }: LoginProps) {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requires2FA, setRequires2FA] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const payload: LoginRequest = {
        emailOrUsername,
        password,
      }

      if (requires2FA && twoFactorCode) {
        payload.twoFactorCode = twoFactorCode
      }

      const response = await fetch(`${API_URL}/api/auth/desktop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data: LoginResponse = await response.json()

      if (data.requires2FA) {
        setRequires2FA(true)
        setError(null)
        return
      }

      if (!data.success || !data.user) {
        setError(data.error || 'Login failed')
        return
      }

      // Success! Pass the token and user data back
      onLogin(data.user.uploadToken, data.user)
    } catch (err) {
      console.error('Login error:', err)
      setError('Failed to connect to Emberly. Please check your internet connection.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Logo Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Logo size={40} primaryColor="#ffffff" accentColor="hsl(var(--primary))" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Flicker</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your Emberly account to start uploading
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA ? (
              <>
                {/* Email/Username */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                    required
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2.5 pr-10 bg-background border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 2FA Code Input */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Authentication Code
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors text-center text-lg tracking-widest font-mono"
                    required
                    autoFocus
                    disabled={isLoading}
                    maxLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false)
                    setTwoFactorCode('')
                    setError(null)
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to login
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  {requires2FA ? 'Verify' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Skip option for manual token entry */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={onSkip}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Skip and enter upload token manually
            </button>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <a
            href={`${API_URL}/auth/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Sign up at Emberly
          </a>
        </p>
      </div>
    </div>
  )
}
