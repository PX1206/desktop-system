import axios from 'axios'

const baseURL = (import.meta as any).env?.VITE_API_BASE ?? '/api'

const request = axios.create({
  baseURL,
  timeout: 30000
})

request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = token
  }
  return config
})

request.interceptors.response.use(
  res => {
    // 后端 BusinessException(401) 仍返回 HTTP 200，仅 body.code === 401
    const c = res.data?.code
    if (c === 401) {
      localStorage.removeItem('token')
      window.location.href = '/#/login'
      return Promise.reject(new Error(res.data?.message || '请重新登录'))
    }
    return res
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/#/login'
    }
    return Promise.reject(err)
  }
)

export default request
