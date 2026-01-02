import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NavItem } from './Sidebar';
import '../styles/MobileSidebar.css';

interface MobileSidebarProps {
  activeNav: string;
  onNavChange: (navId: string) => void;
  navItems: NavItem[];
  onLogout: () => void;
  username?: string;
  showLogout?: boolean;
}

export function MobileSidebar({
  activeNav,
  onNavChange,
  navItems,
  onLogout,
  username,
  showLogout = true,
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
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="text-primary font-bold text-sm">F</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-foreground text-sm truncate">Flicker</h1>
              {username && <p className="text-xs text-muted-foreground truncate">{username}</p>}
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={`mobile-menu glass-card border-b border-border/50 fixed left-0 right-0 top-[60px] z-40 md:hidden overflow-y-auto transition-all duration-300 ${
          isOpen ? 'block' : 'hidden'
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
