import { useState } from 'react';
import { Menu, X, Camera, Settings, LogOut } from 'lucide-react';
import { NavItem, navItemClass } from './Sidebar';
import { Logo } from '../Logo';
import { APP_VERSION } from '../../../constants';
import '../../../styles/MobileSidebar.css';

interface MobileSidebarProps {
  activeNav: string;
  onNavChange: (navId: string) => void;
  navItems: NavItem[];
  onLogout: () => void;
  username?: string;
  showLogout?: boolean;
  onScreenshot?: () => void;
  onLogin?: () => void;
  isLoggedIn?: boolean;
  uploadCount?: number;
}

export function MobileSidebar({
  activeNav,
  onNavChange,
  navItems,
  onLogout,
  username,
  showLogout = true,
  onScreenshot,
  onLogin,
  isLoggedIn = false,
  uploadCount = 0,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (navId: string) => {
    onNavChange(navId);
    setIsOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setIsOpen(false);
  };

  return (
    <>
      <header className="mobile-header sticky top-0 z-30 border-b border-border/70 bg-card/75 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Logo size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-foreground">Flicker</h1>
                <span className="rounded-md border border-primary/30 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{username || 'Screenshot & upload'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && uploadCount > 0 && (
              <button
                onClick={() => onNavChange('history')}
                className="rounded-lg border border-border/70 bg-secondary/50 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {uploadCount} upload{uploadCount !== 1 ? 's' : ''}
              </button>
            )}
            {isLoggedIn && onScreenshot && (
              <button
                onClick={onScreenshot}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
                aria-label="Take screenshot"
              >
                <Camera size={18} />
              </button>
            )}
            {!isLoggedIn && onLogin && (
              <button
                onClick={onLogin}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 transition-colors hover:bg-secondary/60"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={20} className="text-foreground" /> : <Menu size={20} className="text-muted-foreground" />}
            </button>
          </div>
        </div>
      </header>

      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />}

      <nav
        className={`mobile-menu fixed left-0 right-0 top-[60px] z-50 overflow-y-auto border-b border-border/70 bg-card/95 backdrop-blur-xl transition-all duration-300 lg:hidden ${
          isOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        <div className="space-y-0.5 p-2">
          {navItems.map((item) => {
            const active = activeNav === item.id;
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)} className={navItemClass(active)}>
                <span className={`shrink-0 ${active ? 'text-primary' : ''}`}>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <button onClick={() => handleNavClick('settings')} className={navItemClass(activeNav === 'settings')}>
              <Settings size={16} className={activeNav === 'settings' ? 'text-primary' : ''} />
              <span className="flex-1 text-left">Settings</span>
            </button>

            {showLogout && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut size={16} />
                <span className="flex-1 text-left">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
