import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MainLayout } from './components/layout';
import { PageRouter } from './components/pages';
import { LoginOverlay, ScreenshotToast } from './components/overlays';
import { SplashScreen } from './components/shared/SplashScreen';
import './App.css';

function AppContent() {
  const { config, screenshotStatus } = useApp();
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
      <LoginOverlay />

      <MainLayout>
        <PageRouter />
      </MainLayout>

      <ScreenshotToast status={screenshotStatus} />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
