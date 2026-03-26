<template>
  <section class="cloud-panel">
    <div class="cloud-head">
      <h2>云端文件</h2>
      <div class="cloud-head-actions">
        <span v-if="lastRefreshed" class="last-refresh">更新于 {{ lastRefreshed }}</span>
        <button type="button" class="btn-refresh" :disabled="refreshing" @click="refreshAll">
          {{ refreshing ? '刷新中…' : '刷新' }}
        </button>
      </div>
    </div>
    <p class="cloud-desc">展示当前账号在服务端已同步的文件，本地变更上传成功后会自动刷新。</p>

    <div class="cloud-body">
      <aside class="cloud-tree">
        <div class="tree-title">目录</div>
        <div v-if="treeLoading" class="muted">加载目录…</div>
        <div v-else-if="!dirTree.length" class="muted">暂无同步目录，请先在右侧添加</div>
        <ul v-else class="tree-list">
          <CloudDirNode
            v-for="node in dirTree"
            :key="`${node.syncDirectoryId}-${node.relativePath}`"
            :node="node"
            :selected-node="selected"
            @select="selectDir"
          />
        </ul>
      </aside>

      <div class="cloud-files">
        <div class="toolbar">
          <input
            v-model="keyword"
            type="search"
            placeholder="搜索文件名"
            class="search"
            @input="onSearchInput"
          />
        </div>
        <div v-if="filesLoading" class="muted pad">加载文件…</div>
        <div v-else-if="!selected && !keyword.trim()" class="muted pad">选择左侧目录或输入关键词搜索</div>
        <div v-else-if="!paging.records?.length" class="muted pad">暂无文件</div>
        <ul v-else class="file-list">
          <li v-for="f in paging.records" :key="f.code" class="file-item">
            <div class="file-main">
              <span class="fname">{{ f.name }}{{ fileExt(f) }}</span>
              <span class="fmeta">{{ formatSize(f.size) }} · {{ syncTime(f) }}</span>
            </div>
            <a
              class="fdown"
              :href="downloadUrl(f.code)"
              target="_blank"
              rel="noopener"
            >下载</a>
          </li>
        </ul>
        <div v-if="paging.total > pageSize" class="pagination">
          <button type="button" :disabled="pageIndex <= 1" @click="prevPage">上一页</button>
          <span>{{ pageIndex }} / {{ totalPages }}</span>
          <button type="button" :disabled="pageIndex >= totalPages" @click="nextPage">下一页</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api, type DirectoryTreeNode, type CloudFileItem } from '../sync'
import CloudDirNode from './CloudDirNode.vue'

const props = defineProps<{
  /** 与登录一致，用于同步 api 基址 */
  baseUrl: string
  authToken: string
  /** 父组件在同步目录增删后递增，触发云端目录树重新拉取 */
  cloudTreeStamp?: number
}>()

const emit = defineEmits<{
  /** 云端树刷新完成后通知父组件更新同步空间用量 */
  (e: 'quota-updated'): void
}>()

const dirTree = ref<DirectoryTreeNode[]>([])
const treeLoading = ref(false)
const filesLoading = ref(false)
const refreshing = ref(false)
const selected = ref<{ syncDirectoryId: number; relativePath: string } | null>(null)
const keyword = ref('')
const pageIndex = ref(1)
const pageSize = 20
const paging = ref<{ total: number; records: CloudFileItem[] }>({ total: 0, records: [] })
const lastRefreshed = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(paging.value.total / pageSize)))

let searchTimer: ReturnType<typeof setTimeout> | undefined
let debounceRefreshTimer: ReturnType<typeof setTimeout> | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined
let removeIpc: (() => void) | undefined

/** 云端目录树 / 列表自动刷新间隔（与手动「刷新」无关） */
const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 1000

function fileExt(f: CloudFileItem) {
  if (f.suffix) return f.suffix
  const url = f.url || ''
  const m = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  return m ? `.${m[1]}` : ''
}

function formatSize(bytes: number | undefined) {
  if (bytes == null || bytes === 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function syncTime(f: CloudFileItem) {
  return f.lastSyncTime || f.createTime || '-'
}

function downloadUrl(code: string) {
  return api.fileDownloadUrl(code)
}

function selectDir(node: DirectoryTreeNode) {
  selected.value = {
    syncDirectoryId: node.syncDirectoryId,
    relativePath: node.relativePath || ''
  }
  pageIndex.value = 1
  void loadFiles()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageIndex.value = 1
    loadFiles()
  }, 320)
}

function findFirstSelectable(nodes: DirectoryTreeNode[]): DirectoryTreeNode | null {
  if (!nodes.length) return null
  return nodes[0]
}

async function reconcileSelectionAfterTree() {
  if (!dirTree.value.length) {
    selected.value = null
    await loadFiles()
    return
  }
  const sel = selected.value
  if (!sel) {
    const first = findFirstSelectable(dirTree.value)
    if (first) {
      selected.value = {
        syncDirectoryId: first.syncDirectoryId,
        relativePath: first.relativePath || ''
      }
      pageIndex.value = 1
    }
    await loadFiles()
    return
  }
  if (!treeStillHasSelection(dirTree.value, sel)) {
    const first = findFirstSelectable(dirTree.value)
    if (first) {
      selected.value = {
        syncDirectoryId: first.syncDirectoryId,
        relativePath: first.relativePath || ''
      }
      pageIndex.value = 1
    } else {
      selected.value = null
    }
  }
  await loadFiles()
}

async function loadTree() {
  treeLoading.value = true
  try {
    api.setBase(props.baseUrl)
    api.setToken(props.authToken)
    dirTree.value = await api.getDirectoryTree()
  } catch (e) {
    console.error(e)
    dirTree.value = []
  } finally {
    treeLoading.value = false
  }
  await reconcileSelectionAfterTree()
}

function treeStillHasSelection(
  nodes: DirectoryTreeNode[],
  sel: { syncDirectoryId: number; relativePath: string }
): boolean {
  for (const n of nodes) {
    if (n.syncDirectoryId === sel.syncDirectoryId && (n.relativePath || '') === (sel.relativePath || '')) {
      return true
    }
    if (n.children?.length && treeStillHasSelection(n.children, sel)) return true
  }
  return false
}

async function loadFiles() {
  if (!props.authToken) return
  filesLoading.value = true
  try {
    api.setBase(props.baseUrl)
    api.setToken(props.authToken)
    const data = await api.getFilePageList({
      pageIndex: pageIndex.value,
      pageSize,
      name: keyword.value.trim() || undefined,
      syncDirectoryId: selected.value?.syncDirectoryId,
      relativePath: selected.value != null ? selected.value.relativePath : undefined
    })
    paging.value = data
  } catch (e) {
    console.error(e)
    paging.value = { total: 0, records: [] }
  } finally {
    filesLoading.value = false
  }
}

function scheduleDebouncedRefresh() {
  if (debounceRefreshTimer) clearTimeout(debounceRefreshTimer)
  debounceRefreshTimer = setTimeout(() => {
    debounceRefreshTimer = undefined
    void refreshAllQuiet()
  }, 500)
}

/** 同步上传成功后：轻量刷新，不打断用户操作 */
async function refreshAllQuiet() {
  if (!props.authToken) return
  try {
    api.setBase(props.baseUrl)
    api.setToken(props.authToken)
    await loadTree()
    lastRefreshed.value = new Date().toLocaleTimeString()
    emit('quota-updated')
  } catch (_) {
    /* ignore */
  }
}

async function refreshAll() {
  if (!props.authToken || refreshing.value) return
  refreshing.value = true
  try {
    await refreshAllQuiet()
  } finally {
    refreshing.value = false
  }
}

function prevPage() {
  if (pageIndex.value > 1) {
    pageIndex.value--
    loadFiles()
  }
}

function nextPage() {
  if (pageIndex.value < totalPages.value) {
    pageIndex.value++
    loadFiles()
  }
}

watch(
  () => [props.baseUrl, props.authToken] as const,
  () => {
    if (!props.authToken) return
    selected.value = null
    pageIndex.value = 1
    keyword.value = ''
    void loadTree()
  }
)

watch(
  () => props.cloudTreeStamp,
  () => {
    if (props.authToken) void loadTree()
  }
)

onMounted(() => {
  if (props.authToken) {
    api.setBase(props.baseUrl)
    api.setToken(props.authToken)
    void loadTree()
    lastRefreshed.value = new Date().toLocaleTimeString()
  }
  removeIpc = window.electronAPI?.onSyncRemoteUpdated?.(() => scheduleDebouncedRefresh())
  pollTimer = setInterval(() => scheduleDebouncedRefresh(), AUTO_REFRESH_INTERVAL_MS)
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (debounceRefreshTimer) clearTimeout(debounceRefreshTimer)
  if (pollTimer) clearInterval(pollTimer)
  removeIpc?.()
})
</script>

<style scoped>
.cloud-panel {
  background: #16213e;
  padding: 20px;
  border-radius: 12px;
  min-height: 420px;
  display: flex;
  flex-direction: column;
}
.cloud-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.cloud-head h2 {
  margin: 0;
  font-size: 1.1rem;
}
.cloud-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.last-refresh {
  font-size: 0.75rem;
  color: #64748b;
}
.btn-refresh {
  padding: 6px 14px;
  font-size: 0.85rem;
  background: #0f3460;
  border: 1px solid #1e4976;
  border-radius: 8px;
  color: #eee;
  cursor: pointer;
}
.btn-refresh:hover:not(:disabled) {
  border-color: #e94560;
  color: #fca5a5;
}
.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.cloud-desc {
  margin: 8px 0 16px;
  font-size: 0.8rem;
  color: #94a3b8;
  line-height: 1.4;
}
.cloud-body {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 280px;
}
.cloud-tree {
  width: 220px;
  flex-shrink: 0;
  background: #0f3460;
  border-radius: 10px;
  padding: 10px;
  overflow: auto;
  max-height: 480px;
}
.tree-title {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tree-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.cloud-files {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.toolbar {
  margin-bottom: 10px;
}
.search {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #0f3460;
  border-radius: 8px;
  background: #0f3460;
  color: #eee;
  font-size: 0.9rem;
}
.search::placeholder {
  color: #64748b;
}
.muted {
  color: #64748b;
  font-size: 0.9rem;
}
.pad {
  padding: 16px 0;
}
.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow: auto;
  max-height: 400px;
}
.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: rgba(15, 52, 96, 0.5);
  border: 1px solid transparent;
}
.file-item:hover {
  border-color: #1e4976;
}
.file-main {
  min-width: 0;
  flex: 1;
}
.fname {
  display: block;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fmeta {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 4px;
}
.fdown {
  flex-shrink: 0;
  font-size: 0.85rem;
  color: #e94560;
  text-decoration: none;
}
.fdown:hover {
  text-decoration: underline;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #0f3460;
}
.pagination button {
  padding: 6px 12px;
  background: #0f3460;
  border: 1px solid #1e4976;
  border-radius: 6px;
  color: #eee;
  cursor: pointer;
  font-size: 0.85rem;
}
.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pagination span {
  font-size: 0.85rem;
  color: #94a3b8;
}
</style>
