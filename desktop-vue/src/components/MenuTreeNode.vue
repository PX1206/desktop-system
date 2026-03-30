<template>
  <div class="menu-tree-node">
    <div class="row" :style="{ paddingLeft: depth * 14 + 'px' }">
      <span class="title">{{ node.title }}</span>
      <span class="type">{{ node.type }}</span>
      <span class="path">{{ node.path || '—' }}</span>
      <span class="sort" v-if="node.sort != null">{{ node.sort }}</span>
      <div class="actions">
        <button type="button" class="link" @click="$emit('addChild', node)">子菜单</button>
        <button type="button" class="link" @click="$emit('edit', node)">编辑</button>
        <button type="button" class="link danger" @click="$emit('delete', node)">删除</button>
      </div>
    </div>
    <div v-if="node.children?.length" class="children">
      <MenuTreeNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        @add-child="$emit('addChild', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import MenuTreeNode from './MenuTreeNode.vue'
import type { MenuVO } from '../api/menu'

defineProps<{
  node: MenuVO
  depth: number
}>()

defineEmits<{
  addChild: [MenuVO]
  edit: [MenuVO]
  delete: [MenuVO]
}>()
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 8px 10px;
  background: #0f172a;
  border-radius: 6px;
  margin-bottom: 4px;
  border: 1px solid #334155;
}
.title {
  font-weight: 500;
  min-width: 0;
}
.type {
  font-size: 0.8rem;
  color: #64748b;
}
.path {
  font-size: 0.85rem;
  color: #38bdf8;
  flex: 1;
  min-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sort {
  font-size: 0.8rem;
  color: #94a3b8;
  width: 2.5em;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
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
.link.danger {
  color: #f87171;
}
.children {
  margin-top: 2px;
}
@media (max-width: 768px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
  }
  .path {
    white-space: normal;
    word-break: break-all;
  }
  .actions {
    margin-left: 0;
  }
}
</style>
