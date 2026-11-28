// A picture of the page as drawn, for the AI Visual Critic. Built from the rendered page's own
// boxes (backgrounds, pictures, text lines at their measured places), not a screen capture, so
// nothing else on screen can leak in and no capture library is needed. Pictures from other
// sites that the browser will not let us draw become grey blocks.

const visible = (e: Element) => { const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05; };

export async function pageSnapshot(root: HTMLElement, width = 720, maxHeight = 2400): Promise<string | null> {
  try {
    const box = root.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const scale = width / box.width, height = Math.min(maxHeight, Math.round(box.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const at = (r: DOMRect) => [(r.left - box.left) * scale, (r.top - box.top) * scale, r.width * scale, r.height * scale] as const;
    ctx.fillStyle = getComputedStyle(root).backgroundColor || "#fff";
    if (ctx.fillStyle === "rgba(0, 0, 0, 0)") ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    const all = [root, ...root.querySelectorAll<HTMLElement>("*")];
    // 1. Backgrounds and borders of boxes.
    for (const e of all) {
      if (!visible(e)) continue;
      const s = getComputedStyle(e), [x, y, w, h] = at(e.getBoundingClientRect());
      if (y > height || w < 1 || h < 1) continue;
      if (s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)") { ctx.fillStyle = s.backgroundColor; ctx.fillRect(x, y, w, h); }
      if (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== "none") { ctx.fillStyle = s.borderTopColor; ctx.fillRect(x, y, w, Math.max(1, parseFloat(s.borderTopWidth) * scale)); }
    }
    // 2. Pictures, cropped the way the page crops them (cover by default).
    for (const img of root.querySelectorAll("img")) {
      if (!visible(img)) continue;
      const [x, y, w, h] = at(img.getBoundingClientRect());
      if (y > height || w < 2 || h < 2) continue;
      try {
        if (!img.complete || !img.naturalWidth) throw new Error("not loaded");
        const fit = getComputedStyle(img).objectFit;
        const s = fit === "contain" ? Math.min(w / img.naturalWidth, h / img.naturalHeight) : Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        ctx.restore();
      } catch { ctx.fillStyle = "#c8c8c8"; ctx.fillRect(x, y, w, h); }
    }
    // 3. Text, line by line where the browser put it.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      const text = t.textContent ?? "";
      if (!el || !text.trim() || !visible(el)) continue;
      const s = getComputedStyle(el);
      ctx.fillStyle = s.color; ctx.textBaseline = "top";
      ctx.font = `${s.fontWeight} ${parseFloat(s.fontSize) * scale}px ${s.fontFamily}`;
      // Draw each character at its own measured place (CJK lines wrap anywhere).
      let line = "", lx = 0, ly = -1;
      const flush = () => { if (line) ctx.fillText(line, lx, ly); line = ""; };
      for (let i = 0; i < text.length && i < 4000; i++) {
        range.setStart(t, i); range.setEnd(t, i + 1);
        const r = range.getClientRects()[0];
        if (!r) continue;
        const [x, y] = at(r);
        if (y > height) break;
        if (Math.abs(y - ly) > 2) { flush(); lx = x; ly = y; }
        line += text[i];
      }
      flush();
    }
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}
