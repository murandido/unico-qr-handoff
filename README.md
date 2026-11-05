# Unico QR Handoff

A tiny browser extension for **Chrome** and **Firefox** that makes [Unico](https://unico.io)'s identity check offer the **QR code** on desktop, so you can take the selfie on your phone instead of the computer's webcam. It also adds a **Copy link** button under the QR code, so you can send the link to your phone without scanning.

> 🇧🇷 [Leia em português](#português)

## Why

Some sites (for example, Smiles and LATAM when issuing award tickets) ask for a face check powered by Unico. Smiles embeds it in an iframe, while LATAM opens a Unico page. In Chrome and Firefox on desktop, Unico opens the computer's webcam right away. In Opera it shows a QR code instead, and you finish the check on your phone.

The difference lives in Unico's own front-end. Its browser-support check marks Opera as unsupported:

```js
if (["OPR", "Opera"].includes(browserName)) return false; // unsupported
```

On desktop, an unsupported browser is sent to the QR code screen. This extension makes Unico's page see an Opera token (`OPR/…`) in the user agent, which triggers that same QR flow.

## What it does (and doesn't do)

- Runs **only** on Unico pages and frames (`*.unico.app` and `*.unico.io`). Every other site, including the one embedding Unico, keeps your real user agent.
- Appends ` OPR/125.0.0.0` to `navigator.userAgent` and `navigator.appVersion` before any page script runs.
- When a QR code shows up, decodes it **locally** with [jsQR](https://github.com/cozmo/jsQR) and shows a **Copy link** button below it. If the clipboard is blocked, the link appears in a text box so you can copy it by hand.
- **Does not** skip, fake or alter the face check. You still take the selfie, on your phone.
- Requests no extra permissions, has no background script, and collects or sends no data.

## Install

Grab `unico-qr-handoff-<version>.zip` from the [latest release](https://github.com/murandido/unico-qr-handoff/releases/latest) and unzip it, or clone this repository and use the `extension/` folder.

### Chrome (and other Chromium browsers)

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the unzipped folder (or `extension/`).

Chrome may show a warning about the `browser_specific_settings` key. That key is for Firefox only, and Chrome ignores it.

### Firefox (140+)

- **Temporary (for testing):** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…** and pick the release `.zip` (or `extension/manifest.json`). It stays loaded until Firefox restarts.
- **Permanent:** build the package (`npm run build`) and sign it through [addons.mozilla.org](https://addons.mozilla.org/developers/) as an unlisted add-on, then install the signed `.xpi`.

## Usage

1. Keep the extension enabled.
2. Start the flow that asks for the face check (for example, ticket issuance on Smiles).
3. Unico shows a QR code. Scan it with your phone, or click **Copy link** and send the link to your phone (WhatsApp, Telegram, e-mail…), then take the selfie there.

Open the copied link **on your phone**. If you open it on the same computer with the extension on, Unico will just show the QR code again.

If Unico was already open when you installed or enabled the extension, close the check and start it again so the frame reloads.

## Development

```bash
npm install
npm test             # checks the script against ua-parser-js, the same parser Unico uses
npm run lint:firefox # web-ext lint
npm run build        # zip in dist/
npm run demo         # demo/index.html: fake QR screen to try the copy button (serve it with `npx serve demo`)
```

Layout:

```
extension/
  manifest.json      # MV3, shared by Chrome and Firefox
  src/spoof-ua.js    # MAIN-world content script, runs at document_start
  src/copy-link.js   # isolated-world content script: finds the QR, decodes it, shows the button
  vendor/jsQR.js     # jsQR 1.4.0 (Apache-2.0), see vendor/jsQR.LICENSE
scripts/
  make-demo.cjs      # builds the demo page
test/
  spoof-ua.test.js
```

## Caveats

- This depends on how Unico decides today. If Unico changes its browser rules, the extension may stop working.
- A user agent is only a hint, so sites are free to treat it however they want. The change is limited to Unico's frames to keep the side effects small.

## Disclaimer

This is an independent project. It is not affiliated with, endorsed by, or supported by Unico or Smiles. All trademarks belong to their owners. Use it at your own risk.

## License

[MIT](LICENSE). Bundled [jsQR](https://github.com/cozmo/jsQR) is Apache-2.0 ([license](extension/vendor/jsQR.LICENSE)).

---

## Português

Extensão para **Chrome** e **Firefox** que faz a verificação facial da Unico mostrar o **QR code** no computador, para você tirar a selfie pelo celular.

**Por quê:** o front-end da Unico considera o Opera um navegador "não suportado". No desktop, um navegador não suportado vai para a tela do QR code. A extensão adiciona `OPR/…` ao User-Agent **só nas páginas e frames da Unico** (`*.unico.app` e `*.unico.io`), e o resto da navegação continua igual. Funciona com a Smiles, que abre a Unico num iframe, e com a LATAM, que abre uma página da Unico.

**Botão "Copiar link do QR code":** quando o QR aparece, a extensão lê o QR localmente e mostra um botão logo abaixo para copiar o link. Mande o link para o celular e abra lá. Se abrir no mesmo computador com a extensão ligada, a Unico só mostra o QR de novo.

**Baixar:** pegue o `.zip` na [última release](https://github.com/murandido/unico-qr-handoff/releases/latest) e descompacte.

**Instalar no Chrome:** `chrome://extensions` → ative o *Modo do desenvolvedor* → *Carregar sem compactação* → escolha a pasta descompactada (ou `extension/`).

**Instalar no Firefox (140+):** `about:debugging#/runtime/this-firefox` → *Carregar extensão temporária…* → o `.zip` da release (ou `extension/manifest.json`). Para instalar de forma permanente, assine o pacote no addons.mozilla.org.

A selfie continua sendo feita normalmente, só que no celular. A extensão não pula nem altera a verificação e não coleta nenhum dado. Este projeto não tem vínculo com a Unico nem com a Smiles.
