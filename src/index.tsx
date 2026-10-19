import { useState } from "react";
import { Button, Input } from "@tau/ui";
import { definePlugin, type PluginSettingsProps } from "@tau/plugins";
import { createImageInstance } from "./provider";

declare const __PLUGIN_META__: { id: string; name: string; version: string };

function ImageSettings({ imageConfig, context }: PluginSettingsProps) {
  const value = imageConfig?.value;
  const initial =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const [baseUrl, setBaseUrl] = useState(
    typeof initial.baseUrl === "string"
      ? initial.baseUrl
      : "https://api.openai.com/v1",
  );
  const [apiKey, setApiKey] = useState(
    typeof initial.apiKey === "string" ? initial.apiKey : "",
  );
  const [model, setModel] = useState(imageConfig?.modelId || "gpt-image-2");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  if (!imageConfig) return null;
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const config = { baseUrl: baseUrl.trim(), apiKey: apiKey.trim() };
      createImageInstance(config, model, context.fetch);
      await imageConfig.save(config, model.trim());
      if (!context.signal.aborted) setMessage("已保存");
    } catch (error) {
      if (!context.signal.aborted)
        setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      if (!context.signal.aborted) setSaving(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        模型地址
        <Input
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          spellCheck={false}
        />
      </label>
      <label className="flex flex-col gap-1">
        API Key
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1">
        模型名称
        <Input
          value={model}
          onChange={(event) => setModel(event.target.value)}
          spellCheck={false}
        />
      </label>
      <Button variant="secondary" loading={saving} onClick={() => void save()}>
        保存连接配置
      </Button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export default definePlugin({
  ...__PLUGIN_META__,
  create: () => ({
    activate(context) {
      if (!context.images)
        throw new Error("请升级到支持图片插件接口的 Tau 客户端");
      context.images.register({
        id: context.pluginId,
        name: "OpenAI 兼容图片",
        create: (config, modelId) =>
          createImageInstance(config, modelId, context.fetch),
      });
      context.settings.register({
        id: "connection",
        title: "OpenAI 兼容图片",
        target: "images",
        component: ImageSettings,
      });
    },
  }),
});
