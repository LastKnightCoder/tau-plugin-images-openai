import { messages } from "./i18n";
import { definePlugin } from "@tau/plugins";
import { createImageInstance } from "./provider";
declare const __PLUGIN_META__: { id: string; name: string; version: string };

export default definePlugin({
  ...__PLUGIN_META__,
  i18n: messages,
  create: () => ({
    activate(context) {
      if (!context.images) throw new Error("请升级到支持图片插件接口的 Tau 客户端");
      context.images.register({
        id: context.pluginId,
        name: "OpenAI 图片",
        create: (config, modelId) => createImageInstance(config, modelId, context.fetch),
      });
      context.settings.register({
        id: "connection",
        title: "OpenAI 图片",
        target: "images",
        models: [
          { id: "gpt-image-2" },
          { id: "gpt-image-2.5-sunburst" },
          { id: "gpt-image-2.5-flare" },
          { id: "gpt-image-2.6-sunburst" },
          { id: "gpt-image-2.6-flare" },
        ],
        form: {
          groups: [
            {
              title: messages.ref("connection.title"),
              description: messages.ref("connection.description"),
              fields: [
                { key: "apiKey", label: messages.ref("apiKey.label"), type: "secret" },
                {
                  key: "baseUrl",
                  label: messages.ref("baseUrl.label"),
                  type: "url",
                  default: "https://api.openai.com/v1",
                  description: messages.ref("baseUrl.description"),
                  summary: true,
                },
              ],
            },
          ],
          beforeSave: async values => {
            const baseUrl = values.baseUrl.trim();
            let protocol = "";
            try {
              protocol = new URL(baseUrl).protocol;
            } catch {
              // 无法解析时按地址格式错误处理
            }
            if (!["https:", "http:"].includes(protocol))
              throw new Error("模型地址须为 HTTP 或 HTTPS 地址");
            return { ...values, baseUrl, apiKey: values.apiKey.trim() };
          },
        },
      });
    },
  }),
});
