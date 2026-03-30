import request from './request'
import type { ApiResult } from './types'

/** 与后端 MenuVO 一致 */
export interface MenuVO {
  id: number
  pid: number
  title: string
  type: string
  permission?: string
  component?: string
  icon?: string
  name?: string
  redirect?: string
  sort?: number
  hidden?: boolean
  path?: string
  affix?: boolean
  keepAlive?: boolean
  createTime?: string
  children?: MenuVO[]
}

/** Layout 侧栏等沿用 */
export type MenuItem = MenuVO

export interface MenuParam {
  id?: number
  pid?: number
  title: string
  type: string
  permission?: string
  component?: string
  icon?: string
  name?: string
  redirect?: string
  sort?: number
  hidden?: boolean
  path?: string
  affix?: boolean
  keepAlive?: boolean
}

function assertOk(r: { data?: ApiResult }, msg: string) {
  if (r.data?.code !== 200) throw new Error(r.data?.message || msg)
}

/** 完整菜单树（管理端） */
export async function getMenuTree(): Promise<MenuVO[]> {
  const r = await request.get<ApiResult<MenuVO[]>>('/menu/getMenuTree')
  return r.data?.data ?? []
}

export function getUserMenuTree() {
  return request.get<ApiResult<MenuVO[]>>('/menu/getUserMenuTree').then(r => r.data?.data || [])
}

export async function addMenu(param: MenuParam) {
  const r = await request.post<ApiResult<boolean>>('/menu/add', param)
  assertOk(r, '新增失败')
}

export async function updateMenu(param: MenuParam & { id: number }) {
  const r = await request.post<ApiResult<boolean>>('/menu/update', param)
  assertOk(r, '保存失败')
}

export async function deleteMenu(id: number) {
  const r = await request.post<ApiResult<boolean>>(`/menu/delete/${id}`)
  assertOk(r, '删除失败')
}
