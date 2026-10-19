# OpenAI 兼容图片

通过 OpenAI Images 兼容接口生成图片，或使用一张、多张参考图编辑图片。结果可用于聊天、编辑器和白板，按应用中的资源存储设置保存。

安装并启用插件后，在设置的「图片生成」中添加本插件账号，填写接口地址、API Key 和模型名称，保存后设为当前账号。可添加多个账号，配置互相隔离。接口地址填写 API 基址，例如 `https://api.openai.com/v1`，不包含 `/images/generations`。

接口须支持 `/images/generations`，参考图编辑须支持 `/images/edits` 和 `image[]` 文件字段。支持 PNG、JPEG、WebP、base64、二进制和图片 URL 返回。服务商不支持的模型或参数由接口报告错误；取消请求不保证撤销远端已经发生的费用。

从 [GitHub Release](https://github.com/LastKnightCoder/tau-plugin-images-openai/releases) 下载 ZIP，在支持图片插件接口的 Tau 客户端中安装并启用。尚未包含图片插件接口的旧客户端无法启用本插件。

开发与构建步骤见 [DEVELOPMENT.md](DEVELOPMENT.md)。
