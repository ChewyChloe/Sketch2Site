import { describe, expect, it, beforeAll } from "vitest";
import { authConfigFrom, currentUser, handleAuth, verifyGoogleIdToken, type AuthConfig, type JwkSet } from "./auth";

const enc = new TextEncoder();
const b64url = (b: Uint8Array | string) => Buffer.from(typeof b === "string" ? enc.encode(b) : b).toString("base64url");
const CLIENT = "1234567890-abcdefg.apps.googleusercontent.com";
let keys: CryptoKeyPair, other: CryptoKeyPair, jwks: JwkSet;
const now = Date.UTC(2026, 10, 25, 8, 0, 0);
const config = (): AuthConfig => ({ google: { clientId: CLIENT }, secret: "x".repeat(40), fetchKeys: async () => jwks, now: () => now });

async function token(claims: Record<string, unknown>, opts: { key?: CryptoKey; kid?: string; alg?: string } = {}) {
  const header = b64url(JSON.stringify({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "k1", typ: "JWT" }));
  const body = b64url(JSON.stringify({ iss: "https://accounts.google.com", aud: CLIENT, sub: "1001", email: "kid@example.com", email_verified: true, name: "小明", iat: now / 1000 - 10, exp: now / 1000 + 3600, ...claims }));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", opts.key ?? keys.privateKey, enc.encode(`${header}.${body}`)));
  return `${header}.${body}.${b64url(sig)}`;
}
beforeAll(async () => {
  const params = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" } as const;
  keys = (await crypto.subtle.generateKey(params, true, ["sign", "verify"])) as CryptoKeyPair;
  other = (await crypto.subtle.generateKey(params, true, ["sign", "verify"])) as CryptoKeyPair;
  jwks = { keys: [{ ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1", use: "sig" }] };
});

describe("Google ID token verification", () => {
  it("accepts a valid token with the right audience and nonce", async () => {
    const r = await verifyGoogleIdToken(await token({ nonce: "n-123" }), config(), "n-123");
    expect(r).toEqual({ ok: true, user: { sub: "google:1001", email: "kid@example.com", name: "小明" } });
  });
  it.each([
    ["wrong key", { }, { key: "other" }, "BAD_SIGNATURE"],
    ["unknown kid", {}, { kid: "zz" }, "UNKNOWN_KEY"],
    ["alg none", {}, { alg: "none" }, "UNSUPPORTED_ALG"],
    ["other audience", { aud: "999-x.apps.googleusercontent.com" }, {}, "BAD_AUDIENCE"],
    ["other issuer", { iss: "https://evil.example" }, {}, "BAD_ISSUER"],
    ["expired", { exp: now / 1000 - 3600 }, {}, "EXPIRED"],
    ["issued in the future", { iat: now / 1000 + 3600 }, {}, "NOT_YET_VALID"],
    ["unverified email", { email_verified: false }, {}, "EMAIL_UNVERIFIED"],
    ["wrong nonce", { nonce: "other" }, {}, "BAD_NONCE"],
    ["missing nonce", { nonce: undefined }, {}, "BAD_NONCE"],
  ])("rejects %s", async (_label, claims, opts, reason) => {
    const o = opts as { key?: string; kid?: string; alg?: string };
    const t = await token({ nonce: "n-123", ...(claims as object) }, { kid: o.kid, alg: o.alg, key: o.key === "other" ? other.privateKey : undefined });
    expect(await verifyGoogleIdToken(t, config(), "n-123")).toEqual({ ok: false, reason });
  });
  it("rejects a tampered payload", async () => {
    const [h, , s] = (await token({ nonce: "n" })).split(".");
    const forged = `${h}.${b64url(JSON.stringify({ iss: "accounts.google.com", aud: CLIENT, sub: "1", email: "admin@example.com", email_verified: true, iat: now / 1000, exp: now / 1000 + 60, nonce: "n" }))}.${s}`;
    expect(await verifyGoogleIdToken(forged, config(), "n")).toEqual({ ok: false, reason: "BAD_SIGNATURE" });
    expect(await verifyGoogleIdToken("not.a.jwt", config(), "n")).toEqual({ ok: false, reason: "MALFORMED" });
  });
});

describe("auth routes", () => {
  const base = "https://sketch.example";
  const cookieOf = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(name + "="))!.split(";")[0];
  it("signs in with a nonce from /me, then knows the user; logout clears it", async () => {
    const me = await handleAuth(new Request(base + "/api/auth/me"), config(), { sameOrigin: true });
    const { google, providers, user } = await me!.json();
    const nonce = google.nonce;
    expect({ providers, clientId: google.clientId, user }).toEqual({ providers: ["google"], clientId: CLIENT, user: null });
    const nonceCookie = cookieOf(me!, "s2_nonce");
    expect(me!.headers.getSetCookie()[0]).toMatch(/HttpOnly; SameSite=Strict; Max-Age=600; Secure/);
    const login = await handleAuth(new Request(base + "/api/auth/google", { method: "POST", headers: { "content-type": "application/json", cookie: nonceCookie }, body: JSON.stringify({ credential: await token({ nonce }) }) }), config(), { sameOrigin: true });
    expect(login!.status).toBe(200);
    expect(await login!.json()).toEqual({ user: { name: "小明", email: "kid@example.com", provider: "google" } });
    const session = cookieOf(login!, "s2_session");
    expect(login!.headers.getSetCookie().join("\n")).toMatch(/s2_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=604800; Secure/);
    const who = await currentUser(new Request(base + "/", { headers: { cookie: session } }), config());
    expect(who).toEqual({ sub: "google:1001", email: "kid@example.com", name: "小明" });
    // A forged session cookie is ignored.
    const [body] = session.split("=")[1].split(".");
    expect(await currentUser(new Request(base + "/", { headers: { cookie: `s2_session=${body}.AAAA` } }), config())).toBeNull();
    const out = await handleAuth(new Request(base + "/api/auth/logout", { method: "POST", headers: { cookie: session } }), config(), { sameOrigin: true });
    expect(out!.headers.getSetCookie().join("\n")).toMatch(/s2_session=; Path=\/; HttpOnly; SameSite=Lax; Max-Age=0/);
  });
  it("refuses cross-site posts, missing nonce cookies and replays with another nonce", async () => {
    const post = (cookie: string, credential: string, sameOrigin = true) => handleAuth(new Request(base + "/api/auth/google", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ credential }) }), config(), { sameOrigin, clientKey: "t2" });
    const t = await token({ nonce: "abc" });
    expect((await post("", t, false))!.status).toBe(403);
    expect((await post("", t))!.status).toBe(401);
    const me = await handleAuth(new Request(base + "/api/auth/me"), config(), { sameOrigin: true });
    const nonceCookie = cookieOf(me!, "s2_nonce");
    const r = await post(nonceCookie, t);
    expect(r!.status).toBe(401);
    expect(await r!.json()).toEqual({ code: "INVALID_TOKEN" });
  });
  it("is off without a valid client ID and secret", async () => {
    expect(authConfigFrom({})).toBeNull();
    expect(authConfigFrom({ GOOGLE_CLIENT_ID: CLIENT, SESSION_SECRET: "short" })).toBeNull();
    expect(authConfigFrom({ GOOGLE_CLIENT_ID: "evil", SESSION_SECRET: "y".repeat(40) })).toBeNull();
    expect(authConfigFrom({ GOOGLE_CLIENT_ID: CLIENT, SESSION_SECRET: "y".repeat(40) })?.google?.clientId).toBe(CLIENT);
    expect(authConfigFrom({ GITHUB_CLIENT_ID: "Ov23liAbCdEfGh123456", GITHUB_CLIENT_SECRET: "not-hex", SESSION_SECRET: "y".repeat(40) })).toBeNull();
    expect(authConfigFrom({ GITHUB_CLIENT_ID: "Ov23liAbCdEfGh123456", GITHUB_CLIENT_SECRET: "a".repeat(40), SESSION_SECRET: "y".repeat(40), SKETCH_SITE_ORIGIN: "https://s.example" })).toMatchObject({ github: { clientId: "Ov23liAbCdEfGh123456" }, publicOrigin: "https://s.example" });
    const me = await handleAuth(new Request(base + "/api/auth/me"), null, { sameOrigin: true });
    expect(await me!.json()).toEqual({ providers: [], user: null });
    const login = await handleAuth(new Request(base + "/api/auth/google", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), null, { sameOrigin: true });
    expect(login!.status).toBe(503);
  });
});

describe("GitHub sign-in", () => {
  const base = "https://sketch.example";
  const GH = { clientId: "Ov23liAbCdEfGh123456", clientSecret: "b".repeat(40) };
  function fakeGitHub(opts: { emails?: unknown; badToken?: boolean } = {}) {
    const calls: { url: string; body?: string; auth?: string | null }[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, body: typeof init?.body === "string" ? init.body : undefined, auth: new Headers(init?.headers).get("authorization") });
      if (url === "https://github.com/login/oauth/access_token") return Response.json(opts.badToken ? { error: "bad_verification_code" } : { access_token: "fake-token-for-tests-only", token_type: "bearer" });
      if (url === "https://api.github.com/user") return Response.json({ id: 9001, login: "octo-kid", name: "八爪小孩" });
      if (url === "https://api.github.com/user/emails") return Response.json(opts.emails ?? [{ email: "Octo@Example.com", primary: true, verified: true }]);
      return new Response("nope", { status: 404 });
    }) as typeof fetch;
    return { calls, fetchImpl };
  }
  const cfg = (fetchImpl: typeof fetch): AuthConfig => ({ secret: "g".repeat(40), github: GH, publicOrigin: base, fetchImpl, now: () => now });
  async function start(c: AuthConfig) {
    const res = (await handleAuth(new Request(base + "/api/auth/github/start"), c, { sameOrigin: false, clientKey: "gh" }))!;
    const loc = new URL(res.headers.get("location")!);
    const stateCookie = res.headers.getSetCookie()[0];
    return { res, loc, stateCookie, cookie: stateCookie.split(";")[0] };
  }
  it("redirects to GitHub with state and PKCE, then signs in on the callback without keeping the token", async () => {
    const gh = fakeGitHub();
    const c = cfg(gh.fetchImpl);
    const { res, loc, stateCookie, cookie } = await start(c);
    expect(res.status).toBe(302);
    expect(loc.origin + loc.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(Object.fromEntries(loc.searchParams)).toMatchObject({ client_id: GH.clientId, redirect_uri: base + "/api/auth/github/callback", scope: "read:user user:email", code_challenge_method: "S256" });
    expect(loc.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(stateCookie).toMatch(/^s2_gh=[^;]+; Path=\/api\/auth; HttpOnly; SameSite=Lax; Max-Age=600; Secure$/);
    expect(JSON.stringify(loc.searchParams.toString())).not.toContain(GH.clientSecret);
    const back = (await handleAuth(new Request(`${base}/api/auth/github/callback?code=abc12345&state=${loc.searchParams.get("state")}`, { headers: { cookie } }), c, { sameOrigin: false }))!;
    expect(back.status).toBe(302);
    expect(back.headers.get("location")).toBe("/?signin=ok");
    const session = back.headers.getSetCookie().find((x) => x.startsWith("s2_session="))!;
    expect(session).toMatch(/HttpOnly; SameSite=Lax; Max-Age=604800; Secure/);
    expect(session).not.toContain("fake-token-for-tests-only");
    const exchange = JSON.parse(gh.calls[0].body!);
    expect(exchange).toMatchObject({ client_id: GH.clientId, client_secret: GH.clientSecret, code: "abc12345" });
    expect(exchange.code_verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    const who = await currentUser(new Request(base + "/", { headers: { cookie: session.split(";")[0] } }), c);
    expect(who).toEqual({ sub: "github:9001", email: "octo@example.com", name: "八爪小孩" });
  });
  it("rejects a wrong or missing state, a failed exchange, and works without a public email", async () => {
    const gh = fakeGitHub({ emails: [{ email: "x@example.com", primary: true, verified: false }] });
    const c = cfg(gh.fetchImpl);
    const { loc, cookie } = await start(c);
    const cb = (q: string, ck = cookie) => handleAuth(new Request(`${base}/api/auth/github/callback?${q}`, { headers: { cookie: ck } }), c, { sameOrigin: false });
    expect((await cb(`code=abc12345&state=wrong-state-value-here-123`))!.headers.get("location")).toBe("/?signin=failed");
    expect((await cb(`code=abc12345&state=${loc.searchParams.get("state")}`, ""))!.headers.get("location")).toBe("/?signin=failed");
    expect(gh.calls).toHaveLength(0);
    expect((await cb(`error=access_denied&state=${loc.searchParams.get("state")}`))!.headers.get("location")).toBe("/?signin=cancelled");
    const ok = (await cb(`code=abc12345&state=${loc.searchParams.get("state")}`))!;
    const session = ok.headers.getSetCookie().find((x) => x.startsWith("s2_session="))!.split(";")[0];
    expect(await currentUser(new Request(base + "/", { headers: { cookie: session } }), c)).toEqual({ sub: "github:9001", email: "", name: "八爪小孩" });
    const bad = fakeGitHub({ badToken: true });
    const c2 = cfg(bad.fetchImpl);
    const s2 = await start(c2);
    const fail = (await handleAuth(new Request(`${base}/api/auth/github/callback?code=abc12345&state=${s2.loc.searchParams.get("state")}`, { headers: { cookie: s2.cookie } }), c2, { sameOrigin: false }))!;
    expect(fail.headers.get("location")).toBe("/?signin=failed");
    expect(fail.headers.getSetCookie().some((x) => x.startsWith("s2_session=") && !x.startsWith("s2_session=;"))).toBe(false);
  });
});
