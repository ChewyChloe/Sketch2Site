// Sign-in with Google or GitHub. Platform-neutral (Web Crypto + Request/Response), used by
// the Sites worker and by the local Node server.
//
// Google: GET /api/auth/me hands out a one-time nonce (signed, HttpOnly cookie) and the public
// client ID → Google's button returns an ID token (JWT) → POST /api/auth/google verifies it here
// (RS256 against Google's published keys, issuer, audience, expiry, nonce, verified email).
//
// GitHub: GET /api/auth/github/start → GitHub's consent page with a one-time state and a PKCE
// challenge (kept in a signed, HttpOnly cookie) → GET /api/auth/github/callback checks the state,
// exchanges the code server-side (client secret + PKCE verifier), reads the profile and the
// primary verified email, and throws the GitHub token away.
//
// Both end in the same signed, HttpOnly session cookie holding only provider id, email and name.
import { z } from "zod";

export type AuthConfig = {
  secret: string; // ≥ 32 chars, signs nonce, state and session cookies
  google?: { clientId: string }; // public client ID
  github?: { clientId: string; clientSecret: string }; // secret stays on the server
  publicOrigin?: string; // where people open the site (for GitHub's redirect URL)
  fetchKeys?: () => Promise<JwkSet>; // injectable for tests
  fetchImpl?: typeof fetch; // injectable for tests (GitHub calls)
  now?: () => number; // ms
};
export type JwkSet = { keys: (JsonWebKey & { kid?: string })[] };
export type SessionUser = { sub: string; email: string; name: string };

const SESSION_COOKIE = "s2_session", NONCE_COOKIE = "s2_nonce", STATE_COOKIE = "s2_gh";
const SESSION_TTL = 7 * 24 * 3600, NONCE_TTL = 10 * 60;
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs";
const enc = new TextEncoder(), dec = new TextDecoder();

export function authConfigFrom(env: Record<string, unknown>): AuthConfig | null {
  const str = (k: string) => (typeof env[k] === "string" ? (env[k] as string).trim() : "");
  const secret = typeof env.SESSION_SECRET === "string" ? env.SESSION_SECRET : "";
  if (secret.length < 32) return null;
  const googleId = str("GOOGLE_CLIENT_ID"), githubId = str("GITHUB_CLIENT_ID"), githubSecret = str("GITHUB_CLIENT_SECRET");
  const google = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(googleId) ? { clientId: googleId } : undefined;
  const github = /^[A-Za-z0-9.]{16,40}$/.test(githubId) && /^[0-9a-f]{40}$/.test(githubSecret) ? { clientId: githubId, clientSecret: githubSecret } : undefined;
  if (!google && !github) return null;
  const origin = str("PUBLIC_ORIGIN") || str("SKETCH_SITE_ORIGIN");
  return { secret, google, github, ...(/^https?:\/\/[^/]+$/.test(origin) ? { publicOrigin: origin } : {}) };
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("bad base64url");
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const random = (n = 24) => b64url(crypto.getRandomValues(new Uint8Array(n)));
async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}
function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function seal(secret: string, purpose: string, value: object) {
  const body = b64url(enc.encode(JSON.stringify(value)));
  return `${body}.${await hmac(secret, `${purpose}:${body}`)}`;
}
async function unseal<T>(secret: string, purpose: string, token: string | undefined, schema: z.ZodType<T>): Promise<T | null> {
  if (!token || token.length > 2000) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  if (!sameString(sig, await hmac(secret, `${purpose}:${body}`))) return null;
  try { const v = schema.safeParse(JSON.parse(dec.decode(fromB64url(body)))); return v.success ? v.data : null; } catch { return null; }
}
const cleanName = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 120);

const SessionSchema = z.object({ sub: z.string().regex(/^(google|github):[A-Za-z0-9_-]{1,255}$/), email: z.union([z.literal(""), z.string().email().max(320)]), name: z.string().max(120), exp: z.number().int() }).strict();
const NonceSchema = z.object({ n: z.string().regex(/^[A-Za-z0-9_-]{22,64}$/), exp: z.number().int() }).strict();
const StateSchema = z.object({ s: z.string().regex(/^[A-Za-z0-9_-]{22,64}$/), v: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/), exp: z.number().int() }).strict();
const ClaimsSchema = z.object({
  iss: z.string(), aud: z.string(), sub: z.string().regex(/^[A-Za-z0-9_-]{1,255}$/), exp: z.number(), iat: z.number(),
  email: z.string().email().max(320), email_verified: z.union([z.boolean(), z.literal("true")]),
  name: z.string().max(200).optional(), nonce: z.string().optional(),
}).passthrough();

let keyCache: { at: number; keys: JwkSet } | null = null;
async function googleKeys(config: AuthConfig, now: number): Promise<JwkSet> {
  if (config.fetchKeys) return config.fetchKeys();
  if (keyCache && now - keyCache.at < 3600_000) return keyCache.keys;
  const res = await fetch(GOOGLE_CERTS, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("keys unavailable");
  const keys = (await res.json()) as JwkSet;
  if (!Array.isArray(keys?.keys)) throw new Error("bad keys");
  keyCache = { at: now, keys };
  return keys;
}

export type VerifyFailure = "NOT_CONFIGURED" | "MALFORMED" | "UNSUPPORTED_ALG" | "UNKNOWN_KEY" | "BAD_SIGNATURE" | "BAD_ISSUER" | "BAD_AUDIENCE" | "EXPIRED" | "NOT_YET_VALID" | "EMAIL_UNVERIFIED" | "BAD_NONCE" | "KEYS_UNAVAILABLE";
/** Verifies a Google ID token. Returns the user or the reason it was rejected. */
export async function verifyGoogleIdToken(token: string, config: AuthConfig, expectedNonce: string): Promise<{ ok: true; user: SessionUser } | { ok: false; reason: VerifyFailure }> {
  if (!config.google) return { ok: false, reason: "NOT_CONFIGURED" };
  const now = (config.now?.() ?? Date.now()) / 1000;
  const parts = typeof token === "string" && token.length < 4096 ? token.split(".") : [];
  if (parts.length !== 3) return { ok: false, reason: "MALFORMED" };
  let header: { alg?: string; kid?: string }, claims: z.infer<typeof ClaimsSchema>;
  try {
    header = JSON.parse(dec.decode(fromB64url(parts[0])));
    const parsed = ClaimsSchema.safeParse(JSON.parse(dec.decode(fromB64url(parts[1]))));
    if (!parsed.success) return { ok: false, reason: "MALFORMED" };
    claims = parsed.data;
  } catch { return { ok: false, reason: "MALFORMED" }; }
  if (header.alg !== "RS256") return { ok: false, reason: "UNSUPPORTED_ALG" };
  let keys: JwkSet;
  try { keys = await googleKeys(config, now * 1000); } catch { return { ok: false, reason: "KEYS_UNAVAILABLE" }; }
  const jwk = keys.keys.find((k) => k.kid === header.kid && k.kty === "RSA");
  if (!jwk) return { ok: false, reason: "UNKNOWN_KEY" };
  try {
    const { kid: _kid, alg: _alg, use: _use, ...pub } = jwk as JsonWebKey & { kid?: string; use?: string };
    const key = await crypto.subtle.importKey("jwk", { ...pub, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, fromB64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return { ok: false, reason: "BAD_SIGNATURE" };
  } catch { return { ok: false, reason: "BAD_SIGNATURE" }; }
  if (!GOOGLE_ISSUERS.includes(claims.iss)) return { ok: false, reason: "BAD_ISSUER" };
  if (claims.aud !== config.google.clientId) return { ok: false, reason: "BAD_AUDIENCE" };
  if (claims.exp < now - 60) return { ok: false, reason: "EXPIRED" };
  if (claims.iat > now + 60) return { ok: false, reason: "NOT_YET_VALID" };
  if (claims.email_verified !== true && claims.email_verified !== "true") return { ok: false, reason: "EMAIL_UNVERIFIED" };
  if (!expectedNonce || !claims.nonce || !sameString(claims.nonce, expectedNonce)) return { ok: false, reason: "BAD_NONCE" };
  const name = cleanName(claims.name ?? claims.email.split("@")[0]);
  return { ok: true, user: { sub: `google:${claims.sub}`, email: claims.email.toLowerCase(), name } };
}

/** Exchanges a GitHub authorization code (with the PKCE verifier) for the user's profile. */
async function githubUser(config: AuthConfig, code: string, verifier: string, redirectUri: string): Promise<SessionUser | null> {
  const gh = config.github!;
  const f = config.fetchImpl ?? fetch;
  const tokenRes = await f("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "Sketch2Site" },
    body: JSON.stringify({ client_id: gh.clientId, client_secret: gh.clientSecret, code, redirect_uri: redirectUri, code_verifier: verifier }),
  });
  if (!tokenRes.ok) return null;
  const token = z.object({ access_token: z.string().min(10).max(500), token_type: z.string() }).passthrough().safeParse(await tokenRes.json());
  if (!token.success || token.data.token_type.toLowerCase() !== "bearer") return null;
  const auth = { Authorization: `Bearer ${token.data.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Sketch2Site" };
  const userRes = await f("https://api.github.com/user", { headers: auth });
  if (!userRes.ok) return null;
  const user = z.object({ id: z.number().int().positive(), login: z.string().max(100), name: z.string().max(200).nullable().optional() }).passthrough().safeParse(await userRes.json());
  if (!user.success) return null;
  let email = "";
  const mailRes = await f("https://api.github.com/user/emails", { headers: auth });
  if (mailRes.ok) {
    const mails = z.array(z.object({ email: z.string(), primary: z.boolean(), verified: z.boolean() }).passthrough()).safeParse(await mailRes.json());
    const primary = mails.success ? mails.data.find((m) => m.primary && m.verified) : undefined;
    if (primary && z.string().email().max(320).safeParse(primary.email).success) email = primary.email.toLowerCase();
  }
  // The GitHub token is not stored anywhere; it goes out of scope here.
  return { sub: `github:${user.data.id}`, email, name: cleanName(user.data.name || user.data.login) || user.data.login };
}

function cookies(request: Request) {
  const out: Record<string, string> = {};
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
const originOf = (request: Request, config: AuthConfig | null) => config?.publicOrigin ?? new URL(request.url).origin;
const secureFlag = (request: Request, config: AuthConfig | null) => (originOf(request, config).startsWith("https:") ? "; Secure" : "");
const cookie = (request: Request, config: AuthConfig | null, name: string, value: string, maxAge: number, sameSite = "Strict") => `${name}=${value}; Path=/api/auth; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secureFlag(request, config)}`;
const sessionCookie = (request: Request, config: AuthConfig | null, value: string, maxAge: number) => `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag(request, config)}`;
const baseHeaders = () => new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "Referrer-Policy": "no-referrer" });
function reply(value: unknown, status = 200, setCookies: string[] = []) {
  const headers = baseHeaders();
  headers.set("Content-Type", "application/json");
  for (const c of setCookies) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(value), { status, headers });
}
function redirect(location: string, setCookies: string[] = []) {
  const headers = baseHeaders();
  headers.set("Location", location);
  for (const c of setCookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}

/** The signed-in user for any request (null when signed out or the cookie is invalid/expired). */
export async function currentUser(request: Request, config: AuthConfig | null): Promise<SessionUser | null> {
  if (!config) return null;
  const s = await unseal(config.secret, "session", cookies(request)[SESSION_COOKIE], SessionSchema);
  const now = (config.now?.() ?? Date.now()) / 1000;
  return s && s.exp > now ? { sub: s.sub, email: s.email, name: s.name } : null;
}

const attempts = new Map<string, number[]>();
function tooMany(key: string, now: number) {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) attempts.delete(attempts.keys().next().value!);
  return recent.length > 10;
}
async function startSession(request: Request, config: AuthConfig, user: SessionUser, now: number) {
  return sessionCookie(request, config, await seal(config.secret, "session", { ...user, exp: Math.floor(now / 1000) + SESSION_TTL }), SESSION_TTL);
}

/**
 * Handles /api/auth/*. `sameOrigin` must already be checked by the caller for POSTs
 * (Origin header equals the site's origin). Returns null for other paths.
 */
export async function handleAuth(request: Request, config: AuthConfig | null, opts: { sameOrigin: boolean; clientKey?: string }): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/auth/")) return null;
  const now = config?.now?.() ?? Date.now();
  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    if (!config) return reply({ providers: [], user: null });
    const user = await currentUser(request, config);
    const providers = [...(config.google ? ["google"] : []), ...(config.github ? ["github"] : [])];
    const who = user ? { name: user.name, email: user.email, provider: user.sub.split(":")[0] } : null;
    if (!config.google || user) return reply({ providers, user: who });
    const nonce = random();
    const sealed = await seal(config.secret, "nonce", { n: nonce, exp: Math.floor(now / 1000) + NONCE_TTL });
    return reply({ providers, google: { clientId: config.google.clientId, nonce }, user: null }, 200, [cookie(request, config, NONCE_COOKIE, sealed, NONCE_TTL)]);
  }
  // GitHub: start (top-level navigation from the sign-in card).
  if (url.pathname === "/api/auth/github/start" && request.method === "GET") {
    if (!config?.github) return redirect("/?signin=unavailable");
    if (tooMany(opts.clientKey ?? "anon", now)) return redirect("/?signin=busy");
    const state = random(), verifier = random(48);
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(verifier))));
    const sealed = await seal(config.secret, "github-state", { s: state, v: verifier, exp: Math.floor(now / 1000) + NONCE_TTL });
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.search = new URLSearchParams({ client_id: config.github.clientId, redirect_uri: `${originOf(request, config)}/api/auth/github/callback`, scope: "read:user user:email", state, code_challenge: challenge, code_challenge_method: "S256", allow_signup: "true" }).toString();
    // Lax so the cookie comes back with GitHub's top-level redirect to our callback.
    return redirect(authorize.toString(), [cookie(request, config, STATE_COOKIE, sealed, NONCE_TTL, "Lax")]);
  }
  // GitHub: callback (top-level navigation from github.com).
  if (url.pathname === "/api/auth/github/callback" && request.method === "GET") {
    const clear = cookie(request, config, STATE_COOKIE, "", 0, "Lax");
    if (!config?.github) return redirect("/?signin=unavailable", [clear]);
    const saved = await unseal(config.secret, "github-state", cookies(request)[STATE_COOKIE], StateSchema);
    const state = url.searchParams.get("state") ?? "", code = url.searchParams.get("code") ?? "";
    if (!saved || saved.exp < now / 1000 || !sameString(state, saved.s)) return redirect("/?signin=failed", [clear]);
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(code)) return redirect(url.searchParams.get("error") === "access_denied" ? "/?signin=cancelled" : "/?signin=failed", [clear]);
    let user: SessionUser | null = null;
    try { user = await githubUser(config, code, saved.v, `${originOf(request, config)}/api/auth/github/callback`); } catch { user = null; }
    if (!user) return redirect("/?signin=failed", [clear]);
    return redirect("/?signin=ok", [clear, await startSession(request, config, user, now)]);
  }
  if (request.method !== "POST") return reply({ code: "NOT_FOUND" }, 404);
  if (!opts.sameOrigin) return reply({ code: "FORBIDDEN" }, 403);
  if (url.pathname === "/api/auth/logout")
    return reply({ ok: true }, 200, [sessionCookie(request, config, "", 0), cookie(request, config, NONCE_COOKIE, "", 0)]);
  if (url.pathname !== "/api/auth/google") return reply({ code: "NOT_FOUND" }, 404);
  if (!config?.google) return reply({ code: "NOT_CONFIGURED" }, 503);
  if (tooMany(opts.clientKey ?? "anon", now)) return reply({ code: "RATE_LIMITED" }, 429);
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return reply({ code: "BAD_REQUEST" }, 415);
  const raw = await request.text();
  if (raw.length > 6000) return reply({ code: "BAD_REQUEST" }, 413);
  let credential: string;
  try { credential = z.object({ credential: z.string().min(10).max(4096) }).strict().parse(JSON.parse(raw)).credential; } catch { return reply({ code: "BAD_REQUEST" }, 400); }
  const nonce = await unseal(config.secret, "nonce", cookies(request)[NONCE_COOKIE], NonceSchema);
  if (!nonce || nonce.exp < now / 1000) return reply({ code: "NONCE_EXPIRED" }, 401, [cookie(request, config, NONCE_COOKIE, "", 0)]);
  const result = await verifyGoogleIdToken(credential, config, nonce.n);
  if (!result.ok) return reply({ code: result.reason === "KEYS_UNAVAILABLE" ? "UNAVAILABLE" : "INVALID_TOKEN" }, result.reason === "KEYS_UNAVAILABLE" ? 503 : 401, [cookie(request, config, NONCE_COOKIE, "", 0)]);
  // The nonce is single-use: clear it with the successful sign-in.
  return reply({ user: { name: result.user.name, email: result.user.email, provider: "google" } }, 200, [await startSession(request, config, result.user, now), cookie(request, config, NONCE_COOKIE, "", 0)]);
}
