import request from './request'
import type { ApiResult } from './types'

export async function getCaptcha() {
  const r = await request.get<ApiResult<{ key: string; image: string }>>('/captcha/getPictureCode')
  if (r.data?.code !== 200) throw new Error('获取验证码失败')
  return r.data.data!
}

export async function getSmsCode(mobile: string, key: string, pictureCode: string) {
  const r = await request.post<ApiResult<string>>('/sms/getCode', {
    mobile,
    key,
    pictureCode
  })
  if (r.data?.code !== 200) throw new Error(r.data?.message || '获取短信验证码失败')
  return r.data.data
}
