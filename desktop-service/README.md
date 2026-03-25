# desktop-service

云同步主业务服务模块，提供用户、权限、文件、同步目录、**安装包分发与桌面更新描述（latest.yml）**等 REST API。

> 全仓库安装步骤、迁移脚本列表、三端联调与开源许可见 [../README.md](../README.md)。

## 模块职责

- **用户管理**：用户 CRUD、个人资料、登录认证（密码 / 短信）
- **权限管理**：角色、菜单、操作日志
- **文件管理**：文件上传、下载、权限过滤；桌面同步走 `/file/uploadForSync`
- **同步目录**：用户选择的本地同步目录管理
- **同步配额**：按用户限制同步文件总占用（`user.sync_quota_bytes`，默认 5GiB，管理端可配）
- **安装包管理**：管理员上传分发包；公开下载与 **`GET /open/installPackage/latest.yml`**（electron-updater）
- **其他**：验证码、地区、短信（可选）

## 技术栈

- Spring Boot 2.7.6
- MyBatis-Plus 3.3.1
- Druid 数据源
- Knife4j（Swagger API 文档）
- Redis、RocketMQ、阿里云短信（按配置启用）

## 启动

```bash
# 在仓库根目录先安装依赖到本地仓库
cd ..
mvn clean install -DskipTests

cd desktop-service
mvn spring-boot:run
```

主类：`com.desktop.system.DesktopApplication`。

## 测试与打包

```bash
# 在仓库根目录：仅编译并运行 desktop-service 模块测试（若有）
mvn -pl desktop-service -am test

# 打可执行 JAR（跳过测试）
mvn -pl desktop-service -am package -DskipTests
# 产物：desktop-service/target/*.jar
```

生产环境建议使用 **`spring.profiles.active=prod`** 并配合 `application-prod.yml` 或环境变量注入敏感配置，**勿**将生产密钥提交到 Git。

## API 文档（Knife4j）

默认开启（见 `application.yml` 中 `knife4j.enable`）。启动后浏览器访问（端口以配置为准）：

- **文档 UI**：`http://localhost:6168/doc.html`（若上下文路径未改）

若启用了 Knife4j Basic 认证，账号密码见 `application.yml` 中 `knife4j.basic`（**生产请修改**）。

## 公开接口（无需登录，节选）

登录拦截排除路径见 `CommonConstant.EXCLUDE_PATH`。典型包括：

| 路径 | 说明 |
|------|------|
| `GET /open/rsaPublicKey` | 登录前 RSA 公钥 |
| `POST /user/login/*`、`POST /user/register` 等 | 认证与注册 |
| `GET /open/installPackage/download/{code}` | 安装包公开下载（随机码） |
| `GET /open/installPackage/download/{code}/{fileName}` | 同上（路径含文件名，供 electron-updater 识别 `.exe`） |
| `GET /open/installPackage/latest.yml` | 桌面端自动更新描述（generic 源） |

完整列表以代码与拦截器配置为准。

## 配置说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `server.port` | 服务端口 | 6168 |
| `spring.datasource` | MySQL 数据源 | 见 application.yml |
| `spring.redis` | Redis 连接 | 见 application.yml |
| `rocketmq.name-server` | RocketMQ 地址 | 见 application.yml |
| `knife4j.enable` | 是否开启 API 文档 | true |
| `local.host` | **对外访问的服务根 URL**（含协议与端口，尾部建议 `/`） | 用于生成安装包下载链接、`latest.yml` 内 URL |

## 数据库迁移

- **全新环境**：执行 `src/main/resources/db/init.sql`
- **已有库**：按根目录 [README.md](../README.md) 中「已有库增量迁移」表顺序执行 `migration_*.sql`（含 `migration_install_package_sha512.sql` 等）

## 主要 API 路由（需登录部分）

| 路径前缀 | 功能 |
|----------|------|
| `/captcha`、`/sms` | 验证码、短信 |
| `/area` | 地区 |
| `/user` | 用户 |
| `/role`、`/menu` | 角色、菜单 |
| `/file` | 文件 |
| `/syncDirectory` | 同步目录 |
| `/installPackage` | 安装包管理（管理员） |
| `/sysOperationLog` | 操作日志 |
