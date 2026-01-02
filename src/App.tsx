import { useEffect, useState, useCallback } from "react";
import { UploadArea } from "./components/UploadArea";
import { UploadHistory } from "./components/UploadHistory";
import { Settings } from "./components/Settings";
import { Login } from "./components/Login";
import { ScreenshotPreview } from "./components/ScreenshotPreview";
import { SplashScreen } from "./components/SplashScreen";
import { UpdateNotification, UpdateCheckButton } from "./components/UpdateNotification";
import { Toaster, useToaster } from "./components/Toaster";
import { loadConfig, saveConfig, loadUploadHistory, saveUploadHistory, addToUploadHistory, DEFAULT_HOTKEYS } from "./config";
import { AppConfig, UploadResponse, LoginResponse, UploadCompleteEvent } from "./types";
import { Settings as SettingsIcon, History, Upload, Sparkles, LogOut, User, Camera } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { useHotkeys } from "./hooks/useHotkeys";
import { useUpdater } from "./hooks/useUpdater";
import { APP_NAME, APP_VERSION } from "./constants";
import "./App.css";

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [history, setHistory] = useState<Array<{ url: string; name: string; timestamp: number }>>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<UploadCompleteEvent | null>(null);
  const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
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

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Sparkles className="text-primary" size={24} />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Emberly
                </h1>
                {config.user ? (
                  <p className="text-sm text-muted-foreground">
                    Signed in as <span className="text-primary">{config.user.name || config.user.email}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Desktop Uploader</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Screenshot button */}
              {config.uploadToken && (
                <button
                  onClick={takeFullscreenScreenshot}
                  className="p-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 transition-all duration-200 border border-primary/30"
                  title="Take Screenshot (or use hotkey)"
                >
                  <Camera size={18} className="text-primary" />
                </button>
              )}
              {config.user && (
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-lg bg-secondary/50 hover:bg-destructive/20 hover:text-destructive transition-all duration-200 border border-border/50"
                  title="Sign out"
                >
                  <LogOut size={18} className="text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-all duration-200 border border-border/50"
                title="Settings"
              >
                <SettingsIcon size={18} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </header>

        {/* Status Banner */}
        {!isConfigured && (
          <div className="glass-card border-l-4 border-l-primary p-4 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User size={18} className="text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Sign in to get started</p>
                <p className="text-sm text-muted-foreground">
                  Sign in to your Emberly account to start uploading files.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Enter token manually
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="glass-card p-1.5 flex gap-1">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === "upload"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Upload size={18} />
            Upload
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <History size={18} />
            History
            {history.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === "history" 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-primary/20 text-primary"
              }`}>
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <main className="animate-fade-in">
          {activeTab === "upload" ? (
            <UploadArea
              onUpload={handleUpload}
              uploadToken={config.uploadToken}
              visibility={config.visibility}
              password={config.password}
            />
          ) : (
            <UploadHistory
              history={history}
              onCopy={handleCopyUrl}
              onDelete={handleDeleteFromHistory}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="text-center space-y-2 py-4">
          <p className="text-xs text-muted-foreground">
            {APP_NAME} v{APP_VERSION} • Theme: <span className="text-primary">{currentTheme}</span>
          </p>
          <UpdateCheckButton checking={checking} onClick={checkForUpdates} />
        </footer>
      </div>

      {/* Update Notification */}
      {updateInfo.available && !updateDismissed && (
        <UpdateNotification
          updateInfo={updateInfo}
          onDownload={downloadAndInstall}
          onDismiss={() => setUpdateDismissed(true)}
        />
      )}

      {/* Settings Modal */}
      <Settings
        config={config}
        onSave={handleSaveConfig}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={handleLogout}
        onLogin={() => setShowLogin(true)}
      />

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
