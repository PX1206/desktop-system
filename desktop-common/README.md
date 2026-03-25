# desktop-common

公共基础模块，提供统一的配置、工具类、异常处理、分页、日志等能力，被 `desktop-service` 依赖。

## 主要子包与功能

| 包路径 | 功能 |
|--------|------|
| `api` | 统一响应 `ApiResult`、`ApiCode`、分页参数 `BasePageParam`、`PageInfo` |
| `exception` | `BusinessException`、`BaseException`、`ConfigException` |
| `handler` | `RestExceptionHandler` 全局异常处理 |
| `base` | `BaseController`、`BaseService`、`BaseServiceImpl`、`BaseEntity` |
| `interceptor` | `LoginInterceptor` 登录拦截、`LogInterceptor` 日志拦截 |
| `log` | `LogAop`、`OperationLog` 操作日志、`TraceIdPatternConverter` 链路追踪 |
| `pagination` | 分页、排序、`Paging`、`OrderMapping` |
| `redis` | `RedisUtil` Redis 工具 |
| `tool` | `TokenUtil`、`LoginUtil`、`DateUtil`、`CommonUtil`、`AliyunSmsUtils`、`FileTypeTool` 等 |
| `captcha` | 验证码生成（`Captcha`、`Quant`、`Randoms`、`Encoder`） |
| `config` | `MyBatisPlusConfig`、`YamlConfigLoader` |
| `constant` | `CommonConstant`、`RocketMqConstant` |
| `enums` | `BaseEnum`、`OperationLogType`、`RandomType` |
| `thread` | `ThreadMdcUtil`、`ThreadPoolExecutorMdcWrapper` |

## 关键类说明

- **RestExceptionHandler**：统一处理 `BusinessException`、`Exception`、参数校验异常（`BindException`、`ConstraintViolationException`、`MethodArgumentNotValidException`）
- **ApiResult**：统一 API 响应格式（code、message、data）
- **BusinessException**：业务异常，携带错误码和消息
- **BaseController**：Controller 基类，提供通用方法
- **BaseEntity**：实体基类，公共字段（createTime、updateTime、delFlag 等）
- **RedisUtil**：Redis 操作封装
- **LoginInterceptor**：登录态校验

## 被依赖关系

```
desktop-service
    └── desktop-common
```

## 技术依赖

- Spring Web、Validation
- MyBatis-Plus
- Redis、RocketMQ
- 阿里云短信
- Hutool、Guava、Lombok
