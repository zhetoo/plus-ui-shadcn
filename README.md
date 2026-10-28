# plus-ui-shadcn

基于 Next.js 16、React 19 与 shadcn/ui 重建的 RuoYi-Vue-Plus 前端。项目替换原 `plus-ui` 的 Vue 3 / Element Plus 界面，继续使用原后端接口、鉴权、权限标识、动态菜单和数据结构。

## 技术栈

- Next.js 16 App Router
- React 19 + TypeScript
- shadcn/ui（`b0` preset，Base UI）
- Tailwind CSS 4
- Axios

## 启动

安装依赖：

```bash
pnpm install
```

复制环境变量并填写 RSA 密钥、客户端 ID 等部署参数：

```bash
Copy-Item .env.example .env.development
```

开发环境默认通过 Next.js rewrite 将 `/dev-api` 转发到 `API_PROXY_TARGET`：

```bash
pnpm dev
```

生产检查与构建：

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

## 目录

- `app/`：Next.js 页面与布局
- `components/`：业务组件及 shadcn/ui 组件
- `api/`：从旧前端迁移的接口定义，接口路径和请求方式保持不变
- `utils/request.ts`：Token、租户、加密、重复提交、文件下载和统一错误处理
- `lib/crud-configs.ts`：常规后台模块的页面字段与 API 映射
- `types/`、`enums/`：公共类型与枚举

## 兼容说明

- 登录接口、验证码、租户、第三方登录回调保持原协议。
- Token 名称仍为 `Admin-Token`，请求继续携带 `clientid` 与 `Content-Language`。
- 开启加密后，继续使用 AES 请求体和 RSA 加密的 `encrypt-key` 请求头。
- 菜单继续由 `/system/menu/getRouters` 动态生成，按钮继续按后端权限标识控制。
- SSE、WebSocket、OSS、导入导出与 WarmFlow 设计器继续使用原路径。
- 常规列表筛选仍在点击“查询”后请求，日期范围继续按 `params[beginTime]` / `params[endTime]` 传递。
- 新增用户仍读取 `sys.user.initPassword`，SpEL 表达式仍由组件名、方法名和参数自动生成。

详细迁移范围和联调清单见 [MIGRATION.md](./MIGRATION.md)。
