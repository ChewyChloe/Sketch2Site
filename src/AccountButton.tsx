import { useEffect, useRef, useState } from "react";

// Sign-in with Google or GitHub, in the top bar. Hidden entirely when the site has no
// sign-in set up. Google's script loads only when the person opens the sign-in card.
type Me = {
  providers: ("google" | "github")[];
  google?: { clientId: string; nonce: string };
  user: { name: string; email: string; provider?: string } | null;
};
type GoogleId = {
  accounts: { id: {
    initialize(o: { client_id: string; nonce: string; callback(r: { credential?: string }): void; itp_support?: boolean }): void;
    renderButton(el: HTMLElement, o: Record<string, string | number>): void;
    disableAutoSelect(): void;
  } };
};
const GIS = "https://accounts.google.com/gsi/client";
let gisLoading: Promise<GoogleId> | null = null;
function loadGoogle(): Promise<GoogleId> {
  const w = window as unknown as { google?: GoogleId };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  gisLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS;
    s.async = true;
    s.onload = () => (w.google?.accounts?.id ? resolve(w.google) : reject(new Error("gis")));
    s.onerror = () => { gisLoading = null; reject(new Error("gis")); };
    document.head.append(s);
  });
  return gisLoading;
}
const signinNotes: Record<string, string> = { ok: "", failed: "登入沒有成功，請再試一次", cancelled: "已取消登入", busy: "試太多次了，請等一分鐘再試", unavailable: "現在無法登入，請稍後再試" };

export function AccountButton() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const slot = useRef<HTMLDivElement>(null), wrap = useRef<HTMLDivElement>(null);
  const refresh = () =>
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { providers: [], user: null }))
      .then((m: Me) => setMe({ providers: Array.isArray(m?.providers) ? m.providers : [], google: m?.google, user: m?.user ?? null }))
      .catch(() => setMe({ providers: [], user: null }));
  useEffect(() => {
    void refresh();
    // Coming back from GitHub: show how it went once, then tidy the address bar.
    const params = new URLSearchParams(location.search);
    const result = params.get("signin");
    if (result !== null) {
      if (signinNotes[result]) { setNote(signinNotes[result]); setOpen(true); }
      params.delete("signin");
      history.replaceState(history.state, "", location.pathname + (params.size ? "?" + params : "") + location.hash);
    }
  }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  // Google's own button, rendered inside the card.
  useEffect(() => {
    const google = me?.google;
    if (!open || !google || me?.user) return;
    let live = true;
    loadGoogle()
      .then((g) => {
        if (!live || !slot.current) return;
        g.accounts.id.initialize({
          client_id: google.clientId,
          nonce: google.nonce,
          itp_support: true,
          callback: async ({ credential }) => {
            if (!credential) return;
            setBusy(true);
            try {
              const r = await fetch("/api/auth/google", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) });
              if (!r.ok) throw new Error(String(r.status));
              setNote("");
              setOpen(false);
            } catch {
              setNote(signinNotes.failed);
            } finally {
              setBusy(false);
              void refresh();
            }
          },
        });
        slot.current.replaceChildren();
        g.accounts.id.renderButton(slot.current, { theme: "outline", size: "large", shape: "pill", text: "signin_with", locale: "zh-TW", width: 260 });
      })
      .catch(() => live && setNote((current) => current || "連不到 Google，請檢查網路後再試"));
    return () => { live = false; };
  }, [open, me]);
  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      (window as unknown as { google?: GoogleId }).google?.accounts.id.disableAutoSelect();
    } finally {
      setBusy(false);
      setOpen(false);
      void refresh();
    }
  }
  if (!me) return null;
  // Before sign-in is set up the button stays, but both options are shown as coming soon.
  const soon = !me.providers.length && !me.user;
  const user = me.user;
  return (
    <div className="account" ref={wrap}>
      <button type="button" className={"account-button" + (user ? " is-signed-in" : "")} aria-expanded={open} aria-haspopup="dialog" aria-label={user ? `帳號：${user.name}` : "登入"} onClick={() => setOpen((v) => !v)}>
        {user ? <><span className="account-avatar" aria-hidden="true">{Array.from(user.name || user.email || "?")[0]?.toUpperCase()}</span><span className="account-name">{user.name}</span></> : "登入"}
      </button>
      {open && (
        <div className="account-card" role="dialog" aria-label={user ? "帳號" : "登入"}>
          {user ? (
            <>
              <p className="account-who"><strong>{user.name}</strong>{user.email && <small>{user.email}</small>}<small>{user.provider === "github" ? "用 GitHub 登入" : "用 Google 登入"}</small></p>
              <p className="account-help">你的作品還是存在這台裝置上</p>
              <button type="button" className="account-logout" disabled={busy} onClick={() => void logout()}>登出</button>
            </>
          ) : (
            <>
              <h2>登入</h2>
              {soon && <p className="account-help">登入功能即將開放，現在不用登入也能使用全部功能</p>}
              {soon && (
                <div className="account-soon">
                  <button type="button" disabled>用 Google 登入（即將開放）</button>
                  <button type="button" disabled>用 GitHub 登入（即將開放）</button>
                </div>
              )}
              {me.google && <div ref={slot} className="account-google" aria-busy={busy} />}
              {me.providers.includes("github") && (
                <a className="account-github" href="/api/auth/github/start">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0z" fill="currentColor" /></svg>
                  用 GitHub 登入
                </a>
              )}
            </>
          )}
          {note && <p className="account-note" role="status">{note}</p>}
        </div>
      )}
    </div>
  );
}
