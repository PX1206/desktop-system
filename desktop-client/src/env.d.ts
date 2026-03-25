/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 桌面端标题旁展示的 Web 门户地址（开发/生产分别由 .env.development / .env.production 配置） */
  readonly VITE_WEB_PORTAL_URL: string
  /** 登录页默认接口根地址，如 https://host/api 或 http://localhost:6168 */
  readonly VITE_DEFAULT_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  electronAPI?: {
    pathExists: (dirPath: string) => Promise<boolean>
    pullFromCloud: (
      dirId: number,
      localPath: string
    ) => Promise<{ ok: boolean; downloaded: number; failed: number; message?: string }>
    selectDirectory: () => Promise<string | null>
    getAutoLaunch: () => Promise<boolean>
    setAutoLaunch: (enabled: boolean) => Promise<void>
    saveAutoLogin: (creds: { username: string; password: string }) => Promise<boolean>
    loadAutoLogin: () => Promise<{ username: string; password: string } | null>
    clearAutoLogin: () => Promise<void>
    syncConfig: (config: { token: string; baseUrl: string }) => Promise<void>
    syncStart: (dirs: Array<{ id: number; localPath: string }>) => Promise<void>
    syncStop: () => Promise<void>
    onSyncRemoteUpdated?: (callback: () => void) => () => void
    downloadUpdate?: () => Promise<{ ok: boolean; message?: string }>
    quitAndInstall?: () => Promise<{ ok: boolean }>
    updateCheckManual?: () => Promise<{ ok: boolean; message?: string }>
    updateIsEnabled?: () => Promise<boolean>
    notifyInstallPackageUpdateBase?: (
      apiBase: string
    ) => Promise<{ ok: true; ignored?: true } | { ok: false; reason: string }>
    onUpdateAvailable?: (cb: (payload: { version: string; releaseNotes: string }) => void) => () => void
    onUpdateDownloadProgress?: (
      cb: (payload: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void
    ) => () => void
    onUpdateDownloaded?: (cb: (payload: { version: string }) => void) => () => void
    onUpdateDownloadError?: (cb: (payload: { message: string }) => void) => () => void
  }
}
