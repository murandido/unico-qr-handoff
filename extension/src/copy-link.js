/*
 * Unico QR Handoff: "copy link" button.
 *
 * Watches Unico's pages for a rendered QR code (an <svg> drawn by qrcode.react,
 * or a <canvas>), decodes it locally with jsQR and shows a floating button that
 * copies the encoded link. Runs in the extension's isolated world; nothing is
 * sent anywhere.
 */
(() => {
  "use strict";

  const jsQR = globalThis.jsQR || (typeof window !== "undefined" && window.jsQR);
  if (typeof jsQR !== "function") return;

  const MIN_QR_SIZE = 80; // CSS px; smaller squares are icons, not QR codes
  const SCAN_DELAY_MS = 400;
  const PX_PER_MODULE = 8;
  const QUIET_ZONE = 4; // modules of white border added around the QR before decoding

  const isPortuguese = (navigator.language || "").toLowerCase().startsWith("pt");
  const TEXT = isPortuguese
    ? { copy: "Copiar link do QR code", copied: "Link copiado!", manual: "Copie com Ctrl+C" }
    : { copy: "Copy QR code link", copied: "Link copied!", manual: "Copy with Ctrl+C" };

  let current = null; // { el, url }
  let ui = null;
  let scanTimer = null;
  let scanning = false;
  const cache = new WeakMap(); // element -> { key, url }

  // ---------- QR detection ----------

  const isSquareAndBig = (el) => {
    const r = el.getBoundingClientRect();
    return r.width >= MIN_QR_SIZE && Math.abs(r.width - r.height) <= 4;
  };

  const findCandidates = () => {
    const svgs = [...document.querySelectorAll("svg")].filter(
      (svg) => svg.querySelector('path[shape-rendering="crispEdges"], rect') && isSquareAndBig(svg),
    );
    const canvases = [...document.querySelectorAll("canvas")].filter(isSquareAndBig);
    return [...svgs, ...canvases];
  };

  const contentKey = (el) => {
    if (el instanceof HTMLCanvasElement) {
      try {
        return `canvas:${el.width}x${el.height}:${el.toDataURL().length}`;
      } catch {
        return null; // tainted canvas, cannot be read
      }
    }
    return `svg:${el.getAttribute("viewBox")}:${[...el.querySelectorAll("path")].map((p) => p.getAttribute("d")).join("|").length}`;
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const drawWithQuietZone = (source, sourceSize, modules) => {
    const scale = Math.max(1, Math.round((modules * PX_PER_MODULE) / sourceSize));
    const size = Math.min(1600, sourceSize * scale);
    const pad = Math.round((size / modules) * QUIET_ZONE);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size + pad * 2;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, pad, pad, size, size);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const imageDataFromSvg = async (svg) => {
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const modules = vb && vb.width ? vb.width : 33;
    const clone = svg.cloneNode(true);
    const size = Math.max(modules, 1) * PX_PER_MODULE;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(size));
    clone.setAttribute("height", String(size));
    clone.querySelectorAll("image").forEach((img) => img.remove()); // center logos only get in the way
    const xml = new XMLSerializer().serializeToString(clone);
    const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
    return drawWithQuietZone(img, size, modules);
  };

  const imageDataFromCanvas = (canvas) => drawWithQuietZone(canvas, canvas.width, 41);

  const decode = async (el) => {
    const data = el instanceof HTMLCanvasElement ? imageDataFromCanvas(el) : await imageDataFromSvg(el);
    const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
    const text = code && code.data ? code.data.trim() : "";
    return /^https?:\/\//i.test(text) ? text : null;
  };

  const scan = async () => {
    if (scanning) return;
    scanning = true;
    try {
      let found = null;
      for (const el of findCandidates()) {
        const key = contentKey(el);
        if (!key) continue;
        const cached = cache.get(el);
        let url = cached && cached.key === key ? cached.url : undefined;
        if (url === undefined) {
          try {
            url = await decode(el);
          } catch {
            url = null;
          }
          cache.set(el, { key, url });
        }
        if (url) {
          found = { el, url };
          break;
        }
      }
      current = found;
      render();
    } finally {
      scanning = false;
    }
  };

  const scheduleScan = () => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, SCAN_DELAY_MS);
  };

  // ---------- UI ----------

  const buildUi = () => {
    const host = document.createElement("div");
    host.setAttribute("data-unico-qr-handoff", "");
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;top:0;left:0;";
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .wrap { display:flex; flex-direction:column; align-items:center; gap:6px; font:600 14px/1.2 system-ui, sans-serif; }
        button { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:8px; padding:10px 16px;
          border-radius:999px; background:#111; color:#fff; box-shadow:0 2px 10px rgba(0,0,0,.25); white-space:nowrap; }
        button:hover { background:#333; }
        button:focus-visible { outline:2px solid #4c8dff; outline-offset:2px; }
        button.ok { background:#137333; }
        input { display:none; width:min(320px, 90vw); padding:6px 8px; border:1px solid #999; border-radius:6px;
          font:12px/1.2 ui-monospace, monospace; background:#fff; color:#111; }
        input.show { display:block; }
        svg { width:16px; height:16px; flex:none; }
      </style>
      <div class="wrap">
        <button type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span></span>
        </button>
        <input type="text" readonly aria-label="link">
      </div>`;
    const button = root.querySelector("button");
    const label = root.querySelector("span");
    const input = root.querySelector("input");
    label.textContent = TEXT.copy;
    let resetTimer = null;

    const flash = (text, ok) => {
      label.textContent = text;
      button.classList.toggle("ok", ok);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        label.textContent = TEXT.copy;
        button.classList.remove("ok");
      }, 2500);
    };

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!current) return;
      const url = current.url;
      input.classList.remove("show");
      if (await copyText(url)) {
        flash(TEXT.copied, true);
      } else {
        input.value = url;
        input.classList.add("show");
        input.focus();
        input.select();
        flash(TEXT.manual, false);
      }
      position();
    });

    return { host, input };
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for frames without clipboard-write permission.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0;";
      (document.body || document.documentElement).appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  };

  const position = () => {
    if (!ui || !current) return;
    const r = current.el.getBoundingClientRect();
    const visible = r.width > 0 && r.height > 0 && current.el.isConnected;
    ui.host.style.display = visible ? "block" : "none";
    if (!visible) return;
    const box = ui.host.getBoundingClientRect();
    const w = box.width || 220;
    const h = box.height || 40;
    const top = Math.min(Math.max(r.bottom + 12, 8), window.innerHeight - h - 8);
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, 8), Math.max(8, window.innerWidth - w - 8));
    ui.host.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };

  const render = () => {
    if (!current) {
      if (ui) {
        ui.host.remove();
        ui = null;
      }
      return;
    }
    if (!ui) ui = buildUi();
    if (!ui.host.isConnected) (document.body || document.documentElement).appendChild(ui.host);
    requestAnimationFrame(position);
  };

  // ---------- wiring ----------

  const start = () => {
    new MutationObserver((mutations) => {
      if (ui && mutations.every((m) => ui.host === m.target || ui.host.contains(m.target))) return;
      scheduleScan();
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["d", "viewBox", "width", "height"] });
    window.addEventListener("resize", () => requestAnimationFrame(position), { passive: true });
    window.addEventListener("scroll", () => requestAnimationFrame(position), { passive: true, capture: true });
    scheduleScan();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
