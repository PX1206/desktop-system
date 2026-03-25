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

/** 当前站点可访问的公开下载链接（与列表接口返回的 downloadUrl 二选一） */
export function buildPublicDownloadUrl(downloadCode: string): string {
  const base = String((import.meta as any).env?.VITE_API_BASE ?? '/api').replace(/\/$/, '')
  const prefix = base.startsWith('http') ? base : `${window.location.origin}${base.startsWith('/') ? base : '/' + base}`
  return `${prefix}/open/installPackage/download/${downloadCode}`
}
