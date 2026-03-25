# 云同步 · Web 管理端

基于 **Vue 3 + TypeScript + Vite** 的管理后台：用户与角色、文件与同步目录、操作日志、**安装包管理**等。完整部署、数据库与开源说明见仓库根目录 [README.md](../README.md)。

## 环境

- **Node.js 18+**

## 常用命令

```bash
npm install
npm run dev      # 开发服务，默认端口 7173
npm run build    # 生产构建，输出 dist/
```

## 开发联调

1. 先启动后端 [desktop-service](../desktop-service)（默认 **6168**）。
2. 本目录执行 `npm run dev`，浏览器访问 `http://localhost:7173`。

Vite 将前端的 **`/api`** 代理到 `http://localhost:6168`，并**去掉** `/api` 前缀再转发给 Spring Boot（见 [vite.config.ts](vite.config.ts)）。

## 环境变量

| 文件 | 变量 | 说明 |
|------|------|------|
| `.env.development` | `VITE_API_BASE` | 开发一般为 `/api`（走 Vite 代理） |
| `.env.production` | `VITE_API_BASE` | 生产填**实际后端根路径**，如 `https://your-domain.com/api` 或与 Nginx 反代规则一致 |

前端请求使用 `import.meta.env.VITE_API_BASE` 作为 `axios` 的 `baseURL`。

## 生产部署

1. 执行 `npm run build`，将 `dist/` 部署到 Nginx（或其它静态资源服务器）。
2. 配置 **反向代理**：例如浏览器访问 `/api/*` 转发到后端服务根地址，且路径规则与 `VITE_API_BASE` 一致。
3. 若前后端**同域**且 API 前缀为 `/api`，`VITE_API_BASE` 可保持 `/api`。

## 相关文档

- [desktop-service/README.md](../desktop-service/README.md) — API、Knife4j、公开下载接口
- [CONTRIBUTING.md](../CONTRIBUTING.md) — 协作与密钥安全
