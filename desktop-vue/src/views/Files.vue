<template>
  <div class="files-page">
    <div class="files-layout">
      <aside class="dir-tree">
        <div class="tree-header">同步目录</div>
        <div v-if="treeLoading" class="tree-loading">加载中...</div>
        <div v-else-if="!dirTree.length" class="tree-empty">暂无同步目录，请使用桌面客户端添加</div>
        <ul v-else class="tree-list">
          <DirNode
            v-for="node in dirTree"
            :key="`${node.syncDirectoryId}-${node.relativePath}`"
            :node="node"
            :selected-node="selected"
            :show-owner="isAdmin"
            @select="selectDir"
          />
        </ul>
      </aside>
      <main class="file-panel">
        <div class="toolbar">
          <input
            v-model="keyword"
            placeholder="搜索文件名"
            @input="debouncedSearch"
            class="search"
          />
        </div>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="!selected && !keyword" class="empty">请从左侧选择目录或输入关键词搜索</div>
        <div v-else-if="!paging.records?.length" class="empty">暂无文件</div>
        <ul v-else class="file-list">
          <li v-for="f in paging.records" :key="f.code" class="file-item">
            <div class="file-line">
              <FilePreview :file="f" :url="downloadUrl(f.code)" />
              <div class="file-row">
                <span class="name">{{ f.name }}{{ getExt(f) }}</span>
                <span class="meta">
                  {{ formatSize(f.size) }} · 最后同步 {{ syncTime(f) }}
                  <span v-if="isAdmin && f.createBy" class="owner"> · {{ f.createBy }}</span>
                </span>
                <a
                  :href="downloadUrl(f.code)"
                  target="_blank"
                  rel="noopener"
                  class="download"
                >下载</a>
                <button
                  type="button"
                  class="btn-delete"
                  :disabled="deletingCode === f.code"
                  @click="confirmDelete(f)"
                >
                  {{ deletingCode === f.code ? '删除中…' : '删除' }}
                </button>
              </div>
            </div>
          </li>
        </ul>
        <div v-if="paging.total > pageSize" class="pagination">
          <button @click="prevPage" :disabled="pageIndex <= 1">上一页</button>
          <span>{{ pageIndex }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="pageIndex >= totalPages">下一页</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  getFileList,
  getDirectoryTree,
  deleteFile,
  type FileItem,
  type DirectoryTreeNode
} from '../api/file'
import { getUserInfo } from '../api/user'
import DirNode from '../components/DirNode.vue'
import FilePreview from '../components/FilePreview.vue'

const dirTree = ref<DirectoryTreeNode[]>([])
const treeLoading = ref(false)
const selected = ref<{ syncDirectoryId: number; relativePath: string } | null>(null)
const userInfo = ref<{ role?: string }>({})
const keyword = ref('')
const loading = ref(false)
const pageIndex = ref(1)
const pageSize = 20
const paging = ref<{ total: number; records: FileItem[] }>({ total: 0, records: [] })
const deletingCode = ref<string | null>(null)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(paging.value.total / pageSize))
)
const isAdmin = computed(() => userInfo.value?.role === 'admin')

function getExt(f: FileItem) {
  if (f.suffix) return f.suffix
  const url = f.url || ''
  const m = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return m ? `.${m[1]}` : ''
}

function formatSize(bytes: number | undefined | null) {
  if (bytes == null || bytes === 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function syncTime(f: FileItem) {
  return f.lastSyncTime || f.createTime || '-'
}

function downloadUrl(code: string) {
  const base = (import.meta as any).env?.VITE_API_BASE ?? '/api'
  const token = localStorage.getItem('token')
  return `${base}/file/${code}${token ? `?Authorization=${encodeURIComponent(token)}` : ''}`
}

function selectDir(node: DirectoryTreeNode) {
  selected.value = {
    syncDirectoryId: node.syncDirectoryId,
    relativePath: node.relativePath || ''
  }
  pageIndex.value = 1
}

let searchTimer: number
function debouncedSearch() {
  clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    pageIndex.value = 1
    load()
  }, 300)
}

async function loadTree() {
  treeLoading.value = true
  try {
    dirTree.value = await getDirectoryTree()
  } catch (e) {
    console.error(e)
    dirTree.value = []
  } finally {
    treeLoading.value = false
  }
}

async function loadUserInfo() {
  try {
    const data = await getUserInfo()
    userInfo.value = data || {}
  } catch {
    userInfo.value = {}
  }
}

async function load() {
  loading.value = true
  try {
    const data = await getFileList({
      pageIndex: pageIndex.value,
      pageSize,
      name: keyword.value || undefined,
      syncDirectoryId: selected.value?.syncDirectoryId,
      relativePath: selected.value != null ? selected.value.relativePath : undefined
    })
    paging.value = data
  } catch (e) {
    console.error(e)
    paging.value = { total: 0, records: [] }
  } finally {
    loading.value = false
  }
}

async function confirmDelete(f: FileItem) {
  const label = `${f.name}${getExt(f)}`
  const ok = window.confirm(
    `确定从云端删除「${label}」？\n仅可删除您本人名下的文件；管理员可删除全部。\n若本地同步目录仍保留该文件，定时同步或修改文件后会再次上传。`
  )
  if (!ok) return
  deletingCode.value = f.code
  try {
    await deleteFile(f.code)
    await Promise.all([load(), loadTree()])
  } catch (e) {
    window.alert((e as Error)?.message || '删除失败')
  } finally {
    deletingCode.value = null
  }
}

watch([selected, keyword], () => load(), { immediate: true })

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

onMounted(() => {
  loadTree()
  loadUserInfo()
})
</script>

<style scoped>
.files-page { padding: 0; }
.files-layout { display: flex; flex-wrap: nowrap; gap: 20px; min-height: 400px; }
.dir-tree {
  width: 260px;
  min-width: 260px;
  flex-shrink: 0;
  background: #1e293b;
  border-radius: 10px;
  border: 1px solid #334155;
  overflow: hidden;
}
.tree-header {
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #334155;
}
.tree-loading, .tree-empty { padding: 24px; text-align: center; color: #94a3b8; }
.tree-list { list-style: none; margin: 0; padding: 8px 0; }
.file-panel { flex: 1; min-width: 0; }
.toolbar { margin-bottom: 16px; }
.search {
  width: 100%;
  max-width: 320px;
  padding: 10px 14px;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #1e293b;
  color: #e2e8f0;
  font-size: 0.95rem;
}
.loading, .empty {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
}
.file-list { list-style: none; margin: 0; padding: 0; }
.file-item {
  padding: 12px 16px;
  margin-bottom: 8px;
  background: #1e293b;
  border-radius: 10px;
  border: 1px solid #334155;
}
.file-line {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
}
.file-item .file-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.file-item .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-item .meta { font-size: 0.85rem; color: #94a3b8; }
.file-item .meta .owner { color: #64748b; }
.file-item .download {
  padding: 6px 14px;
  background: #3b82f6;
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
  font-size: 0.9rem;
}
.file-item .download:hover { background: #2563eb; }
.file-item .btn-delete {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid #b91c1c;
  border-radius: 6px;
  color: #f87171;
  font-size: 0.9rem;
  cursor: pointer;
}
.file-item .btn-delete:hover:not(:disabled) {
  background: rgba(185, 28, 28, 0.2);
  color: #fca5a5;
}
.file-item .btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}
.pagination button {
  padding: 8px 16px;
  background: #334155;
  border: none;
  border-radius: 6px;
  color: #e2e8f0;
  cursor: pointer;
}
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 768px) {
  .files-layout { flex-direction: column; }
  .dir-tree { width: 100%; min-width: 0; }
  .file-line {
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .file-item .file-row {
    width: 100%;
    flex-basis: 100%;
  }
}
</style>
