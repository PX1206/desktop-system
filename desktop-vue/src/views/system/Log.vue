<template>
  <div class="page">
    <div class="card">
      <div class="toolbar">
        <input v-model="keyword" placeholder="搜索日志" class="search" @keyup.enter="load" />
        <button @click="load" class="btn">查询</button>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>操作</th>
              <th>路径</th>
              <th>方法</th>
              <th>结果</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paging.records" :key="log.id">
              <td>{{ log.id }}</td>
              <td>{{ log.userName || '-' }}</td>
              <td>{{ log.name || '-' }}</td>
              <td class="path-cell">{{ log.path || '-' }}</td>
              <td>{{ log.requestMethod || '-' }}</td>
              <td :class="log.success ? 'success' : 'fail'">{{ log.success ? '成功' : '失败' }}</td>
              <td>{{ log.createTime || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button @click="prevPage" :disabled="pageIndex <= 1">上一页</button>
        <span>{{ pageIndex }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="pageIndex >= totalPages">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getLogPageList, type LogItem, type PageResult } from '../../api/log'

const keyword = ref('')
const loading = ref(false)
const pageIndex = ref(1)
const pageSize = 10
const paging = ref<PageResult<LogItem>>({ total: 0, records: [], pageIndex: 1, pageSize: 10 })

const totalPages = computed(() => Math.max(1, Math.ceil(paging.value.total / pageSize)))

async function load() {
  loading.value = true
  try {
    const data = await getLogPageList({
      pageIndex: pageIndex.value,
      pageSize,
      userName: keyword.value || undefined,
      name: keyword.value || undefined
    })
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

onMounted(load)
</script>

<style scoped>
.page { padding: 0; }
.card { background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; align-items: center; }
.search { padding: 8px 12px; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #e2e8f0; flex: 1; max-width: 280px; }
.btn { padding: 8px 16px; background: #3b82f6; border: none; border-radius: 6px; color: #fff; cursor: pointer; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #334155; }
.table th { color: #94a3b8; font-weight: 500; }
.path-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.success { color: #22c55e; }
.fail { color: #ef4444; }
.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
.pagination button { padding: 6px 12px; background: #334155; border: none; border-radius: 6px; color: #e2e8f0; cursor: pointer; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 768px) {
  .card { padding: 16px; }
  .search {
    min-width: 0;
    max-width: none;
  }
  .table th, .table td { padding: 8px; font-size: 0.85rem; }
}
</style>
