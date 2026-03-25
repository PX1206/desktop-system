import request from './request'

export interface FileItem {
  code: string
  name: string
  type?: number
  url?: string
  suffix?: string
  size?: number
  createTime?: string
  lastSyncTime?: string
  createBy?: string
  syncDirectoryId?: number
  relativePath?: string
}

export interface FilePageResult {
  pageIndex: number
  pageSize: number
  total: number
  records: FileItem[]
}

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

export async function getDirectoryTree() {
  const r = await request.get('/file/directoryTree')
  if (r.data?.code !== 200) throw new Error(r.data?.message || '获取失败')
  return r.data.data as DirectoryTreeNode[]
}

export async function getFileList(params: {
  pageIndex?: number
  pageSize?: number
  name?: string
  type?: number
  syncDirectoryId?: number
  relativePath?: string
}) {
  const r = await request.post('/file/getPageList', {
    pageIndex: params.pageIndex ?? 1,
    pageSize: params.pageSize ?? 20,
    name: params.name,
    type: params.type,
    syncDirectoryId: params.syncDirectoryId,
    relativePath: params.relativePath
  })
  if (r.data?.code !== 200) throw new Error(r.data?.message || '获取失败')
  return r.data.data as FilePageResult
}

function apiBase(): string {
  return (import.meta as ImportMeta & { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? '/api'
}

export function getDownloadUrl(code: string): string {
  const base = apiBase()
  const token = localStorage.getItem('token')
  return `${base}/file/${code}${token ? `?Authorization=${encodeURIComponent(token)}` : ''}`
}

/** 解析 POST /file/upload 返回路径中的文件 code */
export function fileCodeFromUploadPath(serverPath: string): string | null {
  const m = String(serverPath).trim().match(/\/file\/([A-Za-z0-9]+)/)
  return m ? m[1] : null
}

/** 上传返回的路径转为前端可访问 URL（走代理与 Authorization） */
export function headImgUrlFromUploadResult(serverPath: string): string {
  const code = fileCodeFromUploadPath(serverPath)
  if (code) return getDownloadUrl(code)
  return serverPath
}

/** 文件管理：通用上传（与后台 FileController /file/upload 一致） */
export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await request.post<{ code: number; data: string; message?: string }>('/file/upload', fd)
  if (r.data?.code !== 200) throw new Error(r.data?.message || '上传失败')
  const path = r.data.data
  if (!path) throw new Error('上传未返回文件地址')
  return path
}
