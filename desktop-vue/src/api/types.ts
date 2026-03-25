/** 后端统一响应（与 Java ApiResult 一致） */
export interface ApiResult<T = unknown> {
  code: number
  message?: string
  data?: T
  success?: boolean
}
