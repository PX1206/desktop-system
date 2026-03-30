<template>
  <div class="page">
    <div class="card">
      <div class="toolbar">
        <input v-model="keyword" placeholder="搜索用户名/昵称/手机号" class="search" @keyup.enter="load" />
        <button type="button" class="btn" @click="load">查询</button>
        <button type="button" class="btn btn-secondary" @click="openAdd">新增用户</button>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>账号</th>
              <th>昵称</th>
              <th>手机号</th>
              <th>状态</th>
              <th>同步空间</th>
              <th>最后登录</th>
              <th>创建时间</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in paging.records" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td>{{ u.nickname || '-' }}</td>
              <td>{{ u.mobile || '-' }}</td>
              <td>{{ statusMap[u.status!] ?? u.status }}</td>
              <td class="sync-cell">{{ formatSyncUsage(u) }}</td>
              <td>{{ u.loginTime || '-' }}</td>
              <td>{{ u.createTime || '-' }}</td>
              <td class="col-actions">
                <div class="actions">
                  <button type="button" class="link" @click="openEdit(u)">编辑</button>
                  <button type="button" class="link" @click="openReset(u)">重置密码</button>
                  <template v-if="u.id !== currentUserId">
                    <button
                      v-if="u.status === 1"
                      type="button"
                      class="link warn"
                      @click="doDisable(u)"
                    >禁用</button>
                    <button
                      v-if="u.status === 1"
                      type="button"
                      class="link warn"
                      @click="doFreeze(u)"
                    >冻结</button>
                    <button
                      v-if="u.status === 2 || u.status === 3 || u.status === 4"
                      type="button"
                      class="link ok"
                      @click="doRestore(u)"
                    >恢复</button>
                    <button type="button" class="link danger" @click="doDelete(u)">删除</button>
                  </template>
                  <span v-else class="self-tag">当前账号</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button type="button" @click="prevPage" :disabled="pageIndex <= 1">上一页</button>
        <span>{{ pageIndex }} / {{ totalPages }}</span>
        <button type="button" @click="nextPage" :disabled="pageIndex >= totalPages">下一页</button>
      </div>
    </div>

    <!-- 重置密码 -->
    <Teleport to="body">
      <div v-if="resetUser" class="modal-mask" @click.self="resetUser = null">
        <div class="modal">
          <h3>重置密码 — {{ resetUser.username }}</h3>
          <label>新密码</label>
          <input v-model="resetPwd1" type="password" autocomplete="new-password" />
          <label>确认密码</label>
          <input v-model="resetPwd2" type="password" autocomplete="new-password" />
          <p v-if="modalErr" class="modal-err">{{ modalErr }}</p>
          <div class="modal-btns">
            <button type="button" class="btn-cancel" @click="resetUser = null">取消</button>
            <button type="button" class="btn-ok" :disabled="modalBusy" @click="submitReset">确定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 新增 -->
    <Teleport to="body">
      <div v-if="showAdd" class="modal-mask" @click.self="showAdd = false">
        <div class="modal modal-wide">
          <h3>新增用户</h3>
          <label>账号 <span class="req">*</span></label>
          <input v-model="addForm.username" />
          <label>手机号 <span class="req">*</span></label>
          <input v-model="addForm.mobile" maxlength="11" />
          <label>昵称 <span class="req">*</span></label>
          <input v-model="addForm.nickname" />
          <label>初始密码 <span class="req">*</span></label>
          <input v-model="addForm.password" type="password" />
          <label>同步空间配额（GB）</label>
          <input v-model.number="addForm.syncQuotaGb" type="number" min="1" max="2048" step="1" />
          <p class="field-hint">仅统计云同步目录内文件；默认 5GB，可限制单用户占用。</p>
          <p v-if="modalErr" class="modal-err">{{ modalErr }}</p>
          <div class="modal-btns">
            <button type="button" class="btn-cancel" @click="showAdd = false">取消</button>
            <button type="button" class="btn-ok" :disabled="modalBusy" @click="submitAdd">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 编辑 -->
    <Teleport to="body">
      <div v-if="editUser" class="modal-mask" @click.self="editUser = null">
        <div class="modal modal-wide">
          <h3>编辑用户 — {{ editUser.username }}</h3>
          <label>账号 <span class="req">*</span></label>
          <input v-model="editForm.username" />
          <label>手机号 <span class="req">*</span></label>
          <input v-model="editForm.mobile" maxlength="11" />
          <label>昵称</label>
          <input v-model="editForm.nickname" />
          <label>同步空间配额（GB）</label>
          <input v-model.number="editForm.syncQuotaGb" type="number" min="1" max="2048" step="1" />
          <p class="field-hint">已用：{{ editUsedHint }}</p>
          <p v-if="modalErr" class="modal-err">{{ modalErr }}</p>
          <div class="modal-btns">
            <button type="button" class="btn-cancel" @click="editUser = null">取消</button>
            <button type="button" class="btn-ok" :disabled="modalBusy" @click="submitEdit">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getUserPageList,
  getUserInfo,
  resetPassword,
  addUser,
  updateUserAdmin,
  deleteUser,
  disableUser,
  freezeUser,
  restoreUser,
  logout,
  type UserItem,
  type PageResult
} from '../../api/user'

const router = useRouter()

const keyword = ref('')
const loading = ref(false)
const pageIndex = ref(1)
const pageSize = 10
const paging = ref<PageResult<UserItem>>({ total: 0, records: [], pageIndex: 1, pageSize: 10 })
const currentUserId = ref<number | null>(null)

const statusMap: Record<number, string> = {
  0: '注销',
  1: '正常',
  2: '禁用',
  3: '冻结',
  4: '临时冻结'
}

const totalPages = computed(() => Math.max(1, Math.ceil(paging.value.total / pageSize)))

const GB = 1024 * 1024 * 1024

function formatBytesShort(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= GB) return `${(n / GB).toFixed(2)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

function formatSyncUsage(u: UserItem): string {
  const used = u.syncUsedBytes ?? 0
  const cap = u.syncQuotaBytes ?? 5 * GB
  return `${formatBytesShort(used)} / ${formatBytesShort(cap)}`
}

const editUsedHint = computed(() => {
  const u = editUser.value
  if (!u) return '—'
  return formatBytesShort(u.syncUsedBytes ?? 0)
})

const resetUser = ref<UserItem | null>(null)
const resetPwd1 = ref('')
const resetPwd2 = ref('')
const showAdd = ref(false)
const addForm = ref({ username: '', mobile: '', nickname: '', password: '', syncQuotaGb: 5 })
const editUser = ref<UserItem | null>(null)
const editForm = ref({ username: '', mobile: '', nickname: '', syncQuotaGb: 5 })
const modalErr = ref('')
const modalBusy = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await getUserPageList({ pageIndex: pageIndex.value, pageSize, keyword: keyword.value || undefined })
    paging.value = data!
  } catch {
    paging.value = { total: 0, records: [], pageIndex: 1, pageSize: 10 }
  } finally {
    loading.value = false
  }
}

function prevPage() {
  if (pageIndex.value > 1) {
    pageIndex.value--
    load()
  }
}

function nextPage() {
  if (pageIndex.value < totalPages.value) {
    pageIndex.value++
    load()
  }
}

function validatePwdPair(a: string, b: string): boolean {
  if (a.length < 8) {
    modalErr.value = '密码至少 8 位'
    return false
  }
  if (!/[0-9]/.test(a) || !/[a-zA-Z]/.test(a)) {
    modalErr.value = '密码须同时包含数字和字母'
    return false
  }
  if (a !== b) {
    modalErr.value = '两次密码不一致'
    return false
  }
  return true
}

function openReset(u: UserItem) {
  modalErr.value = ''
  resetPwd1.value = ''
  resetPwd2.value = ''
  resetUser.value = u
}

async function submitReset() {
  if (!resetUser.value) return
  modalErr.value = ''
  if (!validatePwdPair(resetPwd1.value, resetPwd2.value)) return
  modalBusy.value = true
  const targetId = resetUser.value.id
  try {
    await resetPassword(targetId, resetPwd1.value)
    resetUser.value = null
    if (targetId === currentUserId.value) {
      alert('密码已重置，请使用新密码重新登录')
      logout()
      router.push('/login')
      return
    }
    alert('密码已重置，该用户所有会话已失效')
    await load()
  } catch (e: any) {
    modalErr.value = e?.message || '失败'
  } finally {
    modalBusy.value = false
  }
}

function openAdd() {
  modalErr.value = ''
  addForm.value = { username: '', mobile: '', nickname: '', password: '', syncQuotaGb: 5 }
  showAdd.value = true
}

async function submitAdd() {
  modalErr.value = ''
  const f = addForm.value
  if (!f.username?.trim() || !f.mobile?.trim() || !f.nickname?.trim() || !f.password) {
    modalErr.value = '请填写完整'
    return
  }
  if (!validatePwdPair(f.password, f.password)) return
  const gb = Number(f.syncQuotaGb)
  if (!Number.isFinite(gb) || gb < 1 || gb > 2048) {
    modalErr.value = '同步配额须在 1～2048 GB 之间'
    return
  }
  modalBusy.value = true
  try {
    await addUser({
      username: f.username.trim(),
      mobile: f.mobile.trim(),
      nickname: f.nickname.trim(),
      password: f.password,
      syncQuotaGb: Math.floor(gb)
    })
    showAdd.value = false
    await load()
  } catch (e: any) {
    modalErr.value = e?.message || '失败'
  } finally {
    modalBusy.value = false
  }
}

function openEdit(u: UserItem) {
  modalErr.value = ''
  editUser.value = u
  const cap = u.syncQuotaBytes ?? 5 * GB
  editForm.value = {
    username: u.username,
    mobile: u.mobile || '',
    nickname: u.nickname || '',
    syncQuotaGb: Math.max(1, Math.min(2048, Math.round(cap / GB)))
  }
}

async function submitEdit() {
  if (!editUser.value) return
  modalErr.value = ''
  const f = editForm.value
  if (!f.username?.trim() || !f.mobile?.trim()) {
    modalErr.value = '账号与手机号必填'
    return
  }
  const gb = Number(f.syncQuotaGb)
  if (!Number.isFinite(gb) || gb < 1 || gb > 2048) {
    modalErr.value = '同步配额须在 1～2048 GB 之间'
    return
  }
  modalBusy.value = true
  try {
    await updateUserAdmin({
      id: editUser.value.id,
      username: f.username.trim(),
      mobile: f.mobile.trim(),
      nickname: f.nickname?.trim(),
      syncQuotaGb: Math.floor(gb)
    })
    editUser.value = null
    await load()
  } catch (e: any) {
    modalErr.value = e?.message || '失败'
  } finally {
    modalBusy.value = false
  }
}

async function doDisable(u: UserItem) {
  if (!confirm(`确定禁用用户「${u.username}」？`)) return
  try {
    await disableUser(u.id)
    await load()
  } catch (e: any) {
    alert(e?.message || '失败')
  }
}

async function doFreeze(u: UserItem) {
  if (!confirm(`确定冻结用户「${u.username}」？`)) return
  try {
    await freezeUser(u.id)
    await load()
  } catch (e: any) {
    alert(e?.message || '失败')
  }
}

async function doRestore(u: UserItem) {
  if (!confirm(`确定恢复用户「${u.username}」为正常状态？`)) return
  try {
    await restoreUser(u.id)
    await load()
  } catch (e: any) {
    alert(e?.message || '失败')
  }
}

async function doDelete(u: UserItem) {
  if (!confirm(`确定删除用户「${u.username}」？此操作不可恢复。`)) return
  try {
    await deleteUser(u.id)
    await load()
  } catch (e: any) {
    alert(e?.message || '失败')
  }
}

onMounted(async () => {
  const me = await getUserInfo()
  currentUserId.value = me?.id ?? null
  load()
})
</script>

<style scoped>
.page {
  padding: 0;
}
.card {
  background: #1e293b;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #334155;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.search {
  padding: 8px 12px;
  border: 1px solid #334155;
  border-radius: 6px;
  background: #0f172a;
  color: #e2e8f0;
  flex: 1;
  min-width: 200px;
  max-width: 280px;
}
.btn {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
}
.btn-secondary {
  background: #475569;
}
.table-wrap {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.table th,
.table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid #334155;
  vertical-align: top;
}
.table th {
  color: #94a3b8;
  font-weight: 500;
}
.col-actions {
  min-width: 200px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
}
.link {
  background: none;
  border: none;
  color: #38bdf8;
  cursor: pointer;
  padding: 0;
  font-size: 0.85rem;
  text-decoration: underline;
}
.link:hover {
  color: #7dd3fc;
}
.link.warn {
  color: #fbbf24;
}
.link.ok {
  color: #4ade80;
}
.link.danger {
  color: #f87171;
}
.self-tag {
  font-size: 0.75rem;
  color: #64748b;
}
.sync-cell {
  font-size: 0.82rem;
  color: #94a3b8;
  white-space: nowrap;
}
.field-hint {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.4;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}
.pagination button {
  padding: 6px 12px;
  background: #334155;
  border: none;
  border-radius: 6px;
  color: #e2e8f0;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 400px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  color: #e2e8f0;
}
.modal-wide {
  max-width: 440px;
}
.modal h3 {
  margin: 0 0 16px;
  font-size: 1.05rem;
}
.modal label {
  display: block;
  margin: 10px 0 6px;
  font-size: 0.85rem;
  color: #94a3b8;
}
.req {
  color: #f87171;
}
.modal input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  box-sizing: border-box;
}
.modal-err {
  margin: 12px 0 0;
  color: #f87171;
  font-size: 0.85rem;
}
.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.btn-cancel {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
}
.btn-ok {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}
.btn-ok:disabled {
  opacity: 0.6;
}
@media (max-width: 768px) {
  .card {
    padding: 16px;
  }
  .search {
    min-width: 0;
    max-width: none;
  }
  .table th,
  .table td {
    padding: 8px 6px;
    font-size: 0.85rem;
  }
}
</style>
