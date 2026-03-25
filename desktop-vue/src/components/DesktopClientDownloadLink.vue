<template>
  <div v-if="!loading && info" :class="['desktop-dl', variant]">
    <a :href="href" class="desktop-dl-link" rel="noopener noreferrer">
      {{ linkText }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchLatestDesktopInstallInfo,
  buildPublicDownloadUrlWithFileName,
  type OpenLatestInstallInfo
} from '../api/installPackage'

const props = withDefaults(
  defineProps<{
    /** login-footer：登录卡片底部左侧；header：顶栏紧凑样式 */
    variant?: 'login-footer' | 'header'
  }>(),
  { variant: 'login-footer' }
)

const info = ref<OpenLatestInstallInfo | null>(null)
const loading = ref(true)

const href = computed(() => {
  if (!info.value) return '#'
  return buildPublicDownloadUrlWithFileName(info.value.downloadCode, info.value.fileName)
})

const linkText = computed(() => {
  if (!info.value) return ''
  return props.variant === 'header'
    ? `桌面端 v${info.value.version}`
    : `下载 Windows 桌面端（v${info.value.version}）`
})

onMounted(async () => {
  try {
    info.value = await fetchLatestDesktopInstallInfo()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.desktop-dl {
  text-align: center;
}

.desktop-dl.header {
  text-align: left;
  margin: 0;
}

.desktop-dl-link {
  font-size: 0.85rem;
  color: #38bdf8;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.desktop-dl-link:hover {
  color: #7dd3fc;
}

.desktop-dl.login-footer {
  margin: 0;
  text-align: left;
}

.desktop-dl.login-footer .desktop-dl-link {
  font-size: 0.82rem;
  font-weight: 500;
}

.desktop-dl.header .desktop-dl-link {
  font-size: 0.8rem;
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #e0f2fe;
  background: rgba(56, 189, 248, 0.08);
}

.desktop-dl.header .desktop-dl-link:hover {
  background: rgba(56, 189, 248, 0.16);
  color: #f0f9ff;
}
</style>
