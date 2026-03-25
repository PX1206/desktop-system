/**
 * electron-updater（generic）：feedUrl 指向含 latest.yml 的目录；
 * 或 fromInstallPackage=true 时使用「当前登录的服务器根地址」+ /open/installPackage（与后台安装包管理一致）。
 */
import { app, dialog, ipcMain, type BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import semver from 'semver'
import { autoUpdater } from 'electron-updater'

type UpdateMergedCfg = { feedUrl?: string; fromInstallPackage?: boolean }

let manualCheckPending = false
let getWindow: () => BrowserWindow | null = () => null
let updaterEnabled = false
let eventsBound = false
let scheduledCheckTimer: ReturnType<typeof setTimeout> | null = null

const INSTALL_PACKAGE_API_BASE_FILE = 'install-package-api-base.txt'

export function setUpdateWindowGetter(fn: () => BrowserWindow | null) {
  getWindow = fn
}

function readJsonFile<T extends object>(filePath: string): Partial<T> {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
    }
  } catch {
    // ignore
  }
  return {}
}

function readMergedUpdateConfig(): UpdateMergedCfg {
  const packed = path.join(process.resourcesPath, 'update-feed.json')
  const userCfg = path.join(app.getPath('userData'), 'update-config.json')
  return { ...readJsonFile<UpdateMergedCfg>(packed), ...readJsonFile<UpdateMergedCfg>(userCfg) }
}

function readPersistedInstallPackageApiBase(): string | null {
  const p = path.join(app.getPath('userData'), INSTALL_PACKAGE_API_BASE_FILE)
  try {
    if (fs.existsSync(p)) {
      const s = fs.readFileSync(p, 'utf-8').trim().replace(/\/+$/, '')
      return s || null
    }
  } catch {
    // ignore
  }
  return null
}

function normalizeApiBase(base: string): string {
  return base.trim().replace(/\/+$/, '')
}

function genericFeedFromApiBase(apiBase: string): string {
  return `${normalizeApiBase(apiBase)}/open/installPackage`
}

function resolveExplicitFeedUrl(cfg: UpdateMergedCfg): string | null {
  const u = cfg.feedUrl
  if (u && typeof u === 'string' && u.trim()) {
    return u.trim().replace(/\/+$/, '')
  }
  return null
}

function sendToRenderer(channel: string, payload?: unknown) {
  const w = getWindow()
  if (w && !w.isDestroyed()) {
    w.webContents.send(channel, payload)
  }
}

function bindAutoUpdaterEvents() {
  if (eventsBound) {
    return
  }
  eventsBound = true

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for update…')
  })

  autoUpdater.on('update-available', (info) => {
    const wasManualCheck = manualCheckPending
    manualCheckPending = false

    const current = app.getVersion()
    const remoteRaw = String(info.version ?? '').trim()
    const c = semver.coerce(current)
    const r = semver.coerce(remoteRaw)
    // 安装包管理里「版本说明」若写得比真实打包包体 version 大，会出现装完仍提示更新；与当前安装包再比对一次
    if (r && c && !semver.gt(r, c)) {
      console.log('[updater] skip notify: feed version not newer than app', { current, remote: remoteRaw })
      if (wasManualCheck) {
        void dialog.showMessageBox({
          type: 'info',
          title: '云同步',
          message: `当前已是最新版本（${current}）。`,
          buttons: ['确定']
        })
      }
      return
    }

    const notes = info.releaseNotes
    let releaseNotes = ''
    if (typeof notes === 'string') releaseNotes = notes
    else if (Array.isArray(notes)) {
      releaseNotes = notes.map((n) => (typeof n === 'string' ? n : (n as { name?: string }).name || '')).join('\n')
    }
    sendToRenderer('update-available', {
      version: info.version,
      releaseNotes: releaseNotes || ''
    })
  })

  autoUpdater.on('update-not-available', () => {
    if (manualCheckPending) {
      manualCheckPending = false
      void dialog.showMessageBox({
        type: 'info',
        title: '云同步',
        message: '当前已是最新版本',
        buttons: ['确定']
      })
    }
  })

  autoUpdater.on('download-progress', (p) => {
    sendToRenderer('update-download-progress', {
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater]', err)
    if (manualCheckPending) {
      manualCheckPending = false
      void dialog.showMessageBox({
        type: 'error',
        title: '云同步',
        message: `检查或下载更新失败：${err.message}`,
        buttons: ['确定']
      })
    }
  })
}

function enableGenericUpdater(genericUrl: string) {
  bindAutoUpdaterEvents()
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  // 安装包管理 / 自建 generic 源通常没有与当前安装包配对的 blockmap；差分下载会长时间停在 0% 或反复失败
  autoUpdater.disableDifferentialDownload = true
  autoUpdater.setFeedURL({ provider: 'generic', url: genericUrl })
  updaterEnabled = true
  console.log('[updater] generic feed:', genericUrl)
}

/** 供 IPC：渲染进程上报当前 API 根地址后持久化并启用更新 */
export function applyInstallPackageApiBase(apiBase: string): void {
  if (!app.isPackaged) {
    return
  }
  const b = normalizeApiBase(apiBase)
  if (!b) {
    return
  }
  const p = path.join(app.getPath('userData'), INSTALL_PACKAGE_API_BASE_FILE)
  try {
    fs.writeFileSync(p, b, 'utf-8')
  } catch (e) {
    console.warn('[updater] persist api base', e)
  }
  enableGenericUpdater(genericFeedFromApiBase(b))
  scheduleDeferredCheck(3000)
}

function scheduleDeferredCheck(ms: number) {
  if (scheduledCheckTimer) {
    clearTimeout(scheduledCheckTimer)
  }
  scheduledCheckTimer = setTimeout(() => {
    scheduledCheckTimer = null
    void autoUpdater.checkForUpdates().catch((e) => console.warn('[updater] checkForUpdates', e))
  }, ms)
}

let ipcRegistered = false

function registerIpc() {
  if (ipcRegistered) {
    return
  }
  ipcRegistered = true

  ipcMain.handle('update:download', () => {
    if (!updaterEnabled) {
      return { ok: false as const, message: '未配置更新源' }
    }
    // 不可 await：downloadUpdate 会持续至整包下完，会导致渲染进程长时间卡在「准备中」且收不到进度
    void autoUpdater.downloadUpdate().catch((err: Error) => {
      console.error('[updater] downloadUpdate', err)
      sendToRenderer('update-download-error', { message: err?.message || String(err) })
    })
    return { ok: true as const }
  })

  ipcMain.handle('update:quit-and-install', () => {
    if (!updaterEnabled) return { ok: false as const }
    autoUpdater.quitAndInstall(false, true)
    return { ok: true as const }
  })

  ipcMain.handle('update:check-manual', async () => {
    return runManualCheck()
  })

  ipcMain.handle('update:is-enabled', () => updaterEnabled)

  ipcMain.handle('update:notify-install-package-api-base', (_, apiBase: string) => {
    if (!app.isPackaged) {
      return { ok: true as const, ignored: true as const }
    }
    const cfg = readMergedUpdateConfig()
    if (resolveExplicitFeedUrl(cfg)) {
      return { ok: true as const, ignored: true as const }
    }
    if (cfg.fromInstallPackage !== true) {
      return { ok: false as const, reason: 'not-enabled' as const }
    }
    applyInstallPackageApiBase(String(apiBase || ''))
    return { ok: true as const }
  })
}

/** 须在 app.ready 之后、ipcMain 其它 handler 之前调用一次 */
export function initUpdater(): void {
  registerIpc()

  if (!app.isPackaged) {
    return
  }

  const cfg = readMergedUpdateConfig()
  const explicit = resolveExplicitFeedUrl(cfg)
  if (explicit) {
    enableGenericUpdater(explicit)
    scheduleDeferredCheck(8000)
    return
  }

  if (cfg.fromInstallPackage === true) {
    const persisted = readPersistedInstallPackageApiBase()
    if (persisted) {
      enableGenericUpdater(genericFeedFromApiBase(persisted))
      scheduleDeferredCheck(8000)
    } else {
      console.log('[updater] fromInstallPackage：等待渲染进程上报服务器地址（保存于登录配置后自动检查）')
    }
    return
  }

  console.log('[updater] 未配置 feedUrl / fromInstallPackage，跳过自动更新（可编辑 resources/update-feed.json）')
}

async function runManualCheck(): Promise<{ ok: boolean; message?: string }> {
  if (!updaterEnabled) {
    const cfg = readMergedUpdateConfig()
    const hint =
      cfg.fromInstallPackage === true && !resolveExplicitFeedUrl(cfg)
        ? '已启用「从后台安装包管理更新」，请先成功连接服务器（填写服务器地址并登录），或在本机 update-config.json 中设置 feedUrl。'
        : '未配置更新地址。请在 resources/update-feed.json 或用户目录 update-config.json 中设置 feedUrl，或启用 fromInstallPackage 并连接服务器。'
    await dialog.showMessageBox({
      type: 'info',
      title: '云同步',
      message: hint,
      buttons: ['确定']
    })
    return { ok: false, message: 'no-feed' }
  }
  manualCheckPending = true
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    manualCheckPending = false
    throw e
  }
  setTimeout(() => {
    manualCheckPending = false
  }, 8000)
  return { ok: true }
}

/** 托盘「检查更新」等主进程内调用 */
export function triggerManualUpdateCheck(): void {
  void runManualCheck().catch((e) => console.error('[updater] manual check', e))
}
