import request from './request'

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

export function getRolePageList(params: { pageIndex?: number; pageSize?: number; keyword?: string }) {
  return request.post<{ data: PageResult<RoleItem> }>('/role/getPageList', {
    pageIndex: params.pageIndex ?? 1,
    pageSize: params.pageSize ?? 10,
    keyword: params.keyword
  }).then(r => r.data?.data)
}

export function getAllRoles() {
  return request.get<{ data: RoleItem[] }>('/role/getAllRoles').then(r => r.data?.data || [])
}

export function addRole(data: { name: string; code: string; description?: string }) {
  return request.post('/role/add', data)
}

export function updateRole(data: { id: number; name: string; code: string; description?: string }) {
  return request.post('/role/update', data)
}

export function deleteRole(id: number) {
  return request.post(`/role/delete/${id}`)
}

export function toggleRoleStatus(id: number) {
  return request.post(`/role/toggleStatus/${id}`)
}

export function getRoleMenuIds(roleId: number) {
  return request.get<{ data: number[] }>(`/role/getRoleMenuIds/${roleId}`).then(r => r.data?.data || [])
}

export function saveRoleMenus(roleId: number, menuIds: number[]) {
  return request.post('/role/saveRoleMenus', { roleId, menuIds })
}
