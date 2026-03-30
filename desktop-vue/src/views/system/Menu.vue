<template>
  <div class="page">
    <div class="card">
      <h2>菜单管理</h2>
      <p class="tip">菜单由数据库初始化，可通过后端接口增删改。此处仅展示树形结构。</p>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="tree">
        <div v-for="m in menuTree" :key="m.id" class="tree-node">
          <div class="tree-node-label">
            <span class="path">{{ m.path || '-' }}</span>
            <span class="title">{{ m.title }}</span>
            <span class="type">[{{ m.type }}]</span>
          </div>
          <div v-if="m.children?.length" class="tree-children">
            <div v-for="c in m.children" :key="c.id" class="tree-node">
              <div class="tree-node-label">
                <span class="path">{{ c.path || '-' }}</span>
                <span class="title">{{ c.title }}</span>
                <span class="type">[{{ c.type }}]</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../../api/request'
import type { MenuItem } from '../../api/menu'

const menuTree = ref<MenuItem[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const r = await request.get('/menu/getMenuTree')
    menuTree.value = r.data?.data || []
  } catch {
    menuTree.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page { padding: 0; }
.card { background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #334155; }
.card h2 { margin: 0 0 12px; font-size: 1.1rem; }
.tip { color: #94a3b8; font-size: 0.9rem; margin: 0 0 20px; }
.loading { padding: 40px; text-align: center; color: #94a3b8; }
.tree-node { margin: 6px 0; }
.tree-node-label { display: flex; gap: 12px; align-items: center; padding: 6px 10px; background: #0f172a; border-radius: 6px; }
.path { color: #38bdf8; font-size: 0.85rem; min-width: 120px; }
.title { flex: 1; }
.type { color: #64748b; font-size: 0.8rem; }
.tree-children { margin-left: 24px; margin-top: 4px; }
@media (max-width: 768px) {
  .card { padding: 16px; }
  .tree-node-label {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .path {
    min-width: 0;
    max-width: 100%;
    word-break: break-all;
  }
  .title { width: 100%; }
  .tree-children { margin-left: 12px; }
}
</style>
