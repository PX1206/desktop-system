<template>
  <div class="register-page">
    <div class="register-card">
      <h1>注册账号</h1>
      <p class="subtitle">创建您的云同步账号</p>

      <form @submit.prevent="handleRegister">
        <input v-model="form.username" placeholder="用户名" required />
        <input v-model="form.password" type="password" placeholder="密码（8位以上，含数字和字母）" required />
        <input
          v-model="form.passwordConfirm"
          type="password"
          placeholder="确认密码"
          required
        />
        <input v-model="form.nickname" placeholder="昵称（选填）" />
        <input v-model="form.mobile" placeholder="手机号" maxlength="11" required />
        <div class="captcha-row">
          <input v-model="form.pictureCode" placeholder="图形验证码" maxlength="4" required />
          <img
            v-if="captchaImg"
            :src="captchaImg"
            alt="验证码"
            class="captcha-img"
            @click="refreshCaptcha"
          />
        </div>
        <div class="code-row">
          <input v-model="form.smsCode" placeholder="短信验证码" maxlength="6" required />
          <button
            type="button"
            class="btn-code"
            :disabled="loadingCode || countdown > 0"
            @click="sendSmsCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">注册</button>
      </form>

      <p class="login-link">
        已有账号？<router-link to="/login">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '../api/user'
import { getCaptcha, getSmsCode } from '../api/sms'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
  passwordConfirm: '',
  nickname: '',
  mobile: '',
  pictureCode: '',
  smsCode: ''
})
const error = ref('')
const loading = ref(false)
const loadingCode = ref(false)
const countdown = ref(0)
const captchaKey = ref('')
const captchaImg = ref('')

async function refreshCaptcha() {
  const cap = await getCaptcha()
  captchaKey.value = cap.key
  captchaImg.value = cap.image
}

async function sendSmsCode() {
  if (!form.mobile || form.mobile.length !== 11) {
    error.value = '请输入正确的手机号'
    return
  }
  if (!form.pictureCode || form.pictureCode.length < 4) {
    error.value = '请输入图形验证码'
    return
  }
  loadingCode.value = true
  error.value = ''
  try {
    if (!captchaKey.value) await refreshCaptcha()
    await getSmsCode(form.mobile, captchaKey.value, form.pictureCode)
    countdown.value = 60
    const t = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(t)
    }, 1000)
  } catch (e: any) {
    error.value = e?.message || '获取验证码失败'
  } finally {
    loadingCode.value = false
  }
}

async function handleRegister() {
  error.value = ''
  if (form.password !== form.passwordConfirm) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await register({
      username: form.username,
      password: form.password,
      nickname: form.nickname || undefined,
      mobile: form.mobile,
      smsCode: form.smsCode
    })
    router.push('/login')
    error.value = ''
  } catch (e: any) {
    error.value = e?.message || '注册失败'
  } finally {
    loading.value = false
  }
}

onMounted(refreshCaptcha)
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 16px;
}
.register-card {
  width: 100%;
  max-width: 380px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.register-card h1 { margin: 0 0 8px; font-size: 1.75rem; color: #fff; }
.subtitle { color: #94a3b8; margin: 0 0 24px; font-size: 0.95rem; }

.register-card input {
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  background: rgba(0,0,0,0.2);
  color: #fff;
  font-size: 1rem;
  box-sizing: border-box;
}
.captcha-row, .code-row { display: flex; gap: 12px; margin-bottom: 16px; }
.captcha-row input, .code-row input { flex: 1; margin-bottom: 0; }
.captcha-img { height: 46px; width: 100px; cursor: pointer; border-radius: 8px; object-fit: contain; background: #0f172a; }
.btn-code {
  flex-shrink: 0;
  padding: 14px 20px;
  background: #334155;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-code:hover:not(:disabled) { background: #475569; }
.btn-code:disabled { opacity: 0.6; cursor: not-allowed; }

.register-card button[type="submit"] {
  width: 100%;
  padding: 14px;
  background: #e94560;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.register-card button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }
.error { color: #f87171; margin: -8px 0 12px; font-size: 0.9rem; }

.login-link {
  margin: 20px 0 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}
.login-link a { color: #38bdf8; text-decoration: none; }
.login-link a:hover { text-decoration: underline; }
</style>
