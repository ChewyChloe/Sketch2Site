import { authConfigFrom, currentUser } from "../../server/auth";
import { bindVerifiedOwner, type SitesEnv } from "../../server/sitesIdentity";
import { createSitesAPI } from "../../server/sitesWorker";

async function authenticatePagesOwner(request: Request, env: SitesEnv) {
  const origin = new URL(request.url).origin;
  if (origin !== env.SKETCH_SITE_ORIGIN || request.headers.get("sec-fetch-site") === "cross-site") return null;
  if (request.headers.has("origin") && request.headers.get("origin") !== origin) return null;
  const user = await currentUser(request, authConfigFrom(env));
  if (!user?.email || typeof env.SKETCH_AI_OWNER_EMAIL !== "string" ||
      user.email.toLowerCase() !== env.SKETCH_AI_OWNER_EMAIL.trim().toLowerCase()) return null;
  return bindVerifiedOwner(env, `pages:${user.sub}`, user.email);
}

const handle = createSitesAPI(undefined, undefined, authenticatePagesOwner);

export async function onRequest({ request, env }: { request: Request; env: SitesEnv }) {
  try {
    // Use Pages runtime bindings directly. Request headers are never trusted as owner identity.
    return await handle(request, env);
  } catch {
    return Response.json({ code: "UNAVAILABLE" }, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      },
    });
  }
}
