# 云同步（Desktop Sync）

面向团队/企业的**本地目录 → 服务端**同步方案：桌面客户端监听本机文件夹变更并上传，Web 管理端浏览、搜索与下载；支持多同步目录、角色权限、按用户的**同步空间配额**，以及桌面端开机自启与静默重新登录（账号密码场景）。

---

## 桌面端
<img width="1455" height="880" alt="image" src="https://github.com/user-attachments/assets/4b4a30c4-0378-4cae-a66c-6b23023c618b" />

## 管理端
<img width="1920" height="930" alt="image" src="https://github.com/user-attachments/assets/195dd4a5-fd12-47c4-9100-3d46adb486ef" />

## 技术栈概览

| 模块 | 技术 |
|------|------|
| **desktop-service** | Spring Boot、MyBatis-Plus、MySQL、Redis、Druid |
| **desktop-common** | 公共常量、Redis 工具、登录拦截、异常与分页等 |
| **desktop-vue** | Vue 3、Vite、TypeScript（Web 管理端，含用户/文件/系统菜单等） |
| **desktop-client** | Vue 3 + **Electron**（桌面同步客户端） |
| **desktop-generator** | 代码生成（可选） |

---

## 仓库结构

```
desktop-system/
├── pom.xml                 # 父工程（聚合 Java 模块）
├── desktop-service/        # 后端 API（默认端口 6168）
├── desktop-common/         # Java 公共库
├── desktop-vue/            # Web 前端（开发端口 7173）
├── desktop-client/         # Electron 桌面端（开发端口 6173）
└── desktop-generator/      # 代码生成模块
```

---

## 模块一览

| 模块 | 路径 | 职责 | 文档 |
|------|------|------|------|
| **desktop-service** | `desktop-service/` | REST API、文件与同步、安装包管理等 | [desktop-service/README.md](desktop-service/README.md) |
| **desktop-common** | `desktop-common/` | 公共库、拦截器、统一响应与工具类 | [desktop-common/README.md](desktop-common/README.md) |
| **desktop-vue** | `desktop-vue/` | Web 管理端（Vue 3 + Vite） | [desktop-vue/README.md](desktop-vue/README.md) |
| **desktop-client** | `desktop-client/` | Electron 桌面同步客户端 | [desktop-client/README.md](desktop-client/README.md) |
| **desktop-generator** | `desktop-generator/` | MyBatis 代码生成（可选） | [desktop-generator/README.md](desktop-generator/README.md) |

---

## 环境要求

- **JDK 8+**、**Maven 3.6+**
- **Node.js 18+**（桌面端与 Web 前端）
- **MySQL 8.0+**、**Redis**（与 `application.yml` 中配置一致）
- 若项目启用了 RocketMQ 等中间件，需与配置文件中的地址一致

---

## 快速验证（联调 smoke）

**启动顺序**：MySQL、Redis → `desktop-service` → `desktop-vue` 与/或 `desktop-client`。

**建议最小检查项**：

1. **管理端**：使用 `init.sql` 中的默认管理员登录 → 用户/角色/菜单可访问 → 文件或同步目录相关页面正常。
2. **安装包管理**（管理员，需已执行安装包相关迁移）：上传、列表、删除、下载链接可访问。
3. **桌面端**：填写 API 根地址并登录 → 添加同步目录 → 本机文件变更可上传，或「从云端拉取」可用。
4. **同步配额**（可选）：管理端调整用户配额后，超限上传是否被 `/file/uploadForSync` 拒绝并返回明确提示。

**构建冒烟**（发版前可跑一遍）：

```bash
# Java：编译并执行测试（若有）
cd desktop-system && mvn -pl desktop-service -am test

# Web 生产构建
cd desktop-vue && npm ci && npm run build

# 桌面：Vite 构建 + Windows 安装包（需本机已满足 electron-builder 要求）
cd desktop-client && npm ci && npx vite build && npm run electron:build
```

---

## 打包与发布清单

| 产物 | 命令 / 路径 | 说明 |
|------|-------------|------|
| 后端 JAR | `mvn -pl desktop-service -am package -DskipTests` → `desktop-service/target/*.jar` | 生产建议使用 `application-prod.yml` 或环境变量注入敏感配置 |
| Web 静态资源 | `desktop-vue` 执行 `npm run build` → `dist/` | 部署到 Nginx 等；`/api` 反向代理到后端 |
| Windows 安装包 | `desktop-client` 执行 `npm run electron:build` → `release/` | `package.json` 的 `version` 须与后台「安装包管理」中版本说明一致 |
| 数据库 | 新环境：`init.sql`；旧库：按序执行 `desktop-service/src/main/resources/db/migration_*.sql` | 见下表 |

**配置注意**：

- **勿**将生产密钥提交到 Git；协作见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 后端 **`local.host`** 应配置为对外可访问的 **HTTP(S) 服务根地址**（用于公开下载链接、`latest.yml` 中的下载 URL）。

---

## 数据库

### 全新安装

在 MySQL 中执行初始化脚本（会创建库 `desktop_db` 及表结构）：

```bash
mysql -u root -p < desktop-service/src/main/resources/db/init.sql
```

### 已有库增量迁移（按顺序执行）

| 脚本 | 说明 |
|------|------|
| `migration_file_sync_columns.sql` | `file` 表增加同步目录相关字段（若建库较早、无同步列时执行） |
| `migration_user_sync_quota.sql` | `user` 表增加 `sync_quota_bytes`（用户同步空间配额） |
| `migration_install_package.sql` | 安装包管理菜单与表（按需） |
| `migration_install_package_sha512.sql` | `install_package.sha512` 列（桌面自动更新 `latest.yml` 校验用，旧库按需执行） |

### 默认管理员

初始化脚本中的默认管理员账号见 `init.sql` 内注释（常见为 `admin` / `Admin123`，以实际 SQL 为准）。**生产环境请务必修改密码。**

---

## 后端（desktop-service）

更多说明见 [desktop-service/README.md](desktop-service/README.md)。

1. 编辑 `src/main/resources/application.yml`（及 `application-prod.yml`）：**数据源、Redis、文件存储路径**等。
2. 本地文件默认落在与运行目录相关的 `./resources/files/`（见业务配置），请确保磁盘空间充足。

启动：

```bash
cd desktop-service
mvn spring-boot:run
```

默认 HTTP 端口：**6168**（与前端代理、桌面端默认 API 地址一致）。

打包：

```bash
cd desktop-system
mvn -pl desktop-service -am package -DskipTests
```

---

## Web 管理端（desktop-vue）

说明见 [desktop-vue/README.md](desktop-vue/README.md)。

```bash
cd desktop-vue
npm install
npm run dev
```

- 开发服务端口：**7173**
- Vite 将 **`/api`** 代理到 `http://localhost:6168`，并去掉 `/api` 前缀与后端对接

生产构建：

```bash
npm run build
```

将 `dist` 部署到 Nginx 等静态资源服务器，并配置 **`/api` → 后端** 的反向代理（与线上 `VITE_API_BASE` 约定一致）。

---

## 桌面客户端（desktop-client）

说明见 [desktop-client/README.md](desktop-client/README.md)。

```bash
cd desktop-client
npm install
npm run electron:dev      # 联调：Vite 6173 + Electron
```

Windows 安装包（输出目录一般为 `release/`）：

```bash
npm run electron:build
# 或
npm run build:win
```

仅构建前端与 Electron 主进程（不跑完整 installer）：

```bash
npx vite build
```

### 应用自动更新（electron-updater）

已集成 **generic** 更新源：启动约 8 秒后自动检查；发现新版本时弹窗，用户可选择**稍后**或**下载并安装**；下载完成后可**立即重启并安装**。托盘菜单提供**检查更新**。

**配置更新地址（三选一，用户目录 `update-config.json` 可覆盖安装包内 `update-feed.json`）：**

1. **后台安装包管理（默认）**：`update-feed.json` 中 `fromInstallPackage: true` 且 `feedUrl` 留空时，客户端在填写**服务器地址**后会向 `{服务器根}/open/installPackage` 拉取 **`latest.yml`**（由服务端根据最新一条 Windows `.exe` 记录动态生成）。管理员在 Web 端「安装包管理」上传 `.exe` 即可；**版本说明或文件名中的语义化版本号须与该次打包时 `desktop-client/package.json` 的 `version` 一致**（例如包是 `1.2.0` 就不要写 `1.3.0`），否则装完重启后仍可能被提示「发现新版本」。数据库若由旧库升级，需执行 `desktop-service/src/main/resources/db/migration_install_package_sha512.sql` 增加 `sha512` 列。
2. **静态目录（CDN 等）**：设置 `feedUrl` 为 **HTTPS 目录地址**（末尾不要多余 `/`），并可将 `fromInstallPackage` 设为 `false` 以免使用服务器动态源。
3. **用户本机覆盖**：在 `%APPDATA%\云同步\update-config.json`（名称以实际 `productName` 为准）写入上述字段，例如：`{"feedUrl":"https://你的域名/releases/desktop/win"}` 或 `{"fromInstallPackage":true}`。

**发布新版本步骤（静态 `feedUrl` 方式）：**

1. 在 `desktop-client/package.json` 中**提高 `version`**（如 `1.0.0` → `1.0.1`）。
2. 执行 `npm run electron:build`，在 `release/` 中得到 **`.exe` 安装包** 与 **`latest.yml`**（由 electron-builder 生成）。
3. 将 **同一次构建** 产出的 `latest.yml` 与 `.exe` **上传到同一目录**，且该目录 URL 与 `feedUrl` 一致。

**注意：** 生产环境更新源建议使用 **HTTPS**；未启用 `fromInstallPackage` 且未配置 `feedUrl` 时不会检查更新。开发模式（未打包）不启用自动更新。

### 环境变量（`.env.development` / `.env.production`）

| 变量 | 说明 |
|------|------|
| `VITE_WEB_PORTAL_URL` | 标题旁「Web 门户」链接地址（开发可指向 `http://127.0.0.1:7173`） |
| `VITE_DEFAULT_API_BASE` | 接口根地址：开发一般为 `http://localhost:6168`；**生产若经网关，常带 `/api` 后缀**（与 `.env.production` 示例一致） |

修改后需重新构建或重启开发服务。

### 桌面端能力摘要

- **同步目录**：多目录、监听变更上传、支持「从云端拉取」、路径失效提示与重新关联。
- **开机自启**：Windows 写注册表；偏好同时写入用户目录下 `autoLaunch.json`，界面勾选状态以该文件为准并回写注册表。
- **自动登录**：勾选开机自启且使用**账号密码登录**时，可用系统密钥链加密保存凭据，在 Token 失效后尝试静默登录（手机验证码登录无法保存密码）。
- **同步空间**：右侧「同步目录」标题旁展示**剩余云端同步配额**；左侧云端列表刷新后会重新拉取用户信息以更新用量。
- **应用更新**：见上文「应用自动更新」；使用安装包管理时提升构建版本并上传 `.exe` 即可；使用静态源时需同步上传 `latest.yml` 与安装包。
- **Windows SmartScreen**：未做代码签名的安装包可能提示「未知发布者」，与业务功能无关；正式分发需购买代码签名证书并在构建中配置签名。

---

## 核心业务说明

### 同步与权限

- 桌面端仅将**本机变更上传**到服务端；不会因本机缺文件而删除云端（详见客户端文案说明）。
- **普通用户**仅能访问自己的同步目录与文件；**管理员**可查看全部用户数据（以角色为准）。
- 接口鉴权使用 Header **`Authorization`** 传递 Token；登录态与 Redis 中 Token 有效期相关（详见 `CommonConstant` 与登录实现）。

### 同步空间配额

- 表字段：`user.sync_quota_bytes`（字节，`NULL` 表示使用系统默认 **5 GiB**）。
- 管理端「用户管理」可配置 **1～2048 GB**；列表展示已用/配额。
- 限制作用在 **`/file/uploadForSync`**：按用户汇总「同步目录」下文件大小，超出配额则拒绝上传并返回明确提示。

### 文件与存储

- 同步文件元数据在 `file` 表，含 `sync_directory_id`、`relative_path` 等。
- 大文件上传受 Spring `multipart` 大小限制（默认配置可达 1024MB，可按需调整）。

---

## 联调端口速查

| 服务 | 端口 |
|------|------|
| Spring Boot | 6168 |
| desktop-vue（Vite） | 7173 |
| desktop-client（Vite，Electron 开发） | 6173 |

---

## 常见问题

1. **桌面端连不上接口**  
   检查 `VITE_DEFAULT_API_BASE` 是否与后端地址、是否含网关前缀 `/api` 一致。

2. **数据库缺列报错**  
   对照上文「已有库增量迁移」执行对应 SQL。

3. **开机自启勾选重启后丢失**  
   请使用已修复版本：注册表检测与 `autoLaunch.json` 逻辑见当前 `desktop-client/electron/autoLaunch.ts`。

4. **配额已调整仍无法上传**  
   确认已执行 `migration_user_sync_quota.sql` 且服务已重启；查看接口返回的「已用/配额」提示。

---

## 开源许可与免责声明

本项目基于 **[MIT License](LICENSE)** 发布，允许在商业与非商业场景中**使用、修改、分发**，惟需在分发中保留许可证全文或版权声明。

- 本软件按「**原样**」（AS IS）提供，不作任何明示或暗示的担保。
- 可选能力涉及的**第三方服务**（如阿里云短信、RocketMQ 等）由使用者自行申请、配置并承担费用与合规责任；仓库内示例配置**不可替代**生产密钥。
- **禁止**向仓库提交真实数据库密码、Redis 密码、API Key、RSA 私钥等。协作约定见 **[CONTRIBUTING.md](CONTRIBUTING.md)**。

## 贡献

欢迎通过 Issue、Pull Request 参与改进，详见 **[CONTRIBUTING.md](CONTRIBUTING.md)**。
