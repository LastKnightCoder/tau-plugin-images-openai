import { definePlugin } from "@tau/plugins";
import { createImageInstance } from "./provider";
declare const __PLUGIN_META__: { id: string; name: string; version: string };

export default definePlugin({
  ...__PLUGIN_META__,
  create: () => ({
    activate(context) {
      if (!context.images)
        throw new Error("请升级到支持图片插件接口的 Tau 客户端");
      context.images.register({
        id: context.pluginId,
        name: "OpenAI 图片",
        create: (config, modelId) =>
          createImageInstance(config, modelId, context.fetch),
      });
      context.settings.register({
        id: "connection",
        title: "OpenAI 图片",
        target: "images",
        models: [{ id: "gpt-image-2" }],
        form: {
          groups: [{
            title: "连接",
            description: "提示词与参考图会发送到所配置的模型服务。",
            fields: [
              { key: "apiKey", label: "API Key", type: "secret" },
              { key: "baseUrl", label: "模型地址", type: "url", default: "https://api.openai.com/v1", description: "兼容 OpenAI 图片接口的服务可改为对应地址", summary: true },
            ],
          }],
          beforeSave: async values => {
            const baseUrl = values.baseUrl.trim();
            let protocol = "";
            try {
              protocol = new URL(baseUrl).protocol;
            } catch {
              // 无法解析时按地址格式错误处理
            }
            if (!["https:", "http:"].includes(protocol)) throw new Error("模型地址须为 HTTP 或 HTTPS 地址");
            return { ...values, baseUrl, apiKey: values.apiKey.trim() };
          },
        },
      });
    },
  }),
});
