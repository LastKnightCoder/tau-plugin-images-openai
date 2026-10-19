# 开发与发布

需要 Node.js 22 或更高版本，以及 pnpm 11.9.0。依赖从公共 npm 注册表安装，SDK 使用 `@tau/plugins` 到 `@xiongtao.xt/tau-plugins@0.18.0` 的公开别名，不依赖 Tau 主仓库、本机目录或 SDK 快照包。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

构建生成 `dist/tau.images-openai-0.1.0.zip`。SDK、React 和 UI 由客户端提供，构建时保持 external。测试模拟 HTTP，不需要真实账号，也不会产生图片生成费用。

插件入口和表单在 `src/index.tsx`，OpenAI 协议适配在 `src/provider.ts`。配置按账号实例保存，服务端返回临时 URL 时由插件下载为图片字节，下载请求不附带生成接口的 API Key。

更新时同步修改 `package.json`、`manifest.json` 和 `CHANGELOG.md`，提交后推送同版本标签。`v0.1.0` 这样的标签会触发 GitHub Actions：冻结安装依赖、运行测试、类型检查、构建并发布 ZIP 到 GitHub Release。主分支推送与 Pull Request 也会执行构建验证。

`pnpm install:local` 仅用于首次安装开发包，目标目录存在时拒绝覆盖。日常发布不自动安装插件，不读取用户的图片服务凭据。
