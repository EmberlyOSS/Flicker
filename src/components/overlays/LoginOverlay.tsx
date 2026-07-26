import { Login } from '../auth/login/Login'
import { useApp } from '../../context/AppContext'

export function LoginOverlay() {
    const { showLogin, handleLogin, setShowLogin } = useApp()

    if (!showLogin) return null

    return (
        <div className="fixed inset-0 z-[100] overflow-auto">
            <Login onLogin={handleLogin} onSkip={() => setShowLogin(false)} />
        </div>
    )
}
