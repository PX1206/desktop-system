import request from './request'

export interface MenuItem {
  id: number
  pid: number
  title: string
  type: string
  path?: string
  component?: string
  icon?: string
  name?: string
  children?: MenuItem[]
}

export function getUserMenuTree() {
  return request.get<{ data: MenuItem[] }>('/menu/getUserMenuTree').then(r => r.data?.data || [])
}
