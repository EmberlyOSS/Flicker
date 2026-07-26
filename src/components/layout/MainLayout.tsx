import { ReactNode } from 'react'
import { Upload, History, BarChart3 } from 'lucide-react'
import { Sidebar, NavItem } from '../ui/Static/Sidebar'
import { MobileSidebar } from '../ui/Static/MobileSidebar'
import { Header } from './Header'
import { useApp } from '../../context/AppContext'

interface MainLayoutProps {
    children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
    const { config, history, activePage, setActivePage, handleLogout, isLoggedIn, setShowLogin } = useApp()

    const navItems: NavItem[] = [
        { id: 'upload', label: 'Upload', icon: <Upload size={20} /> },
        { id: 'history', label: 'History', icon: <History size={20} />, badge: history.length > 0 ? history.length : undefined },
        { id: 'analytics', label: 'Stats', icon: <BarChart3 size={20} /> },
    ]

    return (
        <div className="flex flex-col flex-1 overflow-hidden lg:flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <Sidebar
                    activeNav={activePage}
                    onNavChange={(id) => setActivePage(id as any)}
                    navItems={navItems}
                    username={config?.user?.name || config?.user?.email}
                    onLogout={handleLogout}
                    showLogout={isLoggedIn}
                />
            </div>

            {/* Mobile Sidebar */}
            <MobileSidebar
                activeNav={activePage}
                onNavChange={(id) => setActivePage(id as any)}
                navItems={navItems}
                username={config?.user?.name || config?.user?.email}
                onLogout={handleLogout}
                showLogout={isLoggedIn}
                isLoggedIn={isLoggedIn}
                onLogin={() => setShowLogin(true)}
                uploadCount={history.length}
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header />
                <main className="flex-1 p-3 overflow-auto lg:p-6">
                    <div className="max-w-4xl mx-auto lg:max-w-6xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
