import { afterEach, expect, it } from "vitest";
import { createGenerationServer } from "./api";
import type { JwkSet } from "./auth";

// The local Node server forwards /api/auth/* to the shared handler and keeps its own guards.
const CLIENT = "1234567890-abcdefg.apps.googleusercontent.com";
const servers: ReturnType<typeof createGenerationServer>[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((s) => new Promise<void>((r) => { s.closeAllConnections(); s.close(() => r()); }))); });

it("signs in through the local server and refuses foreign origins", async () => {
  const params = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" } as const;
  const keys = (await crypto.subtle.generateKey(params, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwks: JwkSet = { keys: [{ ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" }] };
  const server = createGenerationServer({ auth: { google: { clientId: CLIENT }, secret: "s".repeat(40), fetchKeys: async () => jwks } });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
  const me = await fetch(base + "/api/auth/me");
  const info = await me.json();
  expect(info).toMatchObject({ providers: ["google"], google: { clientId: CLIENT }, user: null });
  const nonceCookie = me.headers.getSetCookie()[0].split(";")[0];
  // Local dev is plain http: no Secure flag, still HttpOnly.
  expect(me.headers.getSetCookie()[0]).toMatch(/HttpOnly; SameSite=Strict; Max-Age=600$/);
  const b64 = (v: string | Uint8Array) => Buffer.from(v).toString("base64url");
  const head = b64(JSON.stringify({ alg: "RS256", kid: "k1" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64(JSON.stringify({ iss: "accounts.google.com", aud: CLIENT, sub: "42", email: "a@example.com", email_verified: true, name: "阿安", iat: now, exp: now + 600, nonce: info.google.nonce }));
  const sig = b64(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(`${head}.${body}`))));
  const post = (origin: string) => fetch(base + "/api/auth/google", { method: "POST", headers: { "content-type": "application/json", origin, cookie: nonceCookie }, body: JSON.stringify({ credential: `${head}.${body}.${sig}` }) });
  expect((await post("https://evil.example")).status).toBe(403);
  const ok = await post("http://127.0.0.1:5173");
  expect(ok.status).toBe(200);
  expect(await ok.json()).toEqual({ user: { name: "阿安", email: "a@example.com", provider: "google" } });
  const session = ok.headers.getSetCookie().find((c) => c.startsWith("s2_session="))!.split(";")[0];
  const again = await fetch(base + "/api/auth/me", { headers: { cookie: session } });
  expect((await again.json()).user).toEqual({ name: "阿安", email: "a@example.com", provider: "google" });
});

it("reports sign-in as off when not configured", async () => {
  const server = createGenerationServer({});
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
  expect(await (await fetch(base + "/api/auth/me")).json()).toEqual({ providers: [], user: null });
});
