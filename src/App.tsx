import { useEffect, useState, useCallback } from "react";
import { UploadArea } from "./components/upload/UploadArea";
import { UploadHistory } from "./components/upload/UploadHistory";
import { SettingsPage } from "./components/settings/SettingsPage";
import { Login } from "./components/auth/login/Login";
import { ScreenshotPreview } from "./components/ScreenshotPreview";
import { SplashScreen } from "./components/shared/SplashScreen";
import { UpdateNotification } from "./components/UpdateNotification";
import { Toaster, useToaster } from "./components/ui/Toaster";
import { Sidebar, NavItem } from "./components/ui/Static/Sidebar";
import { MobileSidebar } from "./components/ui/Static/MobileSidebar";
import { PageLayout } from "./components/shared/PageLayout";
import { loadConfig, saveConfig, loadUploadHistory, saveUploadHistory, addToUploadHistory, DEFAULT_HOTKEYS } from "./config";
import { AppConfig, UploadResponse, LoginResponse, UploadCompleteEvent, UploadHistoryItem } from "./types";
import { Upload, History, BarChart3, Camera } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { useHotkeys } from "./hooks/useHotkeys";
import { useUpdater } from "./hooks/useUpdater";
import { APP_NAME } from "./constants";
import "./App.css";

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<UploadCompleteEvent | null>(null);
  const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const [activePage, setActivePage] = useState<"upload" | "history" | "settings" | "analytics">("upload");
  
  // Initialize theme hook
  useTheme();
  
  // Toast notifications (for non-screenshot errors)
  const { toasts, removeToast, addToast } = useToaster();
  
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
  }, []);

  const handleScreenshotError = useCallback((error: string) => {
    setScreenshotStatus(null);
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
    apiUrl: config?.uploadUrl || 'https://embrly.ca',
    enabled: !!config?.uploadToken,
    onScreenshotStart: handleScreenshotStart,
    onUploadComplete: handleScreenshotComplete,
    onError: handleScreenshotError,
  });

  useEffect(() => {
    try {
      const loadedConfig = loadConfig();
      setConfig(loadedConfig);
      
      const loadedHistory = loadUploadHistory();
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

    // Hide splash after 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (uploadToken: string, user: LoginResponse['user']) => {
    if (uploadToken && user) {
      const updatedConfig = {
        ...(config || loadConfig()),
        uploadToken: uploadToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          urlId: user.urlId,
        },
      };
      saveConfig(updatedConfig);
      setConfig(updatedConfig);
      setShowLogin(false);
      addToast(`Logged in as ${user.name || user.email}`, "success");
    }
  };

  const handleLogout = () => {
    const updatedConfig = {
      ...(config || loadConfig()),
      uploadToken: '',
      user: undefined,
    };
    saveConfig(updatedConfig);
    setConfig(updatedConfig);
    setShowLogin(true);
    setActivePage('upload');
  };

  const handleSaveConfig = (newConfig: AppConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
  };

  const handleUploadComplete = (_filePath: string, response: UploadResponse) => {
    addToUploadHistory(response.url, response.name);
    const updatedHistory = loadUploadHistory();
    setHistory(updatedHistory);
  };

  const handleDeleteFromHistory = (url: string) => {
    const updatedHistory = history.filter(item => item.url !== url);
    setHistory(updatedHistory);
    saveUploadHistory(updatedHistory);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    // You could add a toast here too
  };

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
      id: 'analytics' as const,
      label: 'Stats',
      icon: <BarChart3 size={20} />,
    },
  ];

  const handleNavChange = (id: "upload" | "history" | "settings" | "analytics") => {
    setActivePage(id);
  };

  if (!config) return null;

  return (
    <div className="min-h-screen gradient-bg flex flex-col lg:flex-row">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      
      {showLogin && (
        <div className="fixed inset-0 z-[100] overflow-auto">
          <Login
            onLogin={handleLogin}
            onSkip={() => setShowLogin(false)}
          />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeNav={activePage}
          onNavChange={handleNavChange as any}
          navItems={navItems}
          username={config?.user?.name || config?.user?.email}
          onLogout={handleLogout}
          showLogout={!!config?.uploadToken}
        />
      </div>

      {/* Mobile Sidebar & Header */}
      <MobileSidebar
        activeNav={activePage}
        onNavChange={handleNavChange as any}
        navItems={navItems}
        username={config?.user?.name || config?.user?.email}
        onLogout={handleLogout}
        showLogout={!!config?.uploadToken}
        isLoggedIn={!!config?.uploadToken}
        onScreenshot={takeFullscreenScreenshot}
        onLogin={() => setShowLogin(true)}
        uploadCount={history.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header (Desktop) */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border/30 bg-background/50 backdrop-blur-md sticky top-0 z-10 transition-all duration-300">
          <div>
            <h1 className="text-xl font-bold text-foreground">{APP_NAME}</h1>
            <p className="text-xs text-muted-foreground">Emberly Alpha Tools</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50">
              <div className={`w-2 h-2 rounded-full ${config.uploadToken ? 'bg-green-500' : 'bg-destructive'} animate-pulse`} />
              <span className="text-xs font-medium text-muted-foreground lowercase">
                {config.uploadToken ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {config.uploadToken ? (
                <button
                  onClick={takeFullscreenScreenshot}
                  className="px-5 py-2.5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl font-medium shadow-lg shadow-primary/25 border border-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center gap-2.5 group"
                >
                  <Camera size={20} className="group-hover:rotate-[15deg] transition-transform duration-300 drop-shadow-sm" />
                  <span>Capture</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-3 lg:p-6 lg:mt-0">
          <div className="max-w-4xl lg:max-w-6xl mx-auto">
            {activePage === 'upload' && (
              <PageLayout title="Upload" description="Share files and screenshots">
                {config && (
                  <UploadArea
                    onUpload={handleUploadComplete}
                    uploadToken={config.uploadToken}
                    visibility={config.visibility}
                    password={config.password}
                  />
                )}
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

            {activePage === 'analytics' && (
              <PageLayout title="Analytics" description="Upload statistics">
                <div className="glass-card p-12 text-center">
                  <BarChart3 size={48} className="mx-auto text-primary/30 mb-4" />
                  <h3 className="text-xl font-bold text-foreground">Coming Soon</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Detailed analytics and upload stats are currently under development.
                  </p>
                </div>
              </PageLayout>
            )}

            {activePage === 'settings' && (
              <PageLayout title="Settings" description="Manage your preferences">
                <SettingsPage
                  config={config}
                  onSave={handleSaveConfig}
                  onLogout={handleLogout}
                  onLogin={() => setShowLogin(true)}
                  updateInfo={updateInfo}
                  checkingForUpdates={checking}
                  onCheckForUpdates={checkForUpdates}
                  onDownloadUpdate={downloadAndInstall}
                  onUpload={handleUploadComplete}
                />
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
