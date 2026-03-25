import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  pathExists: (dirPath: string) => ipcRenderer.invoke('path-exists', dirPath),
  pullFromCloud: (dirId: number, localPath: string) =>
    ipcRenderer.invoke('sync:pullFromCloud', { dirId, localPath }),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('set-auto-launch', enabled),
  saveAutoLogin: (creds: { username: string; password: string }) =>
    ipcRenderer.invoke('save-auto-login', creds),
  loadAutoLogin: () => ipcRenderer.invoke('load-auto-login'),
  clearAutoLogin: () => ipcRenderer.invoke('clear-auto-login'),
  syncConfig: (config: { token: string; baseUrl: string }) => ipcRenderer.invoke('sync:config', config),
  syncStart: (dirs: Array<{ id: number; localPath: string }>) => ipcRenderer.invoke('sync:start', dirs),
  syncStop: () => ipcRenderer.invoke('sync:stop'),
  /** 本地文件同步上传成功后主进程广播，用于刷新左侧云端文件列表 */
  onSyncRemoteUpdated: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('sync:remote-updated', handler)
    return () => ipcRenderer.removeListener('sync:remote-updated', handler)
  },
  downloadUpdate: () => ipcRenderer.invoke('update:download') as Promise<{ ok: boolean; message?: string }>,
  quitAndInstall: () => ipcRenderer.invoke('update:quit-and-install') as Promise<{ ok: boolean }>,
  updateCheckManual: () => ipcRenderer.invoke('update:check-manual') as Promise<{ ok: boolean; message?: string }>,
  updateIsEnabled: () => ipcRenderer.invoke('update:is-enabled') as Promise<boolean>,
  /** 将当前登录用的 API 根地址交给主进程，用于 fromInstallPackage 模式下的 generic 更新源 */
  notifyInstallPackageUpdateBase: (apiBase: string) =>
    ipcRenderer.invoke('update:notify-install-package-api-base', apiBase) as Promise<
      { ok: true; ignored?: true } | { ok: false; reason: string }
    >,
  onUpdateAvailable: (
    cb: (payload: { version: string; releaseNotes: string }) => void
  ) => {
    const h = (_: IpcRendererEvent, p: { version: string; releaseNotes: string }) => cb(p)
    ipcRenderer.on('update-available', h)
    return () => ipcRenderer.removeListener('update-available', h)
  },
  onUpdateDownloadProgress: (
    cb: (payload: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void
  ) => {
    const h = (
      _: IpcRendererEvent,
      p: { percent: number; bytesPerSecond: number; transferred: number; total: number }
    ) => cb(p)
    ipcRenderer.on('update-download-progress', h)
    return () => ipcRenderer.removeListener('update-download-progress', h)
  },
  onUpdateDownloaded: (cb: (payload: { version: string }) => void) => {
    const h = (_: IpcRendererEvent, p: { version: string }) => cb(p)
    ipcRenderer.on('update-downloaded', h)
    return () => ipcRenderer.removeListener('update-downloaded', h)
  },
  onUpdateDownloadError: (cb: (payload: { message: string }) => void) => {
    const h = (_: IpcRendererEvent, p: { message: string }) => cb(p)
    ipcRenderer.on('update-download-error', h)
    return () => ipcRenderer.removeListener('update-download-error', h)
  }
})
