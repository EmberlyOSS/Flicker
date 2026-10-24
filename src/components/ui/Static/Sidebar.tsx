import { Settings, LogOut } from 'lucide-react';
import { Logo } from '../Logo';
import { APP_VERSION } from '../../../constants';
import '../../../styles/Sidebar.css';

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

export const navItemClass = (active: boolean) =>
  `w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
    active
      ? 'bg-secondary text-foreground font-medium'
      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
  }`;

export function Sidebar({
  activeNav,
  onNavChange,
  navItems,
  onLogout,
  username,
  showLogout = true,
}: SidebarProps) {
  return (
    <aside className="desktop-sidebar sticky top-0 h-screen flex-col border-r border-border/70 bg-card/60 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Logo size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">Flicker</h2>
            <span className="rounded-md border border-primary/30 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              v{APP_VERSION}
            </span>
          </div>
          {username && <p className="truncate text-xs text-muted-foreground">{username}</p>}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Flicker
        </p>
        {navItems.map((item) => {
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={navItemClass(active)}
            >
              <span className={`shrink-0 ${active ? 'text-primary' : ''}`}>{item.icon}</span>
              <span className="flex-1 truncate text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-border/60 p-2">
        <button
          onClick={() => onNavChange('settings')}
          aria-current={activeNav === 'settings' ? 'page' : undefined}
          className={navItemClass(activeNav === 'settings')}
        >
          <Settings size={16} className={activeNav === 'settings' ? 'text-primary' : ''} />
          <span className="flex-1 text-left">Settings</span>
        </button>

        {showLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut size={16} />
            <span className="flex-1 text-left">Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
