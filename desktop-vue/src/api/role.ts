import request from './request'
import type { ApiResult } from './types'

export interface RoleItem {
  id: number
  name: string
  code: string
  description?: string
  status?: number
}

export interface PageResult<T> {
  pageIndex: number
  pageSize: number
  total: number
  records: T[]
}

function assertOk(r: { data?: ApiResult }, msg: string) {
  if (r.data?.code !== 200) throw new Error(r.data?.message || msg)
}

export function getRolePageList(params: { pageIndex?: number; pageSize?: number; keyword?: string }) {
  return request.post<{ data: PageResult<RoleItem> }>('/role/getPageList', {
    pageIndex: params.pageIndex ?? 1,
    pageSize: params.pageSize ?? 10,
    keyword: params.keyword
  }).then(r => r.data?.data)
}

export function getAllRoles() {
  return request.get<ApiResult<RoleItem[]>>('/role/getAllRoles').then(r => r.data?.data || [])
}

export async function addRole(data: { name: string; code: string; description?: string }) {
  const r = await request.post<ApiResult<boolean>>('/role/add', data)
  assertOk(r, '新增失败')
}

export async function updateRole(data: { id: number; name: string; code: string; description?: string }) {
  const r = await request.post<ApiResult<boolean>>('/role/update', data)
  assertOk(r, '保存失败')
}

export async function deleteRole(id: number) {
  const r = await request.post<ApiResult<boolean>>(`/role/delete/${id}`)
  assertOk(r, '删除失败')
}

export async function toggleRoleStatus(id: number) {
  const r = await request.post<ApiResult<boolean>>(`/role/toggleStatus/${id}`)
  assertOk(r, '操作失败')
}

export function getRoleMenuIds(roleId: number) {
  return request.get<ApiResult<number[]>>(`/role/getRoleMenuIds/${roleId}`).then(r => r.data?.data || [])
}

export async function saveRoleMenus(roleId: number, menuIds: number[]) {
  const r = await request.post<ApiResult<boolean>>('/role/saveRoleMenus', { roleId, menuIds })
  assertOk(r, '保存失败')
}
