<template>
  <div class="layout">
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="logo">云同步</div>
      <nav class="menu">
        <template v-for="m in menuTree" :key="m.id">
          <template v-if="m.children?.length">
            <div class="menu-group" :key="m.id">
              <div class="menu-group-title" @click="toggleGroup(m.id)">
                <span class="icon">{{ menuIcon(m.icon) }}</span>
                <span v-show="!sidebarCollapsed" class="label">{{ m.title }}</span>
                <span v-show="!sidebarCollapsed" class="arrow">{{ expandedGroups.has(m.id) ? '▼' : '▶' }}</span>
              </div>
              <div v-show="expandedGroups.has(m.id) && !sidebarCollapsed" class="menu-children">
                <router-link v-for="c in m.children" :key="c.id" :to="c.path || '#'" class="menu-item" active-class="active">
                  <span class="icon">{{ menuIcon(c.icon, '📄') }}</span>
                  <span class="label">{{ c.title }}</span>
                </router-link>
              </div>
            </div>
          </template>
          <template v-else>
            <router-link :key="m.id" :to="m.path || '/'" class="menu-item" active-class="active">
              <span class="icon">{{ menuIcon(m.icon) }}</span>
              <span v-show="!sidebarCollapsed" class="label">{{ m.title }}</span>
            </router-link>
          </template>
        </template>
      </nav>
    </aside>
    <div class="main-wrap">
      <header class="header">
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          {{ sidebarCollapsed ? '☰' : '◀' }}
        </button>
        <span class="title">{{ currentTitle }}</span>
        <DesktopClientDownloadLink variant="header" class="header-desktop-dl" />
        <div ref="userMenuRef" class="user-area">
          <button type="button" class="user-trigger" @click.stop="userMenuOpen = !userMenuOpen">
            {{ userInfo?.nickname || userInfo?.username || '用户' }}
            <span class="caret">{{ userMenuOpen ? '▴' : '▾' }}</span>
          </button>
          <div v-if="userMenuOpen" class="user-dropdown">
            <button type="button" class="drop-item" @click="openProfile">个人信息</button>
            <button type="button" class="drop-item" @click="openChangePwd">修改密码</button>
            <div class="drop-divider" />
            <button type="button" class="drop-item danger" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </header>
      <main class="main">
        <router-view />
      </main>
    </div>

    <Teleport to="body">
      <div v-if="profileOpen" class="profile-mask" @click.self="profileOpen = false">
        <div class="profile-box">
          <h3>个人信息</h3>
          <p class="profile-tip">账号、手机号、角色请在管理端或由管理员修改；修改密码请使用顶部菜单「修改密码」。</p>
          <p v-if="profileLoading" class="profile-loading">正在加载最新信息…</p>
          <div v-if="!profileLoading" class="profile-form">
            <label>账号</label>
            <input type="text" :value="userInfo.username || '-'" class="readonly" readonly />

            <label>手机号</label>
            <input type="text" :value="userInfo.mobile || '-'" class="readonly" readonly />

            <label>角色</label>
            <input type="text" :value="userInfo.role === 'admin' ? '管理员' : '普通用户'" class="readonly" readonly />

            <label>最后登录</label>
            <input type="text" :value="userInfo.loginTime || '-'" class="readonly" readonly />

            <label>昵称</label>
            <input v-model="profileForm.nickname" type="text" placeholder="显示名称" />

            <label>性别</label>
            <select v-model.number="profileForm.sex">
              <option :value="emptySex">未填写</option>
              <option :value="1">男</option>
              <option :value="2">女</option>
            </select>

            <label>生日</label>
            <div class="birthday-row">
              <BirthdayPicker v-model="profileForm.birthday" />
              <button type="button" class="btn-clear-birthday" @click="profileForm.birthday = ''">清除</button>
            </div>

            <label>常用地址</label>
            <input v-model="profileForm.address" type="text" placeholder="选填" />

            <label>头像</label>
            <ProfileAvatarUpload v-model="profileForm.headImg" />
          </div>
          <p v-if="profileErr" class="profile-err">{{ profileErr }}</p>
          <div class="profile-actions">
            <button type="button" class="profile-close" @click="profileOpen = false">取消</button>
            <button type="button" class="profile-save" :disabled="profileSaving || profileLoading" @click="saveProfile">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <ChangePasswordModal
      v-model="pwdModalOpen"
      :mobile="userInfo.mobile || ''"
      @success="onPasswordChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { logout, getUserInfo, updateSelfProfile, type UserDetail } from '../api/user'
import { getUserMenuTree, type MenuItem } from '../api/menu'
import ChangePasswordModal from '../components/ChangePasswordModal.vue'
import BirthdayPicker from '../components/BirthdayPicker.vue'
import ProfileAvatarUpload from '../components/ProfileAvatarUpload.vue'
import DesktopClientDownloadLink from '../components/DesktopClientDownloadLink.vue'

const router = useRouter()
const route = useRoute()
const menuTree = ref<MenuItem[]>([])
const sidebarCollapsed = ref(false)
const expandedGroups = ref<Set<number>>(new Set([110]))
const userInfo = ref<UserDetail>({} as UserDetail)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)
const profileOpen = ref(false)
const pwdModalOpen = ref(false)
const profileSaving = ref(false)
const profileLoading = ref(false)
const profileErr = ref('')
const emptySex = 0
const profileForm = ref({
  nickname: '',
  sex: emptySex as number,
  birthday: '',
  address: '',
  headImg: ''
})

function birthdayToInput(v?: string): string {
  if (!v) return ''
  return v.slice(0, 10)
}

const iconMap: Record<string, string> = {
  folder: '📁',
  document: '📄',
  setting: '⚙️',
  menu: '📋',
  peoples: '👥',
  user: '👤',
  form: '📝',
  download: '📦'
}

function menuIcon(icon?: string | null, fallback: string = '📁') {
  if (!icon) return fallback
  return iconMap[icon] ?? fallback
}

const currentTitle = computed(() => {
  const t = route.meta?.title as string
  if (t) return t
  const path = route.path
  if (path.startsWith('/files')) return '文件管理'
  if (path.startsWith('/system/menu')) return '菜单管理'
  if (path.startsWith('/system/role')) return '角色管理'
  if (path.startsWith('/system/user')) return '用户管理'
  if (path.startsWith('/system/log')) return '日志管理'
  if (path.startsWith('/system/install-package')) return '安装包管理'
  return '云同步'
})

function toggleGroup(id: number) {
  const s = new Set(expandedGroups.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedGroups.value = s
}

async function loadMenu() {
  try {
    menuTree.value = await getUserMenuTree()
    expandedGroups.value = new Set(menuTree.value.map(m => m.id))
  } catch {
    menuTree.value = []
  }
}

async function loadUserInfo() {
  try {
    const data = await getUserInfo()
    userInfo.value = data || ({} as UserDetail)
  } catch {
    userInfo.value = {} as UserDetail
  }
}

function onDocClick(e: MouseEvent) {
  const el = userMenuRef.value
  if (el && !el.contains(e.target as Node)) userMenuOpen.value = false
}

async function openProfile() {
  userMenuOpen.value = false
  profileErr.value = ''
  profileOpen.value = true
  profileLoading.value = true
  try {
    await loadUserInfo()
  } catch {
    /* loadUserInfo 内部已处理 userInfo，此处仅结束加载态 */
  } finally {
    profileLoading.value = false
  }
  profileForm.value = {
    nickname: userInfo.value.nickname || '',
    sex: userInfo.value.sex === 1 || userInfo.value.sex === 2 ? userInfo.value.sex : emptySex,
    birthday: birthdayToInput(userInfo.value.birthday),
    address: userInfo.value.address || '',
    headImg: userInfo.value.headImg || ''
  }
}

async function saveProfile() {
  profileErr.value = ''
  profileSaving.value = true
  try {
    const f = profileForm.value
    const payload: {
      nickname?: string
      headImg?: string
      sex?: number
      birthday?: string
      address?: string
    } = {
      nickname: f.nickname?.trim() || undefined,
      headImg: f.headImg?.trim() || undefined,
      address: f.address?.trim() || undefined
    }
    if (f.sex === 1 || f.sex === 2) payload.sex = f.sex
    if (f.birthday) payload.birthday = f.birthday

    await updateSelfProfile(payload)
    await loadUserInfo()
    profileOpen.value = false
  } catch (e: any) {
    profileErr.value = e?.message || '保存失败'
  } finally {
    profileSaving.value = false
  }
}

function openChangePwd() {
  userMenuOpen.value = false
  if (!userInfo.value.mobile) {
    alert('当前账号未绑定手机号，无法通过短信修改密码')
    return
  }
  pwdModalOpen.value = true
}

function onPasswordChanged() {
  alert('密码已修改，请重新登录')
  logout()
  router.push('/login')
}

function handleLogout() {
  userMenuOpen.value = false
  logout()
  router.push('/login')
}

onMounted(() => {
  loadMenu()
  loadUserInfo()
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; background: #0f172a; color: #e2e8f0; }
.sidebar {
  width: 220px;
  background: #1e293b;
  border-right: 1px solid #334155;
  transition: width 0.2s;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 56px; }
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  border-bottom: 1px solid #334155;
  white-space: nowrap;
  overflow: hidden;
}
.menu { padding: 12px 0; }
.menu-group-title {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.2s;
}
.menu-group-title:hover { color: #fff; }
.menu-group-title .icon { margin-right: 10px; font-size: 1.1rem; min-width: 1.2em; }
.menu-group-title .label { flex: 1; }
.menu-group-title .arrow { font-size: 0.7rem; }
.menu-children { margin-left: 26px; margin-bottom: 4px; }
.menu-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  color: #94a3b8;
  text-decoration: none;
  transition: all 0.2s;
  border-radius: 6px;
  margin: 2px 8px;
}
.menu-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
.menu-item.active { color: #38bdf8; background: rgba(56,189,248,0.1); }
.menu-item .icon { margin-right: 10px; font-size: 1rem; min-width: 1.2em; }
.main-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  gap: 16px;
}
.collapse-btn {
  padding: 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
}
.collapse-btn:hover { color: #fff; }
.title { flex: 1; font-weight: 500; min-width: 0; }
.header-desktop-dl {
  flex-shrink: 0;
}
.user-area {
  position: relative;
  display: flex;
  align-items: center;
}
.user-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #e2e8f0;
  cursor: pointer;
  font-size: 0.9rem;
  max-width: 200px;
}
.user-trigger:hover {
  background: #475569;
}
.caret {
  font-size: 0.65rem;
  color: #94a3b8;
}
.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 160px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
  padding: 6px 0;
  z-index: 200;
}
.drop-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  color: #e2e8f0;
  text-align: left;
  font-size: 0.9rem;
  cursor: pointer;
}
.drop-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.drop-item.danger {
  color: #f87171;
}
.drop-divider {
  height: 1px;
  background: #334155;
  margin: 6px 0;
}
.profile-mask {
  position: fixed;
  inset: 0;
  z-index: 10500;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.profile-box {
  width: 100%;
  max-width: 420px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  color: #e2e8f0;
}
.profile-box h3 {
  margin: 0 0 8px;
}
.profile-tip {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.45;
}
.profile-loading {
  margin: 0 0 16px;
  font-size: 0.9rem;
  color: #94a3b8;
}
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.profile-form label {
  margin-top: 10px;
  font-size: 0.85rem;
  color: #94a3b8;
}
.profile-form label:first-of-type {
  margin-top: 0;
}
.profile-form input,
.profile-form select {
  padding: 10px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.9rem;
}
.profile-form input.readonly {
  opacity: 0.85;
  cursor: not-allowed;
}
.birthday-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.birthday-row :deep(.birthday-picker) {
  flex: 1;
  min-width: 0;
}
.btn-clear-birthday {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  align-self: center;
}
.btn-clear-birthday:hover {
  color: #e2e8f0;
  border-color: #64748b;
}
.profile-err {
  margin: 12px 0 0;
  font-size: 0.85rem;
  color: #f87171;
}
.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.profile-close {
  padding: 8px 20px;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
}
.profile-close:hover {
  background: rgba(255, 255, 255, 0.06);
}
.profile-save {
  padding: 8px 20px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}
.profile-save:hover:not(:disabled) {
  background: #2563eb;
}
.profile-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.main { flex: 1; padding: 20px; overflow: auto; }
@media (max-width: 768px) {
  .sidebar { position: fixed; left: 0; top: 0; bottom: 0; z-index: 100; }
  .sidebar.collapsed { width: 0; overflow: hidden; }
}
</style>
