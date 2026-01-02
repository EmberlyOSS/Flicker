import { useState } from 'react';
import { Menu, X, Camera, Zap } from 'lucide-react';
import { NavItem } from './Sidebar';
import { Logo } from './Logo';
import { APP_VERSION } from '../constants';
import '../styles/MobileSidebar.css';

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
      {/* Mobile Header */}
      <header className="mobile-header glass-card border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo and branding */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/40 shadow-lg shadow-primary/10">
              <Logo size={22} primaryColor="#ffffff" accentColor="hsl(var(--primary))" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-foreground text-sm">Flicker</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                  {APP_VERSION}
                </span>
              </div>
              {username ? (
                <p className="text-xs text-muted-foreground truncate">{username}</p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap size={10} className="text-primary" />
                  Screenshot & Upload
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Upload count badge when logged in */}
            {isLoggedIn && uploadCount > 0 && (
              <button
                onClick={() => onNavChange('history')}
                className="px-2 py-1 rounded-lg bg-secondary/50 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {uploadCount} upload{uploadCount !== 1 ? 's' : ''}
              </button>
            )}
            {/* Screenshot button in header */}
            {isLoggedIn && onScreenshot && (
              <button
                onClick={onScreenshot}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                aria-label="Take Screenshot"
              >
                <Camera size={18} />
              </button>
            )}
            {/* Sign In button if not logged in */}
            {!isLoggedIn && onLogin && (
              <button
                onClick={onLogin}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={22} className="text-foreground" /> : <Menu size={22} className="text-muted-foreground" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={`mobile-menu glass-card border-b border-border/50 fixed left-0 right-0 top-[60px] z-40 lg:hidden overflow-y-auto transition-all duration-300 ${
          isOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 font-medium text-sm ${
                activeNav === item.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
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

          <div className="border-t border-border/30 my-2 pt-2">
            <button
              onClick={() => handleNavClick('settings')}
              className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 font-medium text-sm ${
                activeNav === 'settings'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <span className="text-lg">⚙️</span>
              <span className="flex-1 text-left">Settings</span>
            </button>

            {showLogout && (
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 font-medium text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <span className="text-lg">🚪</span>
                <span className="flex-1 text-left">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
