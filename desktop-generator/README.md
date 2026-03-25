# desktop-generator

基于 MyBatis-Plus Generator 和 Velocity 的代码生成模块，用于快速生成 Entity、Mapper、Service、Controller 等代码。

## 用途

根据数据库表结构，自动生成：

- 实体类（Entity）
- Mapper 接口与 XML
- Service 接口与实现类
- Controller（RestController）
- 分页参数、查询 VO
- Swagger 注解

## 使用方式

### 方式一：运行 Generator 主类（推荐）

修改 `com.desktop.generator.Generator` 中的配置后，直接运行 `main` 方法：

```java
// 设置基本信息
generatorProperties
    .setMavenModuleName("desktop-service")
    .setParentPackage("com.desktop")
    .setModuleName("system")
    .setAuthor("Sakura")
    .setFileOverride(true);

// 设置表信息
generatorProperties.addTable("表名", "主键列名");

// 数据源配置
generatorProperties.getDataSourceConfig()
    .setDbType(DbType.MYSQL)
    .setUsername("...")
    .setPassword("...")
    .setUrl("jdbc:mysql://...");
```

### 方式二：通过 application.yml 配置

在 `src/main/resources/application.yml` 中配置 `sakura.generator`，然后通过 `CodeGenerator.generator(properties)` 调用。

## 配置说明

| 配置项 | 说明 |
|--------|------|
| `maven-module-name` | Maven 模块名（如 desktop-service） |
| `parent-package` | 父包路径（如 com.desktop） |
| `module-name` | 业务模块名（如 system） |
| `table-config` | 表名、主键列名 |
| `data-source-config` | 数据库连接、用户名、密码、URL |
| `generator-config` | 生成策略、是否生成 Entity/Controller/Service/Mapper 等 |
| `file-override` | 是否覆盖已有文件 |

## 生成策略

- **SIMPLE**：生成最基本代码
- **NORMAL**：生成普通代码
- **ALL**：生成全部代码
- **SINGLE**：单表操作，不生成 QueryVo

## 输出路径

生成文件输出到 `desktop-service` 模块对应包下，如：

- Entity：`com.desktop.system.entity`
- Mapper：`com.desktop.system.mapper`
- Service：`com.desktop.system.service`
- Controller：`com.desktop.system.controller`

## 注意事项

- 生成前请确认数据源配置正确
- `file-override: true` 会覆盖已有文件，请谨慎使用
- 生成后可根据业务需要手动调整代码
