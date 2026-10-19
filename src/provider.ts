import type {
  GeneratedImage,
  ImageGenerateRequest,
  ImageInstance,
  ImageOptions,
  JsonValue,
} from "@tau/plugins";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function image(
  content: Uint8Array,
  mimeType: string,
  index: number,
  revisedPrompt?: string,
): GeneratedImage {
  const extension = Object.keys(TYPES).find((key) => TYPES[key] === mimeType);
  if (!extension || !content.byteLength)
    throw new Error("图片接口返回了无效的图片格式或空内容");
  return {
    name: `generated-${index + 1}.${extension}`,
    mimeType,
    content,
    ...(revisedPrompt ? { revisedPrompt } : {}),
  };
}

function decode(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function optionsBody(options?: ImageOptions) {
  const values = {
    size: options?.size,
    quality: options?.quality,
    output_format: options?.outputFormat,
    background: options?.background,
    n: options?.count,
  };
  if (
    options?.count !== undefined &&
    (!Number.isInteger(options.count) ||
      options.count < 1 ||
      options.count > 16)
  )
    throw new Error("图片数量必须是 1 到 16 的整数");
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}

export function createImageInstance(
  config: JsonValue,
  modelId: string,
  fetcher: typeof fetch,
): ImageInstance {
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("图片连接配置无效");
  const baseUrl =
    typeof config.baseUrl === "string"
      ? config.baseUrl.trim().replace(/\/+$/, "")
      : "";
  const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
  const model = modelId.trim();
  if (!baseUrl || !apiKey || !model)
    throw new Error("请填写模型地址、API Key 和模型名称");
  const parsed = new URL(baseUrl);
  if (!["https:", "http:"].includes(parsed.protocol))
    throw new Error("模型地址必须使用 HTTP 或 HTTPS");

  const parseResponse = async (
    response: Response,
    signal: AbortSignal,
    options?: ImageOptions,
  ): Promise<GeneratedImage[]> => {
    const contentType =
      response.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() ?? "";
    if (response.ok && contentType.startsWith("image/"))
      return [
        image(new Uint8Array(await response.arrayBuffer()), contentType, 0),
      ];
    const raw = await response.text();
    let payload: {
      error?: { message?: string };
      data?: {
        b64_json?: string;
        url?: string;
        output_format?: string;
        revised_prompt?: string;
      }[];
      output_format?: string;
    };
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(
        response.ok
          ? "图片接口未返回可识别的图片数据"
          : `图片请求失败：${response.status}`,
      );
    }
    if (!response.ok)
      throw new Error(
        payload?.error?.message || `图片请求失败：${response.status}`,
      );
    if (
      !Array.isArray(payload?.data) ||
      !payload.data.length ||
      payload.data.length > 16
    )
      throw new Error("图片接口未返回有效的图片列表");
    const results: GeneratedImage[] = [];
    for (const [index, item] of payload.data.entries()) {
      signal.throwIfAborted();
      if (item.b64_json) {
        const format =
          item.output_format ??
          payload.output_format ??
          options?.outputFormat ??
          "png";
        results.push(
          image(
            decode(item.b64_json),
            TYPES[format] ?? "",
            index,
            item.revised_prompt,
          ),
        );
      } else if (item.url) {
        const url = new URL(item.url);
        if (!["https:", "http:"].includes(url.protocol))
          throw new Error("图片下载地址必须使用 HTTP 或 HTTPS");
        const download = await fetcher(url.href, { signal });
        if (!download.ok) {
          await download.body?.cancel();
          throw new Error(`图片下载失败：${download.status}`);
        }
        const mimeType =
          download.headers
            .get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase() ?? "";
        results.push(
          image(
            new Uint8Array(await download.arrayBuffer()),
            mimeType,
            index,
            item.revised_prompt,
          ),
        );
      }
    }
    signal.throwIfAborted();
    if (!results.length)
      throw new Error("图片接口未返回 b64_json 或 url 图片数据");
    return results;
  };

  const run = async (
    endpoint: "generations" | "edits",
    request: ImageGenerateRequest,
    signal: AbortSignal,
    body?: FormData,
  ) => {
    const executionSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(300_000),
    ]);
    executionSignal.throwIfAborted();
    const prompt = request.prompt.trim();
    if (!prompt) throw new Error("图片要求不能为空");
    const values = { model, prompt, ...optionsBody(request.options) };
    if (body)
      for (const [key, value] of Object.entries(values))
        body.append(key, String(value));
    const response = await fetcher(`${baseUrl}/images/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? {} : { "Content-Type": "application/json" }),
      },
      body: body ?? JSON.stringify(values),
      signal: executionSignal,
    });
    const results = await parseResponse(
      response,
      executionSignal,
      request.options,
    );
    executionSignal.throwIfAborted();
    return results;
  };

  return {
    generate: (request, signal) => run("generations", request, signal),
    edit: (request, signal) => {
      if (!request.images.length)
        throw new Error("图片编辑至少需要一张输入图片");
      const body = new FormData();
      for (const file of request.images)
        body.append(
          "image[]",
          new Blob([file.content.slice().buffer], { type: file.mimeType }),
          file.name,
        );
      return run("edits", request, signal, body);
    },
  };
}
