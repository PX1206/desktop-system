<template>
  <div class="page">
    <div class="card">
      <h2>安装包管理</h2>
      <p class="tip">
        上传桌面端打包产物后，将「公开下载链接」发给用户即可下载（无需登录）。链接中的随机码请勿泄露给无关人员。
      </p>

      <div class="toolbar">
        <input v-model="keyword" placeholder="搜索文件名 / 版本 / 备注" class="search" @keyup.enter="load" />
        <button type="button" class="btn" @click="load">查询</button>
        <label class="upload-btn">
          <input type="file" accept=".exe,.msi,.zip,.dmg,.apk,.deb,.7z,.gz,.tar,.pkg" hidden @change="onFile" />
          上传安装包
        </label>
      </div>

      <div v-if="uploading" class="uploading">正在上传，请稍候…</div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>文件名</th>
              <th>版本说明</th>
              <th>大小</th>
              <th>上传时间</th>
              <th>备注</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paging.records" :key="row.id">
              <td class="name-cell" :title="row.fileName">{{ row.fileName }}</td>
              <td>{{ row.versionLabel || '-' }}</td>
              <td>{{ formatSize(row.fileSize) }}</td>
              <td>{{ formatCreateTime(row.createTime) }}</td>
              <td class="remark-cell" :title="row.remark || ''">{{ row.remark || '-' }}</td>
              <td class="actions">
                <button type="button" class="linkish" @click="copyLink(row)">复制链接</button>
                <a :href="row.downloadUrl || linkFor(row)" target="_blank" rel="noopener" class="linkish">下载</a>
                <button type="button" class="linkish danger" @click="remove(row)">删除</button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getInstallPackagePageList,
  uploadInstallPackage,
  deleteInstallPackage,
  buildPublicDownloadUrl,
  type InstallPackageItem,
  type PageResult
} from '../../api/installPackage'

const keyword = ref('')
const loading = ref(false)
const uploading = ref(false)
const pageIndex = ref(1)
const pageSize = 10
const paging = ref<PageResult<InstallPackageItem>>({ total: 0, records: [], pageIndex: 1, pageSize: 10 })

const totalPages = computed(() => Math.max(1, Math.ceil(paging.value.total / pageSize)))

function formatSize(bytes: number) {
  if (bytes == null || bytes < 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** 后端 Date 常被序列化为毫秒时间戳 */
function formatCreateTime(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '-'
  let ms: number
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    ms = raw
  } else if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return '-'
    if (/^\d+$/.test(t)) {
      ms = Number(t)
    } else {
      const d = new Date(t)
      return Number.isNaN(d.getTime()) ? raw : formatMsToLocal(d.getTime())
    }
  } else {
    return '-'
  }
  if (ms < 1e12) ms *= 1000
  return formatMsToLocal(ms)
}

function formatMsToLocal(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function linkFor(row: InstallPackageItem) {
  return row.downloadUrl || buildPublicDownloadUrl(row.downloadCode)
}

async function load() {
  loading.value = true
  try {
    const data = await getInstallPackagePageList({
      pageIndex: pageIndex.value,
      pageSize,
      keyword: keyword.value || undefined
    })
    paging.value = data ?? { total: 0, records: [], pageIndex: 1, pageSize: 10 }
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

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const ver = window.prompt('版本说明（可选，如 1.0.0）：', '') ?? ''
  const remark = window.prompt('备注（可选）：', '') ?? ''
  uploading.value = true
  try {
    await uploadInstallPackage(file, ver || undefined, remark || undefined)
    pageIndex.value = 1
    await load()
    alert('上传成功')
  } catch (err: any) {
    alert(err?.response?.data?.message || err?.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

function copyLink(row: InstallPackageItem) {
  const url = linkFor(row)
  navigator.clipboard.writeText(url).then(
    () => alert('已复制下载链接'),
    () => prompt('请手动复制：', url)
  )
}

async function remove(row: InstallPackageItem) {
  if (!confirm(`确定删除「${row.fileName}」？公开链接将失效。`)) return
  try {
    await deleteInstallPackage(row.id)
    await load()
  } catch (err: any) {
    alert(err?.response?.data?.message || err?.message || '删除失败')
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
.card h2 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}
.tip {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0 0 20px;
  line-height: 1.5;
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
.upload-btn {
  padding: 8px 16px;
  background: #0d9488;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
}
.uploading {
  color: #38bdf8;
  margin-bottom: 12px;
  font-size: 0.9rem;
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
.name-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.remark-cell {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-actions {
  width: 220px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.linkish {
  background: none;
  border: none;
  color: #38bdf8;
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
  text-decoration: underline;
}
a.linkish {
  display: inline;
}
.linkish.danger {
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
</style>
