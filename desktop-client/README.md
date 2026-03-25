# 云同步 · 桌面客户端（Electron）

Vue 3 + Vite + Electron，负责本地目录监听、同步上传、开机自启与 **electron-updater** 自动更新。完整联调与数据库说明见仓库根目录 [README.md](../README.md)。

## 环境

- **Node.js 18+**
- **Windows**：用于打包 NSIS 安装包；若需代码签名需自行配置证书与 `electron-builder` 签名参数

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 仅启动 Vite（开发调 UI 时用） |
| `npm run electron:dev` | Vite（端口 **6173**）+ Electron 联调 |
| `npx vite build` | 构建渲染层与主进程到 `dist/`、`dist-electron/`，**不**打安装包 |
| `npm run electron:build` | `vite build` + **electron-builder**（产物在 `release/`） |
| `npm run build:win` | 同 `electron:build`，显式 `--win` |
| `npm run build` | 含 `vue-tsc -b` 类型检查后再构建（CI 友好） |

## 环境变量（Vite）

在 `.env.development`、`.env.production` 中配置（前缀 `VITE_`）：

| 变量 | 说明 |
|------|------|
| `VITE_DEFAULT_API_BASE` | 默认后端根地址；开发多为 `http://localhost:6168`，生产若经网关常带 `/api` |
| `VITE_WEB_PORTAL_URL` | 标题旁「Web 门户」链接；不配置则不显示 |

修改后需重启 `electron:dev` 或重新构建。

## 自动更新（electron-updater）

- **打包应用**才会启用更新逻辑；开发模式不检查更新。
- 配置合并顺序：**用户目录** `update-config.json` 覆盖安装包内 **`resources/update-feed.json`**（由 [electron/update-feed.json](electron/update-feed.json) 经 `extraResources` 打入）。
- 默认支持 **后台安装包管理**：`fromInstallPackage: true` 且 `feedUrl` 为空时，使用当前登录填写的服务器地址请求 `{base}/open/installPackage/latest.yml`。
- **`package.json` 的 `version`** 必须与后台上传安装包时 **版本说明 / 文件名** 中的语义化版本一致，否则易出现装完仍提示更新。
- **`electron-builder.config.js` 中的 `publish`**：用于生成安装目录下的 `app-update.yml`；缺少时 `downloadUpdate` 可能报 `ENOENT`。实际更新 URL 仍由运行时 `setFeedURL` 决定。
- 已设置 **`disableDifferentialDownload: true`**，避免无 blockmap 时差分下载长时间停在 0%。
- 正式分发建议使用 **HTTPS**；未签名安装包在 Windows 上可能触发 SmartScreen，与业务逻辑无关。

## 产物与目录

- `release/`：安装包（`.exe`）、`latest.yml`（与静态更新源配合时使用）等
- `electron/`：主进程、preload、`update-feed.json`、`electron-builder.config.js`

## 常见问题

- **连不上接口**：检查 `VITE_DEFAULT_API_BASE` 与后端地址、网关前缀是否一致。
- **更新下载失败**：确认后端 `local.host` 可访问、安装包管理里 `latest.yml` 中下载 URL 的 pathname 以 `.exe` 结尾（见服务端 `OpenInstallPackageController` 实现）。
