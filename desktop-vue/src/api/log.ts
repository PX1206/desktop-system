import request from './request'

export interface LogItem {
  id: number
  userName?: string
  name?: string
  path?: string
  requestMethod?: string
  createTime?: string
  success?: boolean
}

export interface PageResult<T> {
  pageIndex: number
  pageSize: number
  total: number
  records: T[]
}

export function getLogPageList(params: { pageIndex?: number; pageSize?: number; userName?: string; name?: string }) {
  return request.post<{ data: PageResult<LogItem> }>('/sysOperationLog/getPageList', {
    pageIndex: params.pageIndex ?? 1,
    pageSize: params.pageSize ?? 10,
    userName: params.userName,
    name: params.name
  }).then(r => r.data?.data)
}
