import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'
import { initAutoLauncher, readAutoLaunchPref, setAutoLaunch } from './autoLaunch'
import { initSyncWatcher } from './syncWatcher'
import { initUpdater, setUpdateWindowGetter, triggerManualUpdateCheck } from './updater'

initSyncWatcher()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 720,
    minWidth: 880,
    minHeight: 520,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../public/icon.ico')
  })

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:6173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // <a target="_blank">：网盘下载链接 /file/{code} 走 downloadURL，避免空白子窗；普通 https 用系统浏览器打开。
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      try {
        const pathname = new URL(url).pathname.replace(/\/$/, '')
        const isFileDownload = /^\/file\/[A-Za-z0-9]+$/.test(pathname)
        if (isFileDownload) {
          mainWindow?.webContents.downloadURL(url)
        } else {
          void shell.openExternal(url)
        }
      } catch (e) {
        console.error('window open handler:', e)
        void shell.openExternal(url)
      }
      return { action: 'deny' }
    }
    return { action: 'deny' }
  })

  mainWindow.on('close', (e) => {
    if (tray && !isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.ico')
  tray = new Tray(iconPath)
  tray.setToolTip('云同步')
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开', click: () => mainWindow?.show() },
      { label: '检查更新', click: () => triggerManualUpdateCheck() },
      { label: '退出', click: () => { isQuitting = true; app.quit() } }
    ])
  )
}

// 检测本机路径是否为已存在的目录（用于换电脑后提示「路径无效」）
ipcMain.handle('path-exists', (_, dirPath: string) => {
  try {
    return !!(dirPath && fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory())
  } catch {
    return false
  }
})

// 选择目录
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

// 开机自启
ipcMain.handle('get-auto-launch', () => readAutoLaunchPref())
ipcMain.handle('set-auto-launch', (_, enabled: boolean) => setAutoLaunch(enabled))

const autoLoginFilePath = () => path.join(app.getPath('userData'), 'auto-login.sec')

/** 勾选开机自启时用系统密钥链加密保存账号密码，用于 token 失效后静默重新登录（仅账号登录） */
ipcMain.handle(
  'save-auto-login',
  (_, creds: { username: string; password: string }) => {
    if (!safeStorage.isEncryptionAvailable()) return false
    try {
      const payload = JSON.stringify({
        username: String(creds.username || ''),
        password: String(creds.password || '')
      })
      fs.writeFileSync(autoLoginFilePath(), safeStorage.encryptString(payload))
      return true
    } catch (e) {
      console.error('save-auto-login', e)
      return false
    }
  }
)

ipcMain.handle('load-auto-login', () => {
  const fp = autoLoginFilePath()
  if (!fs.existsSync(fp) || !safeStorage.isEncryptionAvailable()) return null
  try {
    const buf = fs.readFileSync(fp)
    const json = safeStorage.decryptString(buf)
    const o = JSON.parse(json) as { username?: string; password?: string }
    if (!o?.username || !o?.password) return null
    return { username: o.username, password: o.password }
  } catch (e) {
    console.error('load-auto-login', e)
    return null
  }
})

ipcMain.handle('clear-auto-login', () => {
  try {
    const fp = autoLoginFilePath()
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch {
    // ignore
  }
})

app.whenReady().then(() => {
  // Windows / Linux：去掉默认 File、Edit、View 等菜单栏（退出请用托盘或右上角）
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  }
  initAutoLauncher()
  createWindow()
  setUpdateWindowGetter(() => mainWindow)
  initUpdater()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
