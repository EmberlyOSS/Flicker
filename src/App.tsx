import { useEffect, useState, useCallback } from "react";
import { UploadArea } from "./components/UploadArea";
import { UploadHistory } from "./components/UploadHistory";
import { SettingsPage } from "./components/SettingsPage";
import { Login } from "./components/Login";
import { ScreenshotPreview } from "./components/ScreenshotPreview";
import { SplashScreen } from "./components/SplashScreen";
import { UpdateNotification, UpdateCheckButton } from "./components/UpdateNotification";
import { Toaster, useToaster } from "./components/Toaster";
import { Sidebar, NavItem } from "./components/Sidebar";
import { MobileSidebar } from "./components/MobileSidebar";
import { PageLayout } from "./components/PageLayout";
import { loadConfig, saveConfig, loadUploadHistory, saveUploadHistory, addToUploadHistory, DEFAULT_HOTKEYS } from "./config";
import { AppConfig, UploadResponse, LoginResponse, UploadCompleteEvent } from "./types";
import { Upload, History, BarChart3, Camera } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { useHotkeys } from "./hooks/useHotkeys";
import { useUpdater } from "./hooks/useUpdater";
import { APP_NAME, APP_VERSION } from "./constants";
import "./App.css";

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [history, setHistory] = useState<Array<{ url: string; name: string; timestamp: number }>>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<UploadCompleteEvent | null>(null);
  const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const [activePage, setActivePage] = useState<"upload" | "history" | "settings">("upload");
  const { currentTheme } = useTheme();
  
  // Toast notifications (for non-screenshot errors)
  const { toasts, removeToast } = useToaster();
  
  // Updater hook
  const { updateInfo, checking, checkForUpdates, downloadAndInstall } = useUpdater();

  // Hotkey handlers
  const handleScreenshotComplete = useCallback((result: UploadCompleteEvent) => {
    setScreenshotStatus(null);
    setScreenshotPreview(result);
    // Add to history
    addToUploadHistory(result.url, result.name);
    const updatedHistory = loadUploadHistory();
    setHistory(updatedHistory);
    // Toast handled by native notification in useHotkeys
  }, []);

  const handleScreenshotError = useCallback((error: string) => {
    setScreenshotStatus(null);
    // Error notification handled by native notification in useHotkeys
    // Only log here for debugging
    console.error('Screenshot error:', error);
  }, []);

  const handleScreenshotStart = useCallback(() => {
    setScreenshotStatus("Capturing screenshot...");
  }, []);

  // Initialize hotkeys
  const { takeFullscreenScreenshot } = useHotkeys({
    hotkeys: config?.hotkeys || DEFAULT_HOTKEYS,
    uploadToken: config?.uploadToken || "",
    visibility: config?.visibility || "PUBLIC",
    enabled: !!config?.uploadToken,
    onScreenshotStart: handleScreenshotStart,
    onUploadComplete: handleScreenshotComplete,
    onError: handleScreenshotError,
  });

  useEffect(() => {
    try {
      const loadedConfig = loadConfig();
      console.log('Loaded config:', loadedConfig);
      setConfig(loadedConfig);
      
      const loadedHistory = loadUploadHistory();
      console.log('Loaded history:', loadedHistory);
      setHistory(loadedHistory);

      // Show login if not configured
      if (!loadedConfig.uploadToken) {
        setShowLogin(true);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      const defaultConfig: AppConfig = {
        uploadToken: '',
        visibility: 'PUBLIC',
        password: undefined,
        autoUpload: true,
        defaultNotification: true,
      };
      setConfig(defaultConfig);
      setHistory([]);
      setShowLogin(true);
    }
  }, []);

  const handleLogin = (uploadToken: string, user: LoginResponse['user']) => {
    if (!config || !user) return;
    
    const newConfig: AppConfig = {
      ...config,
      uploadToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        urlId: user.urlId,
      },
    };
    
    saveConfig(newConfig);
    setConfig(newConfig);
    setShowLogin(false);
  };

  const handleLogout = () => {
    if (!config) return;
    
    const newConfig: AppConfig = {
      ...config,
      uploadToken: '',
      user: undefined,
    };
    
    saveConfig(newConfig);
    setConfig(newConfig);
    setShowLogin(true);
  };

  const handleSaveConfig = (newConfig: AppConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
  };

  const handleUpload = (_filePath: string, response: UploadResponse) => {
    addToUploadHistory(response.url, response.name);
    const updatedHistory = loadUploadHistory();
    setHistory(updatedHistory);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleDeleteFromHistory = (url: string) => {
    const updatedHistory = history.filter(item => item.url !== url);
    setHistory(updatedHistory);
    saveUploadHistory(updatedHistory);
  };

  // Show splash screen on startup
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} minDisplayTime={2500} />;
  }

  if (!config) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground font-medium">Loading {APP_NAME}...</p>
        </div>
      </div>
    );
  }

  // Show login screen if needed
  if (showLogin) {
    return (
      <Login
        onLogin={handleLogin}
        onSkip={() => setShowLogin(false)}
      />
    );
  }

  const isConfigured = !!config.uploadToken;

  // Build navigation items
  const navItems: NavItem[] = [
    {
      id: 'upload',
      label: 'Upload',
      icon: <Upload size={20} />,
    },
    {
      id: 'history',
      label: 'History',
      icon: <History size={20} />,
      badge: history.length > 0 ? history.length : undefined,
    },
    {
      id: 'analytics',
      label: 'Stats',
      icon: <BarChart3 size={20} />,
    },
  ];

  return (
    <div className="min-h-screen gradient-bg flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <Sidebar
        activeNav={activePage}
        onNavChange={setActivePage}
        navItems={navItems}
        username={config?.user?.name || config?.user?.email}
        onLogout={handleLogout}
        showLogout={!!config?.uploadToken}
      />

      {/* Mobile Sidebar & Header */}
      <MobileSidebar
        activeNav={activePage}
        onNavChange={setActivePage}
        navItems={navItems}
        username={config?.user?.name || config?.user?.email}
        onLogout={handleLogout}
        showLogout={!!config?.uploadToken}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full lg:mt-0 pt-[60px] lg:pt-0">
        {/* Top Header Bar - Desktop Only */}
        <header className="glass-card border-b border-border/50 p-3 lg:p-4 hidden lg:block">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              {config?.uploadToken && (
                <button
                  onClick={takeFullscreenScreenshot}
                  className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 font-medium text-sm flex items-center gap-2 shadow-md"
                  title="Take Screenshot (Ctrl+Shift+S)"
                >
                  <Camera size={18} />
                  Screenshot
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isConfigured && (
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
              )}
              <UpdateCheckButton checking={checking} onClick={checkForUpdates} />
            </div>
          </div>
        </header>

        {/* Mobile Quick Action Bar - Mobile Only */}
        <div className="mobile-action-bar glass-card border-b border-border/50 p-2 gap-2 fixed top-[60px] left-0 right-0 z-20">
          {config?.uploadToken && (
            <button
              onClick={takeFullscreenScreenshot}
              className="flex-1 p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 font-medium text-xs flex items-center justify-center gap-1 shadow-md"
            >
              <Camera size={16} />
              <span className="hidden sm:inline">Screenshot</span>
            </button>
          )}
          {!isConfigured && (
            <button
              onClick={() => setShowLogin(true)}
              className="flex-1 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-xs hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>
          )}
          <UpdateCheckButton checking={checking} onClick={checkForUpdates} />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-3 lg:p-6 mt-[50px] lg:mt-0">
          <div className="max-w-4xl lg:max-w-6xl mx-auto">
            {activePage === 'upload' && (
              <PageLayout
                title="Upload Files"
                description="Drag and drop files or click to select"
              >
                <UploadArea
                  onUpload={handleUpload}
                  uploadToken={config?.uploadToken || ''}
                  visibility={config?.visibility || 'PUBLIC'}
                  password={config?.password}
                />
              </PageLayout>
            )}

            {activePage === 'history' && (
              <PageLayout
                title="Upload History"
                description={`${history.length} upload${history.length !== 1 ? 's' : ''}`}
              >
                {history.length > 0 ? (
                  <UploadHistory
                    history={history}
                    onCopy={handleCopyUrl}
                    onDelete={handleDeleteFromHistory}
                  />
                ) : (
                  <div className="glass-card p-8 text-center">
                    <History size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No uploads yet</p>
                  </div>
                )}
              </PageLayout>
            )}

            {activePage === 'settings' && (
              <PageLayout title="Settings" description="Manage your preferences">
                <SettingsPage
                  config={config || { uploadToken: '', visibility: 'PUBLIC' }}
                  onSave={handleSaveConfig}
                  onLogout={handleLogout}
                  onLogin={() => setShowLogin(true)}
                />
              </PageLayout>
            )}

            {activePage === 'analytics' && (
              <PageLayout title="Upload Statistics" description="Your upload metrics">
                <div className="glass-card p-8 text-center">
                  <BarChart3 size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Analytics coming soon</p>
                </div>
              </PageLayout>
            )}
          </div>
        </main>
      </div>


      {/* Update Notification */}
      {updateInfo.available && !updateDismissed && (
        <UpdateNotification
          updateInfo={updateInfo}
          onDownload={downloadAndInstall}
          onDismiss={() => setUpdateDismissed(true)}
        />
      )}

      {/* Screenshot Preview Popup */}
      <ScreenshotPreview
        upload={screenshotPreview}
        onClose={() => setScreenshotPreview(null)}
        autoCloseMs={6000}
      />

      {/* Screenshot Status Toast */}
      {screenshotStatus && (
        <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
          <div className="glass-card px-4 py-3 flex items-center gap-3 border border-primary/30">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-foreground">{screenshotStatus}</span>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;
