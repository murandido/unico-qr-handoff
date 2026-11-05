# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-05

### Added
- **Copy link** button under Unico's QR code. The QR is decoded locally with jsQR, and nothing is sent anywhere.
- Support for flows that open Unico as a standalone page (e.g. LATAM). Content scripts now match `*.unico.app` and `*.unico.io`.
- `npm run demo` builds a fake QR screen for testing the button.

## [1.0.0] - 2026-11-05

### Added
- MV3 extension for Chrome and Firefox (140+) that adds an Opera token (`OPR/…`) to the user agent inside Unico's frames, so the identity check offers the QR code on desktop.
- Tests that mirror Unico's browser-support check using `ua-parser-js`.

[1.1.0]: https://github.com/murandido/unico-qr-handoff/releases/tag/v1.1.0
[1.0.0]: https://github.com/murandido/unico-qr-handoff/commit/4eccde1
