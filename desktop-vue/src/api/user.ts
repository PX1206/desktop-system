import request from './request'
import type { ApiResult } from './types'

export async function getRsaPublicKey() {
  const r = await request.get<ApiResult<{ publicKey: string }>>('/open/rsaPublicKey')
  return r.data?.data?.publicKey || ''
}

/** 与登录/注册一致：13 位时间戳 + 明文密码，再 RSA 加密 */
export async function encryptPasswordPlain(plainPassword: string): Promise<string> {
  const publicKey = await getRsaPublicKey()
  const plain = String(Date.now()).padStart(13, '0') + plainPassword
  return rsaEncrypt(plain, publicKey)
}

/** 与后端 RSAUtil：RSA/ECB/OAEPWithSHA-1AndMGF1Padding 一致 */
async function rsaEncryptSubtle(plain: string, publicKeyBase64: string): Promise<string> {
  const subtle = globalThis.crypto!.subtle
  const keyData = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0))
  const key = await subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-1' },
    false,
    ['encrypt']
  )
  const enc = new TextEncoder()
  const encrypted = await subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    enc.encode(plain)
  )
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

/** 非安全上下文（如 http://192.168.x.x）无 crypto.subtle 时使用，算法与上面一致 */
async function rsaEncryptForge(plain: string, publicKeyBase64: string): Promise<string> {
  const forge = (await import('node-forge')).default
  const der = forge.util.decode64(publicKeyBase64)
  const asn1 = forge.asn1.fromDer(der)
  const publicKey = forge.pki.publicKeyFromAsn1(asn1)
  const encrypted = publicKey.encrypt(forge.util.encodeUtf8(plain), 'RSA-OAEP', {
    md: forge.md.sha1.create(),
    mgf1: { md: forge.md.sha1.create() }
  })
  return forge.util.encode64(encrypted)
}

async function rsaEncrypt(plain: string, publicKeyBase64: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    return rsaEncryptSubtle(plain, publicKeyBase64)
  }
  return rsaEncryptForge(plain, publicKeyBase64)
}

export interface UserItem {
  id: number
  userNo?: string
  username: string
  nickname?: string
  mobile?: string
  status?: number
  createTime?: string
  loginTime?: string
  /** 同步空间配额（字节） */
  syncQuotaBytes?: number
  /** 已用同步空间（字节） */
  syncUsedBytes?: number
}

export interface UserDetail extends UserItem {
  headImg?: string
  sex?: number
  birthday?: string
  address?: string
  role?: string
  syncQuotaBytes?: number
  syncUsedBytes?: number
}

export interface PageResult<T> {
  pageIndex: number
  pageSize: number
  total: number
  records: T[]
}

export async function login(username: string, password: string) {
  const publicKey = await getRsaPublicKey()
  // 后端要求格式：13位时间戳 + 密码（防重放）
  const plain = String(Date.now()).padStart(13, '0') + password
  const encryptedPwd = await rsaEncrypt(plain, publicKey)
  const r = await request.post<ApiResult<{ token: string }>>('/user/login/password', {
    username,
    password: encryptedPwd
  })
  if (r.data?.code !== 200) throw new Error(r.data?.message || '登录失败')
  return r.data.data
}

export async function smsLogin(mobile: string, smsCode: string) {
  const r = await request.post<ApiResult<{ token: string }>>('/user/login/sms', {
    mobile,
    smsCode
  })
  if (r.data?.code !== 200) throw new Error(r.data?.message || '登录失败')
  return r.data.data
}

export async function register(data: { username: string; password: string; nickname?: string; mobile: string; smsCode: string }) {
  const publicKey = await getRsaPublicKey()
  const plain = String(Date.now()).padStart(13, '0') + data.password
  const encryptedPwd = await rsaEncrypt(plain, publicKey)
  const r = await request.post('/user/register', {
    username: data.username,
    password: encryptedPwd,
    nickname: data.nickname,
    mobile: data.mobile,
    smsCode: data.smsCode
  })
  if (r.data?.code !== 200) throw new Error(r.data?.message || '注册失败')
  return r.data.data
}

export function logout() {
  localStorage.removeItem('token')
}

function assertOk(r: { data?: { code?: number; message?: string } }, fallback: string) {
  if (r.data?.code !== 200) throw new Error(r.data?.message || fallback)
}

export function getUserPageList(params: { pageIndex?: number; pageSize?: number; keyword?: string }) {
  return request.post<{ data: PageResult<UserItem> }>('/user/getPageList', {
    pageIndex: params.pageIndex ?? 1,
    pageSize: params.pageSize ?? 10,
    keyword: params.keyword
  }).then(r => r.data?.data)
}

/** 合并同 URL 的并发请求，避免与 Layout/子页同时拉取用户信息时触发后端「同 URL 500ms 限频」 */
let getUserInfoInflight: Promise<UserDetail | null> | null = null

export async function getUserInfo(): Promise<UserDetail | null> {
  if (getUserInfoInflight) return getUserInfoInflight
  getUserInfoInflight = (async () => {
    const r = await request.get<ApiResult<UserDetail>>('/user/userInfo')
    if (r.data?.code !== 200) return null
    return r.data.data ?? null
  })()
  try {
    return await getUserInfoInflight
  } finally {
    getUserInfoInflight = null
  }
}

/** 当前用户修改资料（昵称、头像、性别、生日、地址），对应 POST /user/update */
export async function updateSelfProfile(data: {
  nickname?: string
  headImg?: string
  sex?: number
  birthday?: string
  address?: string
}) {
  const r = await request.post('/user/update', data)
  assertOk(r, '保存失败')
}

export async function getUserById(id: number): Promise<UserDetail | null> {
  const r = await request.get<ApiResult<UserDetail>>(`/user/info/${id}`)
  if (r.data?.code !== 200) return null
  return r.data.data ?? null
}

export async function addUser(data: {
  username: string
  mobile: string
  nickname: string
  password: string
  roleIds?: number[]
  /** 同步空间配额（GB），默认 5 */
  syncQuotaGb?: number
}) {
  const passwordEnc = await encryptPasswordPlain(data.password)
  const r = await request.post('/user/add', {
    username: data.username,
    mobile: data.mobile,
    nickname: data.nickname,
    password: passwordEnc,
    roleIds: data.roleIds,
    syncQuotaGb: data.syncQuotaGb
  })
  assertOk(r, '新增失败')
}

export async function updateUserAdmin(data: {
  id: number
  username: string
  mobile: string
  nickname?: string
  sex?: number
  address?: string
  /** 同步空间配额（GB） */
  syncQuotaGb?: number
}) {
  const r = await request.post('/user/updateUser', data)
  assertOk(r, '保存失败')
}

export async function deleteUser(id: number) {
  const r = await request.post(`/user/delete/${id}`)
  assertOk(r, '删除失败')
}

export async function disableUser(id: number) {
  const r = await request.post(`/user/disable/${id}`)
  assertOk(r, '操作失败')
}

export async function freezeUser(id: number) {
  const r = await request.post(`/user/freeze/${id}`)
  assertOk(r, '操作失败')
}

export async function restoreUser(id: number) {
  const r = await request.post(`/user/restore/${id}`)
  assertOk(r, '操作失败')
}

export async function resetPassword(userId: number, plainPassword: string) {
  const password = await encryptPasswordPlain(plainPassword)
  const r = await request.post('/user/resetPassword', { userId, password })
  assertOk(r, '重置密码失败')
}

export async function updatePasswordSelf(params: {
  mobile: string
  smsCode: string
  plainPassword: string
}) {
  const password = await encryptPasswordPlain(params.plainPassword)
  const r = await request.post('/user/updatePassword', {
    mobile: params.mobile,
    smsCode: params.smsCode,
    password
  })
  assertOk(r, '修改密码失败')
}

export function getUserRoleIds(userId: number) {
  return request.get<{ data: number[] }>(`/role/getUserRoleIds/${userId}`).then(r => r.data?.data || [])
}

export function saveUserRoles(userId: number, roleIds: number[]) {
  return request.post('/role/saveUserRoles', { userId, roleIds })
}
