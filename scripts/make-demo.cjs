// Builds demo/index.html: a page that mimics Unico's QR screen (qrcode.react-style
// SVG, rendered after a short delay) and loads the copy-link script directly.
// Usage: npm run demo, then serve demo/ (e.g. `npx serve demo`) and open it.
const fs = require("node:fs");
const path = require("node:path");
const QR = require("qrcode");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "demo");
const url = process.argv[2] || "https://cadastro.unico.app/process/00000000-demo?qrcode=true";

const { size: n, data } = QR.create(url, { errorCorrectionLevel: "L" }).modules;
let d = "";
for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (data[y * n + x]) d += `M${x} ${y}h1v1H${x}z`;
const svg =
  `<svg height="200" width="200" viewBox="0 0 ${n} ${n}" role="img">` +
  `<path fill="#FFFFFF" d="M0,0 h${n}v${n}H0z" shape-rendering="crispEdges"></path>` +
  `<path fill="#000000" d="${d}" shape-rendering="crispEdges"></path></svg>`;

fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, "extension/vendor/jsQR.js"), path.join(out, "jsQR.js"));
fs.copyFileSync(path.join(root, "extension/src/copy-link.js"), path.join(out, "copy-link.js"));
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>QR Handoff demo</title>
<body style="font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px">
<h3>Continue on your phone</h3><div id="qr"></div><p>Encoded: <code>${url}</code></p>
<script src="jsQR.js"></script>
<script>setTimeout(() => { document.getElementById("qr").innerHTML = ${JSON.stringify(svg)}; }, 300);</script>
<script src="copy-link.js"></script></body>`,
);
console.log(`demo/index.html written (${n}x${n} modules)`);
