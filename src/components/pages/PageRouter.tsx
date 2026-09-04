import { History as HistoryIcon } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { PageLayout } from '../shared/PageLayout'
import { UploadArea } from '../upload/UploadArea'
import { UploadHistory } from '../upload/UploadHistory'
import { SettingsPage } from '../settings/SettingsPage'
import { StatsPage } from './StatsPage'
import { ShortenPage } from './ShortenPage'

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
        takeRegionScreenshot,
        isVideoRecording,
        videoElapsed,
        toggleVideoRecording,
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
                        domain={config.preferredDomain}
                        behavior={config.behavior}
                        onCaptureRegion={takeRegionScreenshot}
                        isVideoRecording={isVideoRecording}
                        videoElapsed={videoElapsed}
                        onToggleVideo={toggleVideoRecording}
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
                            uploadToken={config.uploadToken}
                            uploadUrl={config.uploadUrl}
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
                <PageLayout title="Stats" description="Your Emberly usage at a glance">
                    <StatsPage uploadToken={config.uploadToken} uploadUrl={config.uploadUrl} />
                </PageLayout>
            )

        case 'shorten':
            return (
                <PageLayout title="Shorten" description="Turn a long link into a short one">
                    <ShortenPage uploadToken={config.uploadToken} uploadUrl={config.uploadUrl} />
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
