import axios from 'axios'

function defaultApiBase(): string {
  const v = (import.meta.env.VITE_DEFAULT_API_BASE || 'http://localhost:6168').trim()
  return v.replace(/\/+$/, '')
}

// 默认由 .env 注入；登录可改
const API_BASE = defaultApiBase()

/** 与 Web 端 /file/directoryTree 一致 */
export interface DirectoryTreeNode {
  syncDirectoryId: number
  relativePath: string
  displayName: string
  ownerName?: string
  userId?: number
  createTime?: string
  lastSyncTime?: string
  children: DirectoryTreeNode[]
}

/** 与 Web 端 GET /user/userInfo 一致（节选） */
export interface UserInfoVO {
  username?: string
  nickname?: string
  mobile?: string
  role?: string
  loginTime?: string
  headImg?: string
  userNo?: string
  /** 同步文件总配额（字节） */
  syncQuotaBytes?: number
  /** 已用同步空间（字节） */
  syncUsedBytes?: number
}

/** 与 Web 端文件分页记录一致 */
export interface CloudFileItem {
  code: string
  name: string
  type?: number
  url?: string
  suffix?: string
  size?: number
  createTime?: string
  lastSyncTime?: string
}

let token = ''
let baseUrl = API_BASE

function getHeaders() {
  const h: Record<string, string> = {}
  if (token) h.Authorization = token
  return h
}

/**
 * 将 user.headImg 转为桌面端可加载的绝对地址。
 * Web 管理端常存为 `/api/file/{code}?Authorization=...`，在 Electron 里会指向 devserver/file 协议错误 origin；
 * 这里解析出 file code，用当前登录的 apiBase + token 重新拼接（与云端文件下载规则一致）。
 */
export function resolveHeadImgUrl(
  headImg: string | undefined | null,
  apiBase: string,
  authToken: string
): string {
  if (!headImg || !String(headImg).trim()) return ''
  const s = String(headImg).trim()
  if (s.startsWith('data:image/')) return s

  const m = s.match(/\/file\/([A-Za-z0-9]+)/)
  if (m && authToken) {
    const base = apiBase.replace(/\/$/, '')
    return `${base}/file/${m[1]}?Authorization=${encodeURIComponent(authToken)}`
  }

  if (/^https?:\/\//i.test(s)) return s

  if (s.startsWith('/')) {
    return `${apiBase.replace(/\/$/, '')}${s}`
  }

  return s
}

// 简单 RSA 加密（使用 Web Crypto API 或 jsencrypt）
async function rsaEncrypt(plainText: string, publicKeyBase64: string): Promise<string> {
  const keyData = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-1' },
    false,
    ['encrypt']
  )
  const encoder = new TextEncoder()
  const data = encoder.encode(plainText)
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data)
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

export const api = {
  setBase(url: string) {
    baseUrl = url.replace(/\/$/, '')
  },
  setToken(t: string) {
    token = t
  },
  async getPublicKey(): Promise<string> {
    const r = await axios.get(`${baseUrl}/open/rsaPublicKey`, { headers: getHeaders() })
    if (r.data?.code !== 200) throw new Error('获取公钥失败')
    return r.data.data?.publicKey || ''
  },
  async login(serverBase: string, username: string, password: string) {
    baseUrl = serverBase.replace(/\/$/, '')
    const publicKey = await this.getPublicKey()
    // 后端要求格式：13位时间戳 + 密码（防重放）
    const plain = String(Date.now()).padStart(13, '0') + password
    const encryptedPwd = await rsaEncrypt(plain, publicKey)
    const r = await axios.post(`${baseUrl}/user/login/password`, {
      username,
      password: encryptedPwd
    }, { headers: getHeaders() })
    if (r.data?.code !== 200) throw new Error(r.data?.message || '登录失败')
    const vo = r.data.data
    token = vo.token
    return { token: vo.token }
  },
  async smsLogin(serverBase: string, mobile: string, smsCode: string) {
    baseUrl = serverBase.replace(/\/$/, '')
    const r = await axios.post(
      `${baseUrl}/user/login/sms`,
      { mobile, smsCode },
      { headers: getHeaders() }
    )
    if (r.data?.code !== 200) throw new Error(r.data?.message || '登录失败')
    const vo = r.data.data
    token = vo.token
    return { token: vo.token }
  },
  async getCaptcha(): Promise<{ key: string; image: string }> {
    const r = await axios.get(`${baseUrl}/captcha/getPictureCode`, { headers: getHeaders() })
    if (r.data?.code !== 200) throw new Error(r.data?.message || '获取图形验证码失败')
    const d = r.data.data
    if (!d?.key || !d?.image) throw new Error('获取图形验证码失败')
    return { key: d.key, image: d.image }
  },
  async getSmsCode(mobile: string, key: string, pictureCode: string) {
    const r = await axios.post(
      `${baseUrl}/sms/getCode`,
      { mobile, key, pictureCode },
      { headers: getHeaders() }
    )
    if (r.data?.code !== 200) throw new Error(r.data?.message || '获取短信验证码失败')
    return r.data.data
  },
  async register(
    serverBase: string,
    data: {
      username: string
      password: string
      nickname?: string
      mobile: string
      smsCode: string
    }
  ) {
    baseUrl = serverBase.replace(/\/$/, '')
    const publicKey = await this.getPublicKey()
    const plain = String(Date.now()).padStart(13, '0') + data.password
    const encryptedPwd = await rsaEncrypt(plain, publicKey)
    const r = await axios.post(
      `${baseUrl}/user/register`,
      {
        username: data.username,
        password: encryptedPwd,
        nickname: data.nickname,
        mobile: data.mobile,
        smsCode: data.smsCode
      },
      { headers: getHeaders() }
    )
    if (r.data?.code !== 200) throw new Error(r.data?.message || '注册失败')
    return r.data.data
  },
  async getSyncDirs() {
    const r = await axios.get(`${baseUrl}/syncDirectory/list`, {
      headers: getHeaders()
    })
    if (r.data?.code !== 200) throw new Error(r.data?.message || '获取列表失败')
    return r.data.data || []
  },
  async addSyncDir(localPath: string, displayName?: string) {
    const r = await axios.post(
      `${baseUrl}/syncDirectory/add`,
      new URLSearchParams({ localPath, displayName: displayName || '' }),
      { headers: { ...getHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    if (r.data?.code !== 200) throw new Error(r.data?.message || '添加失败')
    return r.data.data
  },
  async removeSyncDir(id: number) {
    const r = await axios.post(`${baseUrl}/syncDirectory/remove/${id}`, null, {
      headers: getHeaders()
    })
    if (r.data?.code !== 200) throw new Error(r.data?.message || '移除失败')
    return r.data.data
  },

  /** 换电脑后把同步项改到本机实际文件夹（不删云端文件） */
  async updateSyncDirPath(id: number, localPath: string) {
    const r = await axios.post(
      `${baseUrl}/syncDirectory/updatePath`,
      new URLSearchParams({ id: String(id), localPath }),
      { headers: { ...getHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    if (r.data?.code !== 200) throw new Error(r.data?.message || '更新路径失败')
    return r.data.data
  },

  /** 当前用户在服务端的同步目录树（与普通用户 Web 文件页一致） */
  async getDirectoryTree(): Promise<DirectoryTreeNode[]> {
    const r = await axios.get(`${baseUrl}/file/directoryTree`, { headers: getHeaders() })
    if (r.data?.code !== 200) throw new Error(r.data?.message || '获取目录失败')
    return r.data.data || []
  },

  async getFilePageList(params: {
    pageIndex?: number
    pageSize?: number
    name?: string
    syncDirectoryId?: number
    relativePath?: string
  }): Promise<{ total: number; records: CloudFileItem[] }> {
    const r = await axios.post(
      `${baseUrl}/file/getPageList`,
      {
        pageIndex: params.pageIndex ?? 1,
        pageSize: params.pageSize ?? 20,
        name: params.name,
        syncDirectoryId: params.syncDirectoryId,
        relativePath: params.relativePath
      },
      { headers: getHeaders() }
    )
    if (r.data?.code !== 200) throw new Error(r.data?.message || '获取文件列表失败')
    const data = r.data.data
    return {
      total: data?.total ?? 0,
      records: data?.records ?? []
    }
  },

  /** 浏览器内打开下载/预览（附加 Authorization 查询参数） */
  fileDownloadUrl(code: string): string {
    const t = encodeURIComponent(token)
    return `${baseUrl}/file/${code}?Authorization=${t}`
  },

  /** 当前登录用户资料 */
  async getUserInfo(): Promise<UserInfoVO | null> {
    const r = await axios.get(`${baseUrl}/user/userInfo`, { headers: getHeaders() })
    if (r.data?.code !== 200) return null
    return r.data.data || null
  }
}

// 同步服务：通过 Electron 主进程的 syncWatcher 实现
declare global {
  interface Window {
    electronAPI?: {
      syncConfig: (config: { token: string; baseUrl: string }) => Promise<void>
      syncStart: (dirs: Array<{ id: number; localPath: string }>) => Promise<void>
      syncStop: () => Promise<void>
      onSyncRemoteUpdated?: (callback: () => void) => () => void
    }
  }
}

export const syncService = {
  async startWatching(dirs: Array<{ id: number; localPath: string; displayName?: string }>, token: string, baseUrl: string) {
    this.stop()
    const plainConfig = { token: String(token), baseUrl: String(baseUrl) }
    const plainDirs = dirs.map(d => ({ id: Number(d.id), localPath: String(d.localPath) }))
    await window.electronAPI?.syncConfig(plainConfig)
    await window.electronAPI?.syncStart(plainDirs)
  },
  async restart(dirs: Array<{ id: number; localPath: string }>, token: string, baseUrl: string) {
    this.stop()
    await this.startWatching(dirs, token, baseUrl)
  },
  stop() {
    window.electronAPI?.syncStop()
  }
}
