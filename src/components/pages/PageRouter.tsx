import { History as HistoryIcon, BarChart3 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { PageLayout } from '../shared/PageLayout'
import { UploadArea } from '../upload/UploadArea'
import { UploadHistory } from '../upload/UploadHistory'
import { SettingsPage } from '../settings/SettingsPage'

export function PageRouter() {
    const {
        activePage,
        config,
        history,
        handleUploadComplete,
        handleCopyUrl,
        handleDeleteFromHistory,
        updateConfig,
        handleLogout,
        setShowLogin,
    } = useApp()

    if (!config) return null

    switch (activePage) {
        case 'upload':
            return (
                <PageLayout title="Upload" description="Share files and screenshots">
                    <UploadArea
                        onUpload={handleUploadComplete}
                        uploadToken={config.uploadToken}
                        visibility={config.visibility}
                        password={config.password}
                        behavior={config.behavior}
                    />
                </PageLayout>
            )

        case 'history':
            return (
                <PageLayout title="Upload History" description={`${history.length} uploads`}>
                    {history.length > 0 ? (
                        <UploadHistory
                            history={history}
                            onCopy={handleCopyUrl}
                            onDelete={handleDeleteFromHistory}
                            clipboardFormat={config.behavior?.clipboardFormat}
                        />
                    ) : (
                        <div className="p-8 text-center glass-card">
                            <HistoryIcon size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No uploads yet</p>
                        </div>
                    )}
                </PageLayout>
            )

        case 'analytics':
            return (
                <PageLayout title="Analytics" description="Upload statistics">
                    <div className="p-12 text-center glass-card">
                        <BarChart3 size={48} className="mx-auto mb-4 text-primary/30" />
                        <h3 className="text-xl font-bold">Coming Soon</h3>
                    </div>
                </PageLayout>
            )

        case 'settings':
            return (
                <PageLayout title="Settings" description="Manage your preferences">
                    <SettingsPage
                        config={config}
                        onSave={updateConfig}
                        onLogout={handleLogout}
                        onLogin={() => setShowLogin(true)}
                        onUpload={handleUploadComplete}
                    />
                </PageLayout>
            )

        default:
            return null
    }
}
