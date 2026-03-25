import axios from 'axios'
import request from './request'

export interface InstallPackageItem {
  id: number
  downloadCode: string
  fileName: string
  suffix?: string
  fileSize: number
  versionLabel?: string
  remark?: string
  /** 后端可能为 ISO 字符串或毫秒时间戳（数字） */
  createTime?: string | number
  downloadUrl?: string
}

export interface PageResult<T> {
  pageIndex: number
  pageSize: number
  total: number
  records: T[]
}

export function getInstallPackagePageList(params: {
  pageIndex?: number
  pageSize?: number
  keyword?: string
}) {
  return request
    .post<{ data: PageResult<InstallPackageItem> }>('/installPackage/getPageList', {
      pageIndex: params.pageIndex ?? 1,
      pageSize: params.pageSize ?? 10,
      keyword: params.keyword || undefined
    })
    .then(r => r.data?.data)
}

export function uploadInstallPackage(file: File, versionLabel?: string, remark?: string) {
  const fd = new FormData()
  fd.append('file', file)
  if (versionLabel) fd.append('versionLabel', versionLabel)
  if (remark) fd.append('remark', remark)
  return request.post<{ data: boolean }>('/installPackage/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000
  })
}

export async function deleteInstallPackage(id: number) {
  const r = await request.post<{ code?: number; message?: string; data?: boolean }>(
    `/installPackage/delete/${id}`
  )
  if (r.data?.code !== undefined && r.data.code !== 200) {
    throw new Error(r.data.message || '删除失败')
  }
  return r.data?.data
}

function apiOriginPrefix(): string {
  const base = String((import.meta as any).env?.VITE_API_BASE ?? '/api').replace(/\/$/, '')
  return base.startsWith('http') ? base : `${window.location.origin}${base.startsWith('/') ? base : '/' + base}`
}

/** 当前站点可访问的公开下载链接（与列表接口返回的 downloadUrl 二选一） */
export function buildPublicDownloadUrl(downloadCode: string): string {
  return `${apiOriginPrefix()}/open/installPackage/download/${downloadCode}`
}

/**
 * 含展示文件名（须与库中一致），与 electron-updater / 后台 latest.yml 路径一致，便于浏览器保存正确扩展名。
 */
export function buildPublicDownloadUrlWithFileName(downloadCode: string, fileName: string): string {
  return `${apiOriginPrefix()}/open/installPackage/download/${downloadCode}/${encodeURIComponent(fileName)}`
}

/** 公开接口 GET /open/installPackage/latest-info 的 data，与后台「最新 .exe + 语义化版本」规则一致 */
export interface OpenLatestInstallInfo {
  version: string
  versionLabel?: string
  fileName: string
  downloadCode: string
  fileSize?: number
}

/**
 * 无需登录；失败或无可下载包时返回 null（登录页等静默隐藏即可）。
 */
export async function fetchLatestDesktopInstallInfo(): Promise<OpenLatestInstallInfo | null> {
  try {
    const { data } = await axios.get<{ success?: boolean; data?: OpenLatestInstallInfo }>(
      `${apiOriginPrefix()}/open/installPackage/latest-info`,
      { timeout: 15000 }
    )
    if (data?.success && data?.data?.downloadCode && data?.data?.fileName) {
      return data.data
    }
    return null
  } catch {
    return null
  }
}
