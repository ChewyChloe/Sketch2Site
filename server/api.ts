import {generationProtocol} from '../src/generationProtocol';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { handleAuth, type AuthConfig } from "./auth";
import { z } from "zod";
import { CanvasSchema } from "../src/spec";
import { CopyRequestSchema, cleanOptions, type CopyRequest } from "../src/copySuggest";
import {
  prepareIntent,
  materialize,
  GenerationError,
  type GenerationCode,
} from "../src/generation";
import {
  inputTokenBound,
  validUsage,
  ProviderFailure,
  type ProviderUsage,
  type LayoutProvider,
} from "./provider";
const requestSchema = z
  .object({ requestId: z.string().uuid(), canvasSpec: CanvasSchema })
  .strict();
type Options = {
  provider?: LayoutProvider;
  inputRate?: number;
  outputRate?: number;
  cachedInputRate?: number;
  timeoutMs?: number;
  maxCalls?: number;
  maxPerMinute?: number;
  budgetUsd?: number;
  testMode?: boolean;
  auth?: AuthConfig | null;
  onUsage?: (usage: Record<string, number | string | null>) => void;
};
export function createGenerationServer(options: Options = {}) {
  const sessions = new Map<string, { csrf: string; expires: number }>(),
    used = new Set<string>();
  let active = 0,
    calls = 0,
    reserved = 0;
  const arrivals: number[] = [];
  const allowedOrigins = ["http://127.0.0.1:5173", "http://localhost:5173"];
  const json = (res: ServerResponse, status: number, value: unknown) => {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    });
    res.end(JSON.stringify(value));
  };
  const failure = (res: ServerResponse, status: number, code: GenerationCode) =>
    json(res, status, { code });
  const server = createServer(async (req, res) => {
    const host = req.headers.host ?? "",
      origin = req.headers.origin,
      site = req.headers["sec-fetch-site"];
    if (
      !/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
      (origin && !allowedOrigins.includes(origin)) ||
      // GitHub's sign-in redirect is the one cross-site GET allowed in (its state is checked).
      (site === "cross-site" && !(req.method === "GET" && req.url?.startsWith("/api/auth/github/callback?")))
    )
      return failure(res, 403, "FORBIDDEN");
    const address = req.socket.remoteAddress;
    if (
      address !== "127.0.0.1" &&
      address !== "::1" &&
      address !== "::ffff:127.0.0.1"
    )
      return failure(res, 403, "FORBIDDEN");
    // Google sign-in (same rules as the rest: loopback host, allowed origin, same-site POSTs).
    if (req.url?.startsWith("/api/auth/")) {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) { size += (chunk as Buffer).length; if (size > 8192) return json(res, 413, { code: "BAD_REQUEST" }); chunks.push(chunk as Buffer); }
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
      const request = new Request(`http://${host}${req.url}`, { method: req.method, headers, body: req.method === "POST" ? Buffer.concat(chunks) : undefined });
      const answer = await handleAuth(request, options.auth ?? null, { sameOrigin: Boolean(origin && allowedOrigins.includes(origin)), clientKey: address ?? "anon" });
      if (!answer || res.destroyed) return;
      const out: Record<string, string | string[]> = {};
      answer.headers.forEach((v, k) => { if (k !== "set-cookie") out[k] = v; });
      const cookies = answer.headers.getSetCookie();
      if (cookies.length) out["set-cookie"] = cookies;
      res.writeHead(answer.status, out);
      return res.end(await answer.text());
    }
    // Read-only availability check for the editor (no session is created).
    if (req.method === "GET" && req.url === "/api/generation/ready")
      return json(res, 200, { configured: Boolean(options.provider) });
    if (req.method === "GET" && (req.url === "/api/generation/status" || req.url === "/api/generation/check")) {
      for (const [key, s] of sessions)
        if (s.expires < Date.now()) sessions.delete(key);
      const existing = req.headers.cookie?.match(
        /(?:^|; )sketch_generation_session=([a-f0-9]{64})(?:;|$)/,
      )?.[1];
      const id =
        existing && sessions.has(existing)
          ? existing
          : randomBytes(32).toString("hex");
      if (!sessions.has(id)) {
        if (sessions.size >= 32) return failure(res, 429, "LIMIT");
        sessions.set(id, {
          csrf: randomBytes(32).toString("hex"),
          expires: Date.now() + 30 * 60000,
        });
      }
      res.setHeader(
        "Set-Cookie",
        `sketch_generation_session=${id}; HttpOnly; SameSite=Strict; Path=/api/generation`,
      );
      return json(res, 200, {
        protocol:generationProtocol,
        configured: Boolean(options.provider),
        csrfToken: sessions.get(id)!.csrf,
      });
    }
    if ((req.url !== "/api/generation" && req.url !== "/api/generation/check" && req.url !== "/api/generation/copy") || req.method !== "POST")
      return json(res, 404, { code: "UNAVAILABLE" });
    const id = req.headers.cookie?.match(
      /(?:^|; )sketch_generation_session=([a-f0-9]{64})(?:;|$)/,
    )?.[1];
    const session = id ? sessions.get(id) : undefined,
      csrf = req.headers["x-sketch-csrf"];
    if (
      !origin ||
      !session ||
      session.expires < Date.now() ||
      typeof csrf !== "string" ||
      !/^[a-f0-9]{64}$/.test(csrf) ||
      !timingSafeEqual(Buffer.from(csrf), Buffer.from(session.csrf))
    )
      return failure(res, 403, "FORBIDDEN");
    if (
      req.headers["content-type"] !== "application/json" ||
      Number(req.headers["content-length"] ?? 0) > 32768
    )
      return failure(res, 413, "INVALID_INPUT");
    let body = "";
    try {
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        chunks.push(chunk);
        if (bytes > 32768) {
          failure(res, 413, "INVALID_INPUT");
          req.resume();
          return;
        }
      }
      body = Buffer.concat(chunks).toString("utf8");
    } catch {
      return failure(res, 400, "INVALID_INPUT");
    }
    // Copy suggestions share the session, CSRF, size, rate, call-count and budget guards.
    if (req.url === "/api/generation/copy") {
      let copy: CopyRequest;
      try {
        copy = CopyRequestSchema.parse(JSON.parse(body));
      } catch {
        return failure(res, 400, "INVALID_INPUT");
      }
      const provider = options.provider;
      if (!provider?.suggestCopy) return failure(res, 503, "NOT_CONFIGURED");
      if (used.has(copy.requestId)) return failure(res, 409, "DUPLICATE");
      if (active >= 1) return failure(res, 429, "BUSY");
      const now = Date.now();
      while (arrivals[0] && arrivals[0] < now - 60000) arrivals.shift();
      const reserve = ((Buffer.byteLength(JSON.stringify(copy)) + 2000) * (options.inputRate ?? 2)) / 1e6 + (1024 * (options.outputRate ?? 8)) / 1e6;
      if (arrivals.length >= (options.maxPerMinute ?? 3) || calls >= (options.maxCalls ?? 5) || reserved + reserve > (options.budgetUsd ?? 0.25))
        return failure(res, 429, "LIMIT");
      arrivals.push(now);
      calls++;
      reserved += reserve;
      used.add(copy.requestId);
      active++;
      const started = Date.now(), controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          provider.suggestCopy(copy, controller.signal),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new GenerationError("TIMEOUT"));
            }, options.timeoutMs ?? 30000);
          }),
        ]);
        if (!validUsage(result) || result.outputTokens > 1024) throw new GenerationError("INVALID_OUTPUT");
        const cleaned = cleanOptions(copy.kind, copy.text, result.options);
        if (!cleaned.length) throw new GenerationError("INVALID_OUTPUT");
        const cached = result.cachedInputTokens ?? 0;
        const usage = {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cachedInputTokens: result.cachedInputTokens ?? null,
          reasoningTokens: result.reasoningTokens ?? null,
          estimatedCostUsd: ((result.inputTokens - cached) * (options.inputRate ?? 2) + cached * (options.cachedInputRate ?? options.inputRate ?? 2) + result.outputTokens * (options.outputRate ?? 8)) / 1e6,
          latencyMs: Date.now() - started,
        };
        options.onUsage?.({ requestId: copy.requestId, kind: "copy", outcome: "PASS", ...usage });
        json(res, 200, { requestId: copy.requestId, options: cleaned, usage });
      } catch (error) {
        const code = error instanceof GenerationError ? error.code : "UNAVAILABLE";
        options.onUsage?.({ requestId: copy.requestId, kind: "copy", outcome: code, reservedUsd: reserve, latencyMs: Date.now() - started });
        failure(res, code === "TIMEOUT" ? 504 : 502, code);
      } finally {
        active--;
        if (timer) clearTimeout(timer);
      }
      return;
    }
    let request: z.infer<typeof requestSchema>;
    try {
      request = requestSchema.parse(JSON.parse(body));
      prepareIntent(request.canvasSpec);
    } catch {
      return failure(res, 400, "INVALID_INPUT");
    }
    if (req.url === "/api/generation/check") return json(res,200,{code:"DRAFT_APPROVED",schemaVersion:1}); // Local dev only; no provider or quota.
    if (!options.provider) return failure(res, 503, "NOT_CONFIGURED");
    if (used.has(request.requestId)) return failure(res, 409, "DUPLICATE");
    if (active >= 1) return failure(res, 429, "BUSY");
    const now = Date.now();
    while (arrivals[0] && arrivals[0] < now - 60000) arrivals.shift();
    // Reserve a conservative byte-based token bound plus schema/protocol overhead; failures consume reservations.
    const intent = prepareIntent(request.canvasSpec);
    const inputBound = inputTokenBound(intent);
    const reserve =
      (inputBound * (options.inputRate ?? 2)) / 1e6 +
      (4096 * (options.outputRate ?? 8)) / 1e6;
    if (
      arrivals.length >= (options.maxPerMinute ?? 3) ||
      calls >= (options.maxCalls ?? 5) ||
      reserved + reserve > (options.budgetUsd ?? 0.25) ||
      reserve > 0.1
    )
      return failure(res, 429, "LIMIT");
    arrivals.push(now);
    calls++;
    reserved += reserve;
    used.add(request.requestId);
    active++;
    const started = Date.now(),
      controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observedUsage: ProviderUsage | undefined;
    const account = (usage: ProviderUsage) => {
      const cached = usage.cachedInputTokens ?? 0;
      return {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens ?? null,
        reasoningTokens: usage.reasoningTokens ?? null,
        estimatedCostUsd:
          ((usage.inputTokens - cached) * (options.inputRate ?? 2) +
            cached * (options.cachedInputRate ?? options.inputRate ?? 2) +
            usage.outputTokens * (options.outputRate ?? 8)) / 1e6,
      };
    };
    try {
      const task = Promise.resolve().then(() =>
        options.provider!.generate(intent, controller.signal),
      );
      void task.then(
        () => active--,
        () => active--,
      );
      const result = await Promise.race([
        task,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new GenerationError("TIMEOUT"));
          }, options.timeoutMs ?? 30000);
        }),
      ]);
      if (validUsage(result)) observedUsage = result;
      if (
        result.outputTokens > 4096 ||
        result.inputTokens > inputBound ||
        !validUsage(result)
      )
        throw new GenerationError("INVALID_OUTPUT");
      const page = materialize(request.canvasSpec, result.layout);
      const usage = {
        ...account(result),
        latencyMs: Date.now() - started,
      };
      options.onUsage?.({ requestId: request.requestId, outcome: "PASS", ...usage });
      json(res, 200, {
        requestId: request.requestId,
        page,
        usage,
        mode: options.testMode ? "mock" : "live",
      });
    } catch (error) {
      const code =
        error instanceof GenerationError ? error.code : "UNAVAILABLE";
      if (
        error instanceof ProviderFailure &&
        error.usage &&
        validUsage(error.usage)
      )
        observedUsage = error.usage;
      options.onUsage?.({
        requestId: request.requestId,
        latencyMs: Date.now() - started,
        outcome: code,
        reservedUsd: reserve,
        ...(observedUsage
          ? account(observedUsage)
          : {
              inputTokens: null,
              outputTokens: null,
              cachedInputTokens: null,
              reasoningTokens: null,
              estimatedCostUsd: null,
            }),
      });
      failure(res, code === "TIMEOUT" ? 504 : 502, code);
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 5000;
  server.maxHeadersCount = 30;
  return server;
}
