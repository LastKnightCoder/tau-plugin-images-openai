import { useEffect, useRef, useState } from "react";
import { Input, SettingRow } from "@tau/ui";
import { definePlugin, type PluginSettingsProps } from "@tau/plugins";
import { createImageInstance } from "./provider";

declare const __PLUGIN_META__: { id: string; name: string; version: string };

const SAVE_DELAY_MS = 500;

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
  const [error, setError] = useState("");
  const edited = useRef(false);
  const saveRef = useRef(imageConfig?.save);
  saveRef.current = imageConfig?.save;
  const pending = useRef<(() => void) | null>(null);

  // 输入停顿后自动保存；未改动过不写回，避免打开即覆盖已存配置
  useEffect(() => {
    if (!edited.current) return;
    const config = { baseUrl: baseUrl.trim(), apiKey: apiKey.trim() };
    const modelId = model.trim();
    try {
      createImageInstance(config, modelId, context.fetch);
    } catch (reason) {
      pending.current = null;
      setError(reason instanceof Error ? reason.message : String(reason));
      return;
    }
    setError("");
    const flush = () => {
      pending.current = null;
      saveRef.current?.(config, modelId).catch((reason: unknown) => {
        if (!context.signal.aborted)
          setError(reason instanceof Error ? reason.message : String(reason));
      });
    };
    pending.current = flush;
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [baseUrl, apiKey, model, context]);
  // 停顿期内收起或切走时立即写入，不丢最后一次修改
  useEffect(() => () => pending.current?.(), []);

  if (!imageConfig) return null;
  const edit = (setter: (next: string) => void) => (next: string) => {
    edited.current = true;
    setter(next);
  };
  return (
    <>
      <SettingRow title="模型地址">
        <Input
          wrapperClassName="w-[300px] max-w-full"
          value={baseUrl}
          onChange={(event) => edit(setBaseUrl)(event.target.value)}
          spellCheck={false}
        />
      </SettingRow>
      <SettingRow title="API Key">
        <Input
          wrapperClassName="w-[300px] max-w-full"
          type="password"
          value={apiKey}
          onChange={(event) => edit(setApiKey)(event.target.value)}
          autoComplete="off"
        />
      </SettingRow>
      <SettingRow title="模型名称">
        <Input
          wrapperClassName="w-[300px] max-w-full"
          value={model}
          onChange={(event) => edit(setModel)(event.target.value)}
          spellCheck={false}
        />
      </SettingRow>
      {error && (
        <p className="text-tau-meta text-danger px-3 pb-2" role="alert">
          {error}
        </p>
      )}
    </>
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
        name: "OpenAI 图片",
        create: (config, modelId) =>
          createImageInstance(config, modelId, context.fetch),
      });
      context.settings.register({
        id: "connection",
        title: "OpenAI 图片",
        target: "images",
        component: ImageSettings,
      });
    },
  }),
});
