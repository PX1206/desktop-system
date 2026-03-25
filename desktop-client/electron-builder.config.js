/**
 * 安装包文件名：ytb_YYYYMMDD_001.${ext}（同日多次打包序号递增）
 * 与 package.json 的 build 字段合并；仅覆盖 win.artifactName。
 */
const fs = require('fs')
const path = require('path')

function nextYtbId() {
  const counterPath = path.join(__dirname, '.ytb-build-counter.json')
  const d = new Date()
  const dateStr =
    String(d.getFullYear()) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  let seq = 1
  try {
    if (fs.existsSync(counterPath)) {
      const j = JSON.parse(fs.readFileSync(counterPath, 'utf8'))
      if (j.lastDate === dateStr) seq = (Number(j.seq) || 0) + 1
    }
  } catch (_) {
    /* 计数文件损坏时从 001 重新开始 */
  }
  fs.writeFileSync(counterPath, JSON.stringify({ lastDate: dateStr, seq }, null, 2), 'utf8')
  return `${dateStr}_${String(seq).padStart(3, '0')}`
}

const ytbId = nextYtbId()

module.exports = {
  /**
   * 必须配置 publish，构建时才会在 resources 下生成 app-update.yml；
   * 否则 electron-updater 在 downloadUpdate 时会 ENOENT。
   * 实际更新地址由运行时 setFeedURL（安装包管理 / update-feed.json）覆盖。
   */
  publish: {
    provider: 'generic',
    url: 'https://app-update.placeholder.invalid/desktop/'
  },
  win: {
    // ${ext} 由 electron-builder 宏展开为 exe
    artifactName: `ytb_${ytbId}.\${ext}`
  },
  /** 与 process.resourcesPath 下 update-feed.json 对应，供 electron-updater 读取 feedUrl */
  extraResources: [
    {
      from: 'electron/update-feed.json',
      to: 'update-feed.json'
    }
  ]
}
