import { authConfigFrom, currentUser } from "../../server/auth";
import { bindVerifiedOwner, type SitesEnv } from "../../server/sitesIdentity";
import { createSitesAPI } from "../../server/sitesWorker";

export async function authenticatePagesOwner(request: Request, env: SitesEnv) {
  const origin = new URL(request.url).origin;
  if (origin !== env.SKETCH_SITE_ORIGIN || request.headers.get("sec-fetch-site") === "cross-site") return null;
  if (request.headers.has("origin") && request.headers.get("origin") !== origin) return null;
  const user = await currentUser(request, authConfigFrom(env));
  const email = user?.email.toLowerCase();
  const owner = typeof env.SKETCH_AI_OWNER_EMAIL === "string" ? env.SKETCH_AI_OWNER_EMAIL.trim().toLowerCase() : "";
  if (!user || !email || !owner || !env.DB) return null;
  const subject = `pages:${user.sub}`;
  if (email === owner) return bindVerifiedOwner(env, subject, email, "pages-owner");

  const allowed = typeof env.SKETCH_AI_AUTHORIZED_EMAILS === "string"
    ? env.SKETCH_AI_AUTHORIZED_EMAILS.split(",").map(value => value.trim().toLowerCase())
    : [];
  if (!allowed.includes(email)) return null;
  // Only the owner can establish the Pages identity. Delegates share its existing quota ledger.
  const binding = await env.DB.prepare("SELECT user_id FROM sketch_ai_owner WHERE id = ?")
    .bind("pages-owner").first<{ user_id: string }>();
  return binding?.user_id.startsWith("pages:") ? subject : null;
}

const handle = createSitesAPI(undefined, undefined, { authenticate: authenticatePagesOwner, pages: true });

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
