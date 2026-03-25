<template>
  <div class="login-page">
    <div class="login-container">
      <h2 class="title">云同步</h2>
      <p class="subtitle">登录后查看您的同步文件</p>

      <div class="login-tabs">
        <span
          role="button"
          tabindex="0"
          :class="{ active: loginMode === 'account' }"
          @click="switchToAccount"
          @keyup.enter="switchToAccount"
        >
          账号登录
        </span>
        <span
          role="button"
          tabindex="0"
          :class="{ active: loginMode === 'sms' }"
          @click="switchToSms"
          @keyup.enter="switchToSms"
        >
          手机登录
        </span>
      </div>

      <form class="form" @submit.prevent="onSubmitLogin">
        <!-- 账号密码 -->
        <template v-if="loginMode === 'account'">
          <div class="field-wrap">
            <input
              v-model="username"
              placeholder="用户名"
              required
              autocomplete="username"
            />
          </div>
          <div class="field-wrap">
            <input
              v-model="password"
              type="password"
              placeholder="密码"
              required
              autocomplete="current-password"
            />
          </div>
        </template>

        <!-- 手机登录 -->
        <template v-else>
          <div class="field-wrap">
            <input
              v-model="mobile"
              placeholder="手机号"
              maxlength="11"
              autocomplete="tel"
              @input="mobile = mobile.replace(/\D/g, '')"
            />
          </div>
          <div class="field-wrap">
            <div class="row">
              <input
                v-model="pictureCode"
                class="half inp"
                placeholder="图形验证码"
                maxlength="4"
                autocomplete="off"
              />
              <img
                v-if="captchaImg"
                :src="captchaImg"
                class="captcha-img"
                alt="验证码"
                @click="refreshCaptcha"
              />
            </div>
          </div>
          <div class="field-wrap">
            <div class="row">
              <input
                v-model="smsCode"
                class="half inp"
                placeholder="短信验证码"
                maxlength="6"
                autocomplete="one-time-code"
                @input="onSmsCodeInput"
              />
              <button
                type="button"
                class="btn-code half"
                :disabled="loadingCode || countdown > 0"
                @click="sendSmsCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </button>
            </div>
          </div>
        </template>

        <div class="field-wrap field-actions">
          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? '登录中…' : '登录' }}
          </button>
          <p v-if="error" class="error">{{ error }}</p>
          <div class="footer-links">
            <div class="footer-left">
              <DesktopClientDownloadLink variant="login-footer" />
            </div>
            <div class="register-link">
              <button type="button" class="link-register" @click="openRegister">
                注册
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>

    <Teleport to="body">
      <div v-if="registerOpen" class="reg-mask" @click.self="closeRegister">
        <div class="reg-dialog" :class="{ mobile: isMobile }" @click.stop>
          <h3>用户注册</h3>
          <div class="reg-body">
            <div class="reg-field">
              <label>账号</label>
              <input v-model="regForm.username" maxlength="32" autocomplete="username" />
            </div>
            <div class="reg-field">
              <label>密码</label>
              <input
                v-model="regForm.password"
                type="password"
                autocomplete="new-password"
                placeholder="8 位以上，含数字和字母"
              />
            </div>
            <div class="reg-field">
              <label>确认密码</label>
              <input
                v-model="regForm.passwordConfirm"
                type="password"
                autocomplete="new-password"
              />
            </div>
            <div class="reg-field">
              <label>昵称</label>
              <input v-model="regForm.nickname" maxlength="32" placeholder="选填" />
            </div>
            <div class="reg-field">
              <label>手机号</label>
              <input
                v-model="regForm.mobile"
                maxlength="11"
                autocomplete="tel"
                @input="regForm.mobile = regForm.mobile.replace(/\D/g, '')"
              />
            </div>
            <div class="reg-field">
              <label>图形码</label>
              <div class="row">
                <input v-model="regForm.pictureCode" class="half inp" maxlength="4" />
                <img
                  v-if="regCaptchaImg"
                  :src="regCaptchaImg"
                  class="captcha-img"
                  alt="验证码"
                  @click="refreshRegisterCaptcha"
                />
              </div>
            </div>
            <div class="reg-field">
              <label>短信码</label>
              <div class="row">
                <input v-model="regForm.smsCode" class="half inp" maxlength="6" />
                <button
                  type="button"
                  class="btn-code half"
                  :disabled="regLoadingCode || regCountdown > 0"
                  @click="sendRegisterSms"
                >
                  {{ regCountdown > 0 ? `${regCountdown}s` : '获取验证码' }}
                </button>
              </div>
            </div>
            <p v-if="regError" class="error">{{ regError }}</p>
          </div>
          <div class="reg-footer">
            <button type="button" class="btn-cancel" @click="closeRegister">取消</button>
            <button type="button" class="btn-submit" :disabled="regLoading" @click="doRegister">
              {{ regLoading ? '提交中…' : '注册' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { login, smsLogin, register } from '../api/user'
import { getCaptcha, getSmsCode } from '../api/sms'
import DesktopClientDownloadLink from '../components/DesktopClientDownloadLink.vue'

const router = useRouter()
const loginMode = ref<'account' | 'sms'>('account')

const username = ref('')
const password = ref('')
const mobile = ref('')
const smsCode = ref('')
const error = ref('')
const loading = ref(false)
const loadingCode = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null
const captchaKey = ref('')
const captchaImg = ref('')
const pictureCode = ref('')

const registerOpen = ref(false)
const regForm = reactive({
  username: '',
  password: '',
  passwordConfirm: '',
  nickname: '',
  mobile: '',
  pictureCode: '',
  smsCode: ''
})
const regCaptchaKey = ref('')
const regCaptchaImg = ref('')
const regError = ref('')
const regLoading = ref(false)
const regLoadingCode = ref(false)
const regCountdown = ref(0)
let regCountdownTimer: ReturnType<typeof setInterval> | null = null

const isMobile = ref(typeof window !== 'undefined' && window.innerWidth < 768)
function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function clearRegCountdown() {
  if (regCountdownTimer) {
    clearInterval(regCountdownTimer)
    regCountdownTimer = null
  }
}

async function refreshCaptcha() {
  const cap = await getCaptcha()
  captchaKey.value = cap.key
  captchaImg.value = cap.image
}

async function refreshRegisterCaptcha() {
  const cap = await getCaptcha()
  regCaptchaKey.value = cap.key
  regCaptchaImg.value = cap.image
}

function switchToAccount() {
  loginMode.value = 'account'
  error.value = ''
  clearCountdown()
  countdown.value = 0
}

function switchToSms() {
  loginMode.value = 'sms'
  error.value = ''
  clearCountdown()
  countdown.value = 0
  if (!captchaImg.value) void refreshCaptcha().catch(() => {})
}

async function sendSmsCode() {
  if (!mobile.value || mobile.value.length !== 11) {
    error.value = '请输入正确的手机号'
    return
  }
  if (!pictureCode.value || pictureCode.value.length < 4) {
    error.value = '请输入图形验证码'
    return
  }
  loadingCode.value = true
  error.value = ''
  try {
    if (!captchaKey.value) await refreshCaptcha()
    await getSmsCode(mobile.value, captchaKey.value, pictureCode.value)
    clearCountdown()
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch (e: unknown) {
    error.value = (e as Error)?.message || '获取验证码失败'
    void refreshCaptcha()
  } finally {
    loadingCode.value = false
  }
}

function onSmsCodeInput() {
  if (/^\d{6}$/.test(smsCode.value)) {
    void onSubmitLogin()
  }
}

async function onSubmitLogin() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    if (loginMode.value === 'account') {
      const data = await login(username.value, password.value)
      if (!data?.token) throw new Error('登录失败')
      localStorage.setItem('token', data.token)
    } else {
      const data = await smsLogin(mobile.value, smsCode.value)
      if (!data?.token) throw new Error('登录失败')
      localStorage.setItem('token', data.token)
    }
    router.push('/')
  } catch (e: unknown) {
    error.value = (e as Error)?.message || '登录失败'
  } finally {
    loading.value = false
  }
}

function openRegister() {
  regError.value = ''
  registerOpen.value = true
  void refreshRegisterCaptcha().catch(() => {
    regError.value = '获取图形验证码失败'
  })
}

function closeRegister() {
  registerOpen.value = false
  regError.value = ''
  clearRegCountdown()
  regCountdown.value = 0
}

async function sendRegisterSms() {
  if (!regForm.mobile || regForm.mobile.length !== 11) {
    regError.value = '请输入正确的手机号'
    return
  }
  if (!regForm.pictureCode || regForm.pictureCode.length < 4) {
    regError.value = '请输入图形验证码'
    return
  }
  regLoadingCode.value = true
  regError.value = ''
  try {
    if (!regCaptchaKey.value) await refreshRegisterCaptcha()
    await getSmsCode(regForm.mobile, regCaptchaKey.value, regForm.pictureCode)
    clearRegCountdown()
    regCountdown.value = 60
    regCountdownTimer = setInterval(() => {
      regCountdown.value--
      if (regCountdown.value <= 0 && regCountdownTimer) {
        clearInterval(regCountdownTimer)
        regCountdownTimer = null
      }
    }, 1000)
  } catch (e: unknown) {
    regError.value = (e as Error)?.message || '获取验证码失败'
    void refreshRegisterCaptcha()
  } finally {
    regLoadingCode.value = false
  }
}

async function doRegister() {
  if (regLoading.value) return
  regError.value = ''
  if (regForm.password !== regForm.passwordConfirm) {
    regError.value = '两次输入的密码不一致'
    return
  }
  regLoading.value = true
  try {
    await register({
      username: regForm.username.trim(),
      password: regForm.password,
      nickname: regForm.nickname.trim() || undefined,
      mobile: regForm.mobile,
      smsCode: regForm.smsCode
    })
    closeRegister()
    loginMode.value = 'account'
    username.value = regForm.username.trim()
    password.value = ''
    error.value = '注册成功，请登录'
    Object.assign(regForm, {
      username: '',
      password: '',
      passwordConfirm: '',
      nickname: '',
      mobile: '',
      pictureCode: '',
      smsCode: ''
    })
    regCaptchaKey.value = ''
    regCaptchaImg.value = ''
  } catch (e: unknown) {
    regError.value = (e as Error)?.message || '注册失败'
  } finally {
    regLoading.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  clearCountdown()
  clearRegCountdown()
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  box-sizing: border-box;
  background: radial-gradient(ellipse 120% 80% at 50% -20%, rgba(56, 189, 248, 0.12), transparent 50%),
    linear-gradient(160deg, #141b2d 0%, #1a1a2e 38%, #16213e 72%, #0f2847 100%);
}

.login-container {
  width: 100%;
  max-width: 320px;
  padding: 24px 22px 22px;
  background: rgba(22, 33, 62, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.85);
  border-radius: 14px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  box-sizing: border-box;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .login-container {
    max-width: 400px;
    padding: 20px 16px 18px;
  }
}

.title {
  text-align: center;
  margin: 0 0 6px;
  font-size: 1.35rem;
  color: #f1f5f9;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.subtitle {
  margin: 0 0 16px;
  text-align: center;
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.45;
}

.login-tabs {
  display: flex;
  justify-content: space-around;
  margin-bottom: 18px;
  cursor: pointer;
  user-select: none;
}

.login-tabs span {
  padding-bottom: 6px;
  font-size: 0.95rem;
  color: #94a3b8;
}

.login-tabs .active {
  border-bottom: 2px solid #38bdf8;
  color: #38bdf8;
  font-weight: 600;
}

.form {
  width: 100%;
}

.form .field-wrap {
  width: 100%;
  margin: 0 0 12px;
  box-sizing: border-box;
}

.form .field-actions {
  margin-bottom: 0;
  margin-top: 4px;
}

.form input.inp,
.form input:not(.half) {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
  background: #0f172a;
  color: #e2e8f0;
}

.form input:not(.half)::placeholder,
.form input.inp::placeholder {
  color: #64748b;
}

.form input:not(.half):focus,
.form input.inp:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.row {
  display: flex;
  align-items: stretch;
  width: 100%;
  gap: 10px;
}

.half {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
}

.form .row .half.inp {
  flex: 1;
  width: auto;
  height: 42px;
}

.captcha-img {
  flex: 1;
  min-width: 0;
  width: auto;
  height: 42px;
  cursor: pointer;
  object-fit: contain;
  border-radius: 8px;
  background: #020617;
  border: 1px solid #334155;
  box-sizing: border-box;
}

.btn-code.half {
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.8rem;
  cursor: pointer;
  box-sizing: border-box;
}

.btn-code.half:hover:not(:disabled) {
  background: #475569;
  border-color: #64748b;
}

.btn-code.half:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-submit {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.btn-submit:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.error {
  color: #f87171;
  margin: 10px 0 0;
  font-size: 0.85rem;
  line-height: 1.4;
}

.footer-links {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 10px;
  gap: 12px;
}

.footer-left {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.register-link {
  flex-shrink: 0;
  margin-top: 0;
  text-align: right;
  font-size: 0.95rem;
}

.link-register {
  padding: 0;
  border: none;
  background: none;
  color: #38bdf8;
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link-register:hover {
  color: #7dd3fc;
}

/* 注册弹窗 */
.reg-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.reg-dialog {
  width: 100%;
  max-width: 380px;
  max-height: 90vh;
  overflow: auto;
  background: #16213e;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px 20px 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  color: #e2e8f0;
}

.reg-dialog.mobile {
  max-width: 95%;
}

.reg-dialog h3 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: #f1f5f9;
}

.reg-field {
  margin-bottom: 12px;
}

.reg-field label {
  display: block;
  font-size: 0.78rem;
  color: #94a3b8;
  margin-bottom: 4px;
}

.reg-field input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 0.9rem;
  box-sizing: border-box;
  background: #0f172a;
  color: #e2e8f0;
}

.reg-field input::placeholder {
  color: #64748b;
}

.reg-field input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.reg-field .row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.reg-field .half.inp {
  flex: 1;
  min-width: 0;
  height: 40px;
}

.reg-field .captcha-img {
  flex: 1;
  min-width: 0;
  height: 40px;
}

.reg-field .btn-code.half {
  flex: 1;
  min-width: 0;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.reg-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #334155;
}

.btn-cancel {
  padding: 8px 18px;
  border: 1px solid #475569;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-cancel:hover {
  border-color: #64748b;
  color: #f1f5f9;
}

.reg-footer .btn-submit {
  width: auto;
  padding: 8px 22px;
}
</style>
