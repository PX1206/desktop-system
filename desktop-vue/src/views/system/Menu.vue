<template>
  <div class="page">
    <div class="card">
      <div class="toolbar">
        <h2 class="h2">菜单管理</h2>
        <div class="toolbar-actions">
          <button type="button" class="btn btn-secondary" :disabled="loading" @click="load">刷新</button>
          <button type="button" class="btn" @click="openAddRoot">新增顶级菜单</button>
        </div>
      </div>
      <p class="tip">与后端 <code>/menu/add</code>、<code>/menu/update</code>、<code>/menu/delete</code> 一致；删除前需先删除子菜单。</p>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="tree">
        <MenuTreeNode
          v-for="m in menuTree"
          :key="m.id"
          :node="m"
          :depth="0"
          @add-child="openAddChild"
          @edit="openEdit"
          @delete="confirmDelete"
        />
        <p v-if="!menuTree.length" class="empty">暂无菜单数据</p>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="formOpen" class="modal-mask" @click.self="formOpen = false">
        <div class="modal modal-wide">
          <h3>{{ form.id ? '编辑菜单' : '新增菜单' }}</h3>
          <div class="form-grid">
            <label>父级</label>
            <select v-model.number="form.pid" class="input">
              <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
            </select>

            <label>标题 <span class="req">*</span></label>
            <input v-model="form.title" class="input" placeholder="菜单标题" />

            <label>类型 <span class="req">*</span></label>
            <select v-model="form.type" class="input">
              <option value="dir">dir 目录</option>
              <option value="menu">menu 菜单</option>
              <option value="btn">btn 按钮</option>
            </select>

            <label>路由 path</label>
            <input v-model="form.path" class="input" placeholder="如 /system/user" />

            <label>组件 component</label>
            <input v-model="form.component" class="input" placeholder="前端组件路径" />

            <label>图标 icon</label>
            <input v-model="form.icon" class="input" placeholder="如 folder" />

            <label>路由名 name</label>
            <input v-model="form.name" class="input" />

            <label>重定向 redirect</label>
            <input v-model="form.redirect" class="input" />

            <label>权限 permission</label>
            <input v-model="form.permission" class="input" />

            <label>排序 sort</label>
            <input v-model.number="form.sort" type="number" class="input" />

            <label class="span-2 check">
              <input v-model="form.hidden" type="checkbox" /> 隐藏
            </label>
            <label class="span-2 check">
              <input v-model="form.affix" type="checkbox" /> 固定 affix
            </label>
            <label class="span-2 check">
              <input v-model="form.keepAlive" type="checkbox" /> 缓存 keepAlive
            </label>
          </div>
          <p v-if="formErr" class="err">{{ formErr }}</p>
          <div class="modal-btns">
            <button type="button" class="btn-cancel" @click="formOpen = false">取消</button>
            <button type="button" class="btn-ok" :disabled="formSaving" @click="submitForm">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MenuTreeNode from '../../components/MenuTreeNode.vue'
import {
  getMenuTree,
  addMenu,
  updateMenu,
  deleteMenu,
  type MenuVO,
  type MenuParam
} from '../../api/menu'

const menuTree = ref<MenuVO[]>([])
const loading = ref(false)
const formOpen = ref(false)
const formSaving = ref(false)
const formErr = ref('')

const form = ref({
  id: undefined as number | undefined,
  pid: 0,
  title: '',
  type: 'menu',
  permission: '',
  component: '',
  icon: '',
  name: '',
  redirect: '',
  sort: 0,
  path: '',
  hidden: false,
  affix: false,
  keepAlive: false
})

function flattenMenuTree(nodes: MenuVO[], level = 0): { id: number; label: string }[] {
  const out: { id: number; label: string }[] = []
  for (const n of nodes) {
    out.push({ id: n.id, label: `${'\u3000'.repeat(level)}${n.title}` })
    if (n.children?.length) {
      out.push(...flattenMenuTree(n.children, level + 1))
    }
  }
  return out
}

/** 自身及所有子孙 id（作父级时会导致环，需排除） */
function selfAndDescendantIds(nodes: MenuVO[], targetId: number): Set<number> {
  function find(list: MenuVO[]): MenuVO | null {
    for (const n of list) {
      if (n.id === targetId) return n
      if (n.children?.length) {
        const f = find(n.children)
        if (f) return f
      }
    }
    return null
  }
  const root = find(nodes)
  const ids = new Set<number>()
  function dfs(n: MenuVO) {
    ids.add(n.id)
    n.children?.forEach(dfs)
  }
  if (root) dfs(root)
  return ids
}

const parentOptions = computed(() => {
  const top = { id: 0, label: '顶级' }
  const flat = flattenMenuTree(menuTree.value)
  if (!form.value.id) {
    return [top, ...flat]
  }
  const bad = selfAndDescendantIds(menuTree.value, form.value.id)
  return [top, ...flat.filter(f => !bad.has(f.id))]
})

function resetForm() {
  formErr.value = ''
  form.value = {
    id: undefined,
    pid: 0,
    title: '',
    type: 'menu',
    permission: '',
    component: '',
    icon: '',
    name: '',
    redirect: '',
    sort: 0,
    path: '',
    hidden: false,
    affix: false,
    keepAlive: false
  }
}

function openAddRoot() {
  resetForm()
  form.value.pid = 0
  formOpen.value = true
}

function openAddChild(parent: MenuVO) {
  resetForm()
  form.value.pid = parent.id
  formOpen.value = true
}

function openEdit(node: MenuVO) {
  resetForm()
  form.value = {
    id: node.id,
    pid: node.pid ?? 0,
    title: node.title || '',
    type: node.type || 'menu',
    permission: node.permission || '',
    component: node.component || '',
    icon: node.icon || '',
    name: node.name || '',
    redirect: node.redirect || '',
    sort: node.sort ?? 0,
    path: node.path || '',
    hidden: !!node.hidden,
    affix: !!node.affix,
    keepAlive: !!node.keepAlive
  }
  formOpen.value = true
}

function toParam(): MenuParam {
  const f = form.value
  return {
    pid: f.pid,
    title: f.title.trim(),
    type: f.type,
    permission: f.permission?.trim() || undefined,
    component: f.component?.trim() || undefined,
    icon: f.icon?.trim() || undefined,
    name: f.name?.trim() || undefined,
    redirect: f.redirect?.trim() || undefined,
    sort: Number.isFinite(f.sort) ? f.sort : 0,
    path: f.path?.trim() || undefined,
    hidden: f.hidden,
    affix: f.affix,
    keepAlive: f.keepAlive
  }
}

async function submitForm() {
  formErr.value = ''
  if (!form.value.title.trim()) {
    formErr.value = '请填写标题'
    return
  }
  formSaving.value = true
  try {
    const p = toParam()
    if (form.value.id) {
      await updateMenu({ ...p, id: form.value.id })
    } else {
      await addMenu(p)
    }
    formOpen.value = false
    await load()
  } catch (e: unknown) {
    formErr.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    formSaving.value = false
  }
}

async function confirmDelete(node: MenuVO) {
  if (!confirm(`确定删除菜单「${node.title}」？`)) return
  try {
    await deleteMenu(node.id)
    await load()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : '删除失败')
  }
}

async function load() {
  loading.value = true
  try {
    menuTree.value = await getMenuTree()
  } catch {
    menuTree.value = []
  } finally {
    loading.value = false
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.h2 {
  margin: 0;
  font-size: 1.1rem;
}
.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.tip {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0 0 16px;
  line-height: 1.5;
}
.tip code {
  font-size: 0.8rem;
  color: #7dd3fc;
}
.loading {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
}
.empty {
  color: #64748b;
  padding: 24px;
  text-align: center;
}
.tree {
  margin-top: 8px;
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
  max-width: 520px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
  color: #e2e8f0;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-wide {
  max-width: 560px;
}
.modal h3 {
  margin: 0 0 16px;
  font-size: 1.05rem;
}
.form-grid {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 10px 12px;
  align-items: center;
}
.form-grid label {
  font-size: 0.85rem;
  color: #94a3b8;
}
.form-grid label.check {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.span-2 {
  grid-column: 1 / -1;
}
.req {
  color: #f87171;
}
.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  box-sizing: border-box;
}
.err {
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
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-grid label:not(.check) {
    margin-top: 4px;
  }
}
</style>
