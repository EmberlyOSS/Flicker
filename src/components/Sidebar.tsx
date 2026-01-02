import { Upload, History, Settings, BarChart3, LogOut, Home } from 'lucide-react';
import '../styles/Sidebar.css';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

interface SidebarProps {
  activeNav: string;
  onNavChange: (navId: string) => void;
  navItems: NavItem[];
  onLogout: () => void;
  username?: string;
  showLogout?: boolean;
}

export function Sidebar({
  activeNav,
  onNavChange,
  navItems,
  onLogout,
  username,
  showLogout = true,
}: SidebarProps) {
  return (
    <aside className="desktop-sidebar glass-card border-r border-border/50 flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <Home size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground truncate text-sm">Flicker</h2>
            {username && <p className="text-xs text-muted-foreground truncate">{username}</p>}
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 font-medium text-sm group ${
              activeNav === item.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                  activeNav === item.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/30 space-y-2">
        <button
          onClick={() => onNavChange('settings')}
          className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 font-medium text-sm ${
            activeNav === 'settings'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Settings size={18} />
          <span className="flex-1 text-left">Settings</span>
        </button>

        {showLogout && (
          <button
            onClick={onLogout}
            className="w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 font-medium text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut size={18} />
            <span className="flex-1 text-left">Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
