<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <div class="title-block">
          <h1>云同步</h1>
          <a
            v-if="webPortalUrl"
            class="web-portal-link"
            :href="webPortalUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ webPortalUrl }}</a>
        </div>
      </div>
      <div class="header-sync-wrap">
        <div v-if="token" class="header-sync">
          <span class="header-sync-line">
            <span class="header-sync-title">同步状态</span>
            <span class="header-sync-state" :class="{ active: syncing }">{{
              syncing ? '正在同步…' : '空闲'
            }}</span>
            <template v-if="lastSync">
              <span class="header-sync-dot" aria-hidden="true">·</span>
              <span class="header-last-sync">上次同步 {{ lastSync }}</span>
            </template>
          </span>
        </div>
      </div>
      <div class="header-right">
        <div class="header-actions">
          <label class="switch" title="勾选后使用账号密码登录时，会加密保存凭据以便下次启动自动登录">
            <input type="checkbox" v-model="autoLaunch" @change="onAutoLaunchChange" />
            <span>开机自启</span>
          </label>
          <div v-if="token" ref="userMenuRef" class="user-area">
            <button type="button" class="user-trigger" @click.stop="userMenuOpen = !userMenuOpen">
              <img
                v-if="userAvatarSrc"
                :src="userAvatarSrc"
                class="user-avatar"
                alt=""
                @error="onAvatarError"
              />
              <span v-else class="user-avatar user-avatar-ph">{{ userInitial }}</span>
              <span class="user-name">{{ displayName }}</span>
              <span class="user-caret">{{ userMenuOpen ? '▴' : '▾' }}</span>
            </button>
            <div v-if="userMenuOpen" class="user-dropdown">
              <button type="button" class="drop-item" @click="openProfile">个人信息</button>
              <div class="drop-divider" />
              <button type="button" class="drop-item drop-danger" @click="logout">退出登录</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div
      v-if="updateDownloadActive && updatePhase === 'downloading' && !updateModalOpen"
      class="update-bg-banner"
      role="button"
      tabindex="0"
      @click="openUpdateDetailModal"
      @keydown.enter.prevent="openUpdateDetailModal"
    >
      <span>更新下载中 {{ Math.round(updatePercent) }}%</span>
      <span class="update-bg-banner-action">展开详情</span>
    </div>

    <Teleport to="body">
      <div v-if="profileOpen" class="profile-mask" @click.self="profileOpen = false">
        <div class="profile-dialog" @click.stop>
          <h3>个人信息</h3>
          <p class="profile-hint">以下信息来自服务端，修改请登录 Web 管理端。</p>
          <dl class="profile-dl">
            <dt>账号</dt>
            <dd>{{ userInfo.username || '—' }}</dd>
            <dt>昵称</dt>
            <dd>{{ userInfo.nickname || '—' }}</dd>
            <dt>手机号</dt>
            <dd>{{ userInfo.mobile || '—' }}</dd>
            <dt>角色</dt>
            <dd>{{ userInfo.role === 'admin' ? '管理员' : '普通用户' }}</dd>
            <dt>最后登录</dt>
            <dd>{{ userInfo.loginTime || '—' }}</dd>
          </dl>
          <button type="button" class="profile-close" @click="profileOpen = false">关闭</button>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="updateModalOpen" class="update-mask" @click.self="tryDismissUpdate">
        <div class="update-dialog" @click.stop>
          <h3>发现新版本</h3>
          <p class="update-ver">版本 {{ updateRemoteVersion }}</p>
          <pre v-if="updateNotes.trim()" class="update-notes">{{ updateNotes }}</pre>
          <div v-if="updatePhase === 'downloading'" class="update-progress-wrap">
            <div class="update-progress-bar">
              <div class="update-progress-fill" :style="{ width: Math.min(100, updatePercent) + '%' }" />
            </div>
            <p class="update-pct">{{ Math.round(updatePercent) }}%</p>
          </div>
          <div v-if="updatePhase === 'available'" class="update-actions">
            <button type="button" class="btn-cancel" @click="tryDismissUpdate">稍后</button>
            <button type="button" class="btn-ok" :disabled="updateBusy" @click="startDownloadUpdate">
              {{ updateBusy ? '启动中…' : '下载并安装' }}
            </button>
          </div>
          <p v-if="updatePhase === 'downloading'" class="update-hint">
            正在下载安装包（整包直连，进度可能稍晚出现）。可点下方按钮或按 Esc
            关闭窗口，在后台继续；顶部会出现进度条，完成后会再提示安装。
          </p>
          <div v-if="updatePhase === 'downloading'" class="update-actions">
            <button type="button" class="btn-cancel" @click="closeUpdateModalOnly">关闭窗口（后台下载）</button>
          </div>
          <div v-if="updatePhase === 'downloaded'" class="update-actions">
            <button type="button" class="btn-cancel" @click="tryDismissUpdate">稍后重启</button>
            <button type="button" class="btn-ok" @click="applyUpdateInstall">立即重启并安装</button>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="!token" class="login-section">
      <div class="login-panel">
        <div class="login-form">
          <h2 class="login-title">云同步</h2>
          <div class="login-tabs">
            <span
              role="button"
              tabindex="0"
              :class="{ active: loginMode === 'account' }"
              @click="switchLoginMode('account')"
            >
              账号登录
            </span>
            <span
              role="button"
              tabindex="0"
              :class="{ active: loginMode === 'sms' }"
              @click="switchLoginMode('sms')"
            >
              手机登录
            </span>
          </div>

          <div class="login-fields">
            <div v-show="loginMode === 'account'" class="auth-panel">
              <label class="login-label">用户名</label>
              <input v-model="username" placeholder="用户名" type="text" autocomplete="username" />
              <label class="login-label">密码</label>
              <input
                v-model="password"
                placeholder="密码"
                type="password"
                autocomplete="current-password"
              />
            </div>
            <div v-show="loginMode === 'sms'" class="auth-panel">
              <label class="login-label">手机号</label>
              <input
                v-model="mobile"
                placeholder="手机号"
                type="tel"
                maxlength="11"
                autocomplete="tel"
                @input="mobile = mobile.replace(/\D/g, '')"
              />
              <label class="login-label">图形验证码</label>
              <div class="row">
                <input
                  v-model="pictureCode"
                  class="half"
                  placeholder="图形验证码"
                  type="text"
                  maxlength="4"
                  autocomplete="off"
                />
                <img
                  v-if="captchaImg"
                  :src="captchaImg"
                  alt="验证码"
                  class="captcha-img"
                  @click="refreshCaptcha"
                />
              </div>
              <label class="login-label">短信验证码</label>
              <div class="row">
                <input
                  v-model="smsCode"
                  class="half"
                  placeholder="短信验证码"
                  type="text"
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
          </div>

          <div class="login-actions">
            <button
              type="button"
              class="login-submit"
              @click="loginMode === 'account' ? login() : loginSms()"
              :disabled="logging"
            >
              {{ logging ? '登录中…' : '登录' }}
            </button>
            <p v-if="loginError" class="error">{{ loginError }}</p>
            <div class="register-link-bar">
              <button type="button" class="link-btn" @click="openRegister">注册</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="registerOpen" class="register-mask" @click.self="closeRegister">
        <div class="register-dialog" @click.stop>
          <h3>用户注册</h3>
          <div class="register-dialog-body">
            <div class="reg-row">
              <label class="reg-lbl">账号</label>
              <input v-model="reg.username" maxlength="32" autocomplete="username" />
            </div>
            <div class="reg-row">
              <label class="reg-lbl">密码</label>
              <input
                v-model="reg.password"
                type="password"
                autocomplete="new-password"
                placeholder="8 位以上，含数字和字母"
              />
            </div>
            <div class="reg-row">
              <label class="reg-lbl">确认密码</label>
              <input v-model="reg.passwordConfirm" type="password" autocomplete="new-password" />
            </div>
            <div class="reg-row">
              <label class="reg-lbl">昵称</label>
              <input v-model="reg.nickname" maxlength="32" placeholder="选填" />
            </div>
            <div class="reg-row">
              <label class="reg-lbl">手机号</label>
              <input
                v-model="reg.mobile"
                maxlength="11"
                autocomplete="tel"
                @input="reg.mobile = reg.mobile.replace(/\D/g, '')"
              />
            </div>
            <div class="reg-row">
              <label class="reg-lbl">图形码</label>
              <div class="row">
                <input v-model="reg.pictureCode" class="half" maxlength="4" />
                <img
                  v-if="regCaptchaImg"
                  :src="regCaptchaImg"
                  class="captcha-img"
                  alt="验证码"
                  @click="refreshRegisterCaptcha"
                />
              </div>
            </div>
            <div class="reg-row">
              <label class="reg-lbl">短信码</label>
              <div class="row">
                <input v-model="reg.smsCode" class="half" maxlength="6" />
                <button
                  type="button"
                  class="btn-code half"
                  :disabled="regLoadingCode || regCountdown > 0"
                  @click="sendRegisterSmsCode"
                >
                  {{ regCountdown > 0 ? `${regCountdown}s` : '获取验证码' }}
                </button>
              </div>
            </div>
            <p v-if="registerError" class="error">{{ registerError }}</p>
          </div>
          <div class="register-dialog-footer">
            <button type="button" class="reg-btn-cancel" @click="closeRegister">取消</button>
            <button type="button" class="login-submit reg-btn-ok" @click="registerSubmit" :disabled="regLoading">
              {{ regLoading ? '提交中…' : '注册' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="token" class="main main-logged">
      <div class="main-columns">
        <CloudFilesPanel
          class="cloud-col"
          :base-url="serverUrl"
          :auth-token="token"
          :cloud-tree-stamp="cloudTreeStamp"
          @quota-updated="loadUserInfo"
        />
        <div class="sync-col">
          <section class="sync-dirs">
            <div class="sync-dirs-head">
              <h2>同步目录</h2>
              <span v-if="syncSpaceLine" class="sync-quota" :title="syncSpaceTitle">{{ syncSpaceLine }}</span>
            </div>
            <p class="sync-hint">
              同步只会<strong>上传</strong>本机变更到云端，<strong>不会</strong>因本机缺文件而删除云端。
              换电脑后若路径不存在，请「重新关联」本机文件夹，再可选「从云端拉取」把已有文件下到本地。
              「移除」只取消本机同步绑定，云端文件仍在，可在 Web 端管理或删除。
            </p>
            <div class="dir-list">
              <div v-for="dir in syncDirs" :key="dir.id" class="dir-item">
                <div class="dir-info">
                  <span class="dir-title">{{ dir.displayName || dir.localPath }}</span>
                  <span class="dir-local">{{ dir.localPath }}</span>
                  <span
                    class="dir-status"
                    :class="{ warn: dirPathOk[dir.id] === false, ok: dirPathOk[dir.id] === true }"
                  >
                    {{
                      dirPathOk[dir.id] === false
                        ? '本机路径无效'
                        : dirPathOk[dir.id] === true
                          ? '同步中'
                          : '…'
                    }}
                  </span>
                </div>
                <div class="dir-actions">
                  <button type="button" class="btn-small" @click="rebindDir(dir)">重新关联</button>
                  <button
                    type="button"
                    class="btn-small btn-pull"
                    :disabled="dirPathOk[dir.id] !== true || pullingDirId === dir.id"
                    @click="pullDirFromCloud(dir)"
                  >
                    {{ pullingDirId === dir.id ? '拉取中…' : '从云端拉取' }}
                  </button>
                  <button type="button" class="btn-small" @click="removeDir(dir.id)">移除</button>
                </div>
              </div>
              <button type="button" @click="addDir" class="btn-add">+ 添加目录</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { api, syncService, resolveHeadImgUrl, type UserInfoVO } from './sync'
import CloudFilesPanel from './components/CloudFilesPanel.vue'

/** 来自 VITE_WEB_PORTAL_URL，未配置则不显示链接 */
const webPortalUrl = (import.meta.env.VITE_WEB_PORTAL_URL || '').trim()

const serverUrl = ref(
  (import.meta.env.VITE_DEFAULT_API_BASE || 'http://localhost:6168').trim().replace(/\/+$/, '')
)
const registerOpen = ref(false)
const loginMode = ref<'account' | 'sms'>('account')

const username = ref('')
const password = ref('')
const mobile = ref('')
const smsCode = ref('')
const pictureCode = ref('')
const captchaKey = ref('')
const captchaImg = ref('')
const loadingCode = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const reg = reactive({
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
const regLoadingCode = ref(false)
const regCountdown = ref(0)
let regCountdownTimer: ReturnType<typeof setInterval> | null = null
const registerError = ref('')
const regLoading = ref(false)

const token = ref('')
const loginError = ref('')
const logging = ref(false)

const syncDirs = ref<Array<{ id: number; localPath: string; displayName?: string }>>([])
/** 各同步项本机路径是否存在（Electron 主进程检测） */
const dirPathOk = ref<Record<number, boolean>>({})
const pullingDirId = ref<number | null>(null)
/** 添加/移除同步目录后递增，驱动左侧云端目录树刷新 */
const cloudTreeStamp = ref(0)
const autoLaunch = ref(false)
const syncing = ref(false)
const lastSync = ref('')

const userInfo = ref<UserInfoVO>({})
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const profileOpen = ref(false)

/** 应用更新（electron-updater） */
const updateModalOpen = ref(false)
const updateRemoteVersion = ref('')
const updateNotes = ref('')
const updatePhase = ref<'available' | 'downloading' | 'downloaded'>('available')
const updatePercent = ref(0)
const updateBusy = ref(false)
/** 主进程正在拉取安装包（与弹窗是否打开无关） */
const updateDownloadActive = ref(false)
let updateUnsubs: Array<() => void> = []

const displayName = computed(() => {
  const u = userInfo.value
  return (u.nickname || u.username || '').trim() || '用户'
})
const userInitial = computed(() => {
  const s = displayName.value
  return s && s !== '用户' ? s.charAt(0).toUpperCase() : '用'
})

/** 头像加载失败时回退为字母占位（错误 URL、过期 token 等） */
const avatarLoadFailed = ref(false)
watch(
  () => [userInfo.value.headImg, serverUrl.value, token.value] as const,
  () => {
    avatarLoadFailed.value = false
  }
)

const userAvatarSrc = computed(() => {
  if (avatarLoadFailed.value) return ''
  return resolveHeadImgUrl(userInfo.value.headImg, serverUrl.value, token.value)
})

const SYNC_GB = 1024 * 1024 * 1024

function formatSyncSpaceBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n >= SYNC_GB) return `${(n / SYNC_GB).toFixed(2)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${Math.round(n)} B`
}

/** 标题右侧：剩余同步空间（非本机内存） */
const syncSpaceLine = computed(() => {
  const u = userInfo.value
  if (u.syncQuotaBytes == null && u.syncUsedBytes == null) return ''
  const quota = u.syncQuotaBytes ?? 5 * SYNC_GB
  const used = u.syncUsedBytes ?? 0
  const remain = Math.max(0, quota - used)
  return `剩余 ${formatSyncSpaceBytes(remain)} · 配额 ${formatSyncSpaceBytes(quota)}`
})

const syncSpaceTitle = computed(() => {
  const u = userInfo.value
  const quota = u.syncQuotaBytes ?? 5 * SYNC_GB
  const used = u.syncUsedBytes ?? 0
  const remain = Math.max(0, quota - used)
  return `云端同步空间：已用 ${formatSyncSpaceBytes(used)}，剩余 ${formatSyncSpaceBytes(remain)}，总配额 ${formatSyncSpaceBytes(quota)}`
})

function onAvatarError() {
  avatarLoadFailed.value = true
}

function openUpdateDetailModal() {
  updateModalOpen.value = true
}

function closeUpdateModalOnly() {
  updateModalOpen.value = false
}

function tryDismissUpdate() {
  updateModalOpen.value = false
}

async function startDownloadUpdate() {
  const eapi = window.electronAPI
  if (!eapi?.downloadUpdate) return
  if (updatePhase.value === 'downloading' && updateDownloadActive.value) return

  updatePhase.value = 'downloading'
  updatePercent.value = 0
  updateDownloadActive.value = true
  updateBusy.value = true
  try {
    const r = await eapi.downloadUpdate()
    if (!r.ok) {
      updatePhase.value = 'available'
      updatePercent.value = 0
      updateDownloadActive.value = false
      alert(r.message || '无法开始下载')
      return
    }
  } catch (e: unknown) {
    updatePhase.value = 'available'
    updatePercent.value = 0
    updateDownloadActive.value = false
    alert(String((e as { message?: string })?.message || e || '无法开始下载'))
  } finally {
    updateBusy.value = false
  }
}

async function applyUpdateInstall() {
  await window.electronAPI?.quitAndInstall?.()
}

async function loadUserInfo() {
  if (!token.value) {
    userInfo.value = {}
    return
  }
  try {
    api.setBase(serverUrl.value)
    api.setToken(token.value)
    const data = await api.getUserInfo()
    userInfo.value = data || {}
  } catch {
    userInfo.value = {}
  }
}

function onDocClick(e: MouseEvent) {
  const el = userMenuRef.value
  if (el && !el.contains(e.target as Node)) userMenuOpen.value = false
}

async function openProfile() {
  userMenuOpen.value = false
  profileOpen.value = true
  await loadUserInfo()
}

async function onAutoLaunchChange() {
  const enabled = autoLaunch.value
  try {
    await window.electronAPI?.setAutoLaunch(enabled)
    if (!enabled) {
      await window.electronAPI?.clearAutoLogin?.()
    } else if (token.value) {
      await persistAutoLoginIfNeeded()
    }
  } catch {
    autoLaunch.value = !enabled
  }
}

async function loadAutoLaunch() {
  autoLaunch.value = await window.electronAPI?.getAutoLaunch() ?? false
}

function clearSmsCountdown() {
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

function formatAuthError(e: unknown): string {
  const msg = String((e as { message?: string })?.message || e || '')
  if (/network error/i.test(msg)) {
    return '无法连接服务器（网络错误）。请检查网络、接口地址（如 /api 前缀）及服务器是否可达。'
  }
  return msg || '操作失败'
}

async function bootstrapLoggedInState() {
  await loadSyncDirs()
  await loadUserInfo()
  if (syncDirs.value.length > 0) {
    await syncService.startWatching(syncDirs.value, token.value, serverUrl.value)
  }
}

async function persistAutoLoginIfNeeded() {
  try {
    const eapi = window.electronAPI
    if (!eapi?.saveAutoLogin || !eapi.getAutoLaunch) return
    const al = await eapi.getAutoLaunch()
    if (!al) return
    if (!username.value || !password.value) return
    await eapi.saveAutoLogin({ username: username.value, password: password.value })
  } catch {
    // ignore
  }
}

async function validateSession(): Promise<boolean> {
  if (!token.value) return false
  try {
    const info = await api.getUserInfo()
    return !!(info && (info.username || info.nickname))
  } catch {
    return false
  }
}

/** 开机自启 + 已保存账号密码时，token 失效后静默重新登录 */
async function trySilentAutoLogin(): Promise<boolean> {
  try {
    const al = await window.electronAPI?.getAutoLaunch() ?? false
    if (!al) return false
    const creds = await window.electronAPI?.loadAutoLogin?.()
    if (!creds?.username || !creds?.password) return false
    const r = await api.login(serverUrl.value, creds.username, creds.password)
    await afterLoginSuccess(r.token)
    return true
  } catch {
    return false
  }
}

async function afterLoginSuccess(authToken: string) {
  token.value = authToken
  api.setToken(authToken)
  api.setBase(serverUrl.value)
  await persistAutoLoginIfNeeded()
  await bootstrapLoggedInState()
}

async function refreshCaptcha() {
  api.setBase(serverUrl.value)
  const cap = await api.getCaptcha()
  captchaKey.value = cap.key
  captchaImg.value = cap.image
}

async function refreshRegisterCaptcha() {
  api.setBase(serverUrl.value)
  const cap = await api.getCaptcha()
  regCaptchaKey.value = cap.key
  regCaptchaImg.value = cap.image
}

function switchLoginMode(mode: 'account' | 'sms') {
  loginMode.value = mode
  loginError.value = ''
  clearSmsCountdown()
  countdown.value = 0
  if (mode === 'sms' && !captchaImg.value) {
    void refreshCaptcha().catch(() => {
      loginError.value = '加载图形验证码失败'
    })
  }
}

function onSmsCodeInput() {
  if (loginMode.value === 'sms' && /^\d{6}$/.test(smsCode.value) && !logging.value) {
    void loginSms()
  }
}

async function sendSmsCode() {
  if (!mobile.value || mobile.value.length !== 11) {
    loginError.value = '请输入正确的手机号'
    return
  }
  if (!pictureCode.value || pictureCode.value.length < 4) {
    loginError.value = '请输入图形验证码'
    return
  }
  loadingCode.value = true
  loginError.value = ''
  try {
    api.setBase(serverUrl.value)
    if (!captchaKey.value) await refreshCaptcha()
    await api.getSmsCode(mobile.value, captchaKey.value, pictureCode.value)
    clearSmsCountdown()
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
  } catch (e: unknown) {
    loginError.value = formatAuthError(e)
    void refreshCaptcha()
  } finally {
    loadingCode.value = false
  }
}

async function sendRegisterSmsCode() {
  if (!reg.mobile || reg.mobile.length !== 11) {
    registerError.value = '请输入正确的手机号'
    return
  }
  if (!reg.pictureCode || reg.pictureCode.length < 4) {
    registerError.value = '请输入图形验证码'
    return
  }
  regLoadingCode.value = true
  registerError.value = ''
  try {
    api.setBase(serverUrl.value)
    if (!regCaptchaKey.value) await refreshRegisterCaptcha()
    await api.getSmsCode(reg.mobile, regCaptchaKey.value, reg.pictureCode)
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
    registerError.value = formatAuthError(e)
    void refreshRegisterCaptcha()
  } finally {
    regLoadingCode.value = false
  }
}

function openRegister() {
  loginError.value = ''
  clearSmsCountdown()
  countdown.value = 0
  registerError.value = ''
  registerOpen.value = true
  void refreshRegisterCaptcha().catch(() => {
    registerError.value = '加载图形验证码失败'
  })
}

function closeRegister() {
  registerError.value = ''
  clearRegCountdown()
  regCountdown.value = 0
  registerOpen.value = false
}

async function registerSubmit() {
  registerError.value = ''
  if (reg.password !== reg.passwordConfirm) {
    registerError.value = '两次输入的密码不一致'
    return
  }
  regLoading.value = true
  try {
    await api.register(serverUrl.value, {
      username: reg.username,
      password: reg.password,
      nickname: reg.nickname.trim() || undefined,
      mobile: reg.mobile,
      smsCode: reg.smsCode
    })
    closeRegister()
    loginMode.value = 'account'
    username.value = reg.username
    password.value = ''
    loginError.value = '注册成功，请使用账号密码登录'
    reg.username = ''
    reg.password = ''
    reg.passwordConfirm = ''
    reg.nickname = ''
    reg.mobile = ''
    reg.pictureCode = ''
    reg.smsCode = ''
    regCaptchaKey.value = ''
    regCaptchaImg.value = ''
  } catch (e: unknown) {
    registerError.value = formatAuthError(e)
  } finally {
    regLoading.value = false
  }
}

async function login() {
  if (logging.value) return
  loginError.value = ''
  logging.value = true
  try {
    const r = await api.login(serverUrl.value, username.value, password.value)
    await afterLoginSuccess(r.token)
  } catch (e: unknown) {
    loginError.value = formatAuthError(e)
  } finally {
    logging.value = false
  }
}

async function loginSms() {
  if (logging.value) return
  loginError.value = ''
  logging.value = true
  try {
    const r = await api.smsLogin(serverUrl.value, mobile.value, smsCode.value)
    await afterLoginSuccess(r.token)
  } catch (e: unknown) {
    loginError.value = formatAuthError(e)
  } finally {
    logging.value = false
  }
}

async function refreshDirPathChecks() {
  const next: Record<number, boolean> = {}
  for (const d of syncDirs.value) {
    next[d.id] = (await window.electronAPI?.pathExists(d.localPath)) ?? false
  }
  dirPathOk.value = next
}

async function loadSyncDirs() {
  try {
    syncDirs.value = await api.getSyncDirs()
  } catch (_) {
    syncDirs.value = []
  }
  await refreshDirPathChecks()
}

async function rebindDir(dir: { id: number }) {
  const p = await window.electronAPI?.selectDirectory()
  if (!p) return
  try {
    await api.updateSyncDirPath(dir.id, p)
    await loadSyncDirs()
    cloudTreeStamp.value++
    await syncService.restart(syncDirs.value, token.value, serverUrl.value)
  } catch (e: any) {
    alert(e?.message || '更新路径失败')
  }
}

async function pullDirFromCloud(dir: { id: number; localPath: string }) {
  if (dirPathOk.value[dir.id] !== true) return
  if (
    !confirm(
      '将把该同步目录在云端已有的文件按原相对路径下载到本地，已存在的同名文件会被覆盖。是否继续？'
    )
  ) {
    return
  }
  pullingDirId.value = dir.id
  try {
    const r = await window.electronAPI?.pullFromCloud(dir.id, dir.localPath)
    alert(r?.message || (r?.ok ? '完成' : '拉取失败'))
  } catch (e: any) {
    alert(e?.message || '拉取失败')
  } finally {
    pullingDirId.value = null
  }
}

async function addDir() {
  const selectedPath = await window.electronAPI?.selectDirectory()
  if (!selectedPath) return
  try {
    await api.addSyncDir(selectedPath)
    await loadSyncDirs()
    cloudTreeStamp.value++
    await syncService.startWatching(syncDirs.value, token.value, serverUrl.value)
  } catch (e: any) {
    alert(e?.message || '添加失败')
  }
}

async function removeDir(id: number) {
  if (!confirm('确定移除该同步目录？')) return
  try {
    await api.removeSyncDir(id)
    await loadSyncDirs()
    cloudTreeStamp.value++
    await syncService.restart(syncDirs.value, token.value, serverUrl.value)
  } catch (e: any) {
    alert(e?.message || '移除失败')
  }
}

async function logout() {
  userMenuOpen.value = false
  profileOpen.value = false
  userInfo.value = {}
  token.value = ''
  api.setToken('')
  syncService.stop()
  await window.electronAPI?.clearAutoLogin?.()
  localStorage.removeItem('desktop-sync-config')
}

function onUpdateEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (!updateModalOpen.value) return
  e.preventDefault()
  if (updatePhase.value === 'downloading') {
    closeUpdateModalOnly()
  } else {
    tryDismissUpdate()
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('keydown', onUpdateEscape)
  await loadAutoLaunch()
  let sessionReady = false
  const saved = localStorage.getItem('desktop-sync-config')
  if (saved) {
    try {
      const c = JSON.parse(saved)
      serverUrl.value = c.serverUrl || serverUrl.value
      if (c.token) token.value = c.token
    } catch (_) {}
  }
  api.setBase(serverUrl.value)
  if (token.value) {
    api.setToken(token.value)
    sessionReady = await validateSession()
    if (!sessionReady) {
      token.value = ''
      api.setToken('')
      localStorage.removeItem('desktop-sync-config')
    }
  }
  if (!sessionReady) {
    sessionReady = await trySilentAutoLogin()
  }
  if (sessionReady && token.value) {
    await bootstrapLoggedInState()
  }
  api.setBase(serverUrl.value)
  pushInstallPackageUpdateBase()

  const eapi = window.electronAPI
  if (eapi?.onUpdateAvailable) {
    updateUnsubs.push(
      eapi.onUpdateAvailable((info) => {
        updateRemoteVersion.value = info.version
        updateNotes.value = info.releaseNotes || ''
        if (updatePhase.value !== 'downloading') {
          updatePhase.value = 'available'
          updatePercent.value = 0
          updateDownloadActive.value = false
        }
        const bgOnly =
          updatePhase.value === 'downloading' &&
          updateDownloadActive.value &&
          !updateModalOpen.value
        if (!bgOnly) {
          updateModalOpen.value = true
        }
      })
    )
  }
  if (eapi?.onUpdateDownloadProgress) {
    updateUnsubs.push(
      eapi.onUpdateDownloadProgress((p) => {
        updatePercent.value = p.percent
      })
    )
  }
  if (eapi?.onUpdateDownloaded) {
    updateUnsubs.push(
      eapi.onUpdateDownloaded((info) => {
        updateRemoteVersion.value = info.version
        updatePhase.value = 'downloaded'
        updateDownloadActive.value = false
        updateModalOpen.value = true
      })
    )
  }
  if (eapi?.onUpdateDownloadError) {
    updateUnsubs.push(
      eapi.onUpdateDownloadError((p) => {
        updatePhase.value = 'available'
        updatePercent.value = 0
        updateDownloadActive.value = false
        alert(p.message || '下载更新失败')
      })
    )
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('keydown', onUpdateEscape)
  clearSmsCountdown()
  clearRegCountdown()
  updateUnsubs.forEach((u) => u())
  updateUnsubs = []
})

watch([token, serverUrl], () => {
  if (token.value) {
    localStorage.setItem('desktop-sync-config', JSON.stringify({
      serverUrl: serverUrl.value,
      token: token.value
    }))
  }
})

function pushInstallPackageUpdateBase() {
  const eapi = window.electronAPI
  if (!eapi?.notifyInstallPackageUpdateBase) return
  const b = (serverUrl.value || '').trim().replace(/\/+$/, '')
  if (!b) return
  void eapi.notifyInstallPackageUpdateBase(b)
}

watch(serverUrl, () => {
  pushInstallPackageUpdateBase()
})
</script>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #1a1a2e; color: #eee; }
.app { max-width: 1200px; margin: 0 auto; padding: 24px; }
.header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px 20px;
  margin-bottom: 32px;
}
.header-left {
  justify-self: start;
  min-width: 0;
}
.header-sync-wrap {
  justify-self: center;
  max-width: 100%;
}
.header-sync {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 10px;
  min-width: 0;
  max-width: min(520px, 100%);
}
.header-sync-line {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  font-size: 0.85rem;
  line-height: 1.35;
}
.header-sync-title {
  color: #94a3b8;
  font-weight: 500;
  flex-shrink: 0;
}
.header-sync-state {
  font-weight: 600;
  color: #cbd5e1;
  flex-shrink: 0;
}
.header-sync-state.active {
  color: #4ade80;
}
.header-sync-dot {
  color: #475569;
  flex-shrink: 0;
  user-select: none;
}
.header-last-sync {
  color: #64748b;
  font-size: 0.8rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-right {
  justify-self: end;
  min-width: 0;
}
.title-block { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px 14px; flex-shrink: 0; }
.header h1 { margin: 0; font-size: 1.5rem; flex-shrink: 0; }
.web-portal-link {
  font-size: 0.85rem;
  font-weight: 500;
  color: #7eb8ff;
  text-decoration: none;
  word-break: break-all;
}
.web-portal-link:hover {
  color: #a8d0ff;
  text-decoration: underline;
}
.header-actions { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: flex-end; }
.switch { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.user-area { position: relative; }
.user-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 10px;
  color: #eee;
  cursor: pointer;
  font-size: 0.9rem;
  max-width: 220px;
}
.user-trigger:hover { border-color: #e94560; }
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.user-avatar-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e94560;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
}
.user-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.user-caret { font-size: 0.65rem; color: #94a3b8; flex-shrink: 0; }
.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 160px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  padding: 6px 0;
  z-index: 200;
}
.drop-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  color: #eee;
  text-align: left;
  font-size: 0.9rem;
  cursor: pointer;
}
.drop-item:hover { background: rgba(255, 255, 255, 0.06); }
.drop-divider { height: 1px; background: #0f3460; margin: 6px 0; }
.drop-danger { color: #f87171; }
.profile-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.profile-dialog {
  width: 100%;
  max-width: 400px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 12px;
  padding: 22px;
  color: #eee;
}
.profile-dialog h3 { margin: 0 0 8px; font-size: 1.1rem; }
.profile-hint { margin: 0 0 16px; font-size: 0.8rem; color: #94a3b8; line-height: 1.4; }
.profile-dl { margin: 0; display: grid; grid-template-columns: 88px 1fr; gap: 8px 12px; font-size: 0.9rem; }
.profile-dl dt { color: #94a3b8; margin: 0; }
.profile-dl dd { margin: 0; word-break: break-all; }
.profile-close {
  margin-top: 20px;
  padding: 8px 20px;
  width: 100%;
  background: #0f3460;
  border: 1px solid #1e4976;
  border-radius: 8px;
  color: #eee;
  cursor: pointer;
  font-size: 0.9rem;
}
.profile-close:hover { border-color: #e94560; color: #fca5a5; }
.update-bg-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: -8px auto 12px;
  max-width: 1200px;
  padding: 8px 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.12), rgba(129, 140, 248, 0.12));
  border: 1px solid #334155;
  color: #e2e8f0;
  font-size: 0.88rem;
  cursor: pointer;
  outline: none;
}
.update-bg-banner:hover,
.update-bg-banner:focus-visible {
  border-color: #38bdf8;
}
.update-bg-banner-action {
  color: #38bdf8;
  text-decoration: underline;
  font-size: 0.85rem;
}
.update-mask {
  position: fixed;
  inset: 0;
  z-index: 10002;
  background: rgba(15, 23, 42, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.update-dialog {
  width: 100%;
  max-width: 420px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 22px;
  color: #e2e8f0;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}
.update-dialog h3 {
  margin: 0 0 8px;
  font-size: 1.05rem;
}
.update-ver {
  margin: 0 0 12px;
  font-size: 0.88rem;
  color: #94a3b8;
}
.update-notes {
  margin: 0 0 14px;
  padding: 10px 12px;
  max-height: 160px;
  overflow: auto;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #cbd5e1;
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
  white-space: pre-wrap;
  word-break: break-word;
}
.update-progress-wrap {
  margin-bottom: 12px;
}
.update-progress-bar {
  height: 8px;
  background: #334155;
  border-radius: 4px;
  overflow: hidden;
}
.update-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  border-radius: 4px;
  transition: width 0.15s ease;
}
.update-pct {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: #94a3b8;
}
.update-hint {
  margin: 0 0 8px;
  font-size: 0.82rem;
  color: #94a3b8;
}
.update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
.update-actions .btn-cancel {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.88rem;
}
.update-actions .btn-ok {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 0.88rem;
}
.update-actions .btn-ok:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-section {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 28px 16px 40px;
}
.login-panel {
  width: 100%;
  max-width: 340px;
}
.login-form {
  display: flex;
  flex-direction: column;
  background: #16213e;
  padding: 22px 20px 20px;
  border-radius: 14px;
  border: 1px solid #243554;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}
.login-title {
  margin: 0 0 14px;
  font-size: 1.15rem;
  font-weight: 600;
  text-align: center;
  color: #f1f5f9;
}
.login-tabs {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
  user-select: none;
}
.login-tabs span {
  padding-bottom: 6px;
  font-size: 0.9rem;
  color: #94a3b8;
  cursor: pointer;
}
.login-tabs span.active {
  border-bottom: 2px solid #38bdf8;
  color: #38bdf8;
  font-weight: 600;
}
.login-fields {
  flex: 0 1 auto;
}
.login-actions {
  width: 100%;
  margin: 0;
  flex-shrink: 0;
  padding-top: 6px;
}
.auth-panel .login-label {
  margin-top: 10px;
}
.auth-panel .login-label:first-of-type {
  margin-top: 0;
}
.login-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 5px;
  margin-top: 10px;
}
.login-form > .login-label:first-of-type {
  margin-top: 0;
}
.login-form .auth-panel {
  width: 100%;
  margin: 0;
}
.login-form input {
  display: block;
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  background: #0f172a;
  color: #eee;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.login-form .row {
  display: flex;
  align-items: stretch;
  width: 100%;
  gap: 10px;
}
.login-form .half {
  flex: 1;
  min-width: 0;
  width: auto;
  height: 42px;
}
.captcha-img {
  flex: 1;
  min-width: 0;
  height: 42px;
  object-fit: contain;
  border-radius: 8px;
  background: #020617;
  cursor: pointer;
  border: 1px solid #1e3a5f;
  box-sizing: border-box;
}
.login-form .btn-code.half {
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.76rem;
  cursor: pointer;
  white-space: nowrap;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.login-form .btn-code.half:hover:not(:disabled) {
  background: #475569;
}
.login-form .btn-code.half:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.register-link-bar {
  margin-top: 10px;
  text-align: right;
  font-size: 0.88rem;
}
.link-btn {
  padding: 0;
  border: none;
  background: none;
  color: #38bdf8;
  font-size: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.link-btn:hover {
  color: #7dd3fc;
}
.register-mask {
  position: fixed;
  inset: 0;
  z-index: 10001;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.register-dialog {
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: auto;
  background: #16213e;
  border: 1px solid #243554;
  border-radius: 12px;
  padding: 20px 20px 16px;
  color: #eee;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}
.register-dialog h3 {
  margin: 0 0 14px;
  font-size: 1.05rem;
}
.register-dialog-body {
  font-size: 0.9rem;
}
.reg-row {
  margin-bottom: 12px;
}
.reg-lbl {
  display: block;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-bottom: 4px;
}
.reg-row input {
  width: 100%;
  height: 40px;
  padding: 0 11px;
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  background: #0f172a;
  color: #eee;
  font-size: 0.88rem;
  box-sizing: border-box;
}
.register-dialog .row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}
.register-dialog .row .half {
  flex: 1;
  min-width: 0;
  height: 40px;
  width: auto;
}
.register-dialog .captcha-img {
  flex: 1;
  min-width: 0;
  height: 40px;
  object-fit: contain;
  border-radius: 8px;
  background: #020617;
  border: 1px solid #1e3a5f;
  box-sizing: border-box;
}
.register-dialog .btn-code.half {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.76rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.register-dialog .btn-code.half:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.register-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #243554;
}
.reg-btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 0.88rem;
}
.reg-btn-ok {
  width: auto;
  margin-top: 0;
  padding: 8px 20px;
}
.login-form input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.login-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 10px;
  height: 44px;
  padding: 0 16px;
  background: #e94560;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  box-sizing: border-box;
}
.login-submit:hover:not(:disabled) {
  filter: brightness(1.06);
}
.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #f87171;
  margin-top: 10px;
  font-size: 0.82rem;
  line-height: 1.45;
}
.main-columns {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 320px);
  gap: 20px;
  align-items: start;
}
@media (max-width: 900px) {
  .main-columns {
    grid-template-columns: 1fr;
  }
  .header {
    grid-template-columns: 1fr;
    justify-items: stretch;
  }
  .header-left {
    order: 1;
  }
  .header-sync-wrap {
    order: 2;
    justify-self: center;
  }
  .header-right {
    order: 3;
    justify-self: stretch;
  }
  .header-actions {
    justify-content: space-between;
  }
}
.cloud-col {
  min-width: 0;
}
.sync-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.main section,
.sync-col section {
  margin-bottom: 0;
  background: #16213e;
  padding: 24px;
  border-radius: 12px;
}
.main h2,
.sync-col h2 {
  margin-top: 0;
  font-size: 1.1rem;
}
.sync-dirs-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px 14px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.sync-dirs-head h2 {
  margin-bottom: 0;
}
.sync-quota {
  font-size: 0.78rem;
  font-weight: 500;
  color: #94a3b8;
  line-height: 1.35;
  text-align: right;
  flex: 1;
  min-width: 0;
}
.dir-list { display: flex; flex-direction: column; gap: 10px; }
.sync-hint {
  margin: 0 0 14px;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #94a3b8;
}
.sync-hint strong { color: #cbd5e1; font-weight: 600; }
.dir-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 12px;
  background: #0f3460;
  border-radius: 8px;
}
.dir-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dir-title { font-weight: 500; font-size: 0.9rem; }
.dir-local {
  font-size: 0.75rem;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dir-status { font-size: 0.8rem; color: #4ade80; }
.dir-status.warn { color: #fbbf24; }
.dir-status.ok { color: #4ade80; }
.dir-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.btn-small { padding: 6px 12px; background: #374151; border: none; border-radius: 6px; color: #eee; cursor: pointer; font-size: 0.8rem; }
.btn-pull { background: #1e4976; }
.btn-pull:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-add { padding: 12px; background: transparent; border: 2px dashed #0f3460; border-radius: 8px; color: #94a3b8; cursor: pointer; }
.btn-add:hover { border-color: #e94560; color: #e94560; }
</style>
