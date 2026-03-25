/**
 * 文件同步监听 - 运行在 Electron 主进程
 * 逻辑：登录后获取同步目录 → 与服务器 diff（只上传缺失/更新的）→ 持续监控，变动及时同步
 * 说明：不会根据「本地缺文件」删除服务端文件；仅上传方向。拉取需用户点「从云端拉取」。
 */
import chokidar from 'chokidar'
import path from 'path'
import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
import { pipeline } from 'stream/promises'
import { createWriteStream } from 'fs'
import { BrowserWindow, ipcMain } from 'electron'

/** 通知渲染进程刷新云端文件列表（与本地 chokidar 上传成功联动） */
function notifyRemoteFilesChanged() {
  BrowserWindow.getAllWindows().forEach(w => {
    if (!w.isDestroyed()) w.webContents.send('sync:remote-updated')
  })
}

let watchers: chokidar.FSWatcher[] = []
let token = ''
let baseUrl = 'http://192.168.31.73:6168'
let uploadQueue: Array<{ dirId: number; localPath: string; filePath: string }> = []
let processing = false

function getRelativePath(dirPath: string, filePath: string): string {
  const rel = path.relative(dirPath, filePath)
  return rel.replace(/\\/g, '/')
}

interface SyncFileMeta {
  relativePath: string
  size: number
  updateTime: string
  code?: string
}

function isPathInsideSyncRoot(syncRoot: string, absoluteFilePath: string): boolean {
  const root = path.resolve(syncRoot)
  const file = path.resolve(absoluteFilePath)
  const rel = path.relative(root, file)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/** 将服务端 relativePath 安全拼到本机同步根下，禁止 .. 越界 */
function safeFilePathUnderSyncRoot(syncRoot: string, relativePath: string): string {
  const normalized = String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('..')) {
    throw new Error('非法相对路径')
  }
  const full = path.resolve(syncRoot, normalized)
  if (!isPathInsideSyncRoot(syncRoot, full)) {
    throw new Error('路径越界')
  }
  return full
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

async function fetchServerFileList(dirId: number): Promise<Map<string, SyncFileMeta>> {
  try {
    const r = await axios.get(`${baseUrl}/file/listBySyncDir?syncDirectoryId=${dirId}`, {
      headers: { Authorization: token }
    })
    if (r.data?.code !== 200) return new Map()
    const list: SyncFileMeta[] = r.data.data || []
    const map = new Map<string, SyncFileMeta>()
    for (const f of list) {
      map.set(f.relativePath, f)
    }
    return map
  } catch (e) {
    console.error('Fetch server file list failed:', dirId, e)
    return new Map()
  }
}

function parseServerTime(s: string): number {
  if (!s) return 0
  const d = new Date(s.replace(' ', 'T'))
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

function needUpload(
  relPath: string,
  localSize: number,
  localMtime: number,
  serverMap: Map<string, SyncFileMeta>
): boolean {
  const server = serverMap.get(relPath)
  if (!server) return true
  if (server.size !== localSize) return true
  const serverTime = parseServerTime(server.updateTime)
  if (localMtime > serverTime) return true
  return false
}

/** 递归扫描目录，与服务器 diff，只将缺失/更新的文件加入队列 */
function queueAllFilesWithDiff(
  dirId: number,
  syncRoot: string,
  currentDir: string,
  serverMap: Map<string, SyncFileMeta>
) {
  try {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const ent of entries) {
      const fullPath = path.join(currentDir, ent.name)
      if (ent.isDirectory()) {
        if (!ent.name.startsWith('.')) {
          queueAllFilesWithDiff(dirId, syncRoot, fullPath, serverMap)
        }
      } else {
        const relPath = getRelativePath(syncRoot, fullPath)
        const stats = fs.statSync(fullPath)
        if (needUpload(relPath, stats.size, stats.mtimeMs, serverMap)) {
          uploadQueue.push({ dirId, localPath: syncRoot, filePath: fullPath })
        }
      }
    }
  } catch (e) {
    console.error('Scan dir failed:', currentDir, e)
  }
}

async function uploadFile(filePath: string, dirId: number, relativePath: string) {
  const stats = fs.statSync(filePath)
  if (stats.isDirectory()) return
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath), path.basename(filePath))
  const headers = { ...form.getHeaders(), Authorization: token }
  await axios.post(
    `${baseUrl}/file/uploadForSync?syncDirectoryId=${dirId}&relativePath=${encodeURIComponent(relativePath)}`,
    form,
    { headers }
  )
}

async function processQueue() {
  if (processing || uploadQueue.length === 0) return
  processing = true
  const item = uploadQueue.shift()
  if (!item) {
    processing = false
    return
  }
  try {
    await uploadFile(item.filePath, item.dirId, getRelativePath(item.localPath, item.filePath))
    console.log('Synced:', item.filePath)
    notifyRemoteFilesChanged()
  } catch (e) {
    console.error('Upload failed:', item.filePath, e)
  }
  processing = false
  if (uploadQueue.length > 0) setTimeout(processQueue, 200)
}

function onFileEvent(dirId: number, localPath: string, filePath: string) {
  uploadQueue.push({ dirId, localPath, filePath })
  processQueue()
}

export function initSyncWatcher() {
  ipcMain.handle('sync:config', (_, config: { token: string; baseUrl: string }) => {
    token = config.token
    baseUrl = config.baseUrl.replace(/\/$/, '')
  })

  ipcMain.handle('sync:start', async (_, dirs: Array<{ id: number; localPath: string }>) => {
    watchers.forEach(w => w.close())
    watchers = []
    uploadQueue.length = 0

    for (const dir of dirs) {
      if (!dir.localPath || !fs.existsSync(dir.localPath)) continue

      const serverMap = await fetchServerFileList(dir.id)
      queueAllFilesWithDiff(dir.id, dir.localPath, dir.localPath, serverMap)

      const w = chokidar.watch(dir.localPath, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true
      })
      w.on('add', (fp: string) => onFileEvent(dir.id, dir.localPath, fp))
      w.on('change', (fp: string) => onFileEvent(dir.id, dir.localPath, fp))
      watchers.push(w)
    }

    processQueue()
  })

  ipcMain.handle('sync:stop', () => {
    watchers.forEach(w => w.close())
    watchers = []
    uploadQueue.length = 0
  })

  /**
   * 将某同步目录在服务端已有的文件按相对路径下载到本地（不删服务端、不删本地其它文件）。
   * 两次请求之间短暂间隔，减轻与登录拦截器同 URL 限频的冲突。
   */
  ipcMain.handle(
    'sync:pullFromCloud',
    async (
      _,
      payload: { dirId: number; localPath: string }
    ): Promise<{ ok: boolean; downloaded: number; failed: number; message?: string }> => {
      const { dirId, localPath } = payload
      if (!token || !baseUrl) {
        return { ok: false, downloaded: 0, failed: 0, message: '未登录或未配置服务地址' }
      }
      if (!localPath || !fs.existsSync(localPath)) {
        return { ok: false, downloaded: 0, failed: 0, message: '本地目录不存在' }
      }
      const stat = fs.statSync(localPath)
      if (!stat.isDirectory()) {
        return { ok: false, downloaded: 0, failed: 0, message: '本地路径不是文件夹' }
      }
      let rows: Array<{ code?: string; relativePath?: string }> = []
      try {
        const r = await axios.get(`${baseUrl}/file/listBySyncDir?syncDirectoryId=${dirId}`, {
          headers: { Authorization: token }
        })
        if (r.data?.code !== 200) {
          return { ok: false, downloaded: 0, failed: 0, message: r.data?.message || '获取文件列表失败' }
        }
        rows = r.data.data || []
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '请求失败'
        return { ok: false, downloaded: 0, failed: 0, message: msg }
      }

      let downloaded = 0
      let failed = 0
      for (const row of rows) {
        const code = row.code
        const rel = row.relativePath
        if (!code || !rel) {
          failed++
          continue
        }
        let dest: string
        try {
          dest = safeFilePathUnderSyncRoot(localPath, rel)
        } catch {
          failed++
          continue
        }
        const dir = path.dirname(dest)
        try {
          fs.mkdirSync(dir, { recursive: true })
          const res = await axios.get(`${baseUrl}/file/${code}`, {
            headers: { Authorization: token },
            responseType: 'stream',
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: s => s === 200
          })
          await pipeline(res.data, createWriteStream(dest))
          downloaded++
        } catch (e) {
          console.error('Pull file failed:', rel, e)
          failed++
        }
        await sleep(350)
      }
      notifyRemoteFilesChanged()
      return {
        ok: failed === 0,
        downloaded,
        failed,
        message: `已下载 ${downloaded} 个${failed ? `，失败 ${failed} 个` : ''}`
      }
    }
  )
}
