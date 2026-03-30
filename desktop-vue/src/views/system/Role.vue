<template>
  <div class="page">
    <div class="card">
      <div class="toolbar">
        <input v-model="keyword" placeholder="搜索角色" class="search" @keyup.enter="load" />
        <button type="button" class="btn" @click="load">查询</button>
        <button type="button" class="btn btn-secondary" @click="openAdd">新增角色</button>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>角色名称</th>
              <th>角色标识</th>
              <th>描述</th>
              <th>状态</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in paging.records" :key="r.id">
              <td>{{ r.id }}</td>
              <td>{{ r.name }}</td>
              <td>{{ r.code }}</td>
              <td>{{ r.description || '-' }}</td>
              <td>{{ r.status === 1 ? '启用' : '禁用' }}</td>
              <td class="col-actions">
                <div class="actions">
                  <button type="button" class="link" @click="openEdit(r)">编辑</button>
                  <button type="button" class="link" @click="openMenus(r)">分配菜单</button>
                  <button
                    v-if="r.code !== 'admin'"
                    type="button"
                    class="link warn"
                    @click="toggleStatus(r)"
                  >
                    {{ r.status === 1 ? '禁用' : '启用' }}
                  </button>
                  <button
                    v-if="r.code !== 'admin'"
                    type="button"
                    class="link danger"
                    @click="remove(r)"
                  >
                    删除
                  </button>
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

    <Teleport to="body">
      <div v-if="showForm" class="modal-mask" @click.self="showForm = false">
        <div class="modal">
          <h3>{{ form.id ? '编辑角色' : '新增角色' }}</h3>
          <label>名称 <span class="req">*</span></label>
          <input v-model="form.name" class="input" />
          <label>标识 <span class="req">*</span></label>
          <input v-model="form.code" class="input" :disabled="!!form.id && form.code === 'admin'" />
          <p v-if="form.id && form.code === 'admin'" class="hint">超级管理员标识不可修改</p>
          <label>描述</label>
          <input v-model="form.description" class="input" />
          <p v-if="formErr" class="modal-err">{{ formErr }}</p>
          <div class="modal-btns">
            <button type="button" class="btn-cancel" @click="showForm = false">取消</button>
            <button type="button" class="btn-ok" :disabled="formBusy" @click="submitForm">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="menuRole" class="modal-mask" @click.self="menuRole = null">
        <div class="modal modal-menus">
          <h3>分配菜单 — {{ menuRole.name }}</h3>
          <p class="menu-tip">勾选该角色可访问的菜单；保存后刷新页面或重新登录后侧边栏生效。</p>
          <div v-if="menuTreeLoading" class="loading">加载菜单树…</div>
          <div v-else class="menu-scroll">
            <RoleMenuPicker v-model="selectedMenuIds" :tree="menuTree" />
          </div>
          <p v-if="menuErr" class="modal-err">{{ menuErr }}</p>
          <div class="modal-btns">
            <button type="button" class="btn-cancel" @click="menuRole = null">取消</button>
            <button type="button" class="btn-ok" :disabled="menuSaving" @click="submitMenus">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import RoleMenuPicker from '../../components/RoleMenuPicker.vue'
import {
  getRolePageList,
  addRole,
  updateRole,
  deleteRole,
  toggleRoleStatus,
  getRoleMenuIds,
  saveRoleMenus,
  type RoleItem,
  type PageResult
} from '../../api/role'
import { getMenuTree, type MenuVO } from '../../api/menu'

const keyword = ref('')
const loading = ref(false)
const pageIndex = ref(1)
const pageSize = 10
const paging = ref<PageResult<RoleItem>>({ total: 0, records: [], pageIndex: 1, pageSize: 10 })

const totalPages = computed(() => Math.max(1, Math.ceil(paging.value.total / pageSize)))

const showForm = ref(false)
const formBusy = ref(false)
const formErr = ref('')
const form = ref({ id: 0 as number | undefined, name: '', code: '', description: '' })

const menuRole = ref<RoleItem | null>(null)
const menuTree = ref<MenuVO[]>([])
const menuTreeLoading = ref(false)
const selectedMenuIds = ref<number[]>([])
const menuSaving = ref(false)
const menuErr = ref('')

async function load() {
  loading.value = true
  try {
    const data = await getRolePageList({ pageIndex: pageIndex.value, pageSize, keyword: keyword.value || undefined })
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

function openAdd() {
  formErr.value = ''
  form.value = { id: undefined, name: '', code: '', description: '' }
  showForm.value = true
}

function openEdit(r: RoleItem) {
  formErr.value = ''
  form.value = {
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description || ''
  }
  showForm.value = true
}

async function submitForm() {
  formErr.value = ''
  const f = form.value
  if (!f.name?.trim() || !f.code?.trim()) {
    formErr.value = '请填写名称和标识'
    return
  }
  formBusy.value = true
  try {
    if (f.id) {
      await updateRole({
        id: f.id,
        name: f.name.trim(),
        code: f.code.trim(),
        description: f.description?.trim() || undefined
      })
    } else {
      await addRole({
        name: f.name.trim(),
        code: f.code.trim(),
        description: f.description?.trim() || undefined
      })
    }
    showForm.value = false
    await load()
  } catch (e: unknown) {
    formErr.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    formBusy.value = false
  }
}

async function remove(r: RoleItem) {
  if (!confirm(`确定删除角色「${r.name}」？`)) return
  try {
    await deleteRole(r.id)
    await load()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '删除失败')
  }
}

async function toggleStatus(r: RoleItem) {
  const act = r.status === 1 ? '禁用' : '启用'
  if (!confirm(`确定${act}角色「${r.name}」？`)) return
  try {
    await toggleRoleStatus(r.id)
    await load()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '操作失败')
  }
}

async function openMenus(r: RoleItem) {
  menuErr.value = ''
  menuRole.value = r
  menuTreeLoading.value = true
  selectedMenuIds.value = []
  try {
    menuTree.value = await getMenuTree()
    selectedMenuIds.value = [...(await getRoleMenuIds(r.id))]
  } catch (e: unknown) {
    menuErr.value = e instanceof Error ? e.message : '加载失败'
    menuTree.value = []
  } finally {
    menuTreeLoading.value = false
  }
}

async function submitMenus() {
  const r = menuRole.value
  if (!r) return
  menuErr.value = ''
  menuSaving.value = true
  try {
    await saveRoleMenus(r.id, selectedMenuIds.value)
    menuRole.value = null
    await load()
  } catch (e: unknown) {
    menuErr.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    menuSaving.value = false
  }
}

onMounted(load)
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
  min-width: 140px;
  max-width: 320px;
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
.loading {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
}
.table-wrap {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th,
.table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #334155;
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
.link.warn {
  color: #fbbf24;
}
.link.danger {
  color: #f87171;
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
  max-width: 420px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  color: #e2e8f0;
}
.modal-menus {
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal h3 {
  margin: 0 0 16px;
  font-size: 1.05rem;
}
.menu-tip {
  margin: 0 0 12px;
  font-size: 0.82rem;
  color: #94a3b8;
  line-height: 1.45;
}
.menu-scroll {
  overflow-y: auto;
  max-height: min(52vh, 420px);
  padding: 8px;
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
}
.modal label {
  display: block;
  margin: 10px 0 6px;
  font-size: 0.85rem;
  color: #94a3b8;
}
.modal label:first-of-type {
  margin-top: 0;
}
.req {
  color: #f87171;
}
.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  box-sizing: border-box;
}
.hint {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #64748b;
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
  cursor: not-allowed;
}
@media (max-width: 768px) {
  .card {
    padding: 16px;
  }
  .search {
    flex: 1;
    min-width: 0;
    max-width: none;
    width: auto;
  }
  .table th,
  .table td {
    padding: 8px;
    font-size: 0.85rem;
  }
}
</style>
