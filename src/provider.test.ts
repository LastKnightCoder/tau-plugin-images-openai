import { expect, it, vi } from "vitest";
import { createImageInstance } from "./provider";

const config = { baseUrl: "https://api.test/v1/", apiKey: "test-key" };
const signal = () => new AbortController().signal;
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

it("生成使用账号地址和模型，仅映射显式选项，保留真实 MIME", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    json({ data: [{ b64_json: "AQID" }] }),
  );
  const instance = createImageInstance(config, "test-model", fetcher);
  const result = await instance.generate!(
    { prompt: "生成", options: { count: 2, outputFormat: "webp" } },
    signal(),
  );
  expect(fetcher.mock.calls[0]).toMatchObject([
    "https://api.test/v1/images/generations",
    { headers: { Authorization: "Bearer test-key" } },
  ]);
  expect(
    JSON.parse(
      (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    ),
  ).toEqual({
    model: "test-model",
    prompt: "生成",
    n: 2,
    output_format: "webp",
  });
  expect(result[0]).toMatchObject({
    mimeType: "image/webp",
    content: new Uint8Array([1, 2, 3]),
  });
});

it("编辑使用 multipart image[]，多账号互不覆盖", async () => {
  const calls: [string, RequestInit | undefined][] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push([String(url), init]);
    return json({ data: [{ b64_json: "AQID", output_format: "png" }] });
  };
  const first = createImageInstance(config, "first", fetcher);
  const second = createImageInstance(
    { baseUrl: "https://other.test/v2", apiKey: "second-key" },
    "second",
    fetcher,
  );
  await first.edit!(
    {
      prompt: "编辑",
      images: [
        {
          name: "input.png",
          mimeType: "image/png",
          content: new Uint8Array([4]),
        },
      ],
    },
    signal(),
  );
  await second.generate!({ prompt: "生成" }, signal());
  expect(calls[0][0]).toBe("https://api.test/v1/images/edits");
  const body = calls[0][1]!.body as FormData;
  expect(body.get("model")).toBe("first");
  expect(body.getAll("image[]")).toHaveLength(1);
  expect(
    (calls[0][1]!.headers as Record<string, string>)["Content-Type"],
  ).toBeUndefined();
  expect(calls[1][0]).toBe("https://other.test/v2/images/generations");
  expect(calls[1][1]!.headers).toMatchObject({
    Authorization: "Bearer second-key",
  });
});

it("临时 URL 下载不携带 API 凭据，支持二进制并传播取消", async () => {
  const calls: RequestInit[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    calls.push(init ?? {});
    return calls.length === 1
      ? json({ data: [{ url: "https://cdn.test/image" }] })
      : new Response(new Uint8Array([1]), {
          headers: { "content-type": "image/jpeg" },
        });
  };
  const instance = createImageInstance(config, "model", fetcher);
  expect(
    (await instance.generate!({ prompt: "生成" }, signal()))[0].mimeType,
  ).toBe("image/jpeg");
  expect(calls[1].headers).toBeUndefined();
  const controller = new AbortController();
  controller.abort();
  await expect(
    instance.generate!({ prompt: "生成" }, controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(calls).toHaveLength(2);
  const binary = createImageInstance(
    config,
    "model",
    async () =>
      new Response(new Uint8Array([1]), {
        headers: { "content-type": "image/webp" },
      }),
  );
  expect(
    (await binary.generate!({ prompt: "生成" }, signal()))[0].mimeType,
  ).toBe("image/webp");
});

it("返回服务商错误，拒绝空结果和非法数量", async () => {
  const error = createImageInstance(
    config,
    "model",
    async () =>
      new Response(
        JSON.stringify({ error: { message: "model unsupported" } }),
        { status: 400 },
      ),
  );
  await expect(error.generate!({ prompt: "生成" }, signal())).rejects.toThrow(
    "model unsupported",
  );
  const empty = createImageInstance(config, "model", async () =>
    json({ data: [] }),
  );
  await expect(empty.generate!({ prompt: "生成" }, signal())).rejects.toThrow(
    "有效的图片列表",
  );
  await expect(
    empty.generate!({ prompt: "生成", options: { count: 1.5 } }, signal()),
  ).rejects.toThrow("整数");
});
