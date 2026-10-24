import { Login } from '../auth/login/Login'
import { useApp } from '../../context/AppContext'
import { API_URL } from '../../constants'

export function LoginOverlay() {
    const { showLogin, handleLogin, setShowLogin, config, updateConfig } = useApp()

    if (!showLogin) return null

    return (
        <div className="fixed inset-0 z-[100] overflow-auto">
            <Login
                onLogin={handleLogin}
                onSkip={() => setShowLogin(false)}
                server={config?.uploadUrl || API_URL}
                onServerChange={url => config && updateConfig({ ...config, uploadUrl: url })}
            />
        </div>
    )
}
