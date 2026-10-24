import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MainLayout } from './components/layout';
import { PageRouter } from './components/pages';
import { LoginOverlay, ScreenshotToast, RegionSelector, GlobalRegionOverlay, PermissionsModal } from './components/overlays';
import { SplashScreen } from './components/shared/SplashScreen';
import './App.css';

function OverlayRouter() {
  const [isOverlay, setIsOverlay] = useState<boolean | null>(null);

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    if (params.get('overlay') === 'region') {
      setIsOverlay(true);
      return;
    }

    const checkLabel = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const label = win.label;
        if (label.startsWith('region-overlay')) {
          setIsOverlay(true);
        } else {
          setIsOverlay(false);
        }
      } catch {
        setIsOverlay(false);
      }
    };
    checkLabel();
  }, []);

  if (isOverlay === null) {

    return <div style={{ background: 'transparent' }} />;
  }

  if (isOverlay) {

    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return <GlobalRegionOverlay />;
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { config, screenshotStatus, showRegionSelector, setShowRegionSelector, captureAndUploadRegion, showPermissionsModal } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {!showSplash && showPermissionsModal && <PermissionsModal />}
      <LoginOverlay />

      <MainLayout>
        <PageRouter />
      </MainLayout>

      <ScreenshotToast status={screenshotStatus} />

      {showRegionSelector && (
        <RegionSelector
          onSelect={async (region) => {
            setShowRegionSelector(false)
            await captureAndUploadRegion(region.x, region.y, region.width, region.height)
          }}
          onCancel={() => setShowRegionSelector(false)}
        />
      )}
    </div>
  );
}

function App() {
  return <OverlayRouter />;
}

export default App;
