/**
 * 开机自启：Windows 通过注册表，macOS/Linux 通过 autostart 桌面项
 */
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

const AUTO_LAUNCH_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const APP_NAME = 'DesktopSyncClient'

function autoLaunchConfigPath(): string {
  return path.join(app.getPath('userData'), 'autoLaunch.json')
}

export function initAutoLauncher() {
  try {
    const configPath = autoLaunchConfigPath()
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      setAutoLaunch(!!data.enabled)
    }
  } catch (_) {
    // ignore
  }
}

function saveAutoLaunchPref(enabled: boolean) {
  try {
    fs.writeFileSync(autoLaunchConfigPath(), JSON.stringify({ enabled }))
  } catch (_) {
    // ignore
  }
}

/** Windows：用参数数组调 reg，避免 cmd 下中文路径/编码导致 reg add 失败 */
function winRegQueryValue(): boolean {
  try {
    const { execFileSync } = require('child_process')
    execFileSync(
      'reg',
      ['query', AUTO_LAUNCH_KEY, '/v', APP_NAME],
      { encoding: 'utf-8', windowsHide: true }
    )
    return true
  } catch {
    return false
  }
}

function winRegAddValue(exePath: string): void {
  const { execFileSync } = require('child_process')
  execFileSync(
    'reg',
    ['add', AUTO_LAUNCH_KEY, '/v', APP_NAME, '/t', 'REG_SZ', '/d', exePath, '/f'],
    { windowsHide: true }
  )
}

function winRegDeleteValue(): void {
  const { execFileSync } = require('child_process')
  try {
    execFileSync(
      'reg',
      ['delete', AUTO_LAUNCH_KEY, '/v', APP_NAME, '/f'],
      { stdio: 'ignore', windowsHide: true }
    )
  } catch {
    // 项不存在时失败，忽略
  }
}

/** 系统里是否已写入自启项（注册表 / 桌面文件） */
export function isAutoLaunchApplied(): boolean {
  if (process.platform === 'win32') {
    return winRegQueryValue()
  }
  if (process.platform === 'darwin') {
    const plistPath = path.join(process.env.HOME || '', 'Library', 'LaunchAgents', 'com.desktop.sync.plist')
    return fs.existsSync(plistPath)
  }
  if (process.platform === 'linux') {
    const desktopPath = path.join(process.env.HOME || '', '.config', 'autostart', 'desktop-sync-client.desktop')
    return fs.existsSync(desktopPath)
  }
  return false
}

/**
 * 界面勾选状态：以 userData 下 autoLaunch.json 为准（与 setAutoLaunch 同步写入）；
 * 无 json 时回退到检测系统（兼容早期只写注册表、未写 json 的版本）。
 */
export function readAutoLaunchPref(): boolean {
  try {
    const p = autoLaunchConfigPath()
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
      return !!data.enabled
    }
  } catch (_) {
    // ignore
  }
  return isAutoLaunchApplied()
}

export function setAutoLaunch(enabled: boolean): void {
  saveAutoLaunchPref(enabled)
  const exePath = app.getPath('exe')
  if (process.platform === 'win32') {
    try {
      if (enabled) {
        winRegAddValue(exePath)
      } else {
        winRegDeleteValue()
      }
    } catch (e) {
      console.error('AutoLaunch error:', e)
    }
  } else if (process.platform === 'darwin') {
    const autostartDir = path.join(process.env.HOME || '', 'Library', 'LaunchAgents')
    const plistPath = path.join(autostartDir, 'com.desktop.sync.plist')
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true })
    }
    if (enabled) {
      const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.desktop.sync</string>
  <key>ProgramArguments</key>
  <array><string>${exePath}</string></array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>`
      fs.writeFileSync(plistPath, plist)
    } else if (fs.existsSync(plistPath)) {
      fs.unlinkSync(plistPath)
    }
  } else if (process.platform === 'linux') {
    const autostartDir = path.join(process.env.HOME || '', '.config', 'autostart')
    const desktopPath = path.join(autostartDir, 'desktop-sync-client.desktop')
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true })
    }
    if (enabled) {
      const desktop = `[Desktop Entry]
Type=Application
Name=云同步
Exec=${exePath}
X-GNOME-Autostart-enabled=true
`
      fs.writeFileSync(desktopPath, desktop)
    } else if (fs.existsSync(desktopPath)) {
      fs.unlinkSync(desktopPath)
    }
  }
}
